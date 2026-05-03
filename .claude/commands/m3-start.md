M3 시작. M2 결과물(인증·RBAC) 위에 진행한다.

M3 10개 Task(T-030~T-039) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-030: MealPlan + MealItem 동시 저장은 Prisma `$transaction` 필수.
- T-031: 공개된 식단(status=published) 수정 시 `audit_logs` 기록 + T-053 알림 핸들러 트리거 준비.
- T-032: 예약 공개(`scheduled_at`)는 node-cron 기반 폴링 — `setTimeout` 사용 금지(재기동 안전성).
- T-033: 식약처 19종 키워드 사전 기반 자동 태깅, `is_auto_tagged=true`로 저장.
- T-034: In-memory 캐시(node-cache) 5분 적용.
- T-035: T-041(M4)에 의존 — M4 T-041 완료 후 연결.

완료 기준:
- 식단 생성 → 자동 알레르기 태깅 → prisma studio에서 meal_item_allergens 레코드 확인
- 식단 공개(draft → published) 정상 동작
- 월간 식단 목록 API 응답에 MealItem + 알레르기 태그 포함
- SCR-010 식단 작성 화면에서 자동 태깅 결과 표시 확인
