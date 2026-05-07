import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

// T-106: 매일 새벽 3시 — 1년 초과 감사 로그 삭제 (NFR-SEC-005)
export function registerAuditLogPruneJob(): void {
  cron.schedule('0 3 * * *', async () => {
    try {
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 1)
      const { count } = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      })
      if (count > 0) logger.info({ count }, '[T-106] 감사 로그 정리 완료')
    } catch (err) {
      logger.error({ err }, '[T-106] 감사 로그 정리 실패')
    }
  })
  logger.info('[T-106] 감사 로그 보관 정리 잡 등록 완료 (매일 03:00, 1년 초과 삭제)')
}
