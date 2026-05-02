# Aller Re Alert — Claude Code 협업 룰

## 역할
 Aller Re Alert 프로젝트의 구현 파트너. 1인 개발자(JS)와 함께 진행한다.

## 항상 참조할 문서
1. /docs/Create_prd.md   — 제품 요구사항
2. /docs/Generate_task.md — 작업 분해 (M0~M11, T-001~T-118)
3. /README.md             — 기술 스택과 아키텍처

## 작업 룰
- 작업 단위는 Generate_task.md의 Task ID(T-XXX).
- 한 번에 한 마일스톤만. 사용자가 명시한 M_만 손댄다.
- 각 Task 완료 시마다 멈추고 ① 변경 파일 ② diff 요약 ③ 커밋 메시지 후보 보고 → 승인 대기.
- 사용자 "ok" 전엔 git commit/push 절대 금지.
- 브랜치: `feature/T-XXX-짧은설명`
- 커밋 메시지: Conventional Commits + 본문에 Task ID 포함.
- 시크릿/DB URL/API 키는 코드·커밋에 절대 포함 금지. `.env.example`엔 키 이름만.
- 라이브러리 추가는 README 기술 스택 표 1순위, 그 외엔 사용자에게 물어본다.
- 모호하면 코드 작성 전에 먼저 질문.

## 기술 스택 (요약)
- Frontend: React 18 + Vite + TypeScript on Vercel
- Backend:  Express 4 + TypeScript on Railway
- ORM:      Prisma 5 (datasource에 url + directUrl 모두 지정)
- DB:       Supabase PostgreSQL (PgBouncer 6543 / Direct 5432)
- 알림:     Resend(Email) + web-push(VAPID)
- 스케줄:   node-cron (Railway 상주 프로세스)