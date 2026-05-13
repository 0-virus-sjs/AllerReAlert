// AllerReAlert Service Worker — 웹 푸시 수신 처리
// Vite build 시 public/ → dist/ 복사됨

self.addEventListener('push', (event) => {
  if (!event.data) return

  let title, body, data = {}
  try {
    ;({ title, body, data = {} } = event.data.json())
  } catch {
    // JSON 파싱 실패 시 raw text로 fallback
    title = 'AllerReAlert 알림'
    body  = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const mealPlanId = event.notification.data?.mealPlanId
  const url = mealPlanId ? `/meals/${mealPlanId}` : '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const existing = clientList.find((c) => c.focus)
      if (existing) return existing.navigate(url).then(() => existing.focus())
      return clients.openWindow(url)
    })
  )
})
