import rateLimit from 'express-rate-limit'

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/v1/health',
})

// 인증 엔드포인트(로그인·회원가입·리프레시) 무차별 대입 방어
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_ATTEMPTS',
      message: '인증 시도 횟수가 너무 많습니다. 잠시 후 다시 시도하세요.',
    },
  },
})
