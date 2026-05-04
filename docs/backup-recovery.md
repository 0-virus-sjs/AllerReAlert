# DB 백업 & 복구 절차 — AllerReAlert

## 백업 구성 개요

| 항목 | 값 |
|------|----|
| 방식 | `pg_dump` (full SQL dump) |
| 주기 | 매주 일요일 02:00 KST (node-cron `0 2 * * 0`) |
| 저장소 | Supabase Storage — `backups` 버킷 / `db-snapshots/YYYY-MM-DD.sql` |
| 보관 기간 | 30일 (30일 초과 스냅샷 자동 삭제) |
| 구현 파일 | `backend/src/jobs/backupJob.ts` |
| 활성화 조건 | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 설정 필수 |

---

## 사전 준비 — 환경 변수

Railway Variables에 아래 값이 등록돼 있어야 백업 잡이 활성화된다.

```
DIRECT_URL              # Supabase Direct 연결 (포트 5432) — pg_dump 대상
SUPABASE_URL            # https://[PROJECT].supabase.co
SUPABASE_SERVICE_ROLE_KEY  # Supabase → Settings → API → service_role key
```

둘 중 하나라도 없으면 잡이 warn 로그를 남기고 자동으로 비활성화된다.

---

## 수동 백업 (긴급 시)

Railway 배포 서버 또는 로컬에서 `DIRECT_URL`이 설정된 상태로 실행한다.

```bash
# 1. 날짜 지정 덤프
DATE=$(date +%Y-%m-%d)
pg_dump "$DIRECT_URL" --no-password --clean > backup-${DATE}.sql

# 2. Supabase Storage에 업로드 (supabase CLI 사용 시)
supabase storage cp backup-${DATE}.sql ss://backups/db-snapshots/${DATE}.sql
```

---

## 백업 목록 확인

Supabase 대시보드 → Storage → `backups` 버킷 → `db-snapshots/` 폴더에서 확인하거나, API로 조회한다.

```bash
# supabase CLI
supabase storage ls ss://backups/db-snapshots/
```

---

## 복구 절차

### 1단계 — 복구 대상 스냅샷 다운로드

```bash
DATE=2026-05-04   # 복구할 날짜로 변경

# supabase CLI
supabase storage cp ss://backups/db-snapshots/${DATE}.sql ./${DATE}.sql
```

### 2단계 — 서비스 트래픽 차단 (선택)

복구 중 데이터 오염 방지를 위해 Railway에서 서버를 일시 중단하거나 Supabase의 `REVOKE CONNECT` 로 연결을 차단한다.

```sql
-- Supabase SQL Editor에서 실행
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
 WHERE pg_stat_activity.datname = 'postgres'
   AND pid <> pg_backend_pid();
```

### 3단계 — 스냅샷 복원

`--clean` 옵션으로 생성된 덤프는 DROP → CREATE 순서로 실행되므로 별도 DB 초기화 없이 덮어쓸 수 있다.

```bash
# DIRECT_URL 사용 (PgBouncer 거치지 않음)
psql "$DIRECT_URL" < ${DATE}.sql
```

에러 발생 시 `-v ON_ERROR_STOP=1` 옵션을 추가해 즉시 중단하고 원인을 파악한다.

```bash
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 < ${DATE}.sql
```

### 4단계 — 마이그레이션 상태 동기화

덤프에 마이그레이션 이력이 포함돼 있으므로 별도 `migrate deploy`는 불필요하다.
단, 복구 시점 이후에 새 마이그레이션이 추가된 경우에는 아래를 실행한다.

```bash
cd backend
npx prisma migrate deploy
```

### 5단계 — 서비스 재개

```sql
-- Supabase SQL Editor에서 실행
GRANT CONNECT ON DATABASE postgres TO PUBLIC;
```

Railway에서 서버를 재배포하거나 재시작한다.

### 6단계 — 복구 검증

```bash
# 주요 테이블 row count 확인
psql "$DIRECT_URL" -c "
  SELECT 'organizations' AS tbl, COUNT(*) FROM organizations
  UNION ALL SELECT 'users', COUNT(*) FROM users
  UNION ALL SELECT 'allergens', COUNT(*) FROM allergens
  UNION ALL SELECT 'meal_plans', COUNT(*) FROM meal_plans;
"
```

---

## 복구 시나리오별 선택 가이드

| 시나리오 | 권장 방법 |
|----------|-----------|
| 단순 데이터 실수 (row 삭제 등) | 스냅샷 복구 전 Supabase SQL Editor로 직접 복원 시도 |
| 스키마 오염 / 마이그레이션 실패 | 위 3~4단계 전체 절차 수행 |
| 전체 프로젝트 재구성 | 스냅샷 복구 후 `prisma migrate deploy` 확인 |
| 30일 이전 데이터 필요 | Supabase Pro 플랜 PITR(Point-in-Time Recovery) 활용 |

---

## 장애 대응 연락처 및 참조

- Supabase 대시보드: `https://supabase.com/dashboard/project/[PROJECT_ID]`
- Railway 대시보드: `https://railway.app`
- 백업 잡 로그: Railway 서비스 → Deployments → Logs (`DB 백업` 키워드 검색)
- 관련 NFR: NFR-OPS-002 (30일 보관), NFR-OPS-001 (가용률)
