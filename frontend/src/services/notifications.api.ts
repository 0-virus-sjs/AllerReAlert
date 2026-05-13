import { api } from './api'

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  payload: Record<string, unknown>
  isRead: boolean
  sentAt: string
}

export interface NotificationListResult {
  items: NotificationItem[]
  total: number
  page: number
  pageSize: number
  unreadCount: number
}

type ApiWrap<T> = { success: boolean; data: T }

export const notificationsApi = {
  list: (page = 1) =>
    api.get<ApiWrap<NotificationListResult>>('/notifications', { params: { page } }),

  markRead: (id: string) =>
    api.put<ApiWrap<{ id: string; isRead: boolean }>>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.put<ApiWrap<{ updated: number }>>('/notifications/read-all'),

  getSettings: () =>
    api.get<ApiWrap<{ channels?: ('email' | 'push')[]; quietHoursStart?: string; quietHoursEnd?: string }>>('/notifications/settings'),

  updateSettings: (settings: { channels?: ('email' | 'push')[]; quietHoursStart?: string; quietHoursEnd?: string }) =>
    api.put('/notifications/settings', settings),

  subscribePush: (sub: { endpoint: string; p256dh: string; auth: string }) =>
    api.post('/notifications/web-push/subscribe', sub),
}
