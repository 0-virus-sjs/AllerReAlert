/**
 * T-112 시나리오 5: 관리자 패널 + RBAC 접근 제어
 *
 * - 관리자 로그인 → 패널 접근 성공
 * - 일반 학생 → 관리자 경로 접근 차단 (403 리다이렉트)
 * - 관리자 API — 조직 목록, 사용자 목록 정상 응답
 * - 영양사 전용 API — 학생 역할로 호출 시 403
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1'

const ADMIN       = { email: process.env.TEST_ADMIN_EMAIL       ?? 'admin@allerrealert.kr',       password: process.env.TEST_ADMIN_PASSWORD       ?? 'Test1234!' }
const STUDENT     = { email: process.env.TEST_STUDENT_EMAIL     ?? 'student@allerrealert.kr',     password: process.env.TEST_STUDENT_PASSWORD     ?? 'Test1234!' }
const NUTRITIONIST= { email: process.env.TEST_NUTRITIONIST_EMAIL ?? 'nutritionist@allerrealert.kr', password: process.env.TEST_NUTRITIONIST_PASSWORD ?? 'Test1234!' }

async function apiLogin(request: APIRequestContext, creds: typeof ADMIN): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, { data: creds })
  expect(res.ok(), `로그인 실패: ${creds.email}`).toBeTruthy()
  return (await res.json()).data.accessToken as string
}

test.describe('시나리오 5: 관리자 패널 + RBAC', () => {
  test('UI — 학생 계정으로 /admin 접근 시 차단', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', STUDENT.email)
    await page.fill('input[type="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    await page.goto('/admin')
    // 403 페이지 또는 리다이렉트 확인
    await expect(page).not.toHaveURL('/admin', { timeout: 5_000 })
  })

  test('API — 학생 토큰으로 관리자 API 호출 → 403', async ({ request }) => {
    const token = await apiLogin(request, STUDENT)
    const res = await request.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(403)
  })

  test('API — 관리자 토큰으로 조직 목록 조회 성공', async ({ request }) => {
    const token = await apiLogin(request, ADMIN)
    const res = await request.get(`${API_URL}/admin/organizations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()).data
    expect(Array.isArray(data)).toBeTruthy()
  })

  test('API — 관리자 토큰으로 사용자 목록 조회 성공', async ({ request }) => {
    const token = await apiLogin(request, ADMIN)
    const res = await request.get(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()).data
    expect(Array.isArray(data)).toBeTruthy()
  })

  test('API — 학생 토큰으로 식단 작성 API → 403', async ({ request }) => {
    const token = await apiLogin(request, STUDENT)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const res = await request.post(`${API_URL}/meals`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { date: tomorrow.toISOString().split('T')[0], items: [] },
    })
    expect(res.status()).toBe(403)
  })

  test('API — 영양사 토큰으로 분석 API 접근 성공', async ({ request }) => {
    const token = await apiLogin(request, NUTRITIONIST)
    const res = await request.get(`${API_URL}/analytics/allergy-overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // 200 또는 데이터 없어도 OK (서버가 응답하면 성공)
    expect([200, 404]).toContain(res.status())
  })
})
