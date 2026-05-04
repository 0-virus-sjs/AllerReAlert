import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getMe, updateMe } from '../services/user.service'
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
