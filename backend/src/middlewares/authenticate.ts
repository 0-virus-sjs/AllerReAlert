import { Request, Response, NextFunction } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { verifyAccessToken } from '../lib/jwt'
import { sendError } from './response'

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 401, 'UNAUTHORIZED', '인증 토큰이 필요합니다')
    return
  }

  const token = header.slice(7)
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      sendError(res, 401, 'TOKEN_EXPIRED', '토큰이 만료됐습니다')
    } else if (err instanceof JsonWebTokenError) {
      sendError(res, 401, 'INVALID_TOKEN', '유효하지 않은 토큰입니다')
    } else {
      next(err)
    }
  }
}
