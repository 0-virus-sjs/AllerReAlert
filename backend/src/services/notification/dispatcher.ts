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
    ?.notificationSettings as { channels?: string[]; quietHoursStart?: string; quietHoursEnd?: string } | undefined
  const channels = settings?.channels ?? ['email']  // 기본: 이메일

  // 방해 금지 시간 체크 — 범위 내면 Notification 레코드만 남기고 발송 생략
  if (isQuietHour(settings?.quietHoursStart, settings?.quietHoursEnd)) {
    logger.info({ userId: input.userId }, '방해 금지 시간 — 발송 생략')
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as Parameters<typeof prisma.notification.create>[0]['data']['type'],
        title: input.title,
        body: input.body,
        payload: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    })
    return
  }

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
  const activeChannels: Array<{ channel: string; job: Promise<void> }> = []
  if (channels.includes('email')) {
    activeChannels.push({ channel: 'email', job: emailAdapter.send(payload, recipient) })
  }
  if (channels.includes('push') && recipient.pushSubscription) {
    activeChannels.push({ channel: 'push', job: pushAdapter.send(payload, recipient) })
  }

  const results = await Promise.allSettled(activeChannels.map((c) => c.job))
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const ch = activeChannels[i].channel
    if (r.status === 'rejected') {
      const err = r.reason as Error & { expired?: boolean }
      if (ch === 'push' && err.expired && recipient.pushSubscription) {
        // 만료된 구독 DB에서 삭제 (T-140: 410/404 자동 정리)
        await prisma.pushSubscription.deleteMany({
          where: { userId: input.userId, endpoint: recipient.pushSubscription.endpoint },
        }).catch((e) => logger.warn({ e, userId: input.userId }, '만료 구독 삭제 실패'))
        logger.info({ userId: input.userId }, '만료된 웹 푸시 구독 삭제 완료')
      } else {
        logger.error({ err: r.reason, userId: input.userId, channel: ch }, '채널 발송 실패')
      }
    }
  }
}

/**
 * T-102: 학생에게 알림 발송 후 연동된 보호자에게도 동일 알림을 병렬 발송.
 * 학생이 아닌 userId이면 dispatch 단독 실행.
 */
export async function dispatchWithGuardians(input: DispatchInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  })

  // 학생이 아니면 일반 dispatch로 처리
  if (user?.role !== 'student') {
    return dispatch(input)
  }

  const guardianLinks = await prisma.guardianStudent.findMany({
    where: { studentId: input.userId },
    select: { guardianId: true },
  })

  await Promise.allSettled([
    dispatch(input),
    ...guardianLinks.map(({ guardianId }) =>
      dispatch({ ...input, userId: guardianId })
    ),
  ])
}

/**
 * 현재 시각(KST)이 방해 금지 시간 범위 내인지 확인.
 * start/end 중 하나라도 없으면 false 반환.
 * 자정 걸치는 범위(예: 22:00 ~ 07:00)도 처리.
 */
function isQuietHour(start?: string, end?: string): boolean {
  if (!start || !end) return false

  const now = new Date()
  // KST = UTC+9
  const kstMinutes = (now.getUTCHours() + 9) % 24 * 60 + now.getUTCMinutes()

  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin   = eh * 60 + em

  // 자정을 걸치지 않는 경우: start <= now < end
  if (startMin <= endMin) return kstMinutes >= startMin && kstMinutes < endMin
  // 자정을 걸치는 경우 (예: 22:00 ~ 07:00): now >= start OR now < end
  return kstMinutes >= startMin || kstMinutes < endMin
}
