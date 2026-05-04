import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { cache, CacheKey, invalidateMealCache } from '../../lib/cache'
import { AppError } from '../../middlewares/errorHandler'
import { onAlternatePlanConfirmed } from './survey-hook'

export interface AlternateItemInput {
  replacesItemId: string
  name: string
  calories?: number
  nutrients?: Record<string, unknown>
}

export interface CreateAlternateInput {
  mealPlanId: string
  orgId: string          // 소속 검증용
  targetAllergenId: string
  items: AlternateItemInput[]
}

const ALTERNATE_INCLUDE = {
  targetAllergen: { select: { id: true, code: true, name: true } },
  items: {
    include: {
      replacesItem: { select: { id: true, name: true, category: true } },
    },
  },
} as const

export async function createAlternatePlan(input: CreateAlternateInput) {
  // mealPlan이 해당 org 소속인지 확인
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { id: input.mealPlanId, orgId: input.orgId },
  })
  if (!mealPlan) throw new AppError(404, 'NOT_FOUND', '식단을 찾을 수 없습니다')

  // 대상 알레르기 존재 확인
  const allergen = await prisma.allergen.findUnique({
    where: { id: input.targetAllergenId },
  })
  if (!allergen) throw new AppError(404, 'NOT_FOUND', '알레르기 정보를 찾을 수 없습니다')

  return prisma.$transaction(async (tx) => {
    const plan = await tx.alternateMealPlan.create({
      data: {
        mealPlanId: input.mealPlanId,
        targetAllergenId: input.targetAllergenId,
        // status 기본값 = draft (스키마 default)
      },
    })

    await tx.alternateMealItem.createMany({
      data: input.items.map((item) => ({
        altPlanId: plan.id,
        replacesItemId: item.replacesItemId,
        name: item.name,
        calories: item.calories,
        nutrients: item.nutrients as Prisma.InputJsonValue | undefined,
      })),
    })

    return tx.alternateMealPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: ALTERNATE_INCLUDE,
    })
  })
}

export async function confirmAlternatePlan(id: string, userId: string, orgId: string) {
  const plan = await prisma.alternateMealPlan.findFirst({
    where: { id },
    include: { mealPlan: { select: { orgId: true } } },
  })
  if (!plan) throw new AppError(404, 'NOT_FOUND', '대체 식단을 찾을 수 없습니다')
  if (plan.mealPlan.orgId !== orgId) {
    throw new AppError(403, 'FORBIDDEN', '접근 권한이 없습니다')
  }
  if (plan.status === 'confirmed') {
    throw new AppError(409, 'ALREADY_CONFIRMED', '이미 확정된 대체 식단입니다')
  }

  const confirmed = await prisma.alternateMealPlan.update({
    where: { id },
    data: { status: 'confirmed', confirmedBy: userId },
    include: ALTERNATE_INCLUDE,
  })

  // GET /meals 캐시 무효화 (확정 상태가 반영되도록)
  invalidateMealCache(plan.mealPlan.orgId)
  cache.del(CacheKey.mealDetail(plan.mealPlanId))

  // T-070 트리거: 설문 자동 생성 (M7에서 구현)
  await onAlternatePlanConfirmed(id)

  return confirmed
}
