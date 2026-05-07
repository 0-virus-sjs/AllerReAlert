/**
 * T-107: axe-core 접근성 자동 검사 (WCAG 2.1 AA)
 * 핵심 페이지 컴포넌트를 렌더링 후 axe 위반 여부를 검사한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { LoginPage } from '../LoginPage'
import { useAuthStore } from '../../stores/auth.store'

vi.mock('../../services/auth.api', () => ({
  authApi: { login: vi.fn() },
}))

beforeEach(() => {
  useAuthStore.setState({ user: null, isInitialized: true, accessToken: null })
})

function renderInRouter(element: React.ReactElement) {
  const { container } = render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>
  )
  return container
}

describe('접근성 검사 (WCAG 2.1 AA)', () => {
  it('LoginPage — axe 위반 없음', async () => {
    const container = renderInRouter(<LoginPage />)
    const results = await axe(container)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(expect(results) as any).toHaveNoViolations()
  })
})
