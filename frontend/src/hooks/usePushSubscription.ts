import { useState } from 'react'
import { notificationsApi } from '../services/notifications.api'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return view
}

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribing' | 'subscribed'

export function usePushSubscription() {
  // 브라우저 API는 동기 프로퍼티 접근이므로 lazy initializer로 초기화 — effect 불필요
  const [status, setStatus] = useState<PushStatus>(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
    const perm = Notification.permission
    if (perm === 'granted') return 'granted'
    if (perm === 'denied')  return 'denied'
    return 'default'
  })

  async function subscribe() {
    if (!('serviceWorker' in navigator)) return
    setStatus('subscribing')

    try {
      // SW 등록
      const reg = await navigator.serviceWorker.register('/sw.js')

      // 구독 동의 요청
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
      if (!vapidKey) throw new Error('VITE_VAPID_PUBLIC_KEY 미설정')

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = subscription.toJSON()
      await notificationsApi.subscribePush({
        endpoint: json.endpoint!,
        p256dh:   json.keys!.p256dh,
        auth:     json.keys!.auth,
      })

      setStatus('subscribed')
    } catch (err) {
      console.error('[T-140] 웹 푸시 구독 실패:', err)
      setStatus('default')
    }
  }

  return { status, subscribe }
}
