import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import router from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { sendSuccess } from './middlewares/response'

dotenv.config()

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

// ── 유틸리티 미들웨어 ─────────────────────────────────
app.use(compression())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── 라우터 ────────────────────────────────────────────
app.use('/api/v1', router)

// ── 헬스체크 (Railway 헬스체크 + M0 완료 기준) ────────
app.get('/api/v1/health', (_req, res) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() })
})

// ── 글로벌 에러 핸들러 ────────────────────────────────
app.use(errorHandler)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

export default app
