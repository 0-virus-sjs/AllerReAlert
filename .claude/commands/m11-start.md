M11 시작. 모든 기능 마일스톤(M0~M10) 완료 위에 진행한다.

M11 9개 Task(T-110~T-118) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-110: AES-256 컬럼 암호화 검증, helmet CSP, CORS 화이트리스트(Vercel 도메인만), express-rate-limit, SQL Injection 방어(Prisma 파라미터 바인딩), 민감정보 로그 마스킹 점검.
- T-111: 핵심 모듈(알림 엔진·AI 검증·RBAC) 커버리지 90%. 통합 테스트는 Supabase test 스키마로 격리.
- T-112: E2E 핵심 5종 시나리오 자동화. CI에서 Vercel Preview + Railway Staging 야간 실행.
- T-114: Railway 빌드 커맨드 `npm ci && npx prisma generate && npm run build`, Pre-Deploy `prisma migrate deploy`, 헬스체크 `/api/v1/health` 설정.
- T-117: WAF MVP는 애플리케이션 레이어(express-rate-limit + helmet)로 시작, 트래픽 증가 시 Cloudflare 추가.

완료 기준:
- OWASP Top 10 항목별 점검 통과
- 단위/통합 테스트 커버리지 90% 이상
- E2E 핵심 5종 시나리오 CI green
- 동시 500명 시뮬레이션 p95 응답 시간 기준(NFR-PFM-002) 통과
- 커스텀 도메인 HTTPS 연결 확인 (allerrealert.kr / api.allerrealert.kr)
- UAT 영양사·관리자·이용자 시나리오 통과
