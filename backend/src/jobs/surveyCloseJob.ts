import cron from 'node-cron'
import { logger } from '../lib/logger'
import { autoCloseDueSurveys } from '../services/survey/survey.service'

export function registerSurveyCloseJob(): void {
  // 매 5분마다 마감 시각 도래 설문 자동 close (FR-SVY-003)
  cron.schedule('*/5 * * * *', () => {
    autoCloseDueSurveys().catch((err) =>
      logger.error({ err }, '[T-073] 설문 자동 마감 잡 예외')
    )
  })
  logger.info('[T-073] 설문 자동 마감 잡 등록 완료 (매 5분)')
}
