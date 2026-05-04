import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AuthInit } from '../AuthInit'
import { useAuthStore } from '../../../stores/auth.store'
import { api } from '../../../services/api'

vi.mock('../../../services/api', () => ({
  api: { post: vi.fn() },
}))

const mockPost = vi.mocked(api.post)

beforeEach(() => {
  useAuthStore.setState({ user: null, isInitialized: false, accessToken: null })
  vi.clearAllMocks()
})

describe('AuthInit', () => {
  it('refresh 성공 → setAuth 호출 + isInitialized=true', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          accessToken: 'new-token',
          user: { id: 'u1', name: '테스트', email: 't@t.com', role: 'student', orgId: 'org1' },
        },
      },
    })

    render(<AuthInit><div /></AuthInit>)

    await waitFor(() => expect(useAuthStore.getState().isInitialized).toBe(true))
    expect(useAuthStore.getState().accessToken).toBe('new-token')
    expect(useAuthStore.getState().user?.role).toBe('student')
  })

  it('refresh 실패(미로그인) → user=null, isInitialized=true', async () => {
    mockPost.mockRejectedValueOnce(new Error('401'))

    render(<AuthInit><div /></AuthInit>)

    await waitFor(() => expect(useAuthStore.getState().isInitialized).toBe(true))
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('children을 렌더한다', () => {
    mockPost.mockResolvedValueOnce({ data: { success: false } })
    const { getByText } = render(<AuthInit><span>자식</span></AuthInit>)
    expect(getByText('자식')).toBeInTheDocument()
  })
})
