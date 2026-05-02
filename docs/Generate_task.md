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
| **총계** | **101** | **약 350 SP** | 1 SP ≒ 0.5d → 약 175일 (5인 팀 기준 약 35주) |

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