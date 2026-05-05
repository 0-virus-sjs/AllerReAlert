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
  // mealPlan이 같은 org 소속인지 확인
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
