import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import type { UserRole } from '../../types/auth'

interface Props {
  roles?: UserRole[]   // 미지정 시 인증만 확인
}

export function ProtectedRoute({ roles }: Props) {
  const { user, isInitialized } = useAuthStore()

  // 초기 refresh 완료 전 — 렌더 보류
  if (!isInitialized) return null

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
