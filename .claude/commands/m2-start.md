M2 시작. M1 결과물(DB 스키마 + 시드) 위에 진행한다.

M2 10개 Task(T-020~T-029) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-022: Refresh 토큰은 httpOnly + Secure + SameSite=None 쿠키로 발급 — Vercel↔Railway 크로스 도메인 대응.
- T-024: RBAC 미들웨어는 PRD §3.1 매트릭스와 1:1 대응 단위 테스트 필수.
- T-026: Axios 인터셉터에 `withCredentials: true` + Access 토큰 만료 시 자동 refresh 로직 포함.
- T-028: 개인정보 동의 체크박스 + 14세 미만 법정대리인 동의 플래그 저장 필수.

완료 기준:
- 역할별(admin/nutritionist/staff/student/guardian) 회원가입·로그인·로그아웃 정상 동작
- 만료된 Access 토큰 → 자동 재발급 확인
- 권한 없는 라우트 접근 시 403 응답 확인
- ProtectedRoute 역할 기반 접근 제어 동작 확인
