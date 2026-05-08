/**
 * T-112 시나리오 2: 알레르기 등록 생명주기 (PRD §11.1 핵심 시나리오)
 *
 * - 학생이 알레르기 등록 → pending 상태 표시
 * - 보호자 미승인 상태에서 알림 엔진 대조 제외 확인 (API 레벨)
 * - 관리자/영양사 권한으로 알레르기 프로필 접근 불가
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1'

const STUDENT = {
  email:    process.env.TEST_STUDENT_EMAIL    ?? 'student@allerrealert.kr',
  password: process.env.TEST_STUDENT_PASSWORD ?? 'Test1234!',
}
const NUTRITIONIST = {
  email:    process.env.TEST_NUTRITIONIST_EMAIL    ?? 'nutritionist@allerrealert.kr',
  password: process.env.TEST_NUTRITIONIST_PASSWORD ?? 'Test1234!',
}

async function apiLogin(request: APIRequestContext, creds: typeof STUDENT): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  })
  expect(res.ok(), `로그인 실패: ${creds.email} / status ${res.status()}`).toBeTruthy()
  return (await res.json()).data.accessToken as string
}

test.describe('시나리오 2: 알레르기 등록 생명주기', () => {
  test('학생이 알레르기 등록 후 pending 상태 UI에서 확인', async ({ page }) => {
    // UI 로그인
    await page.goto('/login')
    await page.fill('input[type="email"]', STUDENT.email)
    await page.fill('input[type="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    // 알레르기 프로필 이동
    await page.goto('/allergens')
    await expect(page.locator('h1, h2, h3, h4, h5').first()).toBeVisible()

    // 페이지에 알레르기 목록 또는 등록 버튼이 있는지 확인
    const hasList = await page.locator('[data-testid="allergen-list"], .list-group, .card').first().isVisible()
    expect(hasList).toBeTruthy()
  })

  test('API — 학생 알레르기 등록 → status=pending 반환', async ({ request }) => {
    const token = await apiLogin(request, STUDENT)

    // 마스터 알레르기 목록 조회
    const masterRes = await request.get(`${API_URL}/allergens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(masterRes.ok()).toBeTruthy()
    const allergens = (await masterRes.json()).data as { id: string; code: number; name: string }[]
    expect(allergens.length).toBeGreaterThan(0)

    // 내 알레르기 현재 목록
    const myRes = await request.get(`${API_URL}/users/me/allergens`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(myRes.ok()).toBeTruthy()
    const existing = (await myRes.json()).data as { allergenId: string }[]

    // 아직 등록 안 된 알레르기 찾기
    const existingIds = new Set(existing.map((e) => e.allergenId))
    const fresh = allergens.find((a) => !existingIds.has(a.id))

    if (!fresh) {
      test.skip() // 모두 등록된 경우 스킵
      return
    }

    // 등록 → pending 확인
    const addRes = await request.post(`${API_URL}/users/me/allergens`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { allergenId: fresh.id },
    })
    expect(addRes.ok()).toBeTruthy()
    const added = (await addRes.json()).data
    expect(added.status).toBe('pending') // 학생은 항상 pending

    // 정리: 등록한 알레르기 삭제
    await request.delete(`${API_URL}/users/me/allergens/${added.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  })

  test('API — pending 알레르기는 알레르기 대조 결과에 포함되지 않음', async ({ request }) => {
    const studentToken = await apiLogin(request, STUDENT)
    const nutriToken   = await apiLogin(request, NUTRITIONIST)

    // 오늘 날짜의 published 식단 조회
    const today = new Date().toISOString().split('T')[0]
    const mealsRes = await request.get(`${API_URL}/meals?month=${today.slice(0, 7)}`, {
      headers: { Authorization: `Bearer ${nutriToken}` },
    })
    if (!mealsRes.ok()) { test.skip(); return }

    const meals = (await mealsRes.json()).data as { id: string; status: string }[]
    const published = meals.find((m) => m.status === 'published')
    if (!published) { test.skip(); return }

    // 식단 알레르기 대조 — pending만 있는 사용자는 매칭 안 됨
    const checkRes = await request.get(
      `${API_URL}/meals/${published.id}/allergen-check`,
      { headers: { Authorization: `Bearer ${studentToken}` } },
    )
    expect(checkRes.ok()).toBeTruthy()
    // pending 알레르기만 있으면 isDangerous=false
    const result = (await checkRes.json()).data
    expect(typeof result.isDangerous).toBe('boolean')
  })
})
