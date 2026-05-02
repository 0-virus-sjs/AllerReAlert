// ⭐ 알레르기 알림 엔진 - 서비스 핵심 로직
// 급식 데이터와 유저의 알레르기 설정을 비교해 위험 급식을 감지하고 알림을 발송

// 주요 책임:
//   1. checkMealForAllergens(meal, userAllergens) → 위험 성분 목록 반환
//   2. processDailyMeals()                        → 오늘 급식 전체를 스캔 (jobs/에서 호출)
//   3. buildAlertPayload(user, meal, matched)     → 알림 메시지 포맷 생성

// TODO: 알레르기 성분 매핑 테이블 (DB or 상수)
// TODO: 학교 API(NEIS) 연동 → 급식 데이터 수신
// TODO: 유저별 알레르기 설정 조회 (prisma)
// TODO: notification 서비스 호출

export {}
