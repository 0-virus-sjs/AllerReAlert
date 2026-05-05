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
                <Route path="/profile" element={<div>내 프로필</div>} />
                <Route path="/allergens" element={<AllergenProfilePage />} />
                <Route path="/surveys" element={<SurveyPage />} />
                <Route path="/children" element={<div>자녀 알레르기</div>} />
                <Route path="/analytics" element={<div>수요 대시보드</div>} />
                <Route path="/alternates" element={<AlternateMealPage />} />

                {/* 영양사 전용 */}
                <Route element={<ProtectedRoute roles={['nutritionist']} />}>
                  <Route path="/meals"              element={<MealPlanPage />} />
                  <Route path="/ai"                 element={<AIMealPlanPage />} />
                  <Route path="/survey-management"  element={<SurveyManagementPage />} />
                </Route>

                {/* 관리자 전용 */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                  <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                  <Route path="/admin/users" element={<div>사용자 관리</div>} />
                  <Route path="/admin/schools" element={<div>학교 관리</div>} />
                  <Route path="/admin/allergens" element={<div>알레르기 마스터</div>} />
                  <Route path="/admin/logs" element={<div>시스템 로그</div>} />
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
