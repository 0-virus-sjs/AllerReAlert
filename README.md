# 🍽️ SafePlate — 학교급식 알레르기 관리 시스템

> 학교급식에서 **알레르기 보유 학생·교직원의 안전을 보장**하고, **영양사의 식단 작성 업무를 AI로 보조**하며, **대체식 수요를 설문·투표로 자동 집계**하는 웹 애플리케이션입니다.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![AWS](https://img.shields.io/badge/AWS-Cloud-FF9900?logo=amazonaws)](https://aws.amazon.com/)

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
- 급식 전 알레르기 사전 알림 수신 (푸시 / 이메일 / SMS)
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
| **Frontend** | React 18, Vite, React Router, React Bootstrap, Bootstrap 5, React Query, Zustand, Axios |
| **Backend** | Node.js 20, Express 4, Prisma ORM, JWT, Bull Queue (Redis) |
| **Database** | PostgreSQL 14+ (AWS RDS Multi-AZ) |
| **AI** | Anthropic Claude API (OpenAI 폴백) |
| **알림** | AWS SNS (SMS), AWS SES (Email), Firebase Cloud Messaging (Push) |
| **Infra** | AWS ECS Fargate, S3 + CloudFront, ALB, Route53, ACM, WAF, Secrets Manager |
| **IaC** | Terraform |
| **CI/CD** | GitHub Actions |
| **Monitoring** | AWS CloudWatch, Sentry |
| **Testing** | Jest, Supertest, Playwright, k6 |

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                         사용자                               │
│       (학생 / 교직원 / 보호자 / 영양사 / 관리자)              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                ┌────────▼────────┐
                │   CloudFront    │
                │   (정적 자원)    │
                └────────┬────────┘
                         │
                ┌────────▼────────┐         ┌──────────────┐
                │       ALB       │ ◄─────► │     WAF      │
                └────────┬────────┘         └──────────────┘
                         │
                ┌────────▼────────────────┐
                │   ECS Fargate (Express) │
                │  ┌───────────────────┐  │
                │  │   API Layer       │  │
                │  │   (RBAC 미들웨어)  │  │
                │  ├───────────────────┤  │
                │  │   Service Layer   │  │
                │  │  ┌─────────────┐  │  │
                │  │  │ 알림 엔진 ⭐ │  │  │
                │  │  ├─────────────┤  │  │
                │  │  │  AI 어댑터   │  │  │
                │  │  └─────────────┘  │  │
                │  └───────────────────┘  │
                └─────┬───────────┬───────┘
                      │           │
            ┌─────────▼──┐  ┌─────▼──────┐
            │ RDS        │  │ ElastiCache│
            │ PostgreSQL │  │ Redis      │
            │ Multi-AZ   │  │ (Bull Q)   │
            └────────────┘  └────────────┘
                      │
        ┌─────────────┼──────────────┬─────────────┐
        ▼             ▼              ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌────────────┐
   │   SES   │  │   SNS    │  │   FCM   │  │ Claude API │
   │ (Email) │  │  (SMS)   │  │ (Push)  │  │   (AI)     │
   └─────────┘  └──────────┘  └─────────┘  └────────────┘
```

### 핵심 비즈니스 로직 — 알레르기 알림 엔진

```
[매일 스케줄러 — 급식 N시간 전 실행]

1. 당일 공개된 식단(MealPlan, status=published) 조회
2. 식단의 알레르기 태그 수집 → meal_allergens
3. 학교 내 confirmed UserAllergen 전체 조회
4. 각 이용자별 교집합 계산: matched = user_allergens ∩ meal_allergens
5. matched가 있는 이용자에게:
   - Notification 생성
   - 푸시 / 이메일 / SMS 발송 (이용자 설정에 따라)
   - 학생인 경우 보호자에게도 동일 알림
6. 발송 결과 로깅
```

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 20.x 이상
- npm 10.x 이상
- Docker & Docker Compose (로컬 PostgreSQL / Redis)
- Git

### 1. 저장소 클론

```bash
git clone https://github.com/your-org/safeplate.git
cd safeplate
```

### 2. 환경 변수 설정

```bash
# 루트
cp .env.example .env

# 클라이언트
cp client/.env.example client/.env

# 서버
cp server/.env.example server/.env
```

각 `.env` 파일에 필요한 값을 입력합니다 ([환경 변수](#-환경-변수) 섹션 참고).

### 3. 인프라 (PostgreSQL + Redis) 기동

```bash
docker-compose up -d
```

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
npx prisma migrate dev
npx prisma db seed
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
safeplate/
├── client/                       # React 프론트엔드
│   ├── src/
│   │   ├── pages/               # 화면 컴포넌트 (SCR-001 ~ SCR-015)
│   │   ├── components/
│   │   │   ├── common/          # 공통 UI (Button, Modal 등)
│   │   │   └── domain/          # 도메인 (MealCard, AllergenBadge 등)
│   │   ├── hooks/               # 커스텀 훅
│   │   ├── services/            # API 호출 함수
│   │   ├── stores/              # Zustand 스토어
│   │   ├── types/               # TypeScript 타입
│   │   └── utils/
│   ├── public/
│   └── package.json
│
├── server/                       # Express 백엔드
│   ├── src/
│   │   ├── routes/              # API 라우트
│   │   ├── controllers/         # 컨트롤러
│   │   ├── services/            # 비즈니스 로직
│   │   │   ├── allergy-engine/  # ⭐ 알레르기 알림 엔진
│   │   │   ├── ai/              # AI 어댑터
│   │   │   └── notification/    # 알림 발송 (FCM/SES/SNS)
│   │   ├── middlewares/         # RBAC, 에러 핸들러 등
│   │   ├── jobs/                # Bull Queue 작업
│   │   ├── utils/
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma        # DB 스키마
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── tests/                   # 단위 / 통합 테스트
│   └── package.json
│
├── infra/                        # Terraform IaC
│   ├── modules/
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── README.md
│
├── docs/
│   ├── create_prd.md            # PRD
│   ├── Generate_task.md         # 작업 분해 문서
│   └── api/                     # API 명세
│
├── .github/
│   └── workflows/               # CI/CD 파이프라인
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔐 환경 변수

### `server/.env`

```env
# 서버
NODE_ENV=development
PORT=4000

# DB
DATABASE_URL=postgresql://user:password@localhost:5432/safeplate

# Redis (Bull Queue)
REDIS_URL=redis://localhost:6379

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

# AWS
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_SES_FROM_EMAIL=noreply@safeplate.kr
AWS_SNS_REGION=ap-northeast-2

# Firebase Cloud Messaging
FCM_PROJECT_ID=xxx
FCM_CLIENT_EMAIL=xxx
FCM_PRIVATE_KEY=xxx

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### `client/.env`

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
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
| PUT | `/notifications/settings` | 알림 설정 변경 |

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

상세 작업 분해는 [`docs/Generate_task.md`](docs/Generate_task.md) 참고.

---

## 🧪 테스트

### 단위 / 통합 테스트

```bash
cd server
npm test                    # 전체 테스트
npm run test:unit           # 단위 테스트
npm run test:integration    # 통합 테스트
npm run test:coverage       # 커버리지 리포트
```

핵심 모듈(알레르기 알림 엔진, AI 검증, RBAC)은 90% 이상 커버리지 유지.

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

기준: 동시 500명 접속, p95 응답 시간 2초 이내.

---

## 🚢 배포

### 환경 구분
- **dev**: 개발자 통합 테스트
- **staging**: UAT 및 출시 전 검증
- **prod**: 운영

### 배포 흐름

```
PR 생성
  → CI (lint, test, build)
  → 코드 리뷰 & 머지

develop 머지
  → dev 환경 자동 배포

main 머지
  → staging 자동 배포
  → 승인 게이트
  → prod 배포
```

### 인프라 프로비저닝 (Terraform)

```bash
cd infra/environments/prod
terraform init
terraform plan
terraform apply
```

### 가용성 / 백업
- **가용률 목표**: 99.5% 이상 (학기 중)
- **백업**: RDS 자동 스냅샷 일 1회, 30일 보관, Point-in-Time Recovery 활성화
- **DR 리허설**: 분기 1회

---

## 🔒 보안

- **암호화**: 알레르기 정보 AES-256 컬럼 암호화 / 전송 TLS 1.2 이상
- **인증**: JWT (Access 15분 / Refresh 7일 httpOnly 쿠키)
- **RBAC**: 라우트 레벨 미들웨어 적용
- **WAF**: SQL Injection / XSS 룰
- **감사 로그**: 민감 작업 1년 보관
- **개인정보**: 14세 미만 학생 → 법정대리인 동의 필수
- **로그 마스킹**: 알레르기 정보가 평문으로 로그에 노출되지 않도록 처리

---

## 🤝 기여 가이드

### 브랜치 전략

```
main          # 운영 브랜치
└── develop   # 개발 통합 브랜치
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

### PR 체크리스트
- [ ] 단위 테스트 작성
- [ ] RBAC 미들웨어 적용 (해당 시)
- [ ] 민감 정보 로그 노출 검토
- [ ] 알레르기 정보 암호화 적용 (해당 시)
- [ ] 마이그레이션 스크립트 포함 (DB 변경 시)

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

- **이슈 트래커**: [GitHub Issues](https://github.com/your-org/safeplate/issues)
- **이메일**: contact@safeplate.kr

---

> ⚠️ **안전 안내**: 본 시스템의 알레르기 알림 엔진은 보조 수단입니다. 알레르기 보유자는 항상 본인의 알레르기 정보를 정확히 등록하고, 급식 섭취 전 식단을 직접 확인하는 습관을 유지하시기 바랍니다.
