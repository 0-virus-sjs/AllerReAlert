import webpush from 'web-push'
import { logger } from '../../lib/logger'
import type { NotificationProvider, NotificationPayload, RecipientInfo } from './provider'

let vapidConfigured = false

function ensureVapid(): void {
  if (vapidConfigured) return
  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subj = process.env.VAPID_SUBJECT ?? 'mailto:admin@allerrealert.kr'
  if (!pub || !priv) throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 환경 변수가 설정되지 않았습니다')
  webpush.setVapidDetails(subj, pub, priv)
  vapidConfigured = true
}

export const pushAdapter: NotificationProvider = {
  channel: 'push',

  async send(payload: NotificationPayload, recipient: RecipientInfo): Promise<void> {
    if (!recipient.pushSubscription) {
      logger.warn({ userId: payload.userId }, '웹 푸시 발송 실패: 구독 정보 없음')
      return
    }

    ensureVapid()

    const { endpoint, p256dh, auth } = recipient.pushSubscription
    const message = JSON.stringify({
      title: payload.title,
      body:  payload.body,
      data:  payload.data ?? {},
    })

    logger.debug({ userId: payload.userId, endpoint: endpoint.slice(0, 40) }, '[T-140] 웹 푸시 발송 시도')

    try {
      await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, message)
      logger.info({ userId: payload.userId }, '웹 푸시 발송 완료')
    } catch (err: unknown) {
      const e = err as { statusCode?: number; body?: string; headers?: unknown }
      const status = e.statusCode
      if (status === 410 || status === 404) {
        logger.warn({ userId: payload.userId, status, endpoint: endpoint.slice(0, 40) }, '[T-140] 웹 푸시 구독 만료 (410/404) — 구독 삭제 예정')
        throw Object.assign(new Error('PUSH_SUBSCRIPTION_EXPIRED'), { expired: true })
      }
      logger.error(
        { err, status, body: e.body, userId: payload.userId, endpoint: endpoint.slice(0, 40) },
        '[T-140] 웹 푸시 발송 실패 — 상태 코드 및 응답 본문 확인',
      )
      throw err
    }
  },
}
