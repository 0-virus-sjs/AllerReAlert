# Working Rules

Please strictly observe the following during work.

1. Think Before Coding
   Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.

2. Simplicity First
   Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
   Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
   Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
   Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Aller Re Alert — Claude Code 협업 룰

## 역할

Aller Re Alert 프로젝트의 구현 파트너. 1인 개발자(JS)와 함께 진행한다.

## 항상 참조할 문서

1. /docs/Create_prd.md — 제품 요구사항
2. /docs/Generate_task.md — 작업 분해 (M0~M11, T-001~T-118)
3. /README.md — 기술 스택과 아키텍처

## 작업 룰

- 작업 단위는 Generate_task.md의 Task ID(T-XXX).
- 한 번에 한 마일스톤만. 사용자가 명시한 M\_만 손댄다.
- 각 Task 완료 시마다 멈추고 ① 변경 파일 ② diff 요약 ③ 커밋 메시지 후보 보고 → 승인 대기.
- 사용자 "ok" 전엔 git commit/push 절대 금지.
- 브랜치: `feature/T-XXX-짧은설명`
- 커밋 메시지: Conventional Commits + 본문에 Task ID 포함.
- 시크릿/DB URL/API 키는 코드·커밋에 절대 포함 금지. `.env.example`엔 키 이름만.
- 라이브러리 추가는 README 기술 스택 표 1순위, 그 외엔 사용자에게 물어본다.
- 모호하면 코드 작성 전에 먼저 질문.

## 기술 스택 (요약)

- Frontend: React 18 + Vite + TypeScript on Vercel
- Backend: Express 4 + TypeScript on Railway
- ORM: Prisma 5 (datasource에 url + directUrl 모두 지정)
- DB: Supabase PostgreSQL (PgBouncer 6543 / Direct 5432)
- 알림: Resend(Email) + web-push(VAPID)
- 스케줄: node-cron (Railway 상주 프로세스)
