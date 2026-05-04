import { logger } from '../../lib/logger'

// T-053(M5)에서 실제 알림 발송 로직으로 교체될 훅.
// T-031이 이 인터페이스를 호출하면 M5에서 구현체만 채우면 된다.
export async function onPublishedMealChanged(
  mealPlanId: string,
  _before: unknown,
  _after: unknown,
): Promise<void> {
  // M5 T-053: 공개 식단 변경 → 영향받는 사용자 알림 발송
  logger.info({ mealPlanId }, '[hook] published meal changed — T-053 미구현')
}
