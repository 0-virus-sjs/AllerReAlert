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
