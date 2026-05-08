/**
 * T-112 시나리오 4: 알림 센터
 *
 * - 알림 목록 API 정상 응답
 * - UI — 알림 센터 화면 진입 + 목록 렌더
 * - 읽음 처리 API
 * - 알림 설정 채널 변경 API
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1'
const STUDENT = {
  email:    process.env.TEST_STUDENT_EMAIL    ?? 'student@allerrealert.kr',
  password: process.env.TEST_STUDENT_PASSWORD ?? 'Test1234!',
}

async function apiLogin(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, { data: STUDENT })
  expect(res.ok(), `로그인 실패 / status ${res.status()}`).toBeTruthy()
  return (await res.json()).data.accessToken as string
}

test.describe('시나리오 4: 알림 센터', () => {
  test('API — 알림 목록 조회 정상 응답', async ({ request }) => {
    const token = await apiLogin(request)
    const res = await request.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()).data
    expect(data).toHaveProperty('items')
    expect(data).toHaveProperty('unreadCount')
    expect(Array.isArray(data.items)).toBeTruthy()
  })

  test('API — 알림 설정 채널 변경 정상 처리', async ({ request }) => {
    const token = await apiLogin(request)
    const res = await request.put(`${API_URL}/notifications/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { channels: ['email'] },
    })
    expect(res.ok()).toBeTruthy()
  })

  test('UI — 알림 센터 화면 진입 + 목록 컨테이너 렌더', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', STUDENT.email)
    await page.fill('input[type="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    await page.goto('/notifications')
    // 알림 센터 제목 또는 컨테이너 확인
    await expect(
      page.locator('h1, h2, h3, h4, h5').filter({ hasText: /알림/i }).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('API — 알림이 있으면 읽음 처리 성공', async ({ request }) => {
    const token = await apiLogin(request)

    const listRes = await request.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(listRes.ok()).toBeTruthy()
    const items = (await listRes.json()).data.items as { id: string; isRead: boolean }[]

    const unread = items.find((n) => !n.isRead)
    if (!unread) { test.skip(); return } // 미읽음 알림 없으면 스킵

    const readRes = await request.put(`${API_URL}/notifications/${unread.id}/read`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(readRes.ok()).toBeTruthy()
    const updated = (await readRes.json()).data
    expect(updated.isRead).toBe(true)
  })
})
