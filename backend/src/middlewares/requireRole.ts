import { Request, Response, NextFunction } from 'express'
import type { UserRole } from '@prisma/client'
import { sendError } from './response'

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', '인증이 필요합니다')
      return
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 403, 'FORBIDDEN', '접근 권한이 없습니다')
      return
    }
    next()
  }
}
