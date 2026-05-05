import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { listNotifications, markAsRead, markAllAsRead } from '../services/notification/notification.service'
import { sendSuccess } from '../middlewares/response'

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
})

export async function listNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { page } = pageSchema.parse(req.query)
    const result = await listNotifications(req.user!.sub, page)
    // 미읽음 카운트를 헤더에도 포함
    res.setHeader('X-Unread-Count', String(result.unreadCount))
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function markReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const result = await markAsRead(id, req.user!.sub)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function markAllReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await markAllAsRead(req.user!.sub)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
