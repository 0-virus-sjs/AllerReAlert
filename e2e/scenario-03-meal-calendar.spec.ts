/**
 * T-112 시나리오 3: 식단 캘린더 조회 + 알레르기 경고
 *
 * - 이용자(학생/교직원)가 식단 캘린더 화면 진입
 * - 식단 목록 API 정상 응답
 * - 알레르기 대조 API 정상 응답 (isDangerous 필드 존재)
 * - 영양사가 식단 작성 → 공개 흐름 (API 레벨)
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1'

const STUDENT     = { email: process.env.TEST_STUDENT_EMAIL     ?? 'student@allerrealert.kr',     password: process.env.TEST_STUDENT_PASSWORD     ?? 'Test1234!' }
const NUTRITIONIST= { email: process.env.TEST_NUTRITIONIST_EMAIL ?? 'nutritionist@allerrealert.kr', password: process.env.TEST_NUTRITIONIST_PASSWORD ?? 'Test1234!' }

async function apiLogin(request: APIRequestContext, creds: typeof STUDENT): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, { data: creds })
  expect(res.ok(), `로그인 실패: ${creds.email}`).toBeTruthy()
  return (await res.json()).data.accessToken as string
}

test.describe('시나리오 3: 식단 캘린더 조회', () => {
  test('UI — 식단 캘린더 화면 진입 후 주요 요소 렌더', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', STUDENT.email)
    await page.fill('input[type="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    // 이용자 대시보드 → 식단 캘린더 이동
    await page.goto('/meals')
    // 캘린더 또는 식단 목록 컴포넌트가 렌더됐는지 확인
    await expect(
      page.locator('table, .calendar, [data-testid="meal-calendar"], .fc').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('API — 월간 식단 목록 조회 정상 응답', async ({ request }) => {
    const token = await apiLogin(request, STUDENT)
    const month = new Date().toISOString().slice(0, 7)

    const res = await request.get(`${API_URL}/meals?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBeTruthy()
    const data = (await res.json()).data
    expect(Array.isArray(data)).toBeTruthy()
  })

  test('API — 영양사 식단 생성 → draft 상태 확인', async ({ request }) => {
    const token = await apiLogin(request, NUTRITIONIST)

    // 현재 날짜 기준 내일 식단 생성
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const res = await request.post(`${API_URL}/meals`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        date: dateStr,
        items: [
          { category: 'rice',   name: '현미밥',   calories: 300, nutrients: null },
          { category: 'soup',   name: '된장찌개', calories: 100, nutrients: null },
          { category: 'side',   name: '시금치나물', calories: 50, nutrients: null },
          { category: 'dessert',name: '사과',      calories: 80,  nutrients: null },
        ],
      },
    })
    expect(res.ok()).toBeTruthy()
    const meal = (await res.json()).data
    expect(meal.status).toBe('draft')

    // 정리: 생성한 식단 삭제
    await request.delete(`${API_URL}/meals/${meal.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  })

  test('API — 알레르기 대조 응답에 isDangerous 필드 존재', async ({ request }) => {
    const studentToken = await apiLogin(request, STUDENT)
    const nutriToken   = await apiLogin(request, NUTRITIONIST)

    const month = new Date().toISOString().slice(0, 7)
    const mealsRes = await request.get(`${API_URL}/meals?month=${month}`, {
      headers: { Authorization: `Bearer ${nutriToken}` },
    })
    if (!mealsRes.ok()) { test.skip(); return }
    const meals = (await mealsRes.json()).data as { id: string }[]
    if (meals.length === 0) { test.skip(); return }

    const checkRes = await request.get(
      `${API_URL}/meals/${meals[0].id}/allergen-check`,
      { headers: { Authorization: `Bearer ${studentToken}` } },
    )
    expect(checkRes.ok()).toBeTruthy()
    const result = (await checkRes.json()).data
    expect(result).toHaveProperty('isDangerous')
    expect(result).toHaveProperty('dangerousItems')
  })
})
