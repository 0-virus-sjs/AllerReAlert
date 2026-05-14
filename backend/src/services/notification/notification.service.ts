import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middlewares/errorHandler'

const PAGE_SIZE = 20

export async function listNotifications(userId: string, page: number) {
  const skip = (page - 1) * PAGE_SIZE

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true, type: true, title: true, body: true,
        payload: true, isRead: true, sentAt: true,
      },
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return { items, total, page, pageSize: PAGE_SIZE, unreadCount }
}

export async function markAsRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({ where: { id, userId } })
  if (!notification) throw new AppError(404, 'NOT_FOUND', '알림을 찾을 수 없습니다')

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: { id: true, isRead: true },
  })
}

export async function markAllAsRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
  return { updated: count }
}

// ── T-055: 알림 채널 설정 ─────────────────────────────

export interface NotificationSettings {
  channels?: ('email' | 'push')[]
  quietHoursStart?: string   // "HH:MM"
  quietHoursEnd?: string
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { groupInfo: true },
  })
  if (!user) throw new AppError(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다')

  const prev = (user.groupInfo as Record<string, unknown> | null) ?? {}
  return ((prev.notificationSettings as NotificationSettings) ?? {})
}

export async function updateNotificationSettings(userId: string, settings: NotificationSettings) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { groupInfo: true },
  })
  if (!user) throw new AppError(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다')

  const prev = (user.groupInfo as Record<string, unknown> | null) ?? {}
  const updated = {
    ...prev,
    notificationSettings: {
      ...((prev.notificationSettings as Record<string, unknown>) ?? {}),
      ...settings,
    },
  }

  await prisma.user.update({
    where: { id: userId },
    data: { groupInfo: updated as Prisma.InputJsonValue },
  })

  return { notificationSettings: updated.notificationSettings }
}

// ── T-055: 웹 푸시 구독 등록/갱신 ────────────────────

export interface PushSubscribeInput {
  endpoint: string
  p256dh: string
  auth: string
}

export async function subscribePush(userId: string, input: PushSubscribeInput) {
  const [subscription] = await Promise.all([
    prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: input.endpoint } },
      update: { p256dh: input.p256dh, auth: input.auth },
      create: { userId, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth },
      select: { id: true, endpoint: true, createdAt: true },
    }),
    // 구독 등록과 동시에 push 채널 활성화 (기존 채널 유지하며 push 추가)
    (async () => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { groupInfo: true } })
      const prev = (user?.groupInfo as Record<string, unknown> | null) ?? {}
      const prevSettings = (prev.notificationSettings as Record<string, unknown>) ?? {}
      const prevChannels = (prevSettings.channels as string[] | undefined) ?? ['email']
      if (prevChannels.includes('push')) return
      await prisma.user.update({
        where: { id: userId },
        data: {
          groupInfo: {
            ...prev,
            notificationSettings: { ...prevSettings, channels: [...prevChannels, 'push'] },
          } as Prisma.InputJsonValue,
        },
      })
    })(),
  ])
  return subscription
}
