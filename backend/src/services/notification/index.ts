// 알림 발송 서비스 - Resend(이메일) / Web Push(브라우저 푸시)
// allergy-engine에서 위험 급식 감지 시 이 서비스를 호출

// 주요 기능:
//   - sendEmail(to, subject, html)   → Resend API로 이메일 발송
//   - sendPush(subscription, payload) → Web Push Notification 발송
//   - sendAlert(userId, mealInfo)    → 유저 알림 설정에 따라 채널 선택 후 발송

// 환경변수:
//   RESEND_API_KEY=...
//   VAPID_PUBLIC_KEY=...     (Web Push 공개키)
//   VAPID_PRIVATE_KEY=...    (Web Push 비공개키)

// TODO: Resend 이메일 발송 구현
// TODO: web-push 라이브러리로 Push Notification 구현
// TODO: 유저 알림 구독 정보(subscription) DB 저장/조회

export {}
