import { useAuthStore } from '../stores/auth.store'
import { NutritionistDashboardPage } from './NutritionistDashboardPage'

export function DashboardPage() {
  const { user } = useAuthStore()

  if (user?.role === 'nutritionist') return <NutritionistDashboardPage />

  // T-045(M4)에서 student/staff/guardian 대시보드 추가 예정
  return (
    <div className="p-4">
      <h5 className="fw-bold">대시보드</h5>
      <p className="text-muted small">식단 캘린더 및 알레르기 정보를 확인하세요.</p>
    </div>
  )
}
