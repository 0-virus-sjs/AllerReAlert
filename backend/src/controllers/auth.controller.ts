import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { verifyOrg, login, refreshAccessToken, logout } from '../services/auth.service'
import { sendSuccess } from '../middlewares/response'
import { authenticate } from '../middlewares/authenticate'

const REFRESH_COOKIE = 'refresh_token'

const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,  // Vercel↔Railway 크로스 도메인
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
}

const verifyOrgSchema = z.object({
  orgCode: z.string().min(1, '소속 코드를 입력하세요'),
})

const loginSchema = z.object({
  email: z.email('올바른 이메일을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
})

export async function verifyOrgHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgCode } = verifyOrgSchema.parse(req.body)
    const result = await verifyOrg(orgCode)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const { accessToken, refreshToken, user } = await login(email, password)
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions)
    sendSuccess(res, { accessToken, user })
  } catch (err) {
    next(err)
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE] as string | undefined
    if (!refreshToken) {
      res.status(401).json({ success: false, error: { code: 'NO_REFRESH_TOKEN', message: '리프레시 토큰이 없습니다' } })
      return
    }
    const { accessToken, refreshToken: newRefresh } = await refreshAccessToken(refreshToken)
    res.cookie(REFRESH_COOKIE, newRefresh, refreshCookieOptions)
    sendSuccess(res, { accessToken })
  } catch (err) {
    next(err)
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // authenticate 미들웨어가 먼저 실행돼 req.user가 있을 때만 DB 정리
    if (req.user) {
      await logout(req.user.sub)
    }
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: 0 })
    sendSuccess(res, null)
  } catch (err) {
    next(err)
  }
}

// authenticate를 컨트롤러에서 export해 라우터에서 조합
export { authenticate }
