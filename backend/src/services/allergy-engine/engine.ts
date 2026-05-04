import { prisma } from '../../lib/prisma'
import { matchAllergens, type MatchResult } from './matcher'

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
