import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { generateMealPlan, type GenerateMealPlanInput } from '../services/ai/ai.service'
import {
  markJobRunning,
  markJobCompleted,
  markJobFailed,
} from '../services/ai/meal-generation-job.service'

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
    const input = job.input as GenerateMealPlanInput
    const result = await generateMealPlan(input, job.requestedBy, job.orgId)
    await markJobCompleted(jobId, result)
    logger.info({ jobId, days: result.mealPlans.length }, 'meal-generation-job: completed')
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
  const STUCK_THRESHOLD_MS = 10 * 60 * 1000 // 10분

  // running 상태지만 10분 이상 지난 job → queued로 되돌림
  const stuckAt = new Date(Date.now() - STUCK_THRESHOLD_MS)
  const reset = await prisma.mealGenerationJob.updateMany({
    where: { status: 'running', updatedAt: { lt: stuckAt } },
    data: { status: 'queued' },
  })
  if (reset.count > 0) {
    logger.info({ count: reset.count }, 'meal-generation-job: reset stuck running jobs to queued')
  }

  // queued 상태인 job을 모두 다시 processor에 등록
  const queued = await prisma.mealGenerationJob.findMany({
    where: { status: 'queued' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const job of queued) {
    scheduleMealGenerationJob(job.id)
  }

  if (queued.length > 0) {
    logger.info({ count: queued.length }, 'meal-generation-job: re-queued pending jobs on startup')
  }
}
