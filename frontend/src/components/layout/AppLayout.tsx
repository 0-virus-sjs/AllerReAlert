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

  const NAVBAR_H = 56  // Bootstrap fixed-top navbar 높이(px)
  const SIDEBAR_W = 220

  return (
    <>
      {/* 고정 Navbar — Header 컴포넌트가 fixed-top으로 렌더링 */}
      <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />

      <div className="d-flex" style={{ minHeight: '100vh', paddingTop: NAVBAR_H }}>
        {/* 데스크톱 사이드바 — sticky로 Navbar 아래 고정 */}
        <div
          className="d-none d-md-block flex-shrink-0"
          style={{
            width: SIDEBAR_W,
            position: 'sticky',
            top: NAVBAR_H,
            height: `calc(100vh - ${NAVBAR_H}px)`,
            overflowY: 'auto',
            alignSelf: 'flex-start',
          }}
        >
          <Sidebar role={user.role as UserRole} />
        </div>

        {/* 모바일 오버레이 사이드바 — Navbar 아래부터 시작 */}
        {sidebarOpen && (
          <>
            <div
              className="position-fixed w-100 h-100 bg-dark bg-opacity-50 d-md-none"
              style={{ top: NAVBAR_H, left: 0, zIndex: 1040 }}
              onClick={() => setSidebarOpen(false)}
            />
            <div
              className="position-fixed start-0 d-md-none"
              style={{ top: NAVBAR_H, height: `calc(100vh - ${NAVBAR_H}px)`, zIndex: 1050 }}
            >
              <Sidebar
                role={user.role as UserRole}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </>
        )}

        {/* 메인 콘텐츠 */}
        <main className="flex-grow-1 overflow-auto p-4 bg-light">
          <Outlet />
        </main>
      </div>
    </>
  )
}
