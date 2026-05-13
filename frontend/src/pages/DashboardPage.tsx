import { useAuthStore } from '../stores/auth.store'
import { AnalyticsDashboardPage } from './AnalyticsDashboardPage'
import { UserDashboardPage } from './UserDashboardPage'

export function DashboardPage() {
  const { user } = useAuthStore()

  if (user?.role === 'nutritionist') return <AnalyticsDashboardPage />

  return <UserDashboardPage />
}
