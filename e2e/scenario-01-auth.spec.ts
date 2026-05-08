/**
 * T-112 시나리오 1: 인증 플로우
 *
 * - 유효한 자격증명으로 로그인 → 대시보드 진입
 * - 잘못된 자격증명 → 에러 메시지 표시
 * - 로그아웃 → 로그인 화면으로 이동
 * - 미인증 상태에서 보호 경로 접근 → 로그인 화면으로 리다이렉트
 */
import { test, expect } from '@playwright/test'

const STUDENT = {
  email:    process.env.TEST_STUDENT_EMAIL    ?? 'student@allerrealert.kr',
  password: process.env.TEST_STUDENT_PASSWORD ?? 'Test1234!',
}

test.describe('시나리오 1: 인증 플로우', () => {
  test('유효한 자격증명으로 로그인 후 대시보드 진입', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/AllerReAlert|알라리알라/i)

    await page.fill('input[type="email"]', STUDENT.email)
    await page.fill('input[type="password"]', STUDENT.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/', { timeout: 15_000 })
    // 대시보드에 사용자 이름이나 메뉴가 나타나는지 확인
    await expect(page.locator('nav, [data-testid="sidebar"], .navbar')).toBeVisible()
  })

  test('잘못된 비밀번호 → 에러 메시지 표시', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', STUDENT.email)
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('.alert-danger, [role="alert"]')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/login/)
  })

  test('빈 폼 제출 → 유효성 오류 표시', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')

    // 에러 메시지 또는 HTML5 required 검증
    const hasAlert = await page.locator('.alert-danger, [role="alert"]').isVisible()
    const hasInvalid = await page.locator(':invalid').count()
    expect(hasAlert || hasInvalid > 0).toBeTruthy()
    await expect(page).toHaveURL(/login/)
  })

  test('미인증 상태에서 보호 경로 접근 → 로그인으로 리다이렉트', async ({ page }) => {
    // 쿠키·스토리지를 비운 상태에서 보호 경로 직접 접근
    await page.context().clearCookies()
    await page.goto('/allergens')
    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })

  test('로그인 후 로그아웃 → 로그인 화면 이동', async ({ page }) => {
    // 로그인
    await page.goto('/login')
    await page.fill('input[type="email"]', STUDENT.email)
    await page.fill('input[type="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 15_000 })

    // 로그아웃 버튼 (드롭다운 메뉴 또는 버튼)
    const logoutBtn = page.locator('button:has-text("로그아웃"), a:has-text("로그아웃")')
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
    } else {
      // 프로필 메뉴 열기 → 로그아웃
      await page.locator('[data-testid="profile-menu"], .nav-item.dropdown').first().click()
      await page.locator('button:has-text("로그아웃"), a:has-text("로그아웃")').click()
    }

    await expect(page).toHaveURL(/login/, { timeout: 10_000 })
  })
})
