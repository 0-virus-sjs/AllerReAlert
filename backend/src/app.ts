import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { logger } from './lib/logger'
import { generalLimiter } from './middlewares/rateLimits'
import { registerBackupJob } from './jobs/backupJob'
import { registerScheduledPublishJob } from './jobs/scheduledPublishJob'
import { registerAllergenAlertJob } from './jobs/allergenAlertJob'
import { registerSurveyCloseJob } from './jobs/surveyCloseJob'
import { registerSurveyReminderJob } from './jobs/surveyReminderJob'
import { registerAuditLogPruneJob }  from './jobs/auditLogPruneJob'
import { recoverStuckJobs } from './jobs/mealGenerationJob'
import router from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { sendSuccess } from './middlewares/response'

dotenv.config()

// ── Sentry (DSN 없으면 비활성화) ──────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION,   // Railway: git SHA 환경 변수로 주입
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    ignoreErrors: ['AbortError', 'ECONNRESET'],
  })
}

const app = express()
const PORT = process.env.PORT || 5000

// ── 보안 ──────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production'

// API 서버용 helmet 설정 — CSP·frame-ancestors·HSTS 명시 (NFR-SEC-001)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: isProd
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
)

// CORS 화이트리스트 — CLIENT_URL(쉼표 구분)만 허용. Vercel 프로덕션·프리뷰 도메인을 등록.
const allowedOrigins = (process.env.CLIENT_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
  })
)

// 글로벌 레이트 리밋 — 헬스체크는 제외
app.use(generalLimiter)

// ── 로깅 (pino-http) ──────────────────────────────────
app.use(
  pinoHttp({
    logger,
    // 요청 ID 자동 주입 → 트레이스 가능
    genReqId: (req) => req.headers['x-request-id'] ?? crypto.randomUUID(),
    // 헬스체크는 로그 생략
    autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
  })
)

// ── 유틸리티 미들웨어 ─────────────────────────────────
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── 라우터 ────────────────────────────────────────────
app.use('/api/v1', router)

// ── 헬스체크 ──────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() })
})

// ── 글로벌 에러 핸들러 ────────────────────────────────
app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  registerBackupJob()
  registerScheduledPublishJob()
  registerAllergenAlertJob()
  registerSurveyCloseJob()
  registerSurveyReminderJob()
  registerAuditLogPruneJob()
  recoverStuckJobs().catch((err) => logger.error({ err }, 'meal-generation-job: recovery failed on startup'))
})

export default app
