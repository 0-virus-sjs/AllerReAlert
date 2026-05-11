import { prisma } from '../../lib/prisma'

export type MealJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface MealJobResult {
  mealPlans: Array<{ id: string; date: string; itemCount: number }>
}

export async function enqueueMealPlanGeneration(
  input: Record<string, unknown>,
  userId: string,
  orgId: string,
) {
  const job = await prisma.mealGenerationJob.create({
    data: {
      orgId,
      requestedBy: userId,
      status: 'queued',
      input,
    },
  })
  return { jobId: job.id, status: job.status as MealJobStatus }
}

export async function getMealGenerationJob(jobId: string, orgId: string) {
  const job = await prisma.mealGenerationJob.findFirst({
    where: { id: jobId, orgId },
    select: {
      id: true,
      status: true,
      totalDays: true,
      completedDays: true,
      result: true,
      error: true,
    },
  })
  return job
}

export async function markJobRunning(jobId: string) {
  const result = await prisma.mealGenerationJob.updateMany({
    where: { id: jobId, status: 'queued' },
    data: { status: 'running' },
  })
  return result.count > 0
}

export async function markJobCompleted(jobId: string, result: MealJobResult) {
  await prisma.mealGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      result,
      completedDays: result.mealPlans.length,
      totalDays: result.mealPlans.length,
    },
  })
}

export async function markJobFailed(jobId: string, error: string) {
  await prisma.mealGenerationJob.update({
    where: { id: jobId },
    data: { status: 'failed', error },
  })
}

export async function updateJobProgress(
  jobId: string,
  completedDays: number,
  totalDays: number,
) {
  await prisma.mealGenerationJob.update({
    where: { id: jobId },
    data: { completedDays, totalDays },
  })
}
