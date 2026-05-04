import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { UserRole } from '../../types/auth'

export function AppLayout() {
  const { user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) return null

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* 데스크톱 사이드바 */}
      <div className="d-none d-md-block flex-shrink-0">
        <Sidebar role={user.role as UserRole} />
      </div>

      {/* 모바일 오버레이 사이드바 */}
      {sidebarOpen && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-md-none"
            style={{ zIndex: 1040 }}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className="position-fixed top-0 start-0 h-100 d-md-none"
            style={{ zIndex: 1050 }}
          >
            <Sidebar
              role={user.role as UserRole}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* 메인 영역 */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="flex-grow-1 overflow-auto p-4 bg-light">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
