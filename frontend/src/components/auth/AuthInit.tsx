import { useEffect } from 'react'
import { api } from '../../services/api'
import { useAuthStore } from '../../stores/auth.store'
import type { AuthUser } from '../../types/auth'

interface RefreshResponse {
  success: boolean
  data: { accessToken: string; user?: AuthUser }
}

export function AuthInit({ children }: { children: React.ReactNode }) {
  const { setAuth, setInitialized } = useAuthStore()

  useEffect(() => {
    api
      .post<RefreshResponse>('/auth/refresh')
      .then(({ data }) => {
        if (data.success && data.data.user) {
          setAuth(data.data.accessToken, data.data.user)
        }
      })
      .catch(() => {
        // refresh 실패 = 미로그인 상태, 정상 처리
      })
      .finally(() => {
        setInitialized()
      })
  }, [setAuth, setInitialized])

  return <>{children}</>
}
