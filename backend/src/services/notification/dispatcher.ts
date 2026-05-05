import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { emailAdapter } from './email.adapter'
import { pushAdapter } from './push.adapter'
import type { NotificationPayload, RecipientInfo } from './provider'

interface DispatchInput {
  userId: string
  title: string
  body: string
  type: string
  data?: Record<string, unknown>
}

/**
 * 사용자별 알림 채널 설정을 읽어 이메일·웹 푸시 발송 + Notification 레코드 저장.
 * 채널 설정은 user.groupInfo.notificationSettings 에 저장된다(T-025).
 */
export async function dispatch(input: DispatchInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      email: true,
      groupInfo: true,
    },
  })

  if (!user) {
    logger.warn({ userId: input.userId }, '알림 발송 실패: 사용자 없음')
    return
  }

  // groupInfo.notificationSettings.channels: string[] ('email' | 'push')
  const settings = (user.groupInfo as Record<string, unknown> | null)
    ?.notificationSettings as { channels?: string[] } | undefined
  const channels = settings?.channels ?? ['email']  // 기본: 이메일

  // Notification 레코드 생성
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type as Parameters<typeof prisma.notification.create>[0]['data']['type'],
      title: input.title,
      body: input.body,
      payload: (input.data ?? {}) as Prisma.InputJsonValue,
    },
  })

  // 웹 푸시 구독 조회
  let recipient: RecipientInfo = { email: user.email }
  if (channels.includes('push')) {
    const sub = await prisma.pushSubscription.findFirst({
      where: { userId: input.userId },
      select: { endpoint: true, p256dh: true, auth: true },
    }).catch(() => null)
    if (sub) {
      recipient = { ...recipient, pushSubscription: sub }
    }
  }

  const payload: NotificationPayload = {
    userId: input.userId,
    title: input.title,
    body: input.body,
    data: input.data,
  }

  // 채널별 발송 (실패해도 다른 채널 계속 시도)
  const jobs = [
    channels.includes('email') ? emailAdapter.send(payload, recipient) : null,
    channels.includes('push') && recipient.pushSubscription ? pushAdapter.send(payload, recipient) : null,
  ].filter(Boolean) as Promise<void>[]

  const results = await Promise.allSettled(jobs)
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      logger.error({ err: r.reason, userId: input.userId, channelIdx: i }, '채널 발송 실패')
    }
  })
}
