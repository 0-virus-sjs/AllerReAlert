import type { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middlewares/errorHandler'

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

  return prisma.survey.create({
    data: {
      mealPlanId: input.mealPlanId,
      type: input.type,
      options: input.options,
      deadline: new Date(input.deadline),
      createdBy,
    },
    include: SURVEY_BASE_INCLUDE,
  })
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

  return prisma.surveyResponse.upsert({
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
}
