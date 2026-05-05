// 알림 발송 추상화 인터페이스 (PRD §T-050)
// 구현체: EmailProvider(Resend), PushProvider(web-push)
// Phase 3 예약: SmsProvider(Twilio) — 인터페이스 슬롯만 유지

export interface NotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>   // 웹 푸시 payload / 이메일 템플릿 변수
}

export interface NotificationProvider {
  readonly channel: 'email' | 'push' | 'sms'
  send(payload: NotificationPayload, recipient: RecipientInfo): Promise<void>
}

export interface RecipientInfo {
  email?: string
  pushSubscription?: PushSubscriptionData
  // phone?: string  // Phase 3: Twilio SMS
}

export interface PushSubscriptionData {
  endpoint: string
  p256dh: string
  auth: string
}
