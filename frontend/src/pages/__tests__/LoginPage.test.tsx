import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { authApi } from '../../services/auth.api'
import { useAuthStore } from '../../stores/auth.store'

vi.mock('../../services/auth.api', () => ({
  authApi: { login: vi.fn() },
}))

const mockLogin = vi.mocked(authApi.login)

function renderLogin(state?: { signupSuccess?: boolean }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>대시보드</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useAuthStore.setState({ user: null, isInitialized: true, accessToken: null })
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('기본 폼 요소가 렌더된다', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('example@school.kr')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('비밀번호 입력')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('signupSuccess 상태가 있으면 성공 배너를 표시한다', () => {
    renderLogin({ signupSuccess: true })
    expect(screen.getByText(/회원가입이 완료됐습니다/)).toBeInTheDocument()
  })

  it('빈 폼 제출 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(screen.getByText('이메일과 비밀번호를 입력해주세요.')).toBeInTheDocument()
  })

  it('로그인 성공 시 스토어에 user가 저장된다', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: 'tok',
          user: { id: 'u1', name: '박학생', email: 's@t.com', role: 'student', orgId: 'org1' },
        },
      },
    } as never)

    renderLogin()
    await user.type(screen.getByPlaceholderText('example@school.kr'), 's@t.com')
    await user.type(screen.getByPlaceholderText('비밀번호 입력'), 'Test1234!')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(useAuthStore.getState().user?.email).toBe('s@t.com'))
    expect(screen.getByText('대시보드')).toBeInTheDocument()
  })

  it('로그인 실패 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: { message: '이메일 또는 비밀번호가 올바르지 않습니다' } } },
    })

    renderLogin()
    await user.type(screen.getByPlaceholderText('example@school.kr'), 'wrong@t.com')
    await user.type(screen.getByPlaceholderText('비밀번호 입력'), 'wrong')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() =>
      expect(screen.getByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeInTheDocument()
    )
  })
})
