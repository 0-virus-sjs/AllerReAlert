# Generate_task.md — 알라리알라 (Aller Re-Alert) 개발 작업 목록

> **프로젝트**: 학교 급식 알레르기 관리 시스템 - 알라리알라 (Aller Re-Alert)
> **기술 스택**: React + Bootstrap on **Vercel** (Frontend) / Node.js + Express on **Railway** (Backend) / **Prisma ORM** / **Supabase PostgreSQL** (DB)
> **아키텍처 흐름**: Client → React App on Vercel → HTTP REST API → Express API Server on Railway → Prisma ORM → Supabase PostgreSQL
> **기준 PRD**: create_prd.md (학교급식 알레르기 관리 시스템)
> **작성 원칙**: 기능 단위 분해, API 단위 분리, Phase 1(MVP) 우선, 개발 순서 고려 정렬

---

## 📌 작업 분류 및 표기 규칙

- **분류 태그**: `[INFRA]` `[DB]` `[BE]` `[FE]` `[AI]` `[DEVOPS]` `[QA]`
- **우선순위**: High (MVP 필수) / Medium (권장) / Low (선택·확장)
- **난이도(SP)**: Story Point 기준 — 1(0.5d) / 2(1d) / 3(2d) / 5(3~4d) / 8(1주) / 13(2주)
- **선행 작업**: 해당 Task ID 기재 (없으면 `-`)

---

## 🗺️ 개발 순서 개요 (마일스톤)

```
M0. 프로젝트 셋업 & PaaS 인프라 (T-001 ~ T-008)
M1. DB 스키마 & 마스터 데이터 (T-010 ~ T-018)
M2. 인증·사용자·RBAC (T-020 ~ T-029)
M3. 식단(MealPlan) CRUD & 알레르기 태깅 (T-030 ~ T-039)
M4. 알레르기 등록 & 식단 조회 (이용자) (T-040 ~ T-049)
M5. 알레르기 알림 엔진 ⭐ 핵심 (T-050 ~ T-057)
M6. AI 식단 생성·대체 제안 (T-060 ~ T-067)
M7. 설문·투표 (T-070 ~ T-077)
M8. 수요 집계 대시보드 (T-080 ~ T-085)
M9. 관리자 패널 (T-090 ~ T-095)
M10. Phase 2 - 보호자 승인·채널 설정 등 (T-100 ~ T-107)
M11. 비기능·QA·배포 (T-110 ~ T-118)
M12. 관리자/프로필/영양사 화면 보강 (T-120 ~ T-132)
M13. 버그 수정 & UX 개선 (T-133 ~ T-148)
```

---

# M0. 프로젝트 셋업 & PaaS 인프라

## T-001. [INFRA] 모노레포 / 폴더 구조 셋업
- **설명**: `/client` (React) + `/server` (Express) 구조로 Git 저장소 초기화. ESLint·Prettier·EditorConfig 공통 설정. `.env.example` 작성. `client/vercel.json`, `server/railway.json` 골격 추가.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: -

## T-002. [FE] React 프로젝트 초기화 (Vite + Bootstrap)
- **설명**: `Vite + React 18 + TypeScript` 프로젝트 생성. `react-bootstrap`, `bootstrap`, `react-router-dom`, `axios`, `@tanstack/react-query`, `zustand` 설치. 기본 레이아웃과 라우팅 골격 구성. Vercel 배포 호환 빌드 설정(`vite build` → `dist`).
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-001

## T-003. [BE] Express 프로젝트 초기화
- **설명**: Express 4 + TypeScript + 미들웨어 (`helmet`, `cors`, `morgan`/`pino-http`, `compression`, `cookie-parser`, `express-rate-limit`, `zod` 검증) 셋업. 공통 응답 포맷 `{ success, data, error, meta }` 미들웨어 구현. 글로벌 에러 핸들러 작성. `/api/v1/health` 헬스체크 엔드포인트 추가 (Railway 헬스체크용).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-001

## T-004. [DB] Supabase 프로젝트 생성 + Prisma 연결
- **설명**: Supabase 신규 프로젝트(dev) 생성 → Connection String 두 종류 확보 (PgBouncer Pooled `DATABASE_URL`, Direct `DIRECT_URL`). Prisma 5 도입 (`schema.prisma`에 `datasource db { url, directUrl }` 설정), 마이그레이션 도구 셋업, 시드 스크립트 골격 작성. 로컬 개발용 `.env`에 두 URL 등록.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-003

## T-005. [DEVOPS] Vercel / Railway / Supabase 프로젝트 셋업 (환경별 분리)
- **설명**: Vercel 프로젝트 생성 후 `client/`를 Root로 지정, Preview/Production 환경 변수 등록. Railway 신규 프로젝트 생성 후 `server/`를 Root로 지정, Variables 등록 + 헬스체크 경로 `/api/v1/health` 설정. 환경별로 **Supabase 프로젝트 분리**(dev / staging / prod). 환경별 URL·키 매핑 문서화. (실제 도메인·HTTPS는 T-117에서)
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: -

## T-006. [DEVOPS] CI 파이프라인 (GitHub Actions) + 자동 배포 연동
- **설명**: PR 시 lint·type-check·test 실행. Vercel은 PR마다 Preview 자동 배포. Railway는 `develop` 머지 시 staging 서비스 자동 배포, `main` 머지 시 prod 서비스 자동 배포(Release 단계에서 `prisma migrate deploy` 실행). main 배포에 환경 보호 규칙(reviewer 승인) 적용.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-002, T-003, T-005

## T-007. [BE] 로깅·모니터링 기반 (Pino + Railway Logs + Sentry)
- **설명**: `pino` 또는 `winston` 로거 구성, 요청 ID 기반 trace, 민감정보(알레르기·이메일·비밀번호 등) 마스킹 처리. 로그는 stdout으로 출력 → Railway가 자동 수집. `@sentry/node`로 에러 추적, FE는 `@sentry/react`. (NFR-OPS-001 가용률 모니터링 기반)
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-003

## T-008. [BE] 환경 변수 / 비밀 관리 (Railway / Vercel Variables)
- **설명**: 로컬은 `dotenv` + `.env`, 운영은 **Railway Variables**(서버 시크릿) / **Vercel Environment Variables**(클라이언트 `VITE_*` 키) 사용. JWT 시크릿, `DATABASE_URL`, `DIRECT_URL`, AI API 키, Resend 키, VAPID 키, Sentry DSN 등 키 목록 정의. `.env.example` 동기화 룰 PR 체크리스트화.
- **우선순위**: High
- **난이도**: 1 SP
- **선행 작업**: T-005

---

# M1. DB 스키마 & 마스터 데이터

## T-010. [DB] Organization / User 테이블 스키마
- **설명**: `organizations`(id, name, address, org_type enum[school/company/welfare/military/other], grade_structure nullable, meal_time), `users`(id, org_id FK, role enum, name, email, phone, group_info, password_hash, created_at). 인덱스: `users(email)`, `users(org_id, role)`. Prisma `schema.prisma` 모델 정의 → `prisma migrate dev`. ※ 학교 외 단체 확장 고려하여 `organization` 추상화 엔티티 사용.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-004

## T-011. [DB] Allergen / UserAllergen 테이블 스키마
- **설명**: `allergens`(id, name, code, icon_url) — 식약처 19종 마스터. `user_allergens`(id, user_id FK, allergen_id FK, status enum[pending/confirmed/rejected], approved_by FK→users, created_at). 알레르기 정보는 컬럼 레벨 암호화(AES-256, `crypto` 모듈) 적용 — 애플리케이션 레이어 암호화/복호화 헬퍼 작성.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-010

## T-012. [DB] MealPlan / MealItem / MealItemAllergen 스키마
- **설명**: `meal_plans`(id, org_id, date, status, published_at, created_by). `meal_items`(id, meal_plan_id, category enum[rice/soup/side/dessert], name, calories, nutrients JSONB). `meal_item_allergens`(meal_item_id, allergen_id, is_auto_tagged). 인덱스: `meal_plans(org_id, date)`.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-011

## T-013. [DB] AlternateMealPlan / AlternateMealItem 스키마
- **설명**: `alternate_meal_plans`(id, meal_plan_id, target_allergen_id, status, confirmed_by). `alternate_meal_items`(id, alt_plan_id, replaces_item_id FK→meal_items, name, calories, nutrients JSONB).
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-012

## T-014. [DB] Survey / SurveyResponse 스키마
- **설명**: `surveys`(id, meal_plan_id, type enum[need_check/menu_vote], options JSONB, deadline, status, created_by). `survey_responses`(id, survey_id, user_id, response JSONB, voted_item_id, created_at, updated_at). UNIQUE(survey_id, user_id).
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-013

## T-015. [DB] Notification 스키마
- **설명**: `notifications`(id, user_id, type enum, title, body, payload JSONB, is_read, sent_at). 인덱스: `notifications(user_id, is_read, sent_at DESC)`.
- **우선순위**: High
- **난이도**: 1 SP
- **선행 작업**: T-010

## T-016. [DB] AuditLog / SystemLog 스키마
- **설명**: `audit_logs`(id, user_id, action, target_type, target_id, ip, before JSONB, after JSONB, created_at). 1년 보관 정책. 보관 기간 초과분 정리 잡(node-cron, 일 1회) 구상.
- **우선순위**: Medium
- **난이도**: 2 SP
- **선행 작업**: T-010

## T-017. [DB] 시드 데이터 — 알레르기 19종 + 샘플 학교/사용자
- **설명**: 식약처 알레르기 유발물질 19종(난류, 우유, 메밀, 땅콩, 대두, 밀 등) Prisma seed 스크립트로 시드. 개발용 샘플 학교 1곳, 역할별 테스트 계정 5종. `npx prisma db seed`로 재현 가능하도록 idempotent하게 작성.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-011

## T-018. [DB] 마이그레이션 자동화 & Supabase 백업 정책
- **설명**: 운영 배포에서 `prisma migrate deploy`를 Railway Pre-Deploy(Release) 단계에 등록. **Supabase 자동 백업**(Pro 플랜 일일 백업 + PITR) 활성화 검증. 30일 보관(NFR-OPS-002) 충족을 위해 주 1회 `pg_dump` 스냅샷을 Supabase Storage(또는 별도 S3 호환) 버킷에 업로드하는 node-cron 잡 작성. 복구 절차 문서화.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-005, T-017

---

# M2. 인증·사용자·RBAC

## T-020. [BE] 비밀번호 해싱 & JWT 유틸
- **설명**: `bcrypt`(salt rounds 12) + JWT(access 15분 / refresh 7일). 토큰 발급·검증·재발급 유틸 작성.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-008, T-010

## T-021. [BE] API: `POST /auth/signup` (역할별 회원가입)
- **설명**: 역할(student/staff/guardian/nutritionist) 분기 가입 처리. 학교코드 인증 통합. 비밀번호 정책(8자 이상, 영문+숫자+특수문자) 검증. 개인정보 동의 + 14세 미만 법정대리인 동의 플래그 저장.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-020

## T-022. [BE] API: `POST /auth/login` / `POST /auth/refresh` / `POST /auth/logout`
- **설명**: 로그인 시 Access·Refresh 발급(Refresh는 httpOnly + Secure + SameSite=None 쿠키 — Vercel↔Railway 크로스 도메인 대응). 30분 무활동 시 Access 만료(NFR-SEC-004). 동시 로그인 제한(이전 Refresh 무효화).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-020

## T-023. [BE] API: `POST /auth/verify-org` (소속 코드 인증)
- **설명**: 소속 코드 입력 → 단체(학교·기관 등) 존재 여부 확인 후 임시 토큰 반환. 가입 플로우 1단계로 사용. 단체 유형(org_type)에 따라 추가 인증 필드 분기 가능.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-010

## T-024. [BE] RBAC 미들웨어
- **설명**: `requireRole(['nutritionist','admin'])` 형태의 미들웨어. 라우트별 적용. RBAC 매트릭스(PRD §3.1)와 1:1 매핑되도록 단위 테스트 작성.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-022

## T-025. [BE] API: `GET /users/me` / `PUT /users/me` (프로필)
- **설명**: 본인 프로필 조회/수정. 알림 수신 설정(채널·시간) 포함.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-024

## T-026. [FE] 라우팅 & 인증 가드
- **설명**: `react-router-dom` 라우터 구성. `<ProtectedRoute role="...">` 컴포넌트로 역할 기반 접근 제어. Axios 인터셉터: 토큰 만료 시 자동 refresh + Vercel↔Railway 크로스 도메인 쿠키 전송(`withCredentials: true`).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-002

## T-027. [FE] SCR-001 로그인 화면
- **설명**: 역할 선택 + ID/PW 폼 (react-bootstrap). 폼 검증, 에러 표시, 로딩 상태 UX.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-022, T-026

## T-028. [FE] SCR-002 회원가입 화면 (역할별 폼)
- **설명**: 소속 코드 인증 → 역할 선택 → 역할별 정보 입력 (학생: 학년/반, 보호자: 자녀 연동코드, 영양사: 인증코드; 학교 외 단체는 group_info 필드 유연화). 개인정보 동의 체크박스 필수.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-021, T-023, T-027

## T-029. [FE] 공통 레이아웃 + 네비게이션
- **설명**: 역할별 사이드바/헤더, 알림 아이콘, 프로필 메뉴. Bootstrap Navbar 기반 반응형(NFR-UX-001).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-026

---

# M3. 식단(MealPlan) CRUD & 알레르기 태깅 (영양사)

## T-030. [BE] API: `POST /meals` (식단 생성)
- **설명**: 영양사 권한. `date` 단위 또는 월간 일괄 생성 지원. **Prisma `$transaction`**으로 MealPlan + MealItem(들) 함께 저장. status=draft.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-012, T-024

## T-031. [BE] API: `PUT /meals/:id` / `DELETE /meals/:id`
- **설명**: 수정·삭제. 공개된 식단(status=published) 수정 시 변경 이력 `audit_logs`에 저장 + 알림 엔진(T-053) 트리거.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-030, T-016

## T-032. [BE] API: `PUT /meals/:id/publish` (식단 공개)
- **설명**: status: draft → published, published_at 기록. 예약 공개(`scheduled_at`) 지원 — **node-cron 기반 정기 폴링 잡** 또는 옵션으로 **BullMQ + Railway Redis Plugin**. 단순 케이스는 `setTimeout` 대신 cron으로 처리해 재기동 안전성 확보.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-030

## T-033. [BE] 알레르기 자동 태깅 서비스
- **설명**: 메뉴명 / 식재료 텍스트 → 알레르기 식재료 매칭(키워드 사전 + 식약처 마스터 기반). MealItem 저장 시 자동 호출 → `meal_item_allergens` 생성(is_auto_tagged=true). FR-NTR-004.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-012

## T-034. [BE] API: `GET /meals?school_id=&month=` / `GET /meals/:id`
- **설명**: 월간/일간 조회. 응답에 MealItem + 알레르기 태그 포함. **In-memory 캐시(`node-cache`) 5분** — Phase 2에서 트래픽 증가 시 Railway Redis Plugin 도입 가능.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-030

## T-035. [BE] API: `GET /meals/:id/allergen-check?user_id=`
- **설명**: 특정 이용자에게 해당 식단이 위험한지 대조 결과 반환. matched_allergens 목록 포함. 응답 시간 3초 이내(NFR-PFM-001).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-034, T-041

## T-036. [BE] API: `POST /meals/:id/alternates` / `PUT /alternates/:id/confirm`
- **설명**: 대체 식단 등록·확정. 확정(status=confirmed) 시 설문 자동 생성 트리거(T-070).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-013

## T-037. [FE] SCR-010 식단 작성/편집 화면
- **설명**: 월간 캘린더 그리드. 날짜 클릭 → 메뉴 입력 모달(밥/국/반찬/후식). 자동 태깅 결과 표시 + 수동 보정 UI. 영양 정보 합계 표시.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-030, T-033

## T-038. [FE] SCR-012 대체 식단 관리 화면
- **설명**: 알레르기 유발 식단 자동 표시. AI 제안(T-066) 후보 카드 → 선택 → 확정. 영양 비교 표.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-036

## T-039. [FE] SCR-009 영양사 대시보드
- **설명**: 오늘의 알림 발송 건수, 미확정 식단, 오늘 마감 설문, 수요 요약 카드. (실데이터는 후속 API와 연결)
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-026

---

# M4. 알레르기 등록 & 식단 조회 (이용자)

## T-040. [BE] API: `GET /users/me/allergens`
- **설명**: 본인 알레르기 목록 + 승인 상태 반환. AES-256 복호화 후 응답.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-011, T-024

## T-041. [BE] API: `POST /users/me/allergens` (알레르기 등록)
- **설명**: 19종 체크리스트 + 기타 자유 입력. 미성년 학생인 경우 status=pending + 보호자 알림 발송(T-100). 성인/교직원은 즉시 confirmed.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-040

## T-042. [BE] API: `PUT /users/me/allergens/:id` / `DELETE /users/me/allergens/:id`
- **설명**: 수정·삭제. 미성년 학생의 수정도 보호자 재승인 필요(Phase 2 — Phase 1에서는 즉시 반영 + 추후 강화).
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-041

## T-043. [FE] SCR-005 알레르기 프로필 화면
- **설명**: 19종 체크리스트(아이콘 + 텍스트, NFR-UX-004), 기타 입력란, 승인 상태 배지. 등록/수정/삭제 UI.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-041

## T-044. [FE] SCR-004 식단 캘린더 (이용자)
- **설명**: 일간/주간/월간 뷰 토글. 본인 알레르기와 자동 대조 → 위험 메뉴 빨간색 + 경고 아이콘. 클릭 시 알레르기 식재료 툴팁. FR-USR-008.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-034, T-035, T-043

## T-045. [FE] SCR-003 이용자 대시보드
- **설명**: 오늘의 식단 요약 카드, 알레르기 경고 배너, 미응답 설문 카드.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-044

## T-046. [FE] 알레르기 정보 컴포넌트 (재사용)
- **설명**: `<AllergenBadge>`, `<AllergenList>`, `<MealCard>` 공통 컴포넌트. 디자인 시스템 일관성.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-029

## T-047. [BE] 일간/월간 식단 PDF 다운로드 API: `GET /meals/export?date=&format=pdf`
- **설명**: 장애 대비 수동 전환 수단(NFR-OPS-003). `pdfkit` 또는 `puppeteer`로 PDF 생성. 본인 알레르기 하이라이트 포함. (Railway에서 Puppeteer 사용 시 Chromium 빌드팩 필요 — Nixpacks `apt` 추가)
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-034

## T-048. [FE] PDF 다운로드 버튼 / 인쇄 친화 뷰
- **설명**: 식단 캘린더에 다운로드 버튼 추가. 인쇄용 CSS.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-047

## T-049. [BE] API: `GET /users/me/alternate-meals?date=` (대체 식단 조회)
- **설명**: 본인 알레르기에 해당하는 대체 식단 조회. FR-USR-009.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-036, T-041

---

# M5. 알레르기 알림 엔진 ⭐ 핵심 모듈

> **PRD §11.1**: 이 모듈의 정확성·안정성이 시스템 최우선 가치.

## T-050. [BE] 알림 발송 추상화 레이어
- **설명**: `NotificationProvider` 인터페이스 — Email/Push 구현체 분리. **Resend 어댑터(이메일)**, **web-push 라이브러리 + VAPID 어댑터(웹 푸시)** 작성. SMS(Twilio)는 Phase 3 옵션으로 인터페이스만 예약.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-008, T-015

## T-051. [BE] 알레르기 대조 엔진 (코어 알고리즘)
- **설명**: PRD §7.1 구현. 학교 단위로 (1) 당일 published MealPlan → (2) meal_allergens 집합 → (3) confirmed UserAllergen 전체 → (4) 교집합 계산 → (5) matched가 있는 사용자 추출. 단위 테스트 ≥ 90% 커버리지.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-012, T-011

## T-052. [BE] 일일 알림 스케줄러 (node-cron, Railway 상주 프로세스)
- **설명**: Railway는 컨테이너 상주 프로세스를 지원하므로 `node-cron`으로 학교별 급식시간 - N시간 기준 트리거. T-051 호출 → Notification 생성 → T-050으로 발송. 5분 이내 전체 발송 보장(NFR-PFM-004). 실패 시 지수 백오프 재시도 3회. 인스턴스 다중 배포 대비 **DB 기반 분산 락**(advisory lock) 또는 단일 인스턴스 운영. (대규모 트래픽 시 BullMQ + Railway Redis로 마이그레이션 가능하도록 큐 인터페이스 추상화)
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-050, T-051

## T-053. [BE] 식단 변경 시 실시간 알림 핸들러
- **설명**: PRD §7.2 구현. T-031 트리거. before_set / after_set diff → 새로 추가된 알레르기 → 해당 사용자 즉시 알림(type=menu_change). 변경 이력 audit_logs 기록.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-051, T-031

## T-054. [BE] API: `GET /notifications` / `PUT /notifications/:id/read`
- **설명**: 알림 목록 페이지네이션. 읽음 처리. 미읽음 카운트 헤더(`X-Unread-Count`).
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-015

## T-055. [BE] API: `PUT /notifications/settings` + `POST /notifications/web-push/subscribe`
- **설명**: 푸시/이메일/(SMS Phase 3) 채널 토글, 알림 시간(예: 급식 1시간 전) 설정. 웹 푸시 구독 객체(endpoint, p256dh, auth) 저장. (FR-ALM-003은 Phase 2지만 데이터는 Phase 1부터 저장.)
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-025, T-050

## T-056. [FE] SCR-007 알림 센터
- **설명**: 알림 목록(읽음/미읽음 필터, 타입 필터). 알림 클릭 시 해당 식단 상세로 라우팅. **Service Worker 등록 + 웹 푸시 구독 동의 플로우**. 실시간 갱신은 폴링(30초) 우선, 추후 SSE/WebSocket 검토.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-054, T-055

## T-057. [QA] 알림 엔진 통합 테스트 시나리오
- **설명**: PRD의 핵심 시나리오 자동화 — (1) 알레르기 등록 → 식단 알림 (2) 공개 식단 수정 → 변경 알림 (3) 보호자 미승인 → 알림 미발송. **Vitest + Supertest**, 테스트 DB는 Supabase 별도 스키마(`test`) 또는 별도 프로젝트.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-052, T-053

---

# M6. AI 식단 생성·대체 제안

## T-059. [BE] NEIS 급식 API 연동 서비스
- **설명**: 나이스 교육정보 개방 포털(`open.neis.go.kr`) `mealServiceDietInfo` API 연동. 학교 코드(`ATPT_OFCDC_SC_CODE`, `SD_SCHUL_CODE`)와 날짜 범위로 실제 급식 메뉴 이력 조회. 결과를 AI 프롬프트 컨텍스트로 가공하는 어댑터 작성. API 키 관리(Railway Variables). 응답 캐싱(In-memory 1일) 적용. 학교 외 단체는 이 서비스를 건너뛰도록 org_type 분기.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-008, T-010

## T-060. [AI] AI Provider 추상화 (Claude API 우선, OpenAI 폴백)
- **설명**: `AIProvider` 인터페이스. Anthropic Claude API 어댑터 우선 구현, OpenAI 폴백 어댑터. 타임아웃·재시도·토큰 사용량 로깅(Sentry breadcrumbs).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-008

## T-061. [AI] 정규 식단 생성 프롬프트 빌더
- **설명**: PRD §7.4 정규 식단 프롬프트 구조 구현. 입력 조건(기간·예산·계절·영양 기준·선호/제외) + **T-059에서 가져온 NEIS 급식 이력 데이터**를 컨텍스트로 추가 → 시스템·유저 프롬프트 조립. JSON 출력 강제 (Claude의 JSON mode 또는 strict schema 프롬프트). org_type=school인 경우에만 NEIS 데이터 포함.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-060

## T-062. [AI] 대체 식단 제안 프롬프트 빌더
- **설명**: 원본 메뉴 + 제외 알레르기 → 대체 후보 2~3개 JSON 출력. **제외 알레르기가 결과에 포함되지 않는지 후처리 검증 필수** (PRD §11.3).
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-060

## T-063. [AI] AI 응답 검증·정규화 레이어
- **설명**: AI JSON 응답 schema 검증(**Zod**). 영양 기준 충족 여부 자동 검증. 알레르기 식재료 누설 검사 → 실패 시 재요청 또는 에러.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-061, T-062

## T-064. [BE] API: `POST /ai/generate-meal-plan`
- **설명**: 영양사 호출. 응답 30초 이내(NFR-PFM-003). **장시간 작업 처리 옵션**: (a) Railway 단일 요청에서 동기 처리 (Express의 기본 timeout 늘림) 또는 (b) Job ID 발급 후 polling(node-cron + DB 작업 큐). MVP는 (a) 동기 처리로 시작.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-061, T-063

## T-065. [BE] API: `POST /ai/suggest-alternates`
- **설명**: 대체 메뉴 후보 생성. 10초 이내. 후보 자동 저장 → 영양사가 선택 후 확정(T-036).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-062, T-063

## T-066. [BE] API: `POST /ai/recalculate-nutrition`
- **설명**: 영양사가 메뉴 수정 시 전체 영양 균형 재계산. (FR-AI-002, Phase 2 우선순위지만 API는 미리 노출.)
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-063

## T-067. [FE] SCR-011 AI 식단 생성 화면
- **설명**: 조건 입력 폼 → 생성 버튼 → 진행률 인디케이터 → 결과 캘린더 미리보기 → 일괄 적용 또는 수정. 동기 호출 시 로딩 UX, 비동기 전환 시 폴링 UI.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-064, T-037

---

# M7. 설문·투표

## T-070. [BE] 설문 자동 생성 서비스
- **설명**: PRD §7.3 구현. 영양사가 대체 식단 후보를 확정하고 마감일을 지정해 설문을 등록(T-036 확정 API)하면 (1) Step1 need_check 설문 + (2) Step2 menu_vote 설문(원래 식단 + 대체 식단 후보 포함) 자동 생성. 대상자(해당 알레르기 보유자) 자동 산정. `deadline`은 영양사 입력값 사용.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-014, T-036

## T-071. [BE] API: `GET /surveys?meal_plan_id=` / `POST /surveys` / `GET /surveys/:id`
- **설명**: 설문 목록·상세 조회, 영양사 수동 생성. 권한별 응답 데이터 분리(영양사: 결과 포함, 이용자: 본인 응답만).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-014

## T-072. [BE] API: `POST /surveys/:id/responses` (응답·투표)
- **설명**: 1인 1표, 마감 전까지 변경 가능(Prisma `upsert`). 마감 후 변경 불가(PRD §11.4).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-071

## T-073. [BE] API: `PUT /surveys/:id/close` & 자동 마감 스케줄러
- **설명**: 수동/자동 마감. node-cron 기반 정기 잡(매 5분)으로 마감 시각 도래 설문 close 처리 → 결과 자동 집계 → 영양사 대시보드 캐시 무효화. (FR-SVY-003)
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-072

## T-074. [BE] 설문 알림 트리거 + 마감 전 리마인더
- **설명**: 설문 생성 시 대상자에게 즉시 참여 알림(FR-ALM-005). 마감 24시간/2시간 전 미응답자 리마인더(node-cron).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-070, T-052

## T-075. [FE] SCR-006 설문·투표 화면 (이용자)
- **설명**: 2단계 플로우 — 필요 여부 → 메뉴 투표. 투표 마감 시간 카운트다운. 변경 가능 표시.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-072

## T-076. [FE] SCR-014 설문 관리 화면 (영양사)
- **설명**: 설문 목록, 상태별 필터, 결과 시각화(참여율 게이지, 메뉴별 막대 차트). `chart.js` 또는 `recharts`.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-071, T-073

## T-077. [QA] 설문 라이프사이클 E2E 테스트
- **설명**: 설문 생성 → 알림 → 응답 → 마감 → 집계 → 영양사 확인. Playwright 시나리오 (Vercel Preview URL 대상).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-075, T-076

---

# M8. 수요 집계 대시보드 (영양사)

## T-080. [BE] API: `GET /analytics/allergy-overview?school_id=`
- **설명**: 학교 내 알레르기 유형별 보유 인원 분포. In-memory 캐시 1시간. (FR-NTR-006)
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-011

## T-081. [BE] API: `GET /analytics/daily-demand?month=`
- **설명**: 일별 대체식 필요 인원·유형 집계. (UserAllergen confirmed) ∪ (설문 결과)로 산정.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-073

## T-082. [BE] API: `GET /analytics/report?month=` (월간 운영 리포트)
- **설명**: 알림 발송 건수, 대체식 제공 건수, 설문 참여율. (FR-NTR-008은 Phase 3 — Phase 1에서는 핵심 지표만.)
- **우선순위**: Low
- **난이도**: 3 SP
- **선행 작업**: T-080, T-081

## T-083. [BE] API: `GET /analytics/export?format=csv|pdf`
- **설명**: 대시보드 데이터 CSV/PDF 내보내기.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-080, T-081

## T-084. [FE] SCR-013 수요 집계 화면
- **설명**: 알레르기 유형별 도넛 차트, 일별 수요 표·바 차트, 설문 참여율. 내보내기 버튼.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-080, T-081, T-083

## T-085. [FE] 영양사 대시보드 위젯 실데이터 연결
- **설명**: T-039의 위젯들을 실제 API와 연결.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-080, T-081

---

# M9. 관리자 패널

## T-090. [BE] API: `GET /admin/organizations` / `POST /admin/organizations` / `PUT /admin/organizations/:id`
- **설명**: 단체 정보 CRUD. 학교·사내 식당·복지관 등 org_type 기반 관리. (FR-ADM-001)
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-024

## T-091. [BE] API: `GET /admin/users` / `PUT /admin/users/:id/role` / `PUT /admin/users/:id/status`
- **설명**: 사용자 조회·역할 변경·활성/비활성. (FR-ADM-002)
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-024

## T-092. [BE] API: `GET /admin/allergens` / `POST` / `PUT /:id` / `DELETE /:id`
- **설명**: 알레르기 마스터 CRUD. (FR-ADM-003)
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-011

## T-093. [BE] API: `GET /admin/logs` (시스템 로그 조회)
- **설명**: audit_logs 페이지네이션 조회, 필터(사용자·기간·작업유형). (FR-ADM-004, Phase 2)
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-016

## T-094. [FE] SCR-015 관리자 패널 (탭 구성)
- **설명**: 학교 관리, 사용자 관리, 알레르기 마스터, 시스템 로그 4개 탭. CRUD 모달 통일.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-090, T-091, T-092

## T-095. [FE] 시스템 로그 뷰어
- **설명**: 검색·필터·CSV 내보내기.
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-093

---

# M10. Phase 2 — 보호자 승인 / 채널 설정 등

## T-100. [BE] API: `GET /guardian/children` / `GET /guardian/children/:id/allergens`
- **설명**: 보호자가 자녀 목록·알레르기 조회. 자녀-보호자 연동 키 검증.
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-021

## T-101. [BE] API: `PUT /guardian/approvals/:id` (승인/반려)
- **설명**: status 변경(pending → confirmed/rejected). 반려 시 사유 저장 + 자녀 알림. 미승인 알레르기는 알림 엔진 대조 대상 제외(PRD §11.4).
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-041, T-100

## T-102. [BE] 보호자 동시 알림 (FR-ALM-004)
- **설명**: T-052·T-053에서 학생에게 알림 발송 시 연결된 보호자에게 동일 알림 발송.
- **우선순위**: Medium
- **난이도**: 2 SP
- **선행 작업**: T-052, T-100

## T-103. [FE] SCR-008 보호자 승인 화면
- **설명**: 자녀 알레르기 등록 요청 목록, 승인/반려 액션, 사유 입력 모달.
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-101

## T-104. [FE] 알림 채널·시간 설정 화면 (FR-ALM-003)
- **설명**: 푸시/이메일/(SMS Phase 3) 토글, 알림 시간 슬라이더. 프로필 화면 내 섹션. 푸시 구독 동의 다이얼로그.
- **우선순위**: Medium
- **난이도**: 2 SP
- **선행 작업**: T-055

## T-105. [BE] AI 식단 수정 시 재계산 (FR-AI-002)
- **설명**: T-066 활용. 영양사가 특정 메뉴 변경 시 전체 균형 재계산 + 보정 제안.
- **우선순위**: Medium
- **난이도**: 5 SP
- **선행 작업**: T-066

## T-106. [BE] 감사 로그 강화 (NFR-SEC-005)
- **설명**: 민감 작업(알레르기 변경·식단 변경·로그인) audit_logs에 일관 기록. 1년 보관 정책.
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-016

## T-107. [FE] 접근성 강화 (NFR-UX-002)
- **설명**: WCAG 2.1 AA 검증 — 키보드 네비게이션, 스크린리더 라벨, 색 대비 4.5:1, focus indicator. axe-core CI 통합.
- **우선순위**: Medium
- **난이도**: 5 SP
- **선행 작업**: T-029

---

# M11. 비기능 / QA / 배포

## T-110. [BE] 보안 강화 (NFR-SEC-001~004)
- **설명**: AES-256 컬럼 암호화 검증, **TLS는 Vercel·Railway·Supabase 모두 기본 제공**, helmet CSP, CORS 화이트리스트(`CORS_ORIGIN`에 Vercel 도메인만), `express-rate-limit`로 IP당 분당 호출 제한, SQL Injection 방어(Prisma 파라미터 바인딩), XSS sanitize, 민감정보 로그 마스킹 점검.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-007, T-011

## T-111. [QA] 단위 / 통합 테스트
- **설명**: 서비스 레이어·API 레이어 **Vitest + Supertest**. 핵심 모듈(알림 엔진·AI 검증·RBAC) 90% 커버리지. 통합 테스트는 Supabase 테스트 스키마(`test`) 또는 별도 프로젝트로 격리.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-052, T-063, T-024

## T-112. [QA] E2E 테스트 (Playwright)
- **설명**: 핵심 5종 시나리오 자동화. CI에서 Vercel Preview + Railway Staging URL 대상으로 야간 실행.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-057, T-077

## T-113. [QA] 부하 테스트 (k6)
- **설명**: 동시 500명 시뮬레이션, 핵심 API p95 응답 시간 검증(NFR-PFM-002). Railway 인스턴스 스펙(메모리·CPU)과 Supabase 커넥션 풀 한계 함께 모니터링.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-110

## T-114. [DEVOPS] PaaS 환경 프로비저닝 & 배포 파이프라인 마무리
- **설명**: Vercel(client), Railway(server), Supabase(db) 3종을 dev/staging/prod 3환경으로 정합성 있게 구성.
  - **Vercel**: Production 도메인·Preview 도메인 매핑, 환경별 `VITE_*` 변수.
  - **Railway**: 서비스별 빌드 커맨드(`npm ci && npx prisma generate && npm run build`), Pre-Deploy(`prisma migrate deploy`), Start(`node dist/server.js`), 헬스체크(`/api/v1/health`), 인스턴스 스펙·자동 재시작 설정.
  - **Supabase**: 환경별 프로젝트 분리, Pooled/Direct URL 두 종류를 Railway에 등록, RLS는 사용하지 않고 애플리케이션 레이어에서 권한 처리(서비스 역할 키만 사용).
  - 배포 절차서·롤백 절차서 작성.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-005, T-006

## T-115. [DEVOPS] 모니터링 / 알림 (Sentry + Railway Metrics + Vercel Analytics)
- **설명**: Sentry 프로젝트 분리(FE/BE), 릴리즈 추적, source map 업로드. Railway Metrics 대시보드(CPU·메모리·요청 수·5xx) + 슬랙 webhook 알림 룰. Vercel Analytics(웹 바이탈·트래픽). 가용률 99.5% 모니터링(NFR-OPS-001) — 외부 uptime 모니터(예: UptimeRobot)로 `/api/v1/health` 1분 간격 헬스체크.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-114

## T-116. [DEVOPS] 백업·복구 / DR
- **설명**: Supabase 자동 백업 활성화 검증(Pro 플랜 일일 백업 + PITR), 주 1회 `pg_dump` 외부 보관(NFR-OPS-002 30일 만족), Vercel·Railway는 이전 배포 즉시 롤백 가능 — 롤백 절차 문서화. 분기 1회 복구 리허설(NFR-OPS-003).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-114

## T-117. [DEVOPS] 도메인 / HTTPS / WAF
- **설명**: 커스텀 도메인 연결 — 프론트는 Vercel(`allerrealert.kr`), API는 Railway(`api.allerrealert.kr`). 두 곳 모두 HTTPS·인증서 자동 갱신. **WAF 옵션**: 비용·운영을 고려해 (a) 도메인을 Cloudflare 프록시 뒤에 두고 Cloudflare WAF/Rate Limit 사용 또는 (b) 애플리케이션 레이어 미들웨어(`express-rate-limit`, `helmet`)로 우선 대응. MVP는 (b)로 시작 → 트래픽 증가 시 (a) 추가.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-114

## T-118. [QA] UAT & 출시 체크리스트
- **설명**: 보안 체크리스트 + RBAC 매트릭스 + 성능 기준 + 접근성 검증. 영양사·관리자·이용자 시나리오 UAT 1주.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-111, T-112, T-113, T-117

---

# M12. 관리자/프로필/영양사 화면 보강

> **배경**: MVP 출시 이후 사용자 보고와 영양사 워크플로우 정리 과정에서 드러난 화면·데이터 보강. 관리자 페이지 라우팅 결함, 학생 기본 정보 누락, 영양사 식단 생성 조건 입력 UX 부족을 한 마일스톤으로 묶는다.

## T-120. [FE] 관리자 패널 라우팅·네비게이션 진단 및 수정
- **설명**: `/admin` 라우트와 role-guard는 존재(`App.tsx`, `Sidebar.tsx`)하나 사용자 보고로 "다이렉션이 전혀 되지 않음". 재현 케이스 작성 후 원인 진단 — (1) 사이드바 `/admin/users`·`/admin/schools` 등 서브경로와 실제 탭 컴포넌트 매칭 누락 (2) role-guard 조기 리다이렉트 (3) 로그인 후 admin 사용자 분기 누락 — 중 해당 항목 수정. admin 계정으로 로그인 → 사이드바 → `/admin` 4개 탭 모두 정상 진입 확인.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-094

## T-121. [DB] User 스키마 확장 — 학생 기본 정보 컬럼
- **설명**: `users` 테이블에 `grade Int?`, `class_no String?`, `student_code String?` 컬럼 추가. Prisma 마이그레이션 작성. 기존 `group_info` JSON은 보조 필드로 유지(자유 입력). 인덱스: `(org_id, grade, class_no)`. 회원가입에서 student 역할일 때만 사용.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-010

## T-122. [BE] 회원가입 API에 학생 정보 필드 반영
- **설명**: `POST /auth/signup` 입력 zod 스키마 확장 — role=student일 때 grade/classNo/studentCode 필수. role≠student일 때는 무시. `auth.service.ts`의 user 생성 로직에 매핑.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-021, T-121

## T-123. [BE] 프로필 조회 API에 소속 단체 정보 포함
- **설명**: `GET /users/me` 응답에 organization 객체(name, address, orgType, mealTime) 동봉. role=student는 grade/classNo/studentCode 함께. 응답 캐싱 없음. (RBAC: 본인만)
- **우선순위**: High
- **난이도**: 1 SP
- **선행 작업**: T-025, T-121

## T-124. [BE] 소속 단체 변경 API
- **설명**: `PUT /users/me/org` — 새 단체 코드 입력 → 단체 검증(T-023 재사용) → org_id 업데이트. 변경 시 기존 확정 알레르기(status=confirmed)는 유지, grade/classNo/studentCode는 초기화하고 "재입력 필요" 플래그 응답. audit_logs 기록. 영양사 역할은 호출 불가.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-023, T-123

## T-125. [FE] 프로필 화면 — 학생 기본 정보·소속 단체 조회 및 변경
- **설명**: SCR-005 확장. student: 이름·이메일·전화·학교명·학년·반·학번 표시·편집. staff/guardian: 학교명·연락처 표시. "소속 변경" 버튼 → 단체 코드 인증 모달 → 변경 확정 → 학생이면 grade/classNo/studentCode 재입력 모달. nutritionist: 소속 변경 불가(버튼 숨김).
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-123, T-124

## T-126. [BE] 학교 통계 API — 성별·학년별 인원 분포
- **설명**: `GET /analytics/school-stats` — 영양사 권한, 본인 소속 학교 한정. 학생 총원, 성별 분포, 학년별 분포(grade_no → count) JSON. 알레르기 19종 카드(T-080)와는 분리. In-memory 캐시 30분.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-121, T-024

## T-127. [BE] NEIS 학교 검색 공개 API
- **설명**: `GET /neis/schools?q=` — NEIS `schoolInfo` 엔드포인트 호출. 결과: 학교명·주소·시도교육청 코드(ATPT_OFCDC_SC_CODE)·표준학교코드(SD_SCHUL_CODE). 영양사 권한. 응답 캐시 30분(키워드 단위). 클라이언트 자동완성용.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-059

## T-128. [BE] NEIS 참고가격 카탈로그 빌더 서비스
- **설명**: 영양사 소속 학교 기준 NEIS 과거 메뉴 이력(최근 12개월) 수집 → 메뉴명에서 핵심 키워드 추출 → 카테고리·키워드별 참고 단가표 사전화. 1차 데이터 출처는 NEIS `mealServiceDietInfo` 응답 내 단가 필드(존재 시), 없으면 정적 키워드→단가 테이블(seed)로 fallback. `meal_price_catalog`(org_id, keyword, category, avg_price, sample_count) 또는 in-memory 1일 캐시. AI 프롬프트 컨텍스트로 주입할 어댑터 제공.
- **우선순위**: Medium
- **난이도**: 5 SP
- **선행 작업**: T-059

## T-129. [BE] 식단 생성 조건 기본값 계산 서비스
- **설명**: 한국인 영양섭취기준표(연령대×성별 kcal/일, M12 입력 명세 표) 상수화 → T-126 학교 분포(성별·연령)와 가중평균하여 일 평균 칼로리 초기값 산출. 탄/단/지(60/20/20 %E), 칼슘(300mg), 나트륨(400mg)은 정적 기본값. `GET /meals/conditions/defaults` 엔드포인트로 노출.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-121, T-126

## T-130. [BE] AI 식단 생성 입력 스키마 확장 — 동적 영양소·주 단위 검증·단가 제약
- **설명**: `POST /ai/generate-meal-plan` 입력 스키마 확장:
  - `nutrients: Array<{ key, label, target, unit, mode: 'absolute' | 'percent_of_energy' }>` — 영양소 항목 동적(기본 6종 + 사용자 추가/삭제). target은 **일 평균 제공량**.
  - `priceConstraint: { period: 'month' | 'week' | 'day', aggregation: 'avg' | 'total', value: number }` → 내부에서 1식당 단가로 정규화.
  - 후처리 검증: 생성된 식단의 **주 단위 영양소 총합이 (일 평균 target × 7) 기준 ±10% 이내**인지 확인, 실패 시 1회 재요청. 단가 제약은 T-128 카탈로그를 컨텍스트로 주입.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-064, T-128, T-129

## T-131. [FE] 영양사 대시보드 — 수요 집계 화면과 통합
- **설명**: 기존 `NutritionistDashboardPage`(`/dashboard`)와 `AnalyticsDashboardPage`(`/analytics`)를 통합. 수요 집계 뷰(도넛/바 차트)를 메인 본문으로, 기존 알림·식단·설문 요약 카드를 상단 위젯 영역으로 흡수. 학교 정보 카드(이름·총원·성별 분포·학년별 분포 — T-126) 신규 추가. 라우트는 `/dashboard` 유지, `/analytics`는 `/dashboard`로 301 리다이렉트. NutritionistDashboardPage 컴포넌트 제거.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-084, T-085, T-126

## T-132. [FE] AI 식단 생성 화면 — 조건 입력 UI 재구성
- **설명**: SCR-011 폼 리뉴얼.
  - 영양소 항목: 기본 6종(칼로리/탄/단/지/Ca/Na) 카드 + "항목 추가/삭제" 버튼. 추가 항목은 라벨·단위·target 직접 입력. 기본 항목도 삭제 가능.
  - 칼로리·탄단지 초기값은 탭 로드 시 T-129 default API로 자동 채움 + "재계산" 버튼.
  - NEIS 학교 검색 박스: 탭 로드 시 영양사 소속 학교 자동 선택, 다른 학교 선택 시 자동완성(T-127) 리스트박스로 검색·선택.
  - 단가 입력: "월/주/일" × "평균/총합" 셀렉트 + 금액 인풋, 1식당 단가 환산 미리보기.
  - 제출 시 T-130 스키마로 매핑.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-067, T-127, T-129, T-130

---

# M13. 버그 수정 & UX 개선

> **배경**: M12 이후 식단 입력·대체식단·AI 생성 결과 플로우에서 발견된 구조적 버그와 UX 결함을 우선순위별로 수정한다.  
> **1순위** (블로커) → **2순위** (1순위 완료 후 시작) → **3순위** (선택 사항 UI 개선) 순으로 진행.

---

## 🔴 1순위 — 블로커 버그 (반드시 해결)

## T-133. [DB/BE] meal_items 식재료(ingredients) 컬럼 추가 + 자동 태깅 OR 매핑
- **설명**: `meal_items` 테이블에 `ingredients String?` 컬럼 추가 (Prisma migration). `POST /meals`, `PUT /meals/:id` API 입력 스키마(Zod)에 `ingredients` 필드 추가. 기존 T-033 자동 태깅 서비스를 수정하여 **메뉴명 키워드 매칭** OR **식재료 키워드 매칭** 두 경로를 합집합으로 처리 — 어느 한 쪽이라도 알레르기 유발 식재료가 감지되면 태깅(보수적 정책). `is_auto_tagged=true` 유지.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-033, T-012

## T-134. [FE] MealItemFormModal — 식단 항목 입력 공통 컴포넌트
- **설명**: 수동 식단 입력·대체식단 추가·AI 결과 편집 세 곳이 **동일한 입력 필드**를 공유하도록 단일 `MealItemFormModal` 컴포넌트를 작성한다. 필드: 카테고리(밥/국/반찬/후식 select), 메뉴명(text), 식재료(콤마 구분 text — T-133 신규 필드), 칼로리(number), 탄수화물·단백질·지방(number). props: `initialValues`, `onSave(item)`, `onCancel`. 기존 수동 입력 모달·대체식단 폼·AI 결과 편집 UI는 이 컴포넌트로 교체한다.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-133, T-037

## T-135. [FE] MealPlanPage 수동 입력 폼 — MealItemFormModal로 교체
- **설명**: 기존 SCR-010 식단 작성/편집 화면의 메뉴 입력 모달을 T-134의 `MealItemFormModal`로 교체한다. 식재료 입력 칸이 포함된 상태로 동작해야 하며, 저장 시 `ingredients` 필드를 함께 전송한다. 기존 중복 폼 코드 제거.
- **우선순위**: High
- **난이도**: 2 SP
- **선행 작업**: T-134

## T-136. [BE] 대체 식단 저장 로직 수정 — 후보 1개 즉시 확정 / 2개 이상 설문 자동 생성
- **설명**: `PUT /alternates/:id/confirm` 또는 신규 엔드포인트 `POST /meals/:mealPlanId/alternates/save`를 수정한다. 영양사가 저장 버튼을 클릭할 때 해당 끼니(meal_plan)에 등록된 대체식단 후보 수를 확인 → **1개**: `status=confirmed` 즉시 저장(설문 없음) → **2개 이상**: T-070 설문 자동 생성 로직 트리거(need_check + menu_vote 설문 2단계 자동 생성). 대상자 산정은 기존 T-070 로직 재사용.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-036, T-070

## T-137. [FE] 대체 식단 관리 화면 — 끼니별 섹션 재구성 + MealItemFormModal 적용
- **설명**: 기존 SCR-012 대체 식단 관리 화면을 **끼니(MealPlan) 단위 섹션**으로 재구성한다. 각 섹션에는 해당 날짜·끼니의 원본 메뉴 목록과 "대체식단 추가" 버튼이 표시된다. "대체식단 추가" 클릭 → `MealItemFormModal` 호출 → 저장 시 후보 리스트에 추가. 저장 버튼 클릭 시 T-136 로직 호출(1개→직접 확정, 2개 이상→설문). 메뉴 단위 대체식단 UI 제거.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-134, T-136

## T-138. [FE] AI 식단 생성 결과 — 끼니별 카드 미리보기 + MealItemFormModal 편집 + 최종 저장
- **설명**: AIMealPlanPage의 결과 표시 섹션을 **날짜×끼니 카드 그리드**로 재구성한다. 각 카드에 메뉴명·칼로리·식재료 요약 표시. 카드 우측 편집 버튼 클릭 → `MealItemFormModal`로 해당 항목 수정. 전체 수정 완료 후 "최종 저장" 버튼 → 편집된 데이터를 `POST /meals` 또는 `PUT /meals/:id`로 일괄 저장. 기존 결과 캘린더 미리보기 컴포넌트는 이 카드 그리드로 대체한다.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-134, T-067

## T-139. [FE/BE] Organization.gradeStructure 기반 학년·반 드롭다운 동적 연동
- **설명**: 현재 학년(1~12)·반 수가 하드코딩되어 있는 문제를 수정한다. `Organization.gradeStructure` JSONB 스키마를 `{ grades: Array<{ grade: number, classCount: number }> }` 형식으로 정의하고 seed 데이터를 실제 학교 구조에 맞게 업데이트한다. `GET /users/me` 응답 및 `GET /auth/verify-org` 응답에 `gradeStructure` 포함. FE 회원가입 폼(T-028)과 프로필 편집 화면(T-125) 양쪽에서 단체 코드 인증 후 `gradeStructure`를 읽어 학년 드롭다운과 반 드롭다운을 동적으로 생성한다. gradeStructure 미설정 단체(비학교 org_type)에서는 학년·반 필드를 숨긴다.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-010, T-122, T-125

---

## 🟡 2순위 — 1순위 완료 후 시작

## T-140. [QA/BE] 이메일·웹 푸시 알림 실동작 검증 및 수정
- **설명**: Railway 운영 환경에서 Resend 이메일 실제 발송 테스트 — API 키, From 주소, 도메인 인증(SPF·DKIM) 설정 확인 및 오류 수정. VAPID 웹 푸시 실제 구독·수신 테스트 — Service Worker 등록, 구독 객체 저장, 알림 수신까지 End-to-End 확인. 실패 케이스에 디버그 로그 추가. Railway Variables에서 `RESEND_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` 누락 여부 체크리스트화.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-050, T-056

## T-141. [BE/FE] 월별 식단 엑셀(xlsx) 내보내기
- **설명**: `GET /meals/export?date=YYYY-MM&format=xlsx` 엔드포인트 추가. `exceljs` 라이브러리로 월간 식단 표(날짜 × 카테고리 행렬) 생성 — 본인 알레르기 해당 메뉴는 셀 배경색 강조. FE 식단 캘린더 화면(SCR-004)과 영양사 식단 편집 화면(SCR-010)에 "엑셀 저장" 버튼 추가. 기존 PDF 버튼과 나란히 배치.
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-034, T-047

## T-142. [FE] MealPlanPage — draft 날짜 강조 + 선택 모드 일괄 공개
- **설명**: 캘린더·슬라이더 뷰에서 `status=draft`인 식단이 있는 날짜에 시각적 표시(점 배지 또는 색상 구분)를 추가한다. 영양사 전용 "선택" 버튼을 노출 → 클릭 시 날짜별 체크박스 모드 진입. 하나 이상 체크 후 "일괄 공개" 버튼 표시 → 선택된 날짜 중 draft 식단이 있는 경우 `PUT /meals/:id/publish`를 순차 호출. 완료 후 캐시 무효화 및 화면 갱신. 모드 종료 시 체크박스 해제.
- **우선순위**: Medium
- **난이도**: 5 SP
- **선행 작업**: T-032, T-037

## T-143. [FE] 로그인 탭 역할 분리 — 탭-역할 불일치 시 접근 차단
- **설명**: SCR-001 로그인 화면의 학생·교직원·보호자·영양사 탭 각각에 허용 `role` 배열을 지정한다. 로그인 성공 후 서버 응답의 `role`이 선택한 탭의 허용 역할 목록에 없으면 로그아웃 처리 후 "이 탭에서 로그인할 수 없는 계정입니다" 안내 화면(또는 403 페이지)으로 라우팅. 인증 인터셉터에서 처리하지 않고 **로그인 응답 직후** 탭-역할 매핑을 클라이언트에서 검증.
- **우선순위**: Medium
- **난이도**: 2 SP
- **선행 작업**: T-027, T-026

## T-144. [FE] MealPlanPage AI 초안 버튼 활성화 + AIMealPlanPage 기간 파라미터 연동
- **설명**: 캘린더·슬라이더 뷰에서 날짜가 하나 이상 선택된 경우에만 "AI 초안 생성" 버튼을 활성화한다(현재 항상 비활성). 버튼 클릭 시 선택된 날짜 배열에서 최솟값·최댓값을 추출해 `startDate`·`endDate` query parameter로 AIMealPlanPage(`/ai-meal-plan?startDate=&endDate=`)로 이동. AIMealPlanPage는 로드 시 해당 파라미터로 기간 입력 필드를 자동 채운다. 연속되지 않은 날짜 선택 시에도 첫 날짜~마지막 날짜로 정규화하여 전달.
- **우선순위**: Medium
- **난이도**: 3 SP
- **선행 작업**: T-067, T-037

## T-145. [FE/BE] AIMealPlanPage 주말 포함 여부 옵션 + AI 프롬프트 반영
- **설명**: AIMealPlanPage 조건 입력 폼에 "주말 포함" 체크박스(기본값: 미포함)를 추가한다. T-130 `POST /ai/generate-meal-plan` 입력 스키마에 `includeWeekends: boolean` 필드 추가(Zod). AI 프롬프트 빌더(T-061)에서 `includeWeekends=false`일 때 지정 기간 내 평일만 생성하도록 시스템 프롬프트에 명시. 생성 결과의 날짜 목록도 주말 제외 여부에 맞게 필터링.
- **우선순위**: Medium
- **난이도**: 2 SP
- **선행 작업**: T-130, T-067

## T-146. [DB/BE/FE] User.studentCode 필드 전면 제거
- **설명**: `studentCode`는 비즈니스 로직에 관여하지 않으므로 완전 삭제한다. Prisma migration: `users.student_code` 컬럼 drop. BE: `POST /auth/signup` Zod 스키마, `GET /users/me` 응답 DTO, `PUT /users/me` 스키마에서 `studentCode` 제거. FE: 회원가입 폼(T-028·T-122)의 학번 입력 필드 삭제, 프로필 편집 화면(T-125)의 학번 표시 제거. 관련 타입 정의(TypeScript interface/type) 일괄 정리.
- **우선순위**: Medium
- **난이도**: 2 SP
- **선행 작업**: T-121, T-122, T-125

---

## 🟢 3순위 — 선택적 UI/UX 개선

## T-147. [FE] 네비게이션 바 고정 + 사이드바 레이아웃 재구성
- **설명**: 현재 사이드바에 포함된 로고를 Bootstrap Navbar로 이동시킨다. Navbar를 `fixed-top` 클래스로 화면 상단에 고정하고, 사이드바는 Navbar 높이만큼 `top` 오프셋을 갖도록 CSS를 조정한다. 메인 콘텐츠 영역도 Navbar와 사이드바의 오프셋을 반영해 레이아웃이 겹치지 않도록 수정. 반응형(모바일) 동작 유지. 기존 T-029 공통 레이아웃 컴포넌트를 수정하며, 사이드바 구성 요소는 그대로 유지.
- **우선순위**: Low
- **난이도**: 3 SP
- **선행 작업**: T-029

## T-148. [FE] 로그인·회원가입 비밀번호 표시 토글
- **설명**: 비밀번호 Input 필드 우측에 눈 아이콘 버튼(`react-bootstrap` InputGroup.Text + 아이콘)을 추가한다. 클릭 시 `type="password"` ↔ `type="text"` 토글. 로그인 화면(SCR-001)·회원가입 화면(SCR-002)의 모든 비밀번호 필드에 적용. 아이콘은 Bootstrap Icons `eye` / `eye-slash` 사용.
- **우선순위**: Low
- **난이도**: 1 SP
- **선행 작업**: T-027, T-028

---

---

# M14. 영양사 달력 중심 식단 관리 UX 통합

> **배경**: 현재 영양사 업무 흐름에서 식단표 달력, AI 식단 생성, 대체 식단 생성, 식단 편집 화면이 분리되어 있어 실제 업무 흐름과 맞지 않는다. 영양사는 먼저 달력에서 날짜별 식단 상태를 확인한 뒤, 특정 날짜를 선택하여 일반 식단 편집·AI 생성·대체식단 작성까지 한 화면 흐름에서 처리할 수 있어야 한다.  
> **목표**: 네이버 예약, 여기어때 숙박 관리자 프로그램처럼 달력에서 날짜를 선택하고 해당 날짜의 식단을 바로 관리하는 UX로 재구성한다.

---

## 🔴 1순위 — 달력 중심 식단 관리 구조 통합

## T-149. [FE] MealPlanPage — 영양사 달력 중심 식단 관리 화면 재구성
- **설명**: 기존 SCR-010 식단 작성/편집 화면을 영양사 식단 관리의 메인 화면으로 재구성한다. 월간 또는 주간 달력에서 날짜별 식단 상태를 한눈에 볼 수 있어야 하며, 날짜 클릭 시 해당 날짜의 식단 상세·편집 패널이 열린다. 별도 화면 이동 없이 기존 식단 조회, 직접 편집, AI 식단 생성, 저장, 공개 상태 확인이 가능해야 한다. 기존 `MealPlanPage`, `AIMealPlanPage`, 대체식단 관련 컴포넌트의 중복 UI를 분석하고 가능한 한 기존 컴포넌트와 API 호출 로직을 재사용한다.
- **우선순위**: High
- **난이도**: 8 SP
- **선행 작업**: T-037, T-067, T-134, T-135, T-138, T-142, T-144

## T-150. [FE] 식단 달력 날짜 셀 상태 표시 고도화
- **설명**: 영양사 달력의 각 날짜 셀에 식단 상태를 배지·아이콘·색상·테두리 등으로 명확히 표시한다. 최소 상태값은 `식단 없음`, `draft 식단 있음`, `published 식단 있음`, `AI 생성 초안`, `수정 필요`, `대체식단 필요`, `대체식단 있음`을 포함한다. 날짜 셀은 클릭 가능한 예약/관리형 UI처럼 동작해야 하며, 상태가 많아도 모바일과 데스크톱에서 텍스트가 깨지거나 겹치지 않도록 반응형으로 구현한다.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-034, T-037, T-142, T-149

## T-151. [BE] 월간 식단 조회 응답에 영양사 달력 상태 메타데이터 추가
- **설명**: `GET /meals?school_id=&month=` 또는 영양사 전용 월간 조회 API 응답에 날짜별 상태 메타데이터를 포함한다. 각 날짜는 식단 존재 여부, draft/published 상태, AI 생성 여부, 대체식단 존재 여부, 알레르기 충돌 여부, 대체식단 필요 여부, 충돌 알레르기 목록, 영향받는 학생 수를 반환해야 한다. 기존 T-034 월간 조회 API와 T-051 알레르기 대조 엔진을 우선 재사용하고, 필요 시 `calendarStatus` 형태의 DTO를 추가한다.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-034, T-036, T-051, T-081

## T-152. [BE] 학교 등록 학생 기준 날짜별 알레르기 충돌 판정 API/서비스
- **설명**: 학교에 등록된 학생 중 `confirmed` 상태의 알레르기 정보를 기준으로, 특정 날짜의 식단에 알레르기 유발 음식이 포함되어 있는지 판정하는 서비스를 작성한다. 판정 기준은 MealItem의 알레르기 태그와 학생 UserAllergen의 교집합이다. 결과에는 문제 메뉴, 충돌 알레르기, 영향받는 학생 수, 필요 시 대상 학생 목록을 포함한다. 기존 T-051 알레르기 대조 엔진을 재사용하되, 영양사 달력 표시용으로 월간 단위 일괄 계산이 가능하도록 최적화한다.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-011, T-012, T-033, T-051, T-133

---

## 🟡 2순위 — 선택 날짜 상세 패널과 AI/대체식단 통합

## T-153. [FE] 선택 날짜 식단 상세·편집 패널 구현
- **설명**: 달력에서 날짜를 클릭하면 우측 패널, 하단 패널, 모달, 또는 프로젝트 구조에 가장 자연스러운 방식으로 선택 날짜의 식단 상세·편집 UI를 표시한다. 패널에는 날짜, 식단 상태, 메뉴 목록, 알레르기 태그, 영양 정보, 저장/공개 버튼, AI 생성 버튼, 식단 편집 버튼이 포함되어야 한다. 다른 날짜를 클릭하면 같은 화면에서 선택 날짜만 전환되어 영양사가 빠르게 여러 날짜를 검토할 수 있어야 한다.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-134, T-135, T-149, T-150

## T-154. [FE/BE] 선택 날짜 기반 AI 식단 생성 플로우 내장
- **설명**: AI 식단 생성 기능을 별도 화면 이동 중심이 아니라 선택 날짜 상세·편집 패널 안에서 실행할 수 있도록 통합한다. 선택한 날짜 또는 선택한 날짜 범위를 기준으로 `POST /ai/generate-meal-plan`을 호출하고, 결과는 기존 T-138의 날짜×끼니 카드 미리보기와 `MealItemFormModal` 편집 흐름을 재사용한다. 생성 결과 저장 후 해당 날짜의 알레르기 충돌 여부와 달력 상태를 즉시 갱신한다.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-064, T-067, T-138, T-149, T-153

## T-155. [FE] 대체식단 작성 UI 조건부 렌더링
- **설명**: 대체식단 작성 UI는 항상 노출하지 않고, 선택 날짜가 `대체식단 필요` 또는 `대체식단 있음` 상태일 때만 표시한다. 알레르기 충돌이 없는 날짜에서는 대체식단 작성 영역과 버튼을 숨긴다. 이미 대체식단이 작성된 날짜는 `대체식단 있음` 상태로 표시하고 수정은 가능하게 한다. UI는 기존 T-137의 끼니별 대체식단 섹션과 T-134 `MealItemFormModal`을 재사용한다.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-036, T-134, T-137, T-150, T-152, T-153

## T-156. [FE] 알레르기 충돌 상세 표시 UI
- **설명**: 선택 날짜에 알레르기 충돌이 있는 경우, 식단 상세·편집 패널에서 어떤 메뉴가 문제인지, 어떤 알레르기 항목과 충돌하는지, 영향받는 학생 수가 몇 명인지 표시한다. 가능하면 대상 학생 정보를 접이식 영역 또는 상세 보기로 제공한다. 이 정보는 대체식단 작성 여부 판단의 근거가 되어야 하며, 경고 색상과 아이콘으로 일반 정보와 명확히 구분한다.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-046, T-150, T-152, T-153

## T-157. [FE/BE] 식단 저장·수정 후 알레르기 충돌 상태 자동 재계산
- **설명**: 영양사가 일반 식단을 직접 수정하거나 AI 생성 결과를 저장한 뒤, 해당 날짜의 알레르기 충돌 여부를 다시 계산하여 달력 상태와 상세 패널에 즉시 반영한다. 저장 성공 후 프론트엔드는 월간 식단 상태 캐시를 무효화하거나 선택 날짜 상태를 재조회한다. 백엔드는 MealItem 알레르기 태깅과 충돌 판정 결과가 최신 상태로 반환되도록 보장한다.
- **우선순위**: High
- **난이도**: 3 SP
- **선행 작업**: T-031, T-033, T-051, T-133, T-151, T-152

---

## 🟢 3순위 — 사용성 검증 및 정리

## T-158. [FE] 영양사 식단 관련 라우팅·네비게이션 정리
- **설명**: AI 식단 생성 화면, 대체 식단 관리 화면, 식단 작성/편집 화면이 각각 분리되어 보이는 현재 네비게이션 구조를 점검한다. 최종 UX는 `식단표/달력`을 중심으로 하고, AI 식단 생성과 대체식단 작성은 선택 날짜 편집 흐름 안에서 접근하도록 정리한다. 기존 라우트는 필요 시 유지하되, 영양사의 주 작업 진입점은 달력 중심 화면으로 통일한다.
- **우선순위**: Medium
- **난이도**: 2 SP
- **선행 작업**: T-149, T-154, T-155

## T-159. [QA/FE/BE] 영양사 달력 중심 식단 관리 E2E 시나리오 검증
- **설명**: Playwright 또는 기존 e2e 테스트 구조로 다음 시나리오를 검증한다. (1) 영양사 로그인 → 식단 달력 진입 → 날짜 선택 → 식단 직접 작성 → 저장 → 달력 상태 갱신. (2) 날짜 선택 → AI 식단 생성 → 결과 편집 → 저장 → 알레르기 충돌 재계산. (3) 등록 학생 알레르기와 충돌하는 식단이 있는 날짜가 `대체식단 필요`로 강조됨. (4) 대체식단 필요 날짜에서만 대체식단 작성 UI가 표시됨. (5) 대체식단 저장 후 달력 상태가 `대체식단 있음`으로 변경됨.
- **우선순위**: High
- **난이도**: 5 SP
- **선행 작업**: T-149, T-150, T-152, T-154, T-155, T-157

## T-160. [QA] 영양사 UAT 체크리스트 업데이트
- **설명**: `docs/uat-checklist.md`에 영양사 달력 중심 식단 관리 UX 검증 항목을 추가한다. 체크리스트에는 달력 상태 가시성, 날짜 선택 편집 흐름, AI 생성 내장 흐름, 알레르기 충돌 표시, 대체식단 필요 날짜 강조, 대체식단 UI 조건부 노출, 모바일 반응형 확인을 포함한다.
- **우선순위**: Medium
- **난이도**: 1 SP
- **선행 작업**: T-159

---

## ✅ M14 최종 기대 결과

영양사는 다음 흐름으로 식단을 관리할 수 있어야 한다.

“식단표 달력에서 날짜를 클릭한다 → 해당 날짜 식단을 본다 → 직접 수정하거나 AI로 생성한다 → 저장한다 → 알레르기 충돌 여부가 자동 반영된다 → 대체식단이 필요한 날짜만 달력에서 눈에 띄게 강조된다 → 필요한 날짜에서만 대체식단 작성 UI가 열린다 → 대체식단을 저장한다 → 달력에서 `대체식단 있음` 상태를 확인한다.”

중요: 단순히 기존 화면으로 이동하는 버튼을 추가하는 수준이 아니라, 영양사의 실제 업무 흐름이 `달력 중심`으로 바뀌도록 화면 구조와 컴포넌트 배치를 개선한다.


# 📊 요약 통계

| Phase | Task 수 | 합계 SP | 비고 |
|-------|--------|---------|------|
| M0 셋업·PaaS 인프라 | 8 | 19 | PaaS 채택으로 -4 SP |
| M1 DB | 9 | 20 | Supabase 백업 잡 +1 SP |
| M2 인증·RBAC | 10 | 30 | |
| M3 식단 관리(영양사) | 10 | 39 | |
| M4 식단 조회(이용자) | 10 | 35 | |
| M5 알림 엔진 ⭐ | 8 | 36 | 웹 푸시 구독 +1 SP |
| M6 AI | 9 | 35 | T-059 NEIS API 연동 +3 SP |
| M7 설문·투표 | 8 | 28 | |
| M8 수요 집계 | 6 | 24 | |
| M9 관리자 | 6 | 22 | |
| M10 Phase 2 | 8 | 26 | |
| M11 비기능·QA·배포 | 9 | 36 | Terraform/AWS 제거로 -14 SP |
| M12 관리자/프로필/영양사 화면 보강 | 13 | 40 | 출시 후 보강 마일스톤 |
| M13 버그 수정 & UX 개선 | 16 | 48 | 1순위 7개·2순위 7개·3순위 2개 |
| M14 영양사 달력 중심 식단 관리 UX 통합 | 12 | 52 | 1순위 4개·2순위 5개·3순위 3개 |
| **총계** | **142** | **약 490 SP** | 1 SP ≒ 0.5d → 약 245일 (5인 팀 기준 약 49주) |

> AWS·Terraform 인프라 작업이 빠지고 PaaS 자동화로 전환되면서 M0/M11 합계 SP가 약 18 SP 감소했습니다. 대신 웹 푸시 구독·Supabase 백업 잡 등 일부 신규 작업이 추가되어 순감 약 16 SP입니다.

---

# ⚠️ 주요 가정 (Assumption)

1. **AI 모델**: Anthropic Claude API 우선 사용. OpenAI는 폴백.
2. **알림 채널**: Phase 1에서는 **웹 푸시(VAPID)** + **이메일(Resend)** 2채널, **SMS는 Phase 3** (Twilio 등 별도 PaaS 연동).
3. **모바일**: 별도 네이티브 앱 없이 PWA 기반 반응형 웹 — Service Worker로 웹 푸시 처리.
4. **다국어**: Phase 1 한국어만 — i18n 구조(`react-i18next`)는 미리 도입.
5. **결제·과금**: 본 PRD에 미언급 — 대상 외.
6. **Bootstrap 버전**: 5.x + `react-bootstrap` 2.x.
7. **데이터베이스**: **Supabase PostgreSQL** (관리형 Postgres, PgBouncer Pooled + Direct 두 종류 연결). 자체 운영 RDS·Multi-AZ는 미사용.
8. **ORM**: **Prisma 5** (`schema.prisma`에 `directUrl` 명시 필수).
9. **인증**: JWT(Access 15분 / Refresh 7일 httpOnly + Secure + SameSite=None 쿠키 — Vercel↔Railway 크로스 도메인 대응). OAuth 미적용. **Supabase Auth는 사용하지 않음**(Express에서 자체 JWT 발급).
10. **알레르기 19종**: 식약처 식품위생법 시행규칙 기준 (난류·우유·메밀·땅콩·대두·밀·고등어·게·새우·돼지고기·복숭아·토마토·아황산류·호두·닭고기·쇠고기·오징어·조개류·잣).
11. **호스팅**: **Frontend → Vercel**, **Backend → Railway**, **DB → Supabase**. AWS·GCP·자체 VPC 미사용.
12. **큐/스케줄**: Phase 1은 **node-cron** (Railway 상주 프로세스). 트래픽 증가 시 BullMQ + Railway Redis Plugin으로 마이그레이션.
13. **파일 저장**: 식단 이미지 등은 **Supabase Storage**.

---

# 🚦 권장 진행 순서 (Critical Path)

```
M0 (PaaS 셋업)
  → M1 (Supabase + Prisma 스키마)
    → M2 (인증·RBAC) ─┬→ M3 (식단 관리) ─┐
                       ├→ M4 (식단 조회) ─┤
                       │                   ├→ M5 (알림 엔진) ⭐
                       │                   │
                       │                   └→ M6 (AI) → M7 (설문)
                       │                                   │
                       │                                   └→ M8 (수요 집계)
                       │
                       └→ M9 (관리자)
                            │
                            └→ M10 (Phase 2) → M11 (배포·QA)
```

**MVP 출시 기준 Critical Path**: M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M11