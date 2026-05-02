import { Request, Response, NextFunction } from 'express'

// ── 인증 미들웨어 ─────────────────────────────────────
// JWT 토큰 검증 후 req.user에 유저 정보 주입
// TODO: JWT 검증 (jsonwebtoken 또는 Supabase Auth)
export const authenticate = (_req: Request, _res: Response, next: NextFunction) => {
  // const token = req.headers.authorization?.split(' ')[1]
  // const payload = verifyToken(token)
  // req.user = payload
  next()
}

// ── RBAC 권한 미들웨어 ────────────────────────────────
// 역할(role)에 따라 접근 제어
// 사용 예: router.delete('/admin', authorize('admin'), handler)
export const authorize = (role: string) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    // TODO: req.user.role === role 체크
    void role
    next()
  }
}

// ── 에러 핸들러 ───────────────────────────────────────
// app.ts 최하단에 등록 (다른 미들웨어보다 반드시 나중에)
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message })
}

// ── 요청 검증 ─────────────────────────────────────────
// TODO: zod 스키마 기반 요청 body/query 검증 미들웨어
// export const validate = (schema: ZodSchema) => ...
