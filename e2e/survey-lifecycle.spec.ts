/**
 * T-077: 설문 생명주기 E2E 시나리오
 *
 * 전제 조건:
 *   - .env에 TEST_NUTRITIONIST / TEST_STUDENT 계정 설정
 *   - 해당 조직에 식단(MealPlan)이 최소 1개 존재
 *
 * 실행:
 *   cd e2e && npm test
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'http://localhost:5000/api/v1'

const NUTRITIONIST = {
  email:    process.env.TEST_NUTRITIONIST_EMAIL    ?? 'nutritionist@test.com',
  password: process.env.TEST_NUTRITIONIST_PASSWORD ?? 'test1234',
}
const STUDENT = {
  email:    process.env.TEST_STUDENT_EMAIL    ?? 'student@test.com',
  password: process.env.TEST_STUDENT_PASSWORD ?? 'test1234',
}

// ── 공통 헬퍼 ─────────────────────────────────────────────

async function apiLogin(request: APIRequestContext, creds: typeof NUTRITIONIST): Promise<string> {
  const url = `${API_URL}/auth/login`
  const res  = await request.post(url, {
    data:    { email: creds.email, password: creds.password },
    headers: { 'Content-Type': 'application/json' },
  })
  const body = await res.text()
  expect(
    res.ok(),
    `API 로그인 실패\n  URL: ${url}\n  email: ${creds.email}\n  status: ${res.status()}\n  body: ${body}`,
  ).toBeTruthy()
  return (JSON.parse(body)).data.accessToken as string
}

async function uiLogin(page: Page, creds: typeof NUTRITIONIST): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', creds.email)
  await page.fill('input[type="password"]', creds.password)
  await page.click('button[type="submit"]')

  // 성공(URL 변경) 또는 오류 메시지 중 먼저 오는 것을 기다림
  await Promise.race([
    page.waitForURL('/', { timeout: 20_000 }),
    page.locator('.alert-danger').waitFor({ state: 'visible', timeout: 20_000 }),
  ]).catch(() => { /* 아무것도 오지 않으면 아래에서 실패 */ })

  const errorEl = page.locator('.alert-danger')
  if (await errorEl.isVisible()) {
    const msg = await errorEl.textContent()
    throw new Error(`UI 로그인 실패 (${creds.email}): ${msg?.trim()}`)
  }

  await expect(page).toHaveURL('/', { timeout: 5_000 })
}

// ── 테스트 스위트 ─────────────────────────────────────────

test.describe('설문 생명주기 시나리오 (T-077)', () => {
  let surveyId: string
  let nutritionistToken: string

  // ── 셋업: 영양사가 API로 설문 생성 ─────────────────────

  test.beforeAll(async ({ request }) => {
    console.log('[T-077] API_URL:', API_URL)
    console.log('[T-077] NUTRITIONIST:', NUTRITIONIST.email)
    console.log('[T-077] STUDENT:', STUDENT.email)

    nutritionistToken = await apiLogin(request, NUTRITIONIST)
    const headers = { Authorization: `Bearer ${nutritionistToken}` }

    // 이번 달 식단 조회 → mealPlanId 확보
    const month    = new Date().toISOString().slice(0, 7)
    const mealsRes = await request.get(`${API_URL}/meals`, { headers, params: { month } })
    expect(mealsRes.ok(), 'GET /meals 실패').toBeTruthy()

    const meals = (await mealsRes.json()).data as Array<{ id: string }>
    expect(meals.length, '테스트 전 식단이 최소 1개 필요합니다').toBeGreaterThan(0)
    const mealPlanId = meals[0].id

    // 마감 48시간 후 설문 생성
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    const surveyRes = await request.post(`${API_URL}/surveys`, {
      headers,
      data: {
        mealPlanId,
        type: 'need_check',
        options: {
          question: '[E2E] 대체 식단이 필요하신가요?',
          choices: [
            { key: 'yes', label: '네, 필요합니다' },
            { key: 'no',  label: '아니요, 괜찮습니다' },
          ],
        },
        deadline,
      },
    })
    expect(surveyRes.status(), 'POST /surveys 실패').toBe(201)

    const created = (await surveyRes.json()).data
    surveyId = created.id
    expect(surveyId, '설문 ID가 있어야 합니다').toBeTruthy()
  })

  // ── 시나리오 1: 초대 알림 생성 확인 (API) ─────────────

  test('시나리오 1 — 설문 초대 알림이 학생에게 생성된다', async ({ request }) => {
    const token = await apiLogin(request, STUDENT)

    const res = await request.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok(), 'GET /notifications 실패').toBeTruthy()

    const body = await res.json()
    // listNotifications 응답: { items: [...], total, page, pageSize, unreadCount }
    const notifications = (body.data?.items ?? []) as Array<{
      type: string
      payload: Record<string, unknown>
    }>

    const invite = notifications.find(
      (n) => n.type === 'survey_invite' && n.payload?.surveyId === surveyId,
    )
    expect(invite, `survey_invite 알림이 생성돼야 합니다 (surveyId: ${surveyId})`).toBeDefined()
  })

  // ── 시나리오 2: 학생 UI 투표 ────────────────────────────

  test('시나리오 2 — 학생이 설문에 응답한다 (UI)', async ({ page }) => {
    await uiLogin(page, STUDENT)
    await page.goto('/surveys')

    // 설문 카드 — 생성한 설문의 질문 텍스트가 보여야 함 (이전 실행 잔여 카드 있을 수 있으므로 .first())
    const questionText = '[E2E] 대체 식단이 필요하신가요?'
    await expect(page.getByText(questionText).first()).toBeVisible({ timeout: 15_000 })

    // "네, 필요합니다" 버튼 클릭
    await page.getByRole('button', { name: '네, 필요합니다' }).first().click()

    // 저장 성공 메시지 확인
    await expect(page.getByText('응답이 저장됐습니다.')).toBeVisible()

    // 변경 가능 표시 확인
    await expect(page.getByText(/응답 완료.*변경 가능/)).toBeVisible()
  })

  // ── 시나리오 3: 영양사 마감 + 결과 집계 확인 (UI) ──────

  test('시나리오 3 — 영양사가 설문을 마감하고 결과를 확인한다 (UI)', async ({ page }) => {
    await uiLogin(page, NUTRITIONIST)
    await page.goto('/survey-management')

    // 진행 중 탭 → 방금 만든 설문 행: 참여자 1명 확인 후 클릭
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 10_000 })
    await expect(firstRow.getByText('1명 응답')).toBeVisible()
    await firstRow.click()

    // 상세 모달 열림 확인
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(modal.getByText('[E2E] 대체 식단이 필요하신가요?')).toBeVisible()

    // 마감하기 클릭
    await modal.getByRole('button', { name: '설문 마감하기' }).click()

    // 마감 완료 메시지 — 총 1명 응답
    await expect(modal.getByText(/설문이 마감됐습니다/)).toBeVisible({ timeout: 10_000 })
    await expect(modal.getByText(/총 1명 응답/)).toBeVisible()

    // 집계 결과 — "네, 필요합니다" 1표 확인
    await expect(modal.getByText('네, 필요합니다')).toBeVisible()
    await expect(modal.getByText(/1표/)).toBeVisible()
  })

  // ── 시나리오 4: 마감 후 재응답 차단 확인 (API) ─────────
  // 시나리오 3(UI)이 실패해도 독립적으로 동작하도록 API로 직접 마감

  test('시나리오 4 — 마감된 설문에는 응답할 수 없다 (API)', async ({ request }) => {
    // 아직 open이면 API로 강제 마감
    const closeRes = await request.put(`${API_URL}/surveys/${surveyId}/close`, {
      headers: { Authorization: `Bearer ${nutritionistToken}` },
    })
    // 이미 마감됐으면 409 ALREADY_CLOSED — 둘 다 허용
    expect([200, 201, 409], '설문 마감 실패').toContain(closeRes.status())

    const studentToken = await apiLogin(request, STUDENT)
    const res = await request.post(`${API_URL}/surveys/${surveyId}/responses`, {
      headers: { Authorization: `Bearer ${studentToken}` },
      data:    { response: { choice: 'no' } },
    })

    expect(res.status(), '마감 후 409가 반환돼야 합니다').toBe(409)
    const body = await res.json()
    expect(body.error?.code).toBe('SURVEY_CLOSED')
  })
})
