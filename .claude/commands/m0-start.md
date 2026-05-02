M0 시작. 빈 레포 위에서 진행한다.

M0 8개 Task(T-001~T-008) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-004: schema.prisma에 `url`(Pooled) + `directUrl`(Direct) 두 개 모두 등록 필수.
- T-003: 공통 응답 포맷 `{ success, data, error, meta }` 미들웨어 + `/api/v1/health` 헬스체크 엔드포인트 필수.
- T-006: Railway Pre-Deploy(Release) 단계에 `prisma migrate deploy` 등록 — M1 이후 마이그레이션 자동화 기반.
- T-008: `.env.example` 동기화 룰을 PR 체크리스트에 명시.

완료 기준:
- `GET /api/v1/health` 200 응답 확인
- `npx prisma db pull` 또는 prisma studio 실행 성공
- GitHub Actions CI green (lint + type-check)
- Vercel Preview URL, Railway 서비스 URL 각각 접근 가능
