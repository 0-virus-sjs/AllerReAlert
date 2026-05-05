import { useState, useEffect } from 'react'
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
  const [status, setStatus] = useState<PushStatus>('default')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    const perm = Notification.permission
    if (perm === 'granted') setStatus('granted')
    if (perm === 'denied')  setStatus('denied')
  }, [])

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
    } catch {
      setStatus('default')
    }
  }

  return { status, subscribe }
}
