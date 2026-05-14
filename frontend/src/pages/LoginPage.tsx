import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Alert, Button, Card, Container, Form, Spinner, Tab, Tabs } from 'react-bootstrap'
import { FlashAlert } from '../components/common/FlashAlert'
import { useAuthStore } from '../stores/auth.store'
import { authApi } from '../services/auth.api'
import type { UserRole } from '../types/auth'

const ROLE_TABS: { key: UserRole; label: string; allowedRoles: UserRole[] }[] = [
  { key: 'student',      label: '학생',   allowedRoles: ['student'] },
  { key: 'staff',        label: '교직원', allowedRoles: ['staff'] },
  { key: 'guardian',     label: '보호자', allowedRoles: ['guardian'] },
  { key: 'nutritionist', label: '영양사', allowedRoles: ['nutritionist', 'admin'] },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, clearAuth } = useAuthStore()

  const signupSuccess = (location.state as { signupSuccess?: boolean } | null)?.signupSuccess ?? false

  const [role, setRole] = useState<UserRole>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { data } = await authApi.login(email.trim(), password)
      const user = data.data.user

      // T-143: 로그인 응답 직후 탭-역할 매핑 검증
      const selectedTab = ROLE_TABS.find((t) => t.key === role)!
      if (!selectedTab.allowedRoles.includes(user.role)) {
        clearAuth()
        setError('이 탭에서 로그인할 수 없는 계정입니다.')
        return
      }

      setAuth(data.data.accessToken, user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '로그인에 실패했습니다. 다시 시도해주세요.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* 로고 */}
        <div className="text-center mb-4">
          <div className="fs-1">🍽️</div>
          <h1 className="fs-4 fw-bold text-primary">AllerReAlert</h1>
          <p className="text-muted small">학교급식 알레르기 안심 알림 서비스</p>
        </div>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-4">
            {/* 역할 탭 */}
            <Tabs
              activeKey={role}
              onSelect={(k) => { setRole(k as UserRole); setError(null) }}
              className="mb-4"
              justify
            >
              {ROLE_TABS.map(({ key, label }) => (
                <Tab key={key} eventKey={key} title={label} />
              ))}
            </Tabs>

            {signupSuccess && (
              <Alert variant="success" className="py-2 small">
                ✅ 회원가입이 완료됐습니다. 로그인해주세요.
              </Alert>
            )}

            {error && (
              <FlashAlert variant="danger" text={error} onClose={() => setError(null)} />
            )}

            <Form onSubmit={handleSubmit} noValidate>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">이메일</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="example@school.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold">비밀번호</Form.Label>
                <div className="input-group">
                  <Form.Control
                    type={showPw ? 'text' : 'password'}
                    placeholder="비밀번호 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPw((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
                  >
                    <i className={`bi bi-eye${showPw ? '-slash' : ''}`} />
                  </button>
                </div>
              </Form.Group>

              <Button
                type="submit"
                variant="primary"
                className="w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    로그인 중…
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </Form>

            <div className="text-center mt-3 small text-muted">
              계정이 없으신가요?{' '}
              <Link to="/signup" className="text-primary text-decoration-none fw-semibold">
                회원가입
              </Link>
            </div>
          </Card.Body>
        </Card>
      </div>
    </Container>
  )
}
