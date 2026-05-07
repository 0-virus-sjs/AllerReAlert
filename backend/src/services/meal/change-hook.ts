import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { dispatchWithGuardians } from '../notification/dispatcher'

// meal.service.ts의 MEAL_PLAN_INCLUDE와 동일한 형태
interface AllergenRef { id: string; code: number; name: string }
interface MealItemAllergenEntry { allergenId: string; allergen: AllergenRef }
interface MealItemSnapshot { id: string; name: string; allergens: MealItemAllergenEntry[] }
interface MealPlanSnapshot { orgId: string; items: MealItemSnapshot[] }

function extractAllergenIds(plan: MealPlanSnapshot): Set<string> {
  const ids = new Set<string>()
  for (const item of plan.items) {
    for (const a of item.allergens) ids.add(a.allergenId)
  }
  return ids
}

/**
 * T-053: 공개 식단 수정 시 실시간 알림 핸들러 (PRD §7.2)
 *
 * before → after diff로 새로 추가된 알레르기만 추출.
 * 해당 알레르기가 confirmed 상태인 사용자에게 즉시 menu_change 알림 발송.
 */
export async function onPublishedMealChanged(
  mealPlanId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  try {
    const beforePlan = before as MealPlanSnapshot
    const afterPlan  = after  as MealPlanSnapshot

    const beforeIds = extractAllergenIds(beforePlan)
    const afterIds  = extractAllergenIds(afterPlan)

    // 새로 추가된 알레르기만 (제거된 것은 위험 감소이므로 알림 불필요)
    const newAllergenIds = [...afterIds].filter((id) => !beforeIds.has(id))
    if (newAllergenIds.length === 0) {
      logger.info({ mealPlanId }, '[T-053] 알레르기 변경 없음 — 알림 생략')
      return
    }

    logger.info({ mealPlanId, newAllergenIds }, '[T-053] 새 알레르기 감지 — 영향 사용자 조회')

    // 새 알레르기와 교집합이 있는 confirmed 사용자 조회
    const affectedUsers = await prisma.userAllergen.findMany({
      where: {
        allergenId: { in: newAllergenIds },
        status: 'confirmed',
        user: { orgId: afterPlan.orgId },
      },
      select: {
        userId: true,
        allergen: { select: { name: true } },
      },
    })

    if (affectedUsers.length === 0) {
      logger.info({ mealPlanId }, '[T-053] 영향 사용자 없음')
      return
    }

    // 유저별 그룹화 후 알림 발송
    const userAllergenMap = new Map<string, string[]>()
    for (const ua of affectedUsers) {
      const names = userAllergenMap.get(ua.userId) ?? []
      names.push(ua.allergen.name)
      userAllergenMap.set(ua.userId, names)
    }

    await Promise.allSettled(
      [...userAllergenMap.entries()].map(([userId, names]) =>
        dispatchWithGuardians({
          userId,
          title: '⚠️ 급식 메뉴 변경 알림',
          body: `식단이 수정되어 알레르기(${names.join(', ')}) 유발 메뉴가 추가됐습니다. 식단을 확인하세요.`,
          type: 'menu_change',
          data: { mealPlanId },
        })
      )
    )

    logger.info({ mealPlanId, count: userAllergenMap.size }, '[T-053] 변경 알림 발송 완료')
  } catch (err) {
    logger.error({ err, mealPlanId }, '[T-053] 변경 알림 처리 중 오류')
  }
}
