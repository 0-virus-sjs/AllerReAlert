import { Resend } from 'resend'
import { logger } from '../../lib/logger'
import type { NotificationProvider, NotificationPayload, RecipientInfo } from './provider'

let client: Resend | null = null

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY 환경 변수가 설정되지 않았습니다')
    client = new Resend(key)
  }
  return client
}

export const emailAdapter: NotificationProvider = {
  channel: 'email',

  async send(payload: NotificationPayload, recipient: RecipientInfo): Promise<void> {
    if (!recipient.email) {
      logger.warn({ userId: payload.userId }, '이메일 발송 실패: 수신자 이메일 없음')
      return
    }

    const from = process.env.EMAIL_FROM ?? 'AllerReAlert <noreply@allerrealert.kr>'

    const { error } = await getClient().emails.send({
      from,
      to: [recipient.email],
      subject: payload.title,
      html: buildHtml(payload),
    })

    if (error) {
      logger.error({ error, userId: payload.userId }, '이메일 발송 실패')
      throw new Error(`Resend 오류: ${error.message}`)
    }

    logger.info({ userId: payload.userId, email: recipient.email }, '이메일 발송 완료')
  },
}

function buildHtml(payload: NotificationPayload): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">⚠️ ${payload.title}</h2>
      <p style="color: #333;">${payload.body}</p>
      <hr style="border-color: #eee;" />
      <p style="color: #999; font-size: 12px;">
        AllerReAlert — 학교급식 알레르기 안심 알림 서비스<br/>
        이 메일은 알레르기 설정에 따라 자동 발송됩니다.
      </p>
    </div>
  `
}
