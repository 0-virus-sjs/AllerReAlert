import { logger } from '../../lib/logger'

// T-070(M7)에서 실제 설문 자동 생성 로직으로 교체될 훅.
// T-036 confirm 시 이 인터페이스를 호출하면 M7에서 구현체만 채우면 된다.
export async function onAlternatePlanConfirmed(alternatePlanId: string): Promise<void> {
  // M7 T-070: 대체 식단 확정 → need_check + menu_vote 설문 자동 생성
  logger.info({ alternatePlanId }, '[hook] alternate plan confirmed — T-070 미구현')
}
