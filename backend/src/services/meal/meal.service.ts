import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { applyAutoTagging } from './tagging.service'
import { onPublishedMealChanged } from './change-hook'
import { AppError } from '../../middlewares/errorHandler'
import type { MealItemCategory } from '@prisma/client'

export interface MealItemInput {
  category: MealItemCategory
  name: string
  calories?: number
  nutrients?: Record<string, unknown>
}

export interface CreateMealInput {
  orgId: string
  createdBy: string
  date: string        // YYYY-MM-DD
  items: MealItemInput[]
}

// MealPlan + MealItems 원자 저장 후 T-033 자동 태깅 적용
export async function createMealPlan(input: CreateMealInput) {
  // YYYY-MM-DD → UTC Date (DB.Date 컬럼은 시간대 무관하게 날짜만 저장)
  const [y, m, d] = input.date.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))

  return prisma.$transaction(async (tx) => {
    const plan = await tx.mealPlan.create({
      data: {
        orgId: input.orgId,
        date,
        createdBy: input.createdBy,
        // status 기본값 = draft (스키마 default)
      },
    })

    const createdItems = await Promise.all(
      input.items.map((item) =>
        tx.mealItem.create({
          data: {
            mealPlanId: plan.id,
            category: item.category,
            name: item.name,
            calories: item.calories,
            nutrients: item.nutrients as Prisma.InputJsonValue | undefined,
          },
        }),
      ),
    )

    // T-033: 각 메뉴명에 대해 알레르기 자동 태깅 (트랜잭션 내)
    await Promise.all(
      createdItems.map((item) => applyAutoTagging(item.id, item.name, tx)),
    )

    return tx.mealPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: {
        items: {
          include: {
            allergens: {
              include: { allergen: { select: { id: true, code: true, name: true } } },
            },
          },
        },
      },
    })
  })
}

// 월간 일괄 생성 — 각 날짜별로 독립 트랜잭션
export async function createBulkMealPlans(inputs: CreateMealInput[]) {
  return Promise.all(inputs.map(createMealPlan))
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateMealInput {
  date?: string           // YYYY-MM-DD
  items?: MealItemInput[] // 전달 시 전체 교체 (기존 삭제 후 재생성)
}

const MEAL_PLAN_INCLUDE = {
  items: {
    include: {
      allergens: {
        include: { allergen: { select: { id: true, code: true, name: true } } },
      },
    },
  },
} as const

export async function updateMealPlan(
  id: string,
  userId: string,
  orgId: string,
  input: UpdateMealInput,
) {
  const existing = await prisma.mealPlan.findFirst({
    where: { id, orgId },
    include: MEAL_PLAN_INCLUDE,
  })
  if (!existing) throw new AppError(404, 'NOT_FOUND', '식단을 찾을 수 없습니다')

  const wasPublished = existing.status === 'published'

  const updated = await prisma.$transaction(async (tx) => {
    if (input.items) {
      // 기존 MealItems 전체 삭제 (MealItemAllergen cascade)
      await tx.mealItem.deleteMany({ where: { mealPlanId: id } })

      const newItems = await Promise.all(
        input.items.map((item) =>
          tx.mealItem.create({
            data: {
              mealPlanId: id,
              category: item.category,
              name: item.name,
              calories: item.calories,
              nutrients: item.nutrients as Prisma.InputJsonValue | undefined,
            },
          }),
        ),
      )
      // T-033 자동 태깅 재적용
      await Promise.all(newItems.map((item) => applyAutoTagging(item.id, item.name, tx)))
    }

    const dateUpdate = input.date
      ? (() => {
          const [y, m, d] = input.date!.split('-').map(Number)
          return new Date(Date.UTC(y, m - 1, d))
        })()
      : undefined

    return tx.mealPlan.update({
      where: { id },
      data: { ...(dateUpdate && { date: dateUpdate }) },
      include: MEAL_PLAN_INCLUDE,
    })
  })

  if (wasPublished) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'meal_plan.update',
        targetType: 'meal_plan',
        targetId: id,
        before: existing as unknown as Prisma.InputJsonValue,
        after: updated as unknown as Prisma.InputJsonValue,
      },
    })
    // T-053 트리거: 공개 식단 변경 알림 (M5에서 구현)
    await onPublishedMealChanged(id, existing, updated)
  }

  return updated
}

export async function deleteMealPlan(id: string, userId: string, orgId: string) {
  const existing = await prisma.mealPlan.findFirst({
    where: { id, orgId },
  })
  if (!existing) throw new AppError(404, 'NOT_FOUND', '식단을 찾을 수 없습니다')

  if (existing.status === 'published') {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'meal_plan.delete',
        targetType: 'meal_plan',
        targetId: id,
        before: existing as unknown as Prisma.InputJsonValue,
      },
    })
  }

  // MealItem → MealItemAllergen 은 Prisma cascade 로 자동 삭제
  await prisma.mealPlan.delete({ where: { id } })
}
