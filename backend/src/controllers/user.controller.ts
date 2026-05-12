import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getMe, updateMe, changeOrg } from '../services/user.service'
import { sendSuccess } from '../middlewares/response'

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  groupInfo: z.record(z.string(), z.unknown()).optional(),
  notificationSettings: z.object({
    channels: z.array(z.enum(['push', 'email'])).optional(),
    quietHoursStart: z.string().optional(),  // "HH:MM"
    quietHoursEnd: z.string().optional(),
  }).optional(),
  // T-125: 학생 기본 정보 (role=student일 때만 적용)
  grade: z.number().int().min(1).max(12).optional(),
  classNo: z.string().min(1).max(10).optional(),
  studentCode: z.string().min(1).max(50).optional(),
})

const changeOrgSchema = z.object({
  tempToken: z.string().min(1, '소속 인증 토큰이 필요합니다'),
})

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getMe(req.user!.sub)
    sendSuccess(res, user)
  } catch (err) {
    next(err)
  }
}

export async function updateMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateMeSchema.parse(req.body)
    const user = await updateMe(req.user!.sub, body)
    sendSuccess(res, user)
  } catch (err) {
    next(err)
  }
}

export async function changeOrgHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { tempToken } = changeOrgSchema.parse(req.body)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip
    const result = await changeOrg(req.user!.sub, tempToken, ip)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
