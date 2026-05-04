import { NavLink } from 'react-router-dom'
import type { UserRole } from '../../types/auth'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { to: '/',            label: '식단 조회',    icon: '🍱' },
    { to: '/allergens',   label: '알레르기 등록', icon: '⚠️' },
    { to: '/surveys',     label: '설문·투표',    icon: '📋' },
    { to: '/notifications', label: '알림',       icon: '🔔' },
  ],
  staff: [
    { to: '/',            label: '식단 조회',    icon: '🍱' },
    { to: '/allergens',   label: '알레르기 등록', icon: '⚠️' },
    { to: '/surveys',     label: '설문·투표',    icon: '📋' },
    { to: '/notifications', label: '알림',       icon: '🔔' },
  ],
  guardian: [
    { to: '/',            label: '식단 조회',    icon: '🍱' },
    { to: '/children',    label: '자녀 알레르기', icon: '👶' },
    { to: '/notifications', label: '알림',       icon: '🔔' },
  ],
  nutritionist: [
    { to: '/',            label: '대시보드',     icon: '🏠' },
    { to: '/meals',       label: '식단 관리',    icon: '📝' },
    { to: '/ai',          label: 'AI 식단 생성', icon: '🤖' },
    { to: '/alternates',  label: '대체 식단',    icon: '🔄' },
    { to: '/surveys',     label: '설문 관리',    icon: '📋' },
    { to: '/analytics',   label: '수요 대시보드', icon: '📊' },
    { to: '/notifications', label: '알림',       icon: '🔔' },
  ],
  admin: [
    { to: '/admin/users',     label: '사용자 관리',     icon: '👥' },
    { to: '/admin/schools',   label: '학교 관리',       icon: '🏫' },
    { to: '/admin/allergens', label: '알레르기 마스터',  icon: '⚠️' },
    { to: '/admin/logs',      label: '시스템 로그',      icon: '📜' },
  ],
}

interface Props {
  role: UserRole
  onClose?: () => void
}

export function Sidebar({ role, onClose }: Props) {
  const items = NAV_ITEMS[role] ?? []

  return (
    <nav className="d-flex flex-column bg-white border-end" style={{ width: 220, minHeight: '100%' }}>
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
        <span className="fw-bold text-primary fs-6">🍽️ AllerReAlert</span>
        {onClose && (
          <button className="btn btn-sm btn-light d-md-none" onClick={onClose}>✕</button>
        )}
      </div>
      <ul className="nav flex-column flex-grow-1 p-2">
        {items.map((item) => (
          <li key={item.to} className="nav-item">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 rounded px-3 py-2 ${
                  isActive ? 'bg-primary text-white' : 'text-dark'
                }`
              }
              onClick={onClose}
            >
              <span>{item.icon}</span>
              <span className="small">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
