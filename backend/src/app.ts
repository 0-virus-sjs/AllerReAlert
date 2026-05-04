import * as Sentry from '@sentry/node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { logger } from './lib/logger'
import { registerBackupJob } from './jobs/backupJob'
import { registerScheduledPublishJob } from './jobs/scheduledPublishJob'
import router from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { sendSuccess } from './middlewares/response'

dotenv.config()

// ── Sentry (DSN 없으면 비활성화) ──────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  })
}

const app = express()
const PORT = process.env.PORT || 5000

// ── 보안 ──────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
)
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

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
})

export default app
