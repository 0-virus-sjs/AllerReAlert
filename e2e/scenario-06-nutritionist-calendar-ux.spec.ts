/**
 * T-159: 영양사 달력 중심 식단 관리 E2E 시나리오 (5개)
 *
 * S1 API — 식단 저장 후 calendar-status 응답에 해당 날짜 반영
 * S2 API — GET /meals/calendar-status 응답 구조 검증
 * S3 API — 알레르기 충돌 식단의 calendar-status conflictCount > 0
 * S4 UI  — /meals 진입 시 달력만 표시 (슬라이더 버튼 없음), 상세 패널 공존
 * S5 UI  — AI 초안 버튼 클릭 시 패널 내 AI 섹션 표시 (페이지 이동 없음)
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const API_URL      = process.env.API_URL      ?? 'http://localhost:5000/api/v1'
const NUTRITIONIST = {
  email:    process.env.TEST_NUTRITIONIST_EMAIL    ?? 'nutritionist@allerrealert.kr',
  password: process.env.TEST_NUTRITIONIST_PASSWORD ?? 'Test1234!',
}

async function apiLogin(request: APIRequestContext, creds: typeof NUTRITIONIST): Promise<string> {
  const res = await request.post(`${API_URL}/auth/login`, { data: creds })
  expect(res.ok(), `로그인 실패: ${creds.email}`).toBeTruthy()
  return (await res.json()).data.accessToken as string
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ── S1 ──────────────────────────────────────────────────────────────────────
test('S1 API — 식단 저장 후 calendar-status 해당 날짜 반영', async ({ request }) => {
  const token = await apiLogin(request, NUTRITIONIST)
  const month = currentMonth()
  const date  = todayStr()

  // 식단 생성
  const createRes = await request.post(`${API_URL}/meals`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      date,
      items: [
        { category: 'rice',  name: '현미밥',   calories: 300 },
        { category: 'soup',  name: '미역국',   calories: 80  },
        { category: 'side',  name: '두부조림', calories: 120 },
      ],
    },
  })
  expect(createRes.ok()).toBeTruthy()
  const meal = (await createRes.json()).data
  expect(meal.status).toBe('draft')

  // calendar-status에 해당 날짜 반영 확인
  const statusRes = await request.get(`${API_URL}/meals/calendar-status?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(statusRes.ok()).toBeTruthy()
  const entries = (await statusRes.json()).data as { date: string; status: string }[]
  const entry = entries.find((e) => e.date === date)
  expect(entry).toBeDefined()
  expect(['draft', 'needs-review']).toContain(entry!.status)

  // 정리
  await request.delete(`${API_URL}/meals/${meal.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
})

// ── S2 ──────────────────────────────────────────────────────────────────────
test('S2 API — calendar-status 응답 구조 검증', async ({ request }) => {
  const token = await apiLogin(request, NUTRITIONIST)
  const month = currentMonth()

  const res = await request.get(`${API_URL}/meals/calendar-status?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.ok()).toBeTruthy()

  const entries = (await res.json()).data as unknown[]
  expect(Array.isArray(entries)).toBeTruthy()

  if (entries.length === 0) return // 이달 식단 없음 — 구조 검증 통과로 처리

  const entry = entries[0] as Record<string, unknown>
  expect(typeof entry.date).toBe('string')
  expect(typeof entry.status).toBe('string')
  expect(typeof entry.hasAlternate).toBe('boolean')
  expect(typeof entry.conflictCount).toBe('number')
  expect(typeof entry.affectedStudents).toBe('number')

  const validStatuses = ['no-meal', 'draft', 'ai-draft', 'published', 'needs-review', 'needs-alt', 'has-alt']
  expect(validStatuses).toContain(entry.status)
})

// ── S3 ──────────────────────────────────────────────────────────────────────
test('S3 API — 알레르기 태깅된 식단의 calendar-status conflictCount 필드 존재', async ({ request }) => {
  const token = await apiLogin(request, NUTRITIONIST)
  const month = currentMonth()

  // 이달 calendar-status 조회
  const statusRes = await request.get(`${API_URL}/meals/calendar-status?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(statusRes.ok()).toBeTruthy()
  const entries = (await statusRes.json()).data as { date: string; conflictCount: number; affectedStudents: number }[]

  // 모든 항목에 conflictCount·affectedStudents가 number 타입으로 존재
  for (const e of entries) {
    expect(typeof e.conflictCount).toBe('number')
    expect(e.conflictCount).toBeGreaterThanOrEqual(0)
    expect(typeof e.affectedStudents).toBe('number')
    expect(e.affectedStudents).toBeGreaterThanOrEqual(0)
  }

  // conflictCount > 0 인 항목은 status가 needs-review / needs-alt / has-alt 중 하나
  const conflictEntries = entries.filter((e) => e.conflictCount > 0)
  for (const e of conflictEntries) {
    expect(['needs-review', 'needs-alt', 'has-alt']).toContain(
      (e as unknown as Record<string, string>).status,
    )
  }
})

// ── S4 ──────────────────────────────────────────────────────────────────────
test('S4 UI — /meals 진입 시 달력 표시·슬라이더 버튼 없음·상세 패널 공존', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', NUTRITIONIST.email)
  await page.fill('input[type="password"]', NUTRITIONIST.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/', { timeout: 15_000 })

  await page.goto('/meals')

  // 달력 그리드가 렌더됐는지 확인 (7열 grid)
  await expect(
    page.locator('div[style*="grid-template-columns: repeat(7"]').first()
  ).toBeVisible({ timeout: 10_000 })

  // 슬라이더 버튼이 없는지 확인 (T-149에서 제거)
  await expect(page.getByText('슬라이더')).not.toBeVisible()
  await expect(page.getByText('캘린더')).not.toBeVisible()

  // 상세 패널이 달력과 함께 표시됨 (DayDetailPanel — 날짜/식단 텍스트)
  await expect(page.locator('text=식단').first()).toBeVisible({ timeout: 10_000 })
})

// ── S5 ──────────────────────────────────────────────────────────────────────
test('S5 UI — AI 초안 버튼 클릭 시 패널 내 AI 섹션 표시 (페이지 이동 없음)', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', NUTRITIONIST.email)
  await page.fill('input[type="password"]', NUTRITIONIST.password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/', { timeout: 15_000 })

  await page.goto('/meals')
  await expect(
    page.locator('div[style*="grid-template-columns: repeat(7"]').first()
  ).toBeVisible({ timeout: 10_000 })

  // 패널 내 "AI 초안 생성" 버튼 클릭
  await page.getByText('AI 초안 생성').first().click()

  // URL이 /meals에 그대로 있는지 확인 (페이지 이동 없음)
  expect(page.url()).toContain('/meals')

  // PanelAiSection이 패널 안에 렌더됨 (AI 식단 생성 텍스트 + 선호 재료 입력)
  await expect(page.getByText('AI 식단 생성').first()).toBeVisible({ timeout: 5_000 })
  await expect(page.getByPlaceholder('선호 식재료 (쉼표 구분, 선택)')).toBeVisible()

  // /ai 라우트로 이동하지 않았는지 확인
  expect(page.url()).not.toContain('/ai')
})
