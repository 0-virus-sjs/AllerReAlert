import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar, Nav, Dropdown } from 'react-bootstrap'
import { useAuthStore } from '../../stores/auth.store'
import { api } from '../../services/api'

interface Props {
  onMenuToggle: () => void
}

const ROLE_LABEL: Record<string, string> = {
  student:      '학생',
  staff:        '교직원',
  guardian:     '보호자',
  nutritionist: '영양사',
  admin:        '관리자',
}

export function Header({ onMenuToggle }: Props) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await api.post('/auth/logout')
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
      setLoggingOut(false)
    }
  }

  return (
    <Navbar bg="white" className="border-bottom px-3 py-2 d-flex align-items-center">
      {/* 모바일 햄버거 */}
      <button
        className="btn btn-light d-md-none me-2"
        onClick={onMenuToggle}
        aria-label="메뉴 열기"
      >
        ☰
      </button>

      <span className="fw-semibold d-md-none text-primary">🍽️ AllerReAlert</span>

      <Nav className="ms-auto d-flex align-items-center gap-3">
        {/* 알림 아이콘 */}
        <button
          className="btn btn-light position-relative"
          onClick={() => navigate('/notifications')}
          aria-label="알림"
        >
          🔔
        </button>

        {/* 프로필 드롭다운 */}
        <Dropdown align="end">
          <Dropdown.Toggle variant="light" size="sm" id="profile-dropdown">
            {user?.name ?? '사용자'}{' '}
            <span className="badge bg-secondary ms-1">
              {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
            </span>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => navigate('/profile')}>내 프로필</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? '로그아웃 중…' : '로그아웃'}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Nav>
    </Navbar>
  )
}
