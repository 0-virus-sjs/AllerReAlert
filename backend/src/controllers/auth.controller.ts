import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { verifyOrg, signup, login, refreshAccessToken, logout } from '../services/auth.service'
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

// 비밀번호 정책: 8자 이상, 영문 + 숫자 + 특수문자
const passwordPolicy = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다')
  .regex(/\d/, '숫자를 포함해야 합니다')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, '특수문자를 포함해야 합니다')

const signupSchema = z.object({
  tempToken: z.string().min(1, '소속 인증 토큰이 필요합니다'),
  role: z.enum(['student', 'staff', 'guardian', 'nutritionist']),
  name: z.string().min(1, '이름을 입력하세요'),
  email: z.email('올바른 이메일을 입력하세요'),
  password: passwordPolicy,
  phone: z.string().optional(),
  groupInfo: z.record(z.string(), z.unknown()).optional(),
  // T-122: 학생 전용 필드 (role=student일 때 필수)
  grade: z.number().int().min(1).max(12).optional(),
  classNo: z.string().min(1).max(10).optional(),
  studentCode: z.string().min(1).max(50).optional(),
  privacyAgreed: z.boolean().refine(v => v === true, '개인정보 수집·이용에 동의해야 합니다'),
  guardianConsentRequired: z.boolean().default(false),
}).superRefine((val, ctx) => {
  if (val.role !== 'student') return
  if (val.grade == null) {
    ctx.addIssue({ code: 'custom', path: ['grade'], message: '학년을 선택하세요' })
  }
  if (!val.classNo) {
    ctx.addIssue({ code: 'custom', path: ['classNo'], message: '반을 입력하세요' })
  }
  if (!val.studentCode) {
    ctx.addIssue({ code: 'custom', path: ['studentCode'], message: '학번을 입력하세요' })
  }
})

const loginSchema = z.object({
  email: z.email('올바른 이메일을 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
})

export async function signupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = signupSchema.parse(req.body)
    const user = await signup(body)
    sendSuccess(res, user, 201)
  } catch (err) {
    next(err)
  }
}

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
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip
    const { accessToken, refreshToken, user } = await login(email, password, ip)
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
    const { accessToken, refreshToken: newRefresh, user } = await refreshAccessToken(refreshToken)
    res.cookie(REFRESH_COOKIE, newRefresh, refreshCookieOptions)
    sendSuccess(res, { accessToken, user })
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
