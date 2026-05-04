import cron from 'node-cron'
import { publishScheduledMealPlans } from '../services/meal/meal.service'
import { logger } from '../lib/logger'

// 매 분 실행: scheduled_at <= now 인 draft 식단을 일괄 공개
// setTimeout 미사용 — 재기동 후에도 DB 기반 폴링으로 안전하게 처리
export function registerScheduledPublishJob(): void {
  cron.schedule('* * * * *', () => {
    publishScheduledMealPlans()
      .then((count) => {
        if (count > 0) logger.info({ count }, '예약 식단 공개 완료')
      })
      .catch((err) => logger.error({ err }, '예약 식단 공개 잡 오류'))
  })
  logger.info('예약 식단 공개 잡 등록 완료 (매 분)')
}
