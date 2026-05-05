import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { withAdvisoryLock, LOCK_KEYS } from '../lib/advisory-lock'
import { withRetry } from '../lib/retry'
import { dispatch } from '../services/notification/dispatcher'

// 30분마다 실행 — 각 window(±30min)와 맞물려 한 번만 발송됨
const CRON_EXPR = process.env.SURVEY_REMINDER_CRON ?? '*/30 * * * *'

// 리마인더 기준 시각 (마감 전 N밀리초)
const WINDOW_MS   = 30 * 60 * 1000   // ±30분 window (cron 주기와 동일)
const REMIND_24H  = 24 * 60 * 60 * 1000
const REMIND_2H   =  2 * 60 * 60 * 1000

/**
 * T-074: 마감 24h / 2h 전 미응답자에게 리마인더 발송.
 * 조건: status='open', 해당 window 내 deadline, 아직 미응답인 사용자
 */
async function runSurveyReminderJob(): Promise<void> {
  await withAdvisoryLock(LOCK_KEYS.SURVEY_REMINDER, async () => {
    const now = Date.now()

    // 24h 또는 2h window에 걸린 open 설문 조회
    const surveys = await prisma.survey.findMany({
      where: {
        status: 'open',
        deadline: {
          gte: new Date(now + REMIND_2H  - WINDOW_MS),
          lte: new Date(now + REMIND_24H + WINDOW_MS),
        },
      },
      include: {
        mealPlan: { select: { orgId: true } },
        responses: { select: { userId: true } },
      },
    })

    if (surveys.length === 0) return

    let totalDispatched = 0

    for (const survey of surveys) {
      const msToDeadline = survey.deadline.getTime() - now

      // 어느 window에 해당하는지 판별
      const is24h = Math.abs(msToDeadline - REMIND_24H) <= WINDOW_MS
      const is2h  = Math.abs(msToDeadline - REMIND_2H)  <= WINDOW_MS
      if (!is24h && !is2h) continue

      const respondedIds = new Set(survey.responses.map((r) => r.userId))
      const orgId = survey.mealPlan.orgId

      // 조직 내 미응답 대상자 (학생·직원·보호자)
      const nonResponders = await prisma.user.findMany({
        where: {
          orgId,
          role: { in: ['student', 'staff', 'guardian'] },
          id: { notIn: [...respondedIds] },
        },
        select: { id: true },
      })
      if (nonResponders.length === 0) continue

      const hoursLeft = Math.round(msToDeadline / (60 * 60 * 1000))
      const title = '⏰ 설문 마감이 다가왔습니다'
      const body  = `설문 마감까지 약 ${hoursLeft}시간 남았습니다. 아직 참여하지 않으셨다면 지금 바로 응답해 주세요.`

      await Promise.allSettled(
        nonResponders.map((u) =>
          withRetry(
            () =>
              dispatch({
                userId: u.id,
                title,
                body,
                type: 'survey_reminder',
                data: { surveyId: survey.id, hoursLeft },
              }),
            { maxRetries: 2, label: `survey_reminder:${u.id}` },
          ),
        ),
      )

      totalDispatched += nonResponders.length
      logger.info(
        { surveyId: survey.id, hoursLeft, count: nonResponders.length },
        '[T-074] 설문 리마인더 발송',
      )
    }

    if (totalDispatched > 0) {
      logger.info({ totalDispatched }, '[T-074] 설문 리마인더 잡 완료')
    }
  })
}

export function registerSurveyReminderJob(): void {
  cron.schedule(CRON_EXPR, () => {
    runSurveyReminderJob().catch((err) =>
      logger.error({ err }, '[T-074] 설문 리마인더 잡 예외'),
    )
  })

  logger.info({ cron: CRON_EXPR }, '[T-074] 설문 리마인더 잡 등록 완료')
}
