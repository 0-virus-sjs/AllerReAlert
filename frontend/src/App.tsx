import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthInit } from './components/auth/AuthInit'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInit>
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/login" element={<div>Login — SCR-001</div>} />
            <Route path="/signup" element={<div>Signup — SCR-002</div>} />
            <Route path="/unauthorized" element={<div>403 — 접근 권한 없음</div>} />

            {/* 인증 필요 — 전 역할 */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<div>Dashboard</div>} />
            </Route>

            {/* 영양사 전용 */}
            <Route element={<ProtectedRoute roles={['nutritionist']} />}>
              <Route path="/meals" element={<div>식단 관리 — SCR-010</div>} />
            </Route>

            {/* 관리자 전용 */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<div>관리자 패널</div>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthInit>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
