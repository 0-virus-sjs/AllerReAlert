import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  updateNotificationSettings,
  subscribePush,
} from '../services/notification/notification.service'
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

// ── T-055 ────────────────────────────────────────────

const settingsSchema = z.object({
  channels: z.array(z.enum(['email', 'push'])).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd:   z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

export async function updateSettingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = settingsSchema.parse(req.body)
    const result = await updateNotificationSettings(req.user!.sub, settings)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

const pushSubscribeSchema = z.object({
  endpoint: z.url(),
  p256dh:   z.string().min(1),
  auth:     z.string().min(1),
})

export async function subscribePushHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = pushSubscribeSchema.parse(req.body)
    const result = await subscribePush(req.user!.sub, input)
    sendSuccess(res, result, 201)
  } catch (err) {
    next(err)
  }
}
