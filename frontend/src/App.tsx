import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthInit } from './components/auth/AuthInit'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { MealPlanPage } from './pages/MealPlanPage'
import { AlternateMealPage } from './pages/AlternateMealPage'
import { AllergenProfilePage } from './pages/AllergenProfilePage'
import { NotificationCenterPage } from './pages/NotificationCenterPage'
import { AIMealPlanPage } from './pages/AIMealPlanPage'
import { SurveyPage } from './pages/SurveyPage'
import { SurveyManagementPage } from './pages/SurveyManagementPage'
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage'
import { AdminPanelPage }         from './pages/AdminPanelPage'
import { GuardianApprovalsPage }  from './pages/GuardianApprovalsPage'
import { ProfilePage }            from './pages/ProfilePage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInit>
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/unauthorized" element={<div>403 — 접근 권한 없음</div>} />

            {/* 인증 필요 — 공통 레이아웃 적용 */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/notifications" element={<NotificationCenterPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/allergens" element={<AllergenProfilePage />} />
                <Route path="/surveys" element={<SurveyPage />} />
                {/* 보호자 전용 */}
                <Route element={<ProtectedRoute roles={['guardian']} />}>
                  <Route path="/children" element={<GuardianApprovalsPage />} />
                </Route>
                <Route path="/analytics" element={<AnalyticsDashboardPage />} />
                <Route path="/alternates" element={<AlternateMealPage />} />

                {/* 영양사 전용 */}
                <Route element={<ProtectedRoute roles={['nutritionist']} />}>
                  <Route path="/meals"              element={<MealPlanPage />} />
                  <Route path="/ai"                 element={<AIMealPlanPage />} />
                  <Route path="/survey-management"  element={<SurveyManagementPage />} />
                </Route>

                {/* 관리자 전용 */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                  <Route path="/admin" element={<AdminPanelPage />} />
                  <Route path="/admin/:tab" element={<AdminPanelPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
