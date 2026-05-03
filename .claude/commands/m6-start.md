M6 시작. M3 식단 관리 + M5 알림 엔진 위에 진행한다.

M6 9개 Task(T-059~T-067) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-059: NEIS API는 org_type=school인 경우에만 호출. 응답 캐싱 1일(In-memory). API 키는 Railway Variables.
- T-060: AI 모델은 Anthropic Claude API 우선(claude-sonnet-4-6). OpenAI는 폴백 어댑터만 구현. 토큰 사용량 로깅 포함.
- T-062: 대체 식단 후보에 제외 알레르기 식재료 누설 여부 후처리 검증 필수 (PRD §11.3).
- T-063: AI JSON 응답은 Zod schema 검증 → 실패 시 재요청(최대 2회) 후 에러 반환.
- T-064: MVP는 동기 처리(Express timeout 연장). 응답 30초 이내 목표(NFR-PFM-003).

완료 기준:
- NEIS API로 학교 급식 이력 조회 성공
- 식단 생성 요청 → Claude API 응답 → Zod 검증 통과 → MealPlan 저장 확인
- 대체 식단 후보 2~3개 생성 + 알레르기 누설 없음 확인
- SCR-011 AI 생성 화면에서 조건 입력 → 로딩 → 결과 미리보기 → 적용 흐름 확인
