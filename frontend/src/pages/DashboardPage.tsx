import { useAuthStore } from '../stores/auth.store'
import { NutritionistDashboardPage } from './NutritionistDashboardPage'
import { UserDashboardPage } from './UserDashboardPage'

export function DashboardPage() {
  const { user } = useAuthStore()

  if (user?.role === 'nutritionist') return <NutritionistDashboardPage />

  return <UserDashboardPage />
}
