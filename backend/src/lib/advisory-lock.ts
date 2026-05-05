import { prisma } from './prisma'
import { logger } from './logger'

// 잡별 고정 락 키 (Postgres advisory lock은 bigint 키 사용)
export const LOCK_KEYS = {
  DAILY_ALERT:      1052n,  // T-052 스케줄러 전용
  SURVEY_REMINDER:  1074n,  // T-074 설문 리마인더 전용
} as const

/**
 * Postgres advisory lock을 획득한 상태에서 fn을 실행하고 자동 해제.
 * 이미 락이 잡혀 있으면 실행을 건너뛴다 (다중 인스턴스 안전).
 */
export async function withAdvisoryLock(
  key: bigint,
  fn: () => Promise<void>
): Promise<void> {
  const result = await prisma.$queryRaw<[{ acquired: boolean }]>`
    SELECT pg_try_advisory_lock(${key}) AS acquired
  `
  const acquired = result[0]?.acquired

  if (!acquired) {
    logger.info({ lockKey: key.toString() }, '[advisory-lock] 이미 다른 인스턴스가 실행 중 — 건너뜀')
    return
  }

  try {
    await fn()
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${key})`
    logger.debug({ lockKey: key.toString() }, '[advisory-lock] 락 해제')
  }
}
