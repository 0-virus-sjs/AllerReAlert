M4 시작. M3 결과물(식단 CRUD) 위에 진행한다.

M4 10개 Task(T-040~T-049) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-040: AES-256 복호화 후 응답 — src/lib/crypto.ts의 decrypt 헬퍼 사용.
- T-041: 미성년 학생은 status=pending + 보호자 알림 예약(T-100 Phase 2). 성인/교직원은 즉시 confirmed.
- T-044: 본인 알레르기 대조 — 위험 메뉴 빨간색 + 경고 아이콘, 클릭 시 알레르기 식재료 툴팁.
- T-047: Railway에서 Puppeteer 사용 시 Nixpacks apt Chromium 빌드팩 필요 여부 사전 확인.
- T-041 완료 후 M3의 T-035(allergen-check API)를 연결한다.

완료 기준:
- 알레르기 등록 → prisma studio에서 user_allergens 레코드 + 암호화 상태 확인
- 식단 캘린더에서 본인 알레르기 위험 메뉴 강조 표시 확인
- PDF 다운로드 시 본인 알레르기 하이라이트 포함 확인
- 알레르기 수정/삭제 후 식단 캘린더 대조 결과 즉시 반영 확인
