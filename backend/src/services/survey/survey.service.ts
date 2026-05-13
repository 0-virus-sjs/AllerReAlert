import type { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { AppError } from '../../middlewares/errorHandler'
import { dispatch } from '../notification/dispatcher'
import { withRetry } from '../../lib/retry'
import { invalidateOrgAnalyticsCache } from '../../lib/cache'

const SURVEY_BASE_INCLUDE = {
  mealPlan: { select: { id: true, date: true, orgId: true } },
  createdByUser: { select: { id: true, name: true } },
} as const

// 응답 데이터: 영양사/관리자 = 전체, 그 외 = 본인 응답만
function responsesInclude(userId: string, role: UserRole) {
  const isStaff = role === 'nutritionist' || role === 'admin'
  return isStaff
    ? { responses: { select: { id: true, userId: true, response: true, votedItemId: true, createdAt: true } } }
    : { responses: { where: { userId }, select: { id: true, response: true, votedItemId: true, createdAt: true } } }
}

export async function listSurveys(
  orgId: string,
  userId: string,
  role: UserRole,
  mealPlanId?: string,
) {
  return prisma.survey.findMany({
    where: {
      mealPlan: { orgId },
      ...(mealPlanId ? { mealPlanId } : {}),
    },
    include: { ...SURVEY_BASE_INCLUDE, ...responsesInclude(userId, role) },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSurveyById(id: string, orgId: string, userId: string, role: UserRole) {
  const survey = await prisma.survey.findFirst({
    where: { id, mealPlan: { orgId } },
    include: { ...SURVEY_BASE_INCLUDE, ...responsesInclude(userId, role) },
  })
  if (!survey) throw new AppError(404, 'NOT_FOUND', '설문을 찾을 수 없습니다')
  return survey
}

export interface CreateSurveyInput {
  mealPlanId: string
  type: 'need_check' | 'menu_vote'
  options: Prisma.InputJsonValue
  deadline: string  // ISO string
}

export async function createSurvey(input: CreateSurveyInput, createdBy: string, orgId: string) {
  const plan = await prisma.mealPlan.findFirst({ where: { id: input.mealPlanId, orgId } })
  if (!plan) throw new AppError(404, 'NOT_FOUND', '식단을 찾을 수 없습니다')

  const survey = await prisma.survey.create({
    data: {
      mealPlanId: input.mealPlanId,
      type: input.type,
      options: input.options,
      deadline: new Date(input.deadline),
      createdBy,
    },
    include: SURVEY_BASE_INCLUDE,
  })

  // T-074: 생성 즉시 초대 알림 발송 (응답 블로킹 없이 비동기)
  sendSurveyInvites(survey.id, orgId, input.type).catch((err) =>
    logger.error({ err, surveyId: survey.id }, '[T-074] 설문 초대 알림 발송 실패'),
  )

  return survey
}

// ── T-074: 설문 초대 알림 ─────────────────────────────────

async function sendSurveyInvites(surveyId: string, orgId: string, type: string) {
  const users = await prisma.user.findMany({
    where: { orgId, role: { in: ['student', 'staff', 'guardian'] } },
    select: { id: true },
  })
  if (users.length === 0) return

  const title = '📋 새로운 설문이 등록됐습니다'
  const body =
    type === 'need_check'
      ? '알레르기 대체 식단 필요 여부를 확인해 주세요.'
      : '선호하는 대체 식단 메뉴를 선택해 주세요.'

  await Promise.allSettled(
    users.map((u) =>
      withRetry(
        () => dispatch({ userId: u.id, title, body, type: 'survey_invite', data: { surveyId } }),
        { maxRetries: 2, label: `survey_invite:${u.id}` },
      ),
    ),
  )

  logger.info({ surveyId, orgId, count: users.length }, '[T-074] 설문 초대 알림 발송 완료')
}

// ── T-072: POST /surveys/:id/responses ───────────────────

export interface SubmitResponseInput {
  response: Prisma.InputJsonValue
  votedItemId?: string
}

export async function submitSurveyResponse(
  surveyId: string,
  userId: string,
  orgId: string,
  input: SubmitResponseInput,
) {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, mealPlan: { orgId } },
    select: { id: true, status: true, deadline: true },
  })
  if (!survey) throw new AppError(404, 'NOT_FOUND', '설문을 찾을 수 없습니다')

  // PRD §11.4: 마감 후 변경 불가
  if (survey.status === 'closed' || survey.deadline < new Date()) {
    throw new AppError(409, 'SURVEY_CLOSED', '마감된 설문에는 응답할 수 없습니다')
  }

  const saved = await prisma.surveyResponse.upsert({
    where: { surveyId_userId: { surveyId, userId } },
    update: {
      response: input.response,
      votedItemId: input.votedItemId ?? null,
      updatedAt: new Date(),
    },
    create: {
      surveyId,
      userId,
      response: input.response,
      votedItemId: input.votedItemId,
    },
    select: { id: true, surveyId: true, userId: true, response: true, votedItemId: true, updatedAt: true },
  })

  // 응답 수 변화는 daily-demand/report 분포에 영향
  invalidateOrgAnalyticsCache(orgId)
  return saved
}

// ── T-073: 설문 마감 + 결과 집계 ─────────────────────────

export interface SurveyResult {
  totalResponses: number
  choices: Record<string, number>   // choiceKey → 득표 수
}

function aggregateResponses(
  responses: Array<{ response: Prisma.JsonValue; votedItemId: string | null }>
): SurveyResult {
  const choices: Record<string, number> = {}
  for (const r of responses) {
    const key = r.votedItemId ?? ((r.response as Record<string, unknown>)?.choice as string) ?? 'unknown'
    choices[key] = (choices[key] ?? 0) + 1
  }
  return { totalResponses: responses.length, choices }
}

export async function closeSurvey(surveyId: string, orgId: string): Promise<SurveyResult> {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, mealPlan: { orgId } },
    include: { responses: { select: { response: true, votedItemId: true } } },
  })
  if (!survey) throw new AppError(404, 'NOT_FOUND', '설문을 찾을 수 없습니다')
  if (survey.status === 'closed') throw new AppError(409, 'ALREADY_CLOSED', '이미 마감된 설문입니다')

  await prisma.survey.update({ where: { id: surveyId }, data: { status: 'closed' } })

  const result = aggregateResponses(survey.responses)
  // closed survey는 월간 리포트(surveyParticipationRate)에 반영됨
  invalidateOrgAnalyticsCache(orgId)
  logger.info({ surveyId, result }, '[T-073] 설문 마감 완료')
  return result
}

/** node-cron에서 주기적으로 호출 — 마감 시각 도래 설문 일괄 close */
export async function autoCloseDueSurveys(): Promise<void> {
  const due = await prisma.survey.findMany({
    where: { status: 'open', deadline: { lte: new Date() } },
    include: {
      responses: { select: { response: true, votedItemId: true } },
      mealPlan:  { select: { orgId: true } },
    },
  })
  if (due.length === 0) return

  await Promise.allSettled(
    due.map(async (survey) => {
      await prisma.survey.update({ where: { id: survey.id }, data: { status: 'closed' } })
      const result = aggregateResponses(survey.responses)
      logger.info({ surveyId: survey.id, result }, '[T-073] 자동 마감')
    })
  )

  // 영향 받은 org들 일괄 무효화
  const orgIds = new Set(due.map((s) => s.mealPlan.orgId))
  for (const orgId of orgIds) invalidateOrgAnalyticsCache(orgId)
}
