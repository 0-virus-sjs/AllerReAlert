import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { cache, CacheKey, invalidateMealCache, invalidateOrgAnalyticsCache } from '../../lib/cache'
import { applyAutoTaggingBatch } from './tagging.service'
import { onPublishedMealChanged } from './change-hook'
import { AppError } from '../../middlewares/errorHandler'
import type { MealItem, MealItemCategory } from '@prisma/client'

export interface MealItemInput {
  category: MealItemCategory
  name: string
  ingredients?: string
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

  const plan = await prisma.$transaction(async (tx) => {
    // 같은 날짜의 기존 draft가 있으면 items만 교체, plan ID 재사용
    const existing = await tx.mealPlan.findFirst({
      where: { orgId: input.orgId, date, status: 'draft' },
      select: { id: true },
    })

    let planId: string
    if (existing) {
      await tx.mealItem.deleteMany({ where: { mealPlanId: existing.id } })
      planId = existing.id
    } else {
      const created = await tx.mealPlan.create({
        data: {
          orgId: input.orgId,
          date,
          createdBy: input.createdBy,
        },
      })
      planId = created.id
    }

    const createdItems: MealItem[] = []
    for (const item of input.items) {
      const created = await tx.mealItem.create({
        data: {
          mealPlanId: planId,
          category: item.category,
          name: item.name,
          ingredients: item.ingredients,
          calories: item.calories,
          nutrients: item.nutrients as Prisma.InputJsonValue | undefined,
        },
      })
      createdItems.push(created)
    }

    // T-033/T-133: 메뉴명 OR 식재료 키워드 합집합으로 알레르기 자동 태깅 (트랜잭션 내)
    await applyAutoTaggingBatch(
      input.items.map((item, i) => ({
        mealItemId: createdItems[i].id,
        mealItemName: item.name,
        ingredients: item.ingredients,
      })),
      tx,
    )

    return tx.mealPlan.findUniqueOrThrow({
      where: { id: planId },
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

  // 단건 생성 후에도 즉시 GET /meals·analytics 캐시에 반영되도록 무효화
  invalidateMealCache(input.orgId)
  invalidateOrgAnalyticsCache(input.orgId)
  return plan
}

// 월간 일괄 생성 — 각 날짜별로 독립 트랜잭션
export async function createBulkMealPlans(inputs: CreateMealInput[]) {
  const plans = await Promise.all(inputs.map(createMealPlan))
  // createMealPlan 안에서 무효화하므로 별도 호출 불필요
  return plans
}

// ── T-034 읽기 ────────────────────────────────────────

const ALLERGEN_INCLUDE = {
  include: { allergen: { select: { id: true, code: true, name: true } } },
} as const

const ALTERNATE_PLANS_INCLUDE = {
  include: {
    targetAllergen: { select: { id: true, code: true, name: true } },
    items: {
      include: {
        replacesItem: { select: { id: true, name: true, category: true } },
      },
    },
  },
} as const

const MEAL_LIST_INCLUDE = {
  items: {
    include: { allergens: ALLERGEN_INCLUDE },
  },
  alternatePlans: ALTERNATE_PLANS_INCLUDE,
} as const

// GET /meals?orgId=&month=YYYY-MM  (월간 목록, 5분 캐시)
export async function getMealPlans(orgId: string, month: string) {
  const cacheKey = CacheKey.mealList(orgId, month)
  const cached = cache.get(cacheKey)
  if (cached !== undefined) return cached

  const [year, mon] = month.split('-').map(Number)
  const from = new Date(Date.UTC(year, mon - 1, 1))
  const to   = new Date(Date.UTC(year, mon, 1))   // 다음 달 1일 (exclusive)

  const plans = await prisma.mealPlan.findMany({
    where: { orgId, date: { gte: from, lt: to } },
    orderBy: { date: 'asc' },
    include: MEAL_LIST_INCLUDE,
  })

  cache.set(cacheKey, plans)
  return plans
}

// GET /meals/:id  (단건, 5분 캐시)
export async function getMealPlanById(id: string, orgId: string) {
  const cacheKey = CacheKey.mealDetail(id)
  const cached = cache.get(cacheKey)
  if (cached !== undefined) return cached

  const plan = await prisma.mealPlan.findFirst({
    where: { id, orgId },
    include: MEAL_LIST_INCLUDE,
  })
  if (!plan) throw new AppError(404, 'NOT_FOUND', '식단을 찾을 수 없습니다')

  cache.set(cacheKey, plan)
  return plan
}

// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateMealInput {
  date?: string           // YYYY-MM-DD
  items?: MealItemInput[] // 전달 시 전체 교체 (기존 삭제 후 재생성)
}

const MEAL_PLAN_INCLUDE = {
  items: {
    include: { allergens: ALLERGEN_INCLUDE },
  },
  alternatePlans: ALTERNATE_PLANS_INCLUDE,
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

      const newItems: MealItem[] = []
      for (const item of input.items) {
        const created = await tx.mealItem.create({
          data: {
            mealPlanId: id,
            category: item.category,
            name: item.name,
            ingredients: item.ingredients,
            calories: item.calories,
            nutrients: item.nutrients as Prisma.InputJsonValue | undefined,
          },
        })
        newItems.push(created)
      }
      // T-033/T-133 자동 태깅 재적용 — 메뉴명 OR 식재료 합집합
      await applyAutoTaggingBatch(
        input.items!.map((item, i) => ({
          mealItemId: newItems[i].id,
          mealItemName: item.name,
          ingredients: item.ingredients,
        })),
        tx,
      )
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

  // 캐시 무효화
  cache.del(CacheKey.mealDetail(id))
  invalidateMealCache(orgId)
  invalidateOrgAnalyticsCache(orgId)

  return updated
}

// ── T-032 ─────────────────────────────────────────────

export async function publishMealPlan(
  id: string,
  orgId: string,
  scheduledAt?: string,
) {
  const existing = await prisma.mealPlan.findFirst({ where: { id, orgId } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', '식단을 찾을 수 없습니다')
  if (existing.status === 'published') {
    throw new AppError(409, 'ALREADY_PUBLISHED', '이미 공개된 식단입니다')
  }

  if (scheduledAt) {
    const schedDate = new Date(scheduledAt)
    if (isNaN(schedDate.getTime())) {
      throw new AppError(400, 'INVALID_DATE', '올바른 날짜 형식이 아닙니다')
    }
    if (schedDate <= new Date()) {
      throw new AppError(400, 'INVALID_SCHEDULED_AT', '예약 시간은 현재 시간 이후여야 합니다')
    }
    return prisma.mealPlan.update({
      where: { id },
      data: { scheduledAt: schedDate },
    })
  }

  // 즉시 공개
  const published = await prisma.mealPlan.update({
    where: { id },
    data: { status: 'published', publishedAt: new Date(), scheduledAt: null },
  })
  cache.del(CacheKey.mealDetail(id))
  invalidateMealCache(orgId)
  invalidateOrgAnalyticsCache(orgId)
  return published
}

// node-cron 폴링 잡에서 호출 — 예약 시각 도래한 draft 식단을 일괄 공개
export async function publishScheduledMealPlans(): Promise<number> {
  const now = new Date()
  const due = await prisma.mealPlan.findMany({
    where: { status: 'draft', scheduledAt: { not: null, lte: now } },
    select: { id: true },
  })
  if (due.length === 0) return 0

  await prisma.mealPlan.updateMany({
    where: { id: { in: due.map((p) => p.id) } },
    data: { status: 'published', publishedAt: now, scheduledAt: null },
  })

  // 공개된 각 plan의 캐시 무효화 (orgId는 plan별로 다를 수 있어 key 패턴으로 전체 삭제)
  due.forEach((p) => cache.del(CacheKey.mealDetail(p.id)))
  cache.flushAll()  // 소량 트래픽 단계: 전체 flush (Phase 2에서 Redis로 교체 시 세분화)

  return due.length
}

// ── T-151: 영양사 달력 상태 메타데이터 ───────────────────────────────────────

export type CalendarDayStatus =
  | 'no-meal'
  | 'draft'
  | 'published'
  | 'needs-review'  // draft + 충돌
  | 'needs-alt'     // published + 충돌 + 대체없음
  | 'has-alt'       // published + 충돌 + 대체확정

export interface CalendarStatusEntry {
  date: string
  status: CalendarDayStatus
  hasAlternate: boolean
  conflictCount: number
  affectedStudents: number
}

export async function getMealCalendarStatus(
  orgId: string,
  month: string,
): Promise<CalendarStatusEntry[]> {
  const [year, mon] = month.split('-').map(Number)
  const from = new Date(Date.UTC(year, mon - 1, 1))
  const to   = new Date(Date.UTC(year, mon, 1))

  // 월간 식단 + 대체식단 확정 여부
  const plans = await prisma.mealPlan.findMany({
    where: { orgId, date: { gte: from, lt: to } },
    select: {
      date: true,
      status: true,
      alternatePlans: { select: { status: true } },
      items: {
        select: {
          id: true,
          allergens: { select: { allergenId: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  })

  if (plans.length === 0) return []

  // 충돌 스캔 (draft + published 포함)
  const { runMonthlyConflictScan } = await import('../allergy-engine/engine')
  const conflictResults = await runMonthlyConflictScan(orgId, month)
  const conflictByDate = new Map(conflictResults.map((r) => [r.date, r]))

  return plans.map((plan) => {
    const ds = plan.date.toISOString().slice(0, 10)
    const conflict = conflictByDate.get(ds)
    const conflictCount    = conflict?.conflictCount    ?? 0
    const affectedStudents = conflict?.affectedStudents ?? 0
    const hasConfirmedAlt  = plan.alternatePlans.some((ap) => ap.status === 'confirmed')

    let status: CalendarDayStatus
    if (plan.status === 'published') {
      if (conflictCount === 0) status = 'published'
      else if (hasConfirmedAlt) status = 'has-alt'
      else status = 'needs-alt'
    } else {
      // draft
      status = conflictCount > 0 ? 'needs-review' : 'draft'
    }

    return { date: ds, status, hasAlternate: hasConfirmedAlt, conflictCount, affectedStudents }
  })
}

// ─────────────────────────────────────────────────────────────────────────────

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

  cache.del(CacheKey.mealDetail(id))
  invalidateMealCache(orgId)
  invalidateOrgAnalyticsCache(orgId)
}
