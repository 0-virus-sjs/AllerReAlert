import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import {
  buildMealPlanGenerationContext,
  generateMealPlanWithAI,
  saveGeneratedMealPlan,
  type GenerateMealPlanInput,
} from '../services/ai/ai.service'
import {
  markJobRunning,
  markJobCompleted,
  markJobFailed,
  updateJobProgress,
} from '../services/ai/meal-generation-job.service'

const CHUNK_SIZE = 5 // 영업일 단위

function getTargetDays(from: string, to: string, includeWeekends = false): string[] {
  const days: string[] = []
  const cur = new Date(from)
  const end = new Date(to)
  while (cur <= end) {
    const dow = cur.getDay()
    if (includeWeekends || (dow >= 1 && dow <= 5)) days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function processMealGenerationJob(jobId: string): Promise<void> {
  const job = await prisma.mealGenerationJob.findUnique({ where: { id: jobId } })
  if (!job) {
    logger.warn({ jobId }, 'meal-generation-job: job not found')
    return
  }

  const claimed = await markJobRunning(jobId)
  if (!claimed) {
    logger.warn({ jobId }, 'meal-generation-job: already claimed by another worker')
    return
  }

  logger.info({ jobId, orgId: job.orgId }, 'meal-generation-job: starting')

  try {
    const input = job.input as unknown as GenerateMealPlanInput

    // 컨텍스트는 job 시작 시 한 번만 조회 (NEIS 포함)
    const ctx = await buildMealPlanGenerationContext(input, job.orgId, job.requestedBy)

    // 전체 대상일 → chunk 분할 (includeWeekends에 따라 주말 포함 여부 결정)
    const allWeekdays = getTargetDays(input.period.from, input.period.to, input.includeWeekends ?? false)
    const chunks = chunkArray(allWeekdays, CHUNK_SIZE)
    const totalDays = allWeekdays.length

    await updateJobProgress(jobId, 0, totalDays)
    logger.info({ jobId, totalDays, chunks: chunks.length }, 'meal-generation-job: chunk plan')

    const allPlans: Array<{ id: string; date: string; itemCount: number }> = []
    let completedDays = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const period = {
        from: new Date(chunk[0]),
        to:   new Date(chunk[chunk.length - 1]),
      }

      logger.info({ jobId, chunk: i + 1, of: chunks.length, from: chunk[0], to: chunk[chunk.length - 1] }, 'meal-generation-job: processing chunk')

      const days  = await generateMealPlanWithAI(ctx, period)
      const saved = await saveGeneratedMealPlan(days, job.orgId, job.requestedBy)

      allPlans.push(...saved)
      completedDays += saved.length
      await updateJobProgress(jobId, completedDays, totalDays)
    }

    await markJobCompleted(jobId, { mealPlans: allPlans })
    logger.info({ jobId, totalDays: allPlans.length }, 'meal-generation-job: completed')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await markJobFailed(jobId, message)
    logger.error({ jobId, err }, 'meal-generation-job: failed')
  }
}

export function scheduleMealGenerationJob(jobId: string): void {
  setImmediate(() => {
    processMealGenerationJob(jobId).catch((err) => {
      logger.error({ jobId, err }, 'meal-generation-job: unhandled error in processor')
    })
  })
}

export async function recoverStuckJobs(): Promise<void> {
  const STUCK_THRESHOLD_MS = 10 * 60 * 1000

  const stuckAt = new Date(Date.now() - STUCK_THRESHOLD_MS)
  const reset = await prisma.mealGenerationJob.updateMany({
    where: { status: 'running', updatedAt: { lt: stuckAt } },
    data:  { status: 'queued' },
  })
  if (reset.count > 0) {
    logger.info({ count: reset.count }, 'meal-generation-job: reset stuck running jobs to queued')
  }

  const queued = await prisma.mealGenerationJob.findMany({
    where:   { status: 'queued' },
    select:  { id: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const job of queued) {
    scheduleMealGenerationJob(job.id)
  }

  if (queued.length > 0) {
    logger.info({ count: queued.length }, 'meal-generation-job: re-queued pending jobs on startup')
  }
}
