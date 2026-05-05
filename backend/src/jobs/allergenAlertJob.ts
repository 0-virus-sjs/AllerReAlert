import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { withAdvisoryLock, LOCK_KEYS } from '../lib/advisory-lock'
import { withRetry } from '../lib/retry'
import { runAllergenCheck } from '../services/allergy-engine/engine'
import { dispatch } from '../services/notification/dispatcher'
import { alertQueue } from '../services/notification/job-queue'

// 기본 실행 시각: 매일 07:00 (환경 변수로 덮어쓰기 가능)
const CRON_EXPR = process.env.ALERT_CRON ?? '0 7 * * *'

/**
 * 단일 조직·날짜 알레르기 알림 처리 (큐 핸들러)
 */
async function processOrgAlert(orgId: string, date: Date): Promise<void> {
  const matches = await runAllergenCheck(orgId, date)
  if (matches.length === 0) return

  await Promise.allSettled(
    matches.map((match) =>
      withRetry(
        () => dispatch({
          userId: match.userId,
          title: '⚠️ 오늘 급식 알레르기 주의',
          body: `오늘 급식에 알레르기 유발 메뉴가 포함되어 있습니다. 식단을 확인하세요.`,
          type: 'allergen_alert',
          data: { matchedItems: match.matchedItems.map((i) => i.mealItemName) },
        }),
        { maxRetries: 3, label: `allergen_alert:${match.userId}` }
      )
    )
  )

  logger.info({ orgId, date, count: matches.length }, '[T-052] 알레르기 알림 발송 완료')
}

/**
 * 전체 조직 일괄 처리 (advisory lock 보호)
 */
async function runDailyAlertJob(): Promise<void> {
  await withAdvisoryLock(LOCK_KEYS.DAILY_ALERT, async () => {
    const today = new Date()
    logger.info({ date: today.toISOString() }, '[T-052] 일일 알림 잡 시작')

    // published 식단이 있는 조직만 조회
    const orgs = await prisma.mealPlan.findMany({
      where: {
        status: 'published',
        date: {
          gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
          lt:  new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1)),
        },
      },
      select: { orgId: true },
      distinct: ['orgId'],
    })

    if (orgs.length === 0) {
      logger.info('[T-052] 오늘 공개된 식단 없음')
      return
    }

    // 큐에 조직별 잡 등록
    await Promise.allSettled(
      orgs.map(({ orgId }) => alertQueue.enqueue({ orgId, date: today }))
    )

    logger.info({ orgCount: orgs.length }, '[T-052] 일일 알림 잡 완료')
  })
}

export function registerAllergenAlertJob(): void {
  // 큐 핸들러 등록
  alertQueue.onProcess(({ orgId, date }) => processOrgAlert(orgId, date))

  cron.schedule(CRON_EXPR, () => {
    runDailyAlertJob().catch((err) =>
      logger.error({ err }, '[T-052] 일일 알림 잡 예외')
    )
  })

  logger.info({ cron: CRON_EXPR }, '[T-052] 일일 알레르기 알림 잡 등록 완료')
}
