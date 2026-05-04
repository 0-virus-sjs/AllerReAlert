import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { applyAutoTagging } from './tagging.service'
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
