import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faUtensils, faTriangleExclamation, faClipboardList, faBell,
  faChild, faGaugeHigh, faCalendarDays, faClipboardCheck,
  faUsers, faSchool, faBookMedical, faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons'
import type { UserRole } from '../../types/auth'

interface NavItem {
  to: string
  label: string
  icon: IconDefinition
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { to: '/dashboard',       label: '식단 조회',    icon: faUtensils },
    { to: '/allergens',     label: '알레르기 등록', icon: faTriangleExclamation },
    { to: '/surveys',       label: '설문·투표',    icon: faClipboardList },
    { to: '/notifications', label: '알림',         icon: faBell },
  ],
  staff: [
    { to: '/dashboard',       label: '식단 조회',    icon: faUtensils },
    { to: '/allergens',     label: '알레르기 등록', icon: faTriangleExclamation },
    { to: '/surveys',       label: '설문·투표',    icon: faClipboardList },
    { to: '/notifications', label: '알림',         icon: faBell },
  ],
  guardian: [
    { to: '/dashboard',       label: '식단 조회',    icon: faUtensils },
    { to: '/children',      label: '자녀 알레르기', icon: faChild },
    { to: '/notifications', label: '알림',         icon: faBell },
  ],
  nutritionist: [
    { to: '/dashboard',         label: '대시보드',  icon: faGaugeHigh },
    { to: '/meals',             label: '식단 관리', icon: faCalendarDays },
    { to: '/survey-management', label: '설문 관리', icon: faClipboardCheck },
    { to: '/notifications',     label: '알림',      icon: faBell },
  ],
  admin: [
    { to: '/admin/users',     label: '사용자 관리',    icon: faUsers },
    { to: '/admin/orgs',      label: '학교 관리',      icon: faSchool },
    { to: '/admin/allergens', label: '알레르기 마스터', icon: faBookMedical },
    { to: '/admin/logs',      label: '시스템 로그',     icon: faClockRotateLeft },
  ],
}

interface Props {
  role: UserRole
  onClose?: () => void
}

export function Sidebar({ role, onClose }: Props) {
  const items = NAV_ITEMS[role] ?? []

  return (
    <nav
      className="d-flex flex-column bg-white border-end"
      style={{ width: 220, minHeight: '100%' }}
    >
      {onClose && (
        <div className="p-2 border-bottom d-flex justify-content-end d-md-none">
          <button className="btn btn-sm btn-light" onClick={onClose}>
            ✕
          </button>
        </div>
      )}
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
              {({ isActive }) => (
                <>
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`fa-fw ${isActive ? '' : 'text-primary'}`}
                  />
                  <span className="small">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}