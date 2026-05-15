import { type UserRole } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { matchAllergens, type MatchResult } from './matcher'

export type { MatchResult }

export interface DayConflictResult {
  date: string            // YYYY-MM-DD
  conflictCount: number   // 충돌 mealItem 수
  affectedStudents: number
  matches: MatchResult[]
}

/**
 * 특정 날짜·조직의 published 식단에 대해 알레르기 대조를 실행한다.
 * node-cron 스케줄러(T-052)와 변경 알림 핸들러(T-053)에서 호출.
 */
export async function runAllergenCheck(
  orgId: string,
  date: Date
): Promise<MatchResult[]> {
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayEnd   = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))

  // 당일 published 식단의 모든 MealItem + 알레르기 태그
  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      orgId,
      status: 'published',
      date: { gte: dayStart, lt: dayEnd },
    },
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

  const mealItems = mealPlans.flatMap((plan) =>
    plan.items.map((item) => ({
      id: item.id,
      name: item.name,
      allergens: item.allergens.map((a) => ({
        allergenId: a.allergenId,
        allergenCode: a.allergen.code,
        allergenName: a.allergen.name,
      })),
    }))
  )

  if (mealItems.length === 0) return []

  // 해당 조직의 모든 confirmed UserAllergen 보유 사용자
  const userAllergens = await prisma.userAllergen.findMany({
    where: {
      user: { orgId },
      status: 'confirmed',
    },
    include: {
      user: { select: { id: true, orgId: true, role: true } },
    },
  })

  // userId 기준으로 그룹화
  const userMap = new Map<string, { userId: string; orgId: string; role: string; allergens: { allergenId: string; status: 'confirmed' }[] }>()
  for (const ua of userAllergens) {
    const key = ua.userId
    if (!userMap.has(key)) {
      userMap.set(key, {
        userId: ua.user.id,
        orgId: ua.user.orgId,
        role: ua.user.role,
        allergens: [],
      })
    }
    userMap.get(key)!.allergens.push({ allergenId: ua.allergenId, status: 'confirmed' })
  }

  return matchAllergens(mealItems, [...userMap.values()])
}

/**
 * 특정 날짜 식단에 대해 알레르기 충돌을 판정한다 (T-157).
 * draft·published 모두 대상. 식단이 없으면 null 반환.
 * roles 지정 시 해당 역할의 사용자만 대조 (예: ['student']).
 */
export async function runDayConflictScan(
  orgId: string,
  date: string,  // YYYY-MM-DD
  roles?: UserRole[],
): Promise<DayConflictResult | null> {
  const [y, m, d] = date.split('-').map(Number)
  const from = new Date(Date.UTC(y, m - 1, d))
  const to   = new Date(Date.UTC(y, m - 1, d + 1))

  const mealPlan = await prisma.mealPlan.findFirst({
    where: { orgId, date: { gte: from, lt: to } },
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

  if (!mealPlan) return null

  const userWhere = roles
    ? { orgId, role: { in: roles } }
    : { orgId }

  const userAllergens = await prisma.userAllergen.findMany({
    where: { user: userWhere, status: 'confirmed' },
    include: { user: { select: { id: true, orgId: true, role: true } } },
  })

  const userMap = new Map<string, { userId: string; orgId: string; role: string; allergens: { allergenId: string; status: 'confirmed' }[] }>()
  for (const ua of userAllergens) {
    if (!userMap.has(ua.userId)) {
      userMap.set(ua.userId, {
        userId: ua.user.id,
        orgId: ua.user.orgId,
        role: ua.user.role,
        allergens: [],
      })
    }
    userMap.get(ua.userId)!.allergens.push({ allergenId: ua.allergenId, status: 'confirmed' })
  }

  const mealItems = mealPlan.items.map((item) => ({
    id: item.id,
    name: item.name,
    allergens: item.allergens.map((a) => ({
      allergenId: a.allergenId,
      allergenCode: a.allergen.code,
      allergenName: a.allergen.name,
    })),
  }))

  const matches = matchAllergens(mealItems, [...userMap.values()])
  const conflictItemIds = new Set(matches.flatMap((m) => m.matchedItems.map((mi) => mi.mealItemId)))

  return {
    date,
    conflictCount: conflictItemIds.size,
    affectedStudents: matches.length,
    matches,
  }
}

/**
 * 월간 모든 날짜에 대해 일괄 알레르기 충돌을 판정한다 (T-152).
 * statuses 미지정 시 draft·published 모두 포함.
 * roles 지정 시 해당 역할의 사용자만 대조 (예: ['student']).
 */
export async function runMonthlyConflictScan(
  orgId: string,
  month: string,  // YYYY-MM
  statuses: ('draft' | 'published')[] = ['draft', 'published'],
  roles?: UserRole[],
): Promise<DayConflictResult[]> {
  const [year, mon] = month.split('-').map(Number)
  const from = new Date(Date.UTC(year, mon - 1, 1))
  const to   = new Date(Date.UTC(year, mon, 1))

  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      orgId,
      status: { in: statuses },
      date: { gte: from, lt: to },
    },
    include: {
      items: {
        include: {
          allergens: {
            include: { allergen: { select: { id: true, code: true, name: true } } },
          },
        },
      },
    },
    orderBy: { date: 'asc' },
  })

  if (mealPlans.length === 0) return []

  // 해당 조직의 confirmed 알레르기 보유 사용자 (월 단위 공통 로드)
  const userWhere = roles
    ? { orgId, role: { in: roles } }
    : { orgId }

  const userAllergens = await prisma.userAllergen.findMany({
    where: { user: userWhere, status: 'confirmed' },
    include: { user: { select: { id: true, orgId: true, role: true } } },
  })

  const userMap = new Map<string, { userId: string; orgId: string; role: string; allergens: { allergenId: string; status: 'confirmed' }[] }>()
  for (const ua of userAllergens) {
    if (!userMap.has(ua.userId)) {
      userMap.set(ua.userId, {
        userId: ua.user.id,
        orgId: ua.user.orgId,
        role: ua.user.role,
        allergens: [],
      })
    }
    userMap.get(ua.userId)!.allergens.push({ allergenId: ua.allergenId, status: 'confirmed' })
  }

  const users = [...userMap.values()]

  // 날짜별로 그룹화하여 매칭 실행
  const byDate = new Map<string, typeof mealPlans>()
  for (const plan of mealPlans) {
    const ds = plan.date.toISOString().slice(0, 10)
    if (!byDate.has(ds)) byDate.set(ds, [])
    byDate.get(ds)!.push(plan)
  }

  const results: DayConflictResult[] = []
  for (const [ds, plans] of byDate) {
    const mealItems = plans.flatMap((plan) =>
      plan.items.map((item) => ({
        id: item.id,
        name: item.name,
        allergens: item.allergens.map((a) => ({
          allergenId: a.allergenId,
          allergenCode: a.allergen.code,
          allergenName: a.allergen.name,
        })),
      }))
    )

    const matches = matchAllergens(mealItems, users)
    // 충돌한 mealItem ID 집합 (중복 제거)
    const conflictItemIds = new Set(matches.flatMap((m) => m.matchedItems.map((mi) => mi.mealItemId)))

    results.push({
      date: ds,
      conflictCount: conflictItemIds.size,
      affectedStudents: matches.length,
      matches,
    })
  }

  return results
}
