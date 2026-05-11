# AI 식단 생성 비동기 Job 전환 계획

## 배경

현재 AI 식단 생성은 `POST /ai/generate-meal-plan` 요청 안에서 동기적으로 처리된다.

```txt
POST /ai/generate-meal-plan
  -> generateMealPlan()
    -> 조직 조회
    -> NEIS 이력 조회
    -> 프롬프트 빌드
    -> LLM 호출
    -> JSON/Zod/영양 기준 검증
    -> MealPlan, MealItem 저장
    -> 자동 알레르기 태깅
  -> 201 응답
```

날짜 수가 늘어나면 LLM 출력 JSON이 길어지고, provider timeout 또는 Express 요청 timeout에 걸릴 수 있다. 검증 실패로 재시도까지 발생하면 단일 HTTP 요청 안에서 안정적으로 끝내기 어렵다.

## 목표

HTTP 요청 생명주기에서 장시간 LLM 작업을 분리한다.

```txt
POST /ai/generate-meal-plan
  -> 생성 job 등록
  -> 202 Accepted + jobId 즉시 응답

worker/job processor
  -> job 실행
  -> LLM 식단 생성
  -> DB 저장
  -> job 상태 completed/failed 기록

GET /ai/generate-meal-plan/jobs/:jobId
  -> queued/running/completed/failed 상태 조회
```

1차 목표는 HTTP timeout 제거다. 2차 목표는 날짜 chunk 생성을 통해 LLM timeout, JSON 절단, 검증 실패 범위를 줄이는 것이다.

## 현재 관련 코드

- 라우트: `backend/src/routes/ai.routes.ts`
- 컨트롤러: `backend/src/controllers/ai.controller.ts`
- 생성 서비스: `backend/src/services/ai/ai.service.ts`
- 프롬프트 빌더: `backend/src/services/ai/meal-plan-builder.ts`
- 응답 검증: `backend/src/services/ai/validator.ts`
- provider 선택: `backend/src/services/ai/index.ts`
- Claude 호출: `backend/src/services/ai/claude.adapter.ts`
- OpenAI 호출: `backend/src/services/ai/openai.adapter.ts`

## 신규 DB 모델

Prisma에 작업 상태 테이블을 추가한다.

```prisma
model MealGenerationJob {
  id            String   @id @default(cuid())
  orgId         String
  requestedBy   String
  status        String   // queued, running, completed, failed
  input         Json
  result        Json?
  error         String?
  totalDays     Int?
  completedDays Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

초기 구현에서는 `status`를 `String`으로 둔다. 상태 값이 안정되면 Prisma enum으로 바꾸는 것을 검토한다.

권장 인덱스:

```prisma
@@index([orgId, createdAt])
@@index([status, createdAt])
```

## API 변경안

### 생성 요청

```http
POST /ai/generate-meal-plan
```

현재처럼 입력 조건은 동일하게 받되, 생성 완료 결과 대신 job 정보를 반환한다.

```json
{
  "jobId": "cmabc123",
  "status": "queued"
}
```

HTTP status는 `202 Accepted`를 사용한다.

### 상태 조회

```http
GET /ai/generate-meal-plan/jobs/:jobId
```

처리 중 응답:

```json
{
  "id": "cmabc123",
  "status": "running",
  "totalDays": 20,
  "completedDays": 10,
  "result": null,
  "error": null
}
```

완료 응답:

```json
{
  "id": "cmabc123",
  "status": "completed",
  "totalDays": 20,
  "completedDays": 20,
  "result": {
    "mealPlans": [
      { "id": "meal_plan_id", "date": "2026-05-11", "itemCount": 5 }
    ]
  },
  "error": null
}
```

실패 응답:

```json
{
  "id": "cmabc123",
  "status": "failed",
  "totalDays": 20,
  "completedDays": 5,
  "result": null,
  "error": "AI 응답 JSON 파싱 실패 ..."
}
```

## 신규 파일 구조

```txt
backend/src/services/ai/
  meal-generation-job.service.ts   # job 생성/조회/상태 변경

backend/src/jobs/
  mealGenerationJob.ts             # background processor
```

필요하면 이후에 chunk 전용 파일을 분리한다.

```txt
backend/src/services/ai/
  meal-generation-chunk.service.ts
```

## Job 서비스 책임

`backend/src/services/ai/meal-generation-job.service.ts`

예상 함수:

```ts
enqueueMealPlanGeneration(input, userId, orgId)
getMealGenerationJob(jobId, orgId)
markJobRunning(jobId)
markJobCompleted(jobId, result)
markJobFailed(jobId, error)
updateJobProgress(jobId, completedDays, totalDays)
```

`enqueueMealPlanGeneration()`은 DB에 job을 만들고, worker 실행을 예약한 뒤 `{ jobId, status }`를 반환한다.

## Worker 설계

초기 구현은 in-process worker로 시작할 수 있다.

```ts
setImmediate(() => {
  processMealGenerationJob(job.id).catch(...)
})
```

장점:

- 구현량이 적다.
- 기존 Express 서버 안에서 빠르게 붙일 수 있다.
- Redis/BullMQ 없이도 HTTP timeout 문제를 먼저 제거할 수 있다.

한계:

- 서버 재시작 시 실행 중인 작업이 끊길 수 있다.
- 여러 인스턴스 운영 시 중복 실행 방지가 필요하다.
- 장기적으로는 BullMQ + Redis 같은 큐가 더 안전하다.

운영 안정화 단계에서는 Railway Redis Plugin 또는 별도 Redis와 BullMQ 도입을 검토한다.

## 기존 생성 로직 리팩토링 방향

현재 `generateMealPlan()`은 다음 일을 한 함수 안에서 모두 수행한다.

1. 조직 정보 조회
2. NEIS 이력 조회
3. 프롬프트 빌드
4. AI provider 호출
5. 응답 검증
6. DB 저장
7. 자동 태깅

1차 전환에서는 기존 `generateMealPlan()`을 worker에서 그대로 호출해도 된다.

```txt
processMealGenerationJob()
  -> mark running
  -> generateMealPlan()
  -> mark completed
```

2차 전환에서는 내부를 아래처럼 나눈다.

```ts
buildMealPlanGenerationContext()
generateMealPlanWithAI()
saveGeneratedMealPlan()
generateMealPlanInChunks()
```

이렇게 나누면 chunk 생성, progress 업데이트, 실패 chunk 재시도가 쉬워진다.

## Chunk 생성 전략

비동기 job만 적용하면 HTTP timeout은 해결되지만, LLM 호출 자체의 timeout과 JSON 절단 문제는 남을 수 있다. 날짜가 긴 경우 3~5영업일 단위로 나눠 생성한다.

예:

```txt
2026-05-11 ~ 2026-05-15 생성
2026-05-18 ~ 2026-05-22 생성
2026-05-25 ~ 2026-05-29 생성
```

권장 규칙:

- 기본 chunk 크기: 영업일 5일
- 각 chunk 완료 후 `completedDays` 업데이트
- chunk별 AI 응답을 검증한 뒤 바로 DB 저장
- 실패 시 해당 chunk만 재시도
- 최종 결과는 전체 `mealPlans` 배열을 병합해 job result에 저장

주의할 점:

- 월~금만 생성하는 현재 `meal-plan-builder.ts`의 `getWeekdays()` 규칙과 맞춰야 한다.
- chunk 사이 메뉴 중복을 줄이려면 이전 chunk 결과를 다음 prompt의 참고 컨텍스트로 일부 전달할 수 있다.
- 학교 조직의 경우 NEIS 이력은 job 시작 시 한 번만 조회하고 chunk prompt에 재사용한다.

## 서버 재시작 복구

in-process worker 단계에서도 최소 복구 로직은 두는 것이 좋다.

서버 시작 시:

```txt
status in (queued, running)
  -> 오래된 running job은 queued 또는 failed로 정리
  -> queued job은 다시 processor에 등록
```

중복 실행을 막으려면 job 시작 시 조건부 업데이트를 사용한다.

```txt
UPDATE job
SET status = 'running'
WHERE id = ? AND status = 'queued'
```

Prisma에서는 `updateMany` 결과 count를 확인해 lock처럼 사용할 수 있다.

## 에러 처리 정책

LLM 생성 실패를 HTTP 500으로 직접 반환하지 않는다. job의 `status`와 `error`에 기록한다.

기록할 정보:

- provider 이름
- 실패 단계: neis, llm, validation, db-save 등
- 에러 메시지
- 가능하면 chunk 범위

민감정보가 포함될 수 있으므로 prompt 전문이나 사용자 개인정보는 error에 저장하지 않는다.

## 구현 순서

1. `MealGenerationJob` Prisma 모델 추가 및 migration 생성
2. `meal-generation-job.service.ts` 추가
3. `generateMealPlanHandler`를 enqueue 방식으로 변경
4. `GET /ai/generate-meal-plan/jobs/:jobId` 상태 조회 API 추가
5. `backend/src/jobs/mealGenerationJob.ts`에 in-process processor 추가
6. worker에서 기존 `generateMealPlan()` 호출 후 completed/failed 기록
7. 서버 시작 시 미완료 job 복구 처리 추가
8. `generateMealPlan()` 내부를 context, AI call, DB save로 분리
9. 긴 기간을 3~5영업일 chunk로 생성하도록 변경
10. 필요 시 BullMQ/Redis 기반 큐로 교체

## 테스트 계획

서비스 단위:

- job 생성 시 `queued` 상태로 저장되는지
- 다른 orgId의 job 조회가 차단되는지
- 성공 시 `completed`, `result`가 저장되는지
- 실패 시 `failed`, `error`가 저장되는지

API 통합:

- `POST /ai/generate-meal-plan`이 202와 jobId를 반환하는지
- `GET /ai/generate-meal-plan/jobs/:jobId`가 상태를 반환하는지
- nutritionist 외 역할이 접근 제한되는지

worker:

- 기존 `generateMealPlan()` 성공 결과를 job result로 저장하는지
- AI 검증 실패를 job failed로 기록하는지
- running job 복구 정책이 중복 실행을 만들지 않는지

chunk 적용 후:

- 1~3일 요청은 1 chunk로 처리되는지
- 20영업일 요청은 여러 chunk로 나뉘는지
- 각 chunk 완료마다 progress가 증가하는지
- 일부 chunk 실패 시 전체 job이 실패 또는 재시도되는지

## 결정 사항

- 1차 구현은 DB job + in-process worker로 시작한다.
- API는 `POST /ai/generate-meal-plan`의 입력은 유지하고 응답을 `202 + jobId`로 바꾼다.
- 상태 조회 API를 새로 추가한다.
- chunk 생성은 2차 작업으로 분리하되, job 모델에는 `totalDays`, `completedDays`를 처음부터 둔다.

## 남은 검토 사항

- 프론트엔드에서 기존 동기 응답 기대 로직을 polling UI로 바꿔야 한다.
- 기존 API 응답 호환성이 필요하면 `/ai/generate-meal-plan-sync` 같은 임시 동기 엔드포인트를 둘지 결정한다.
- 운영 환경에서 Redis/BullMQ 도입 시점과 Railway Redis Plugin 사용 여부를 결정한다.
- 실패 job 재시도 API를 만들지, 관리자/영양사 UI에서 재요청만 허용할지 결정한다.
