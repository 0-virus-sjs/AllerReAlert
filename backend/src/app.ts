import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import router from './routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ── 미들웨어 ──────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL })) // 프론트엔드 도메인만 허용
app.use(express.json())

// ── 라우터 ────────────────────────────────────────────
app.use('/api', router) // 모든 API는 /api/* 경로로 통일

// ── 헬스체크 (Railway 배포 시 필수) ──────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// ── 글로벌 에러 핸들러 ────────────────────────────────
// TODO: middlewares/errorHandler.ts 로 분리
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message })
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

export default app
