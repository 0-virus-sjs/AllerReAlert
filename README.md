# 🍽️ Aller Re Alert — 학교급식 알레르기 관리 시스템

> 학교급식에서 **알레르기 보유 학생·교직원의 안전을 보장**하고, **영양사의 식단 작성 업무를 AI로 보조**하며, **대체식 수요를 설문·투표로 자동 집계**하는 웹 애플리케이션입니다.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel)](https://vercel.com/)
[![Railway](https://img.shields.io/badge/Railway-Backend-0B0D0E?logo=railway)](https://railway.app/)

---

## 📑 목차

- [프로젝트 소개](#-프로젝트-소개)
- [핵심 기능](#-핵심-기능)
- [기술 스택](#-기술-스택)
- [시스템 아키텍처](#-시스템-아키텍처)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [환경 변수](#-환경-변수)
- [API 엔드포인트](#-api-엔드포인트)
- [개발 로드맵](#-개발-로드맵)
- [테스트](#-테스트)
- [배포](#-배포)
- [기여 가이드](#-기여-가이드)
- [라이선스](#-라이선스)

---

## 🎯 프로젝트 소개

### 해결하려는 문제

| # | 문제 | 대상 |
|---|------|------|
| P1 | 알레르기 보유자가 매일 식단표를 수동 확인 → 인적 오류로 알레르기 식품 섭취 위험 | 학생·교직원 |
| P2 | 대체식이 제공되어도 메뉴 선택권이 없음 → 만족도 저하 | 학생·교직원 |
| P3 | 영양사가 정규 식단 + 대체 식단을 이중으로 작성 → 업무 과중 | 영양사 |
| P4 | 알레르기 보유 인원·유형 파악이 수동 → 대체식 수량 산정 부정확 | 영양사 |

### 해결 전략

- **알레르기 알림 엔진**: 식단 × 개인 알레르기 정보 자동 대조 → 사전 알림 발송
- **설문·투표 모듈**: 대체식 메뉴를 이용자가 직접 선택
- **AI 식단 생성**: 영양 균형·예산·계절을 반영한 식단 초안 자동 생성
- **수요 대시보드**: 일별 대체식 수요 자동 집계

---

## ✨ 핵심 기능

### 👨‍🎓 학생 / 교직원
- 식품위생법 기준 19종 알레르기 유발물질 등록·관리
- 일간 / 주간 / 월간 식단 캘린더 조회 (본인 알레르기 자동 하이라이트)
- 급식 전 알레르기 사전 알림 수신 (웹 푸시 / 이메일)
- 대체식 필요 여부 응답 및 메뉴 투표

### 👪 보호자
- 자녀 알레르기 정보 승인 / 반려
- 자녀 알림 동시 수신

### 🍳 영양사
- 월간 식단표 작성·공개·예약 공개
- AI 기반 정규 식단 초안 생성 (30초 이내)
- AI 기반 대체 식단 자동 제안 (10초 이내)
- 알레르기 유발물질 자동 태깅 + 수동 보정
- 설문·투표 관리 및 결과 집계
- 알레르기 보유자 현황 / 일별 수요 대시보드

### 🛠️ 관리자
- 학교 정보·사용자 계정·알레르기 마스터 데이터 관리
- 시스템 로그 조회

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 18, Vite, TypeScript, React Router, React Bootstrap, Bootstrap 5, TanStack Query, Zustand, Axios |
| **Frontend Hosting** | **Vercel** (정적 빌드 + Edge Network, 자동 HTTPS, 미리보기 배포) |
| **Backend** | Node.js 20, **Express 4**, TypeScript, Zod (요청 검증), JWT |
| **Backend Hosting** | **Railway** (컨테이너 기반 상시 실행, 자동 빌드·배포, 환경 변수 관리) |
| **ORM** | **Prisma 5** (마이그레이션, 타입 세이프 쿼리) |
| **Database** | **Supabase PostgreSQL** (관리형 Postgres, 자동 백업, 커넥션 풀링 — PgBouncer) |
| **파일 저장소** | Supabase Storage (식단 이미지 등) |
| **스케줄링 / 큐** | `node-cron` (정기 알림 트리거) + 옵션: Railway Redis Plugin + BullMQ |
| **AI** | Anthropic Claude API (OpenAI 폴백) |
| **알림 발송** | Resend (Email), Web Push API (브라우저 푸시) — 옵션: Twilio (SMS) |
| **CI/CD** | GitHub Actions (lint·test) + Vercel·Railway 자동 배포 |
| **Monitoring** | Sentry (FE / BE 에러), Railway 로그, Vercel Analytics |
| **Testing** | Vitest, Supertest, Playwright, k6 |

> **인프라 운영 철학**: AWS·Terraform·ECS 같은 자체 운영 인프라 대신 **PaaS 3종(Vercel·Railway·Supabase)**으로 운영 부담을 최소화하고, 코드와 제품 가치에 집중합니다.

---

## 🏗️ 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                          사용자                              │
│        (학생 / 교직원 / 보호자 / 영양사 / 관리자)            │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
                             ▼
                ┌──────────────────────────┐
                │   React App on Vercel    │
                │   (Vite 빌드 + Edge CDN) │
                │   - SPA 라우팅           │
                │   - JWT 보관 (메모리/쿠키)│
                └────────────┬─────────────┘
                             │ HTTPS / REST (JSON)
                             │ Authorization: Bearer <JWT>
                             ▼
                ┌──────────────────────────┐
                │  Express API on Railway  │
                │  ┌────────────────────┐  │
                │  │  Routes / Zod 검증 │  │
                │  ├────────────────────┤  │
                │  │  RBAC 미들웨어     │  │
                │  ├────────────────────┤  │
                │  │  Service Layer     │  │
                │  │ ┌────────────────┐ │  │
                │  │ │ 알레르기 엔진⭐ │ │  │
                │  │ ├────────────────┤ │  │
                │  │ │  AI 어댑터     │ │  │
                │  │ ├────────────────┤ │  │
                │  │ │  알림 디스패처 │ │  │
                │  │ ├────────────────┤ │  │
                │  │ │ node-cron 잡   │ │  │
                │  │ └────────────────┘ │  │
                │  └─────────┬──────────┘  │
                │            │ Prisma      │
                └────────────┼─────────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │   Supabase PostgreSQL    │
                │  - 관리형 Postgres       │
                │  - PgBouncer (Pooled)    │
                │  - 자동 백업 / PITR      │
                └──────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  ┌─────────────┐    ┌──────────────┐     ┌──────────────┐
  │   Resend    │    │  Web Push    │     │  Claude API  │
  │   (Email)   │    │  (브라우저)  │     │   (AI)       │
  └─────────────┘    └──────────────┘     └──────────────┘
```

### 호출 흐름 요약

```
Client (React on Vercel)
   ─ HTTPS REST ─►  Express API (Railway)
                       ─ Prisma ─►  Supabase PostgreSQL
```

### 핵심 비즈니스 로직 — 알레르기 알림 엔진

```
[node-cron 스케줄러 — 급식 N시간 전 실행 (Railway 상주 프로세스)]

1. 당일 공개된 식단(MealPlan, status=published) 조회 (Prisma)
2. 식단의 알레르기 태그 수집 → meal_allergens
3. 학교 내 confirmed UserAllergen 전체 조회
4. 각 이용자별 교집합 계산: matched = user_allergens ∩ meal_allergens
5. matched가 있는 이용자에게:
   - Notification 레코드 생성 (Supabase Postgres)
   - 웹 푸시 / 이메일 발송 (이용자 설정에 따라)
   - 학생인 경우 보호자에게도 동일 알림
6. 발송 결과 로깅 (Sentry breadcrumbs + Railway 로그)
```

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 20.x 이상
- npm 10.x 이상
- Git
- Supabase 계정 (무료 플랜으로 시작 가능)
- (선택) Vercel / Railway 계정 — 배포 시점에 필요

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/AllerReAlert.git
cd AllerReAlert
```

### 2. Supabase 프로젝트 준비

1. [Supabase](https://supabase.com/) 대시보드에서 새 프로젝트 생성
2. **Project Settings → Database → Connection string**에서 두 종류의 URL 복사
   - **Connection pooling (PgBouncer, 6543 포트)**: 런타임용 → `DATABASE_URL`
   - **Direct connection (5432 포트)**: 마이그레이션용 → `DIRECT_URL`

### 3. 환경 변수 설정

```bash
# 클라이언트
cp client/.env.example client/.env

# 서버
cp server/.env.example server/.env
```

각 `.env` 파일에 필요한 값을 입력합니다 ([환경 변수](#-환경-변수) 섹션 참고).

### 4. 의존성 설치

```bash
# 클라이언트
cd client
npm install

# 서버
cd ../server
npm install
```

### 5. DB 마이그레이션 & 시드 데이터

```bash
cd server
npx prisma migrate dev          # Supabase Postgres에 스키마 반영
npx prisma db seed              # 시드 데이터 주입
npx prisma generate             # Prisma Client 재생성
```

시드로 알레르기 19종 + 샘플 학교 1곳 + 역할별 테스트 계정 5종이 생성됩니다.

### 6. 개발 서버 기동

```bash
# 서버 (포트 4000)
cd server
npm run dev

# 클라이언트 (포트 5173) — 새 터미널
cd client
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 학생 | student@test.com | Test1234! |
| 보호자 | guardian@test.com | Test1234! |
| 영양사 | nutritionist@test.com | Test1234! |
| 교직원 | staff@test.com | Test1234! |
| 관리자 | admin@test.com | Test1234! |

---

## 📁 프로젝트 구조

```
AllerReAlert/
├── client/                       # React 프론트엔드 (Vercel 배포)
│   ├── src/
│   │   ├── pages/               # 화면 컴포넌트 (SCR-001 ~ SCR-015)
│   │   ├── components/
│   │   │   ├── common/          # 공통 UI (Button, Modal 등)
│   │   │   └── domain/          # 도메인 (MealCard, AllergenBadge 등)
│   │   ├── hooks/               # 커스텀 훅
│   │   ├── services/            # Axios 기반 API 클라이언트
│   │   ├── stores/              # Zustand 스토어
│   │   ├── types/               # TypeScript 타입
│   │   └── utils/
│   ├── public/
│   ├── vercel.json              # Vercel 라우팅 / 헤더 설정
│   └── package.json
│
├── server/                       # Express 백엔드 (Railway 배포)
│   ├── src/
│   │   ├── routes/              # API 라우트
│   │   ├── controllers/         # 컨트롤러
│   │   ├── services/            # 비즈니스 로직
│   │   │   ├── allergy-engine/  # ⭐ 알레르기 알림 엔진
│   │   │   ├── ai/              # Claude / OpenAI 어댑터
│   │   │   └── notification/    # 알림 발송 (Resend / Web Push)
│   │   ├── middlewares/         # RBAC, 에러 핸들러, 요청 검증
│   │   ├── jobs/                # node-cron 스케줄 잡
│   │   ├── lib/
│   │   │   └── prisma.ts        # PrismaClient 싱글턴
│   │   ├── utils/
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma        # DB 스키마 (Supabase Postgres 대상)
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── tests/                   # 단위 / 통합 테스트
│   ├── railway.json             # Railway 빌드·헬스체크 설정
│   └── package.json
│
├── docs/
│   ├── create_prd.md            # PRD
│   ├── Generate_task.md         # 작업 분해 문서
│   └── api/                     # API 명세
│
├── .github/
│   └── workflows/               # CI 파이프라인 (lint / test)
│
└── README.md
```

---

## 🔐 환경 변수

### `server/.env` (Railway에서는 동일 키를 환경 변수로 등록)

```env
# 서버
NODE_ENV=development
PORT=4000

# Supabase Postgres
# 런타임 쿼리는 Pooled Connection (PgBouncer, 6543) 사용
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Prisma Migrate / Introspect는 Direct Connection (5432) 필요
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 암호화 (알레르기 정보 AES-256)
ENCRYPTION_KEY=your-32-byte-key

# AI
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# 이메일 (Resend)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM="allerrealert <noreply@allerrealert.kr>"

# 웹 푸시 (VAPID)
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:contact@allerrealert.kr

# Supabase Storage (선택: 식단 이미지 업로드)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# CORS — Vercel 도메인 허용
CORS_ORIGIN=https://allerrealert.vercel.app,http://localhost:5173

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

> 💡 **Prisma + Supabase 팁**: Supabase는 **트랜잭션 모드 PgBouncer**를 사용하므로 `schema.prisma`의 `datasource db`에 `url = env("DATABASE_URL")` 와 `directUrl = env("DIRECT_URL")` 을 함께 지정해야 마이그레이션이 정상 동작합니다.

### `client/.env` (Vercel에서는 동일 키를 Project Settings → Environment Variables에 등록)

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1   # 운영: https://api.allerrealert.kr/api/v1
VITE_VAPID_PUBLIC_KEY=xxx                        # 웹 푸시 구독용
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 🌐 API 엔드포인트

Base URL: `/api/v1`
인증: `Bearer Token (JWT)`
응답 형식: `{ success, data, error, meta }`

### 인증
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/signup` | 회원가입 |
| POST | `/auth/login` | 로그인 |
| POST | `/auth/refresh` | 토큰 갱신 |
| POST | `/auth/verify-school` | 학교코드 인증 |

### 사용자 / 알레르기
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/users/me` | 내 프로필 조회 |
| PUT | `/users/me` | 프로필 수정 |
| GET | `/users/me/allergens` | 내 알레르기 목록 |
| POST | `/users/me/allergens` | 알레르기 등록 |
| PUT | `/users/me/allergens/:id` | 알레르기 수정 |
| DELETE | `/users/me/allergens/:id` | 알레르기 삭제 |

### 보호자
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/guardian/children` | 자녀 목록 |
| GET | `/guardian/children/:id/allergens` | 자녀 알레르기 조회 |
| PUT | `/guardian/approvals/:id` | 알레르기 승인 / 반려 |

### 식단
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/meals?school_id=&month=` | 월간 식단 조회 |
| GET | `/meals/:id` | 식단 상세 |
| POST | `/meals` | 식단 생성 (영양사) |
| PUT | `/meals/:id` | 식단 수정 (영양사) |
| DELETE | `/meals/:id` | 식단 삭제 (영양사) |
| PUT | `/meals/:id/publish` | 식단 공개 (영양사) |
| GET | `/meals/:id/allergen-check` | 알레르기 대조 결과 |

### 대체 식단
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/meals/:id/alternates` | 대체 식단 목록 |
| POST | `/meals/:id/alternates` | 대체 식단 생성 |
| PUT | `/alternates/:id/confirm` | 대체 식단 확정 |

### AI
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/ai/generate-meal-plan` | AI 정규 식단 초안 생성 |
| POST | `/ai/suggest-alternates` | AI 대체 메뉴 제안 |
| POST | `/ai/recalculate-nutrition` | 영양 정보 재계산 |

### 설문 / 투표
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/surveys?meal_plan_id=` | 설문 목록 |
| POST | `/surveys` | 설문 생성 |
| GET | `/surveys/:id` | 설문 상세 + 결과 |
| POST | `/surveys/:id/responses` | 응답 / 투표 |
| PUT | `/surveys/:id/close` | 설문 마감 |

### 알림
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/notifications` | 알림 목록 |
| PUT | `/notifications/:id/read` | 읽음 처리 |
| POST | `/notifications/web-push/subscribe` | 웹 푸시 구독 등록 |
| PUT | `/notifications/settings` | 알림 채널 설정 변경 |

### 수요 집계
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/analytics/allergy-overview` | 알레르기 보유자 현황 |
| GET | `/analytics/daily-demand?month=` | 일별 대체식 수요 |
| GET | `/analytics/report?month=` | 월간 운영 리포트 |
| GET | `/analytics/export?format=csv` | 데이터 내보내기 |

### 관리자
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET / POST / PUT | `/admin/schools` | 학교 관리 |
| GET | `/admin/users?school_id=` | 사용자 목록 |
| PUT | `/admin/users/:id/role` | 역할 변경 |
| PUT | `/admin/users/:id/status` | 계정 활성 / 비활성 |
| GET / POST / PUT / DELETE | `/admin/allergens` | 알레르기 마스터 |
| GET | `/admin/logs` | 시스템 로그 |

### 헬스체크
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | Liveness — Railway 헬스체크용 |
| GET | `/health/ready` | Readiness — Prisma DB 연결 확인 |

---

## 🗺️ 개발 로드맵

### Phase 1 — MVP (필수 기능)
- ✅ 인증·사용자·RBAC
- ✅ 식단 CRUD + 알레르기 자동 태깅
- ✅ 식단 조회 + 알레르기 하이라이트
- ✅ 알레르기 알림 엔진 (일일 / 변경)
- ✅ AI 식단 생성 + 대체 제안
- ✅ 설문·투표
- ✅ 수요 집계 대시보드
- ✅ 관리자 패널

### Phase 2 — 품질 향상 (권장)
- 🔄 보호자 승인 플로우
- 🔄 알림 채널·시간 설정
- 🔄 보호자 동시 알림
- 🔄 AI 수정 시 영양 재계산
- 🔄 감사 로그 / 시스템 로그 강화
- 🔄 접근성 강화 (WCAG 2.1 AA)

### Phase 3 — 확장 (선택)
- ⏳ AI 이력 학습
- ⏳ 월간 운영 리포트
- ⏳ 다국어 지원
- ⏳ Twilio SMS 채널 추가

상세 작업 분해는 [`docs/Generate_task.md`](docs/Generate_task.md) 참고.

---

## 🧪 테스트

### 단위 / 통합 테스트

```bash
cd server
npm test                    # 전체 테스트
npm run test:unit           # 단위 테스트
npm run test:integration    # 통합 테스트 (Supabase 테스트 스키마 사용)
npm run test:coverage       # 커버리지 리포트
```

핵심 모듈(알레르기 알림 엔진, AI 검증, RBAC)은 90% 이상 커버리지 유지.

> 통합 테스트는 Supabase 프로젝트 내 별도 스키마(`test`) 또는 무료 플랜의 별도 프로젝트를 사용해 운영 데이터와 격리합니다.

### E2E 테스트 (Playwright)

```bash
npm run test:e2e
```

자동화된 시나리오:
1. 알레르기 등록 → 당일 식단 알림 발송 확인
2. 공개 식단 수정 → 실시간 변경 알림 발송 확인
3. AI 식단 생성 → 제외 식재료 미포함 검증
4. 대체식 설문 → 투표 → 마감 → 결과 집계
5. 14세 미만 학생 + 보호자 미승인 → 알림 미발송 검증

### 부하 테스트 (k6)

```bash
npm run test:load
```

기준: 동시 500명 접속, p95 응답 시간 2초 이내. 부하 테스트 시 Supabase 커넥션 풀 한계와 Railway 인스턴스 스펙(메모리·CPU)을 함께 모니터링합니다.

---

## 🚢 배포

### 환경 구분
- **dev** — 로컬 개발자 환경
- **staging** — Vercel Preview + Railway Staging 서비스 + Supabase Staging 프로젝트
- **prod** — Vercel Production + Railway Production 서비스 + Supabase Production 프로젝트

### 배포 흐름

```
PR 생성
  └─ GitHub Actions: lint / unit test / type-check
  └─ Vercel: 자동 Preview 배포 (client)
  └─ Railway: PR 환경 (옵션) 또는 staging 서비스에서 검증

main 머지
  └─ Vercel:  Production 자동 배포 (client)
  └─ Railway: Production 서비스 자동 빌드 & 롤아웃 (server)
              ├─ release 단계: `prisma migrate deploy`
              └─ 헬스체크 통과 후 트래픽 전환
```

### 프론트엔드 (Vercel)

1. Vercel 프로젝트 생성 후 `client/` 디렉터리를 Root로 지정
2. Build Command: `npm run build`, Output Directory: `dist`
3. Project Settings → Environment Variables에 `VITE_*` 키 등록
4. 커스텀 도메인 연결 (예: `allerrealert.kr`) — Vercel이 ACM 인증서 자동 발급

### 백엔드 (Railway)

1. Railway 프로젝트 생성 후 GitHub 저장소 연결, 서비스 Root를 `server/`로 지정
2. **Variables**에 `server/.env`의 모든 키 등록 (`DATABASE_URL`, `DIRECT_URL` 포함)
3. **Settings → Deploy**
   - Build Command: `npm ci && npx prisma generate && npm run build`
   - Pre-Deploy / Release Command: `npx prisma migrate deploy`
   - Start Command: `node dist/server.js`
   - Healthcheck Path: `/api/v1/health`
4. 커스텀 도메인 연결 (예: `api.allerrealert.kr`)

### 데이터베이스 (Supabase)

- 환경별로 **별도 Supabase 프로젝트** 사용 (staging / production)
- **Database → Backups**: 무료 플랜 일일 백업, Pro 플랜에서 PITR(Point-in-Time Recovery) 활성화
- **Database → Roles**: 운영 시 서비스 역할 키와 익명 키를 분리 관리
- 마이그레이션은 항상 `prisma migrate deploy`로 자동화 (수동 SQL 변경 금지)

### 가용성 / 백업
- **가용률 목표**: 99.5% 이상 (학기 중)
- **백업**: Supabase 자동 백업 (일 1회) + 주요 마일스톤 시 수동 SQL Dump (`pg_dump`) 보관
- **롤백**: Railway는 이전 빌드로 즉시 원복 가능, Vercel은 이전 배포 즉시 활성화 가능

---

## 🔒 보안

- **암호화**: 알레르기 정보 AES-256 컬럼 암호화 / 전송 TLS 1.2 이상 (Vercel·Railway·Supabase 모두 기본 제공)
- **인증**: JWT (Access 15분 / Refresh 7일 httpOnly 쿠키)
- **RBAC**: Express 라우트 레벨 미들웨어 적용
- **CORS**: Express에서 Vercel 도메인만 허용 (`CORS_ORIGIN` 화이트리스트)
- **Rate Limit**: `express-rate-limit`로 IP당 분당 호출 제한
- **시크릿 관리**: Railway / Vercel / Supabase의 환경 변수 저장소 사용 (Git에 절대 커밋 금지)
- **감사 로그**: 민감 작업 1년 보관 (Supabase Postgres `audit_log` 테이블)
- **개인정보**: 14세 미만 학생 → 법정대리인 동의 필수
- **로그 마스킹**: 알레르기 정보가 평문으로 Railway 로그에 노출되지 않도록 처리

---

## 🤝 기여 가이드

### 브랜치 전략

```
main          # 운영 브랜치 (→ Vercel/Railway prod 자동 배포)
└── develop   # 개발 통합 브랜치 (→ staging 자동 배포)
    └── feature/FR-XXX-기능설명
    └── fix/이슈번호-설명
    └── chore/작업설명
```

### 커밋 메시지 (Conventional Commits)

```
feat: 알레르기 자동 태깅 서비스 추가
fix: 알림 발송 시 보호자 누락 버그 수정
chore: ESLint 룰 업데이트
docs: API 명세서 업데이트
test: 알림 엔진 단위 테스트 추가
```

### 코딩 컨벤션
- **언어**: TypeScript (strict mode)
- **린터**: ESLint + Prettier
- **파일명**: kebab-case (`meal-plan.service.ts`)
- **컴포넌트명**: PascalCase (`MealCalendar.tsx`)
- **API 응답**: `{ success, data, error, meta }` 형식 통일
- **Prisma 모델명**: PascalCase 단수형 (`MealPlan`, `UserAllergen`)

### PR 체크리스트
- [ ] 단위 테스트 작성
- [ ] RBAC 미들웨어 적용 (해당 시)
- [ ] 민감 정보 로그 노출 검토
- [ ] 알레르기 정보 암호화 적용 (해당 시)
- [ ] Prisma 마이그레이션 포함 (DB 변경 시) — `prisma migrate dev --name <설명>`
- [ ] 환경 변수 추가 시 `.env.example` 업데이트

---

## 📚 관련 문서

- [📋 PRD (제품 요구사항 정의서)](docs/create_prd.md)
- [✅ 작업 분해 문서](docs/Generate_task.md)
- [📡 API 명세](docs/api/)

---

## 📄 라이선스

MIT License — [LICENSE](LICENSE) 파일 참조.

---

## 📞 문의

- **이슈 트래커**: [GitHub Issues](https://github.com/your-org/alerrealert/issues)
- **이메일**: contact@allerrealert.kr

---

> ⚠️ **안전 안내**: 본 시스템의 알레르기 알림 엔진은 보조 수단입니다. 알레르기 보유자는 항상 본인의 알레르기 정보를 정확히 등록하고, 급식 섭취 전 식단을 직접 확인하는 습관을 유지하시기 바랍니다.
