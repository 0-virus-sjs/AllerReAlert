import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '../../../stores/auth.store'
import type { AuthUser } from '../../../types/auth'

function setup(user: AuthUser | null, initialized = true) {
  useAuthStore.setState({ user, isInitialized: initialized, accessToken: user ? 'tok' : null })
}

function renderRoute(roles?: Parameters<typeof ProtectedRoute>[0]['roles']) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>로그인 페이지</div>} />
        <Route path="/unauthorized" element={<div>권한 없음</div>} />
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="/protected" element={<div>보호된 페이지</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

const student: AuthUser = { id: 'u1', name: '박학생', email: 'student@test.com', role: 'student', orgId: 'org1' }
const nutritionist: AuthUser = { ...student, role: 'nutritionist', email: 'nutr@test.com' }

beforeEach(() => {
  useAuthStore.setState({ user: null, isInitialized: false, accessToken: null })
})

describe('ProtectedRoute', () => {
  it('초기화 전(isInitialized=false)에는 아무것도 렌더하지 않는다', () => {
    setup(null, false)
    const { container } = renderRoute()
    expect(container.firstChild).toBeNull()
  })

  it('미인증 → /login 리다이렉트', () => {
    setup(null)
    renderRoute()
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument()
  })

  it('인증됨 + roles 미지정 → 접근 허용', () => {
    setup(student)
    renderRoute()
    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
  })

  it('인증됨 + 허용 역할 포함 → 접근 허용', () => {
    setup(nutritionist)
    renderRoute(['nutritionist'])
    expect(screen.getByText('보호된 페이지')).toBeInTheDocument()
  })

  it('인증됨 + 허용 역할 미포함 → /unauthorized 리다이렉트', () => {
    setup(student)
    renderRoute(['nutritionist'])
    expect(screen.getByText('권한 없음')).toBeInTheDocument()
  })

  it('admin 역할만 허용 시 student → /unauthorized', () => {
    setup(student)
    renderRoute(['admin'])
    expect(screen.getByText('권한 없음')).toBeInTheDocument()
  })
})
