# AllerReAlert 배포 절차서

## 환경 구성

| 환경 | Frontend | Backend | DB |
|---|---|---|---|
| dev (로컬) | localhost:5173 | localhost:5000 | Supabase dev 프로젝트 |
| staging | Vercel Preview | Railway dev 서비스 | Supabase dev 프로젝트 |
| production | Vercel Production (allerrealert.kr) | Railway prod 서비스 (api.allerrealert.kr) | Supabase prod 프로젝트 |

---

## Railway 백엔드 설정

### 빌드/배포 커맨드
```
Build:      npm ci && npx prisma generate && npm run build
Pre-Deploy: npx prisma migrate deploy
Start:      node dist/app.js
Healthcheck: /api/v1/health (timeout: 30s)
```

### 필수 환경 변수 (Railway Variables)
`.env.example` 참조. 모든 항목을 Railway > Variables 탭에 등록.

---

## 도메인 · HTTPS 설정 (T-117)

### Frontend — Vercel
1. Vercel 프로젝트 > Settings > Domains
2. `allerrealert.kr` 추가 → DNS에 Vercel CNAME 레코드 등록
3. HTTPS 인증서는 Vercel이 Let's Encrypt로 자동 발급·갱신

### Backend — Railway
1. Railway 프로젝트 > Settings > Networking > Custom Domain
2. `api.allerrealert.kr` 추가 → DNS에 Railway CNAME 레코드 등록
3. HTTPS 인증서 Railway 자동 처리

### WAF (현재: 애플리케이션 레이어)
- `helmet` CSP, HSTS, XSS 방어
- `express-rate-limit` IP당 분당 60회 제한 (일반), 10회 (로그인)
- Prisma 파라미터 바인딩으로 SQL Injection 방어
- 트래픽 증가 시: Cloudflare 프록시 + WAF 룰 추가 권장

---

## 롤백 절차

### Frontend (Vercel)
```
Vercel 대시보드 > Deployments > 이전 배포 선택 > Redeploy
또는: git revert <커밋> → push to main
```

### Backend (Railway)
```
Railway 대시보드 > Deployments > 이전 배포 선택 > Rollback
DB 마이그레이션 롤백이 필요한 경우:
  1. Supabase SQL 에디터에서 수동 롤백 쿼리 실행
  2. prisma/migrations/ 에서 해당 마이그레이션 파일 확인
```

---

## 백업 · 복구 (T-116)

### 자동 백업
- **Supabase Pro**: 일일 자동 백업 + PITR(Point-in-Time Recovery)
- **pg_dump 외부 보관**: `backupJob.ts` — 매주 일요일 02:00 실행, Supabase Storage 버킷 업로드

### 복구 절차
1. **Supabase 대시보드 복구**: Project > Backups > 날짜 선택 > Restore
2. **pg_dump 복구**:
   ```bash
   pg_restore -d $DIRECT_URL -F c backup_YYYYMMDD.dump
   ```
3. **복구 후 확인**: `/api/v1/health` 응답, 주요 API 동작 검증

### 분기 복구 리허설 (NFR-OPS-003)
- 매 분기 1회 staging DB에서 복구 테스트 실행
- 체크리스트: [ ] 백업 다운로드 → [ ] staging 복구 → [ ] 데이터 정합성 확인

---

## 모니터링 (T-115)

### Sentry
- BE DSN: Railway Variable `SENTRY_DSN`
- FE DSN: Vercel Variable `VITE_SENTRY_DSN`
- 릴리즈 추적: CI에서 `APP_VERSION` = git SHA 주입

### 외부 Uptime 모니터
- **UptimeRobot** (무료 플랜) 또는 Sentry Crons
- 대상: `https://api.allerrealert.kr/api/v1/health`
- 간격: 1분
- 알림: 이메일 + Slack webhook

### Railway Metrics 슬랙 알림
Railway 대시보드 > Integrations > Slack 연결 후:
- CPU > 80% 지속 5분
- 5xx 응답률 > 1%
- 메모리 > 85%

---

## 출시 체크리스트 요약

- [ ] 모든 환경 변수 Railway/Vercel 등록 완료
- [ ] `prisma migrate deploy` staging 검증
- [ ] 도메인 DNS 전파 확인 (allerrealert.kr, api.allerrealert.kr)
- [ ] HTTPS 인증서 발급 확인
- [ ] Sentry DSN 연결 및 에러 수신 확인
- [ ] UptimeRobot 헬스체크 설정
- [ ] 백업 잡 첫 실행 확인
- [ ] UAT 통과 (T-118)
