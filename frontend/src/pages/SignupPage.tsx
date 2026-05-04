import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Alert, Button, Card, Col, Container, Form,
  ProgressBar, Row, Spinner,
} from 'react-bootstrap'
import { authApi, type VerifyOrgResponse } from '../services/auth.api'
import type { UserRole } from '../types/auth'

// ── 역할 정의 ──────────────────────────────────────────
const ROLES: { key: UserRole; label: string; desc: string }[] = [
  { key: 'student',      label: '학생',   desc: '급식 알레르기 알림 수신' },
  { key: 'staff',        label: '교직원', desc: '급식 조회 및 설문 참여' },
  { key: 'guardian',     label: '보호자', desc: '자녀 알레르기 승인 관리' },
  { key: 'nutritionist', label: '영양사', desc: '식단 작성 및 AI 보조' },
]

// ── 비밀번호 정책 ────────────────────────────────────────
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return '8자 이상이어야 합니다'
  if (!/[a-zA-Z]/.test(pw)) return '영문자를 포함해야 합니다'
  if (!/\d/.test(pw)) return '숫자를 포함해야 합니다'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return '특수문자를 포함해야 합니다'
  return null
}

// ── Step 1 — 소속 코드 인증 ──────────────────────────────
function StepVerifyOrg({
  onVerified,
}: {
  onVerified: (org: VerifyOrgResponse) => void
}) {
  const [orgCode, setOrgCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    if (!orgCode.trim()) { setError('소속 코드를 입력하세요'); return }
    setError(null)
    setLoading(true)
    try {
      const { data } = await authApi.verifyOrg(orgCode.trim())
      onVerified(data.data)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '소속 코드를 찾을 수 없습니다'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form onSubmit={handleVerify} noValidate>
      <p className="text-muted small mb-3">
        학교 또는 소속 기관에서 발급받은 소속 코드를 입력하세요.
      </p>
      {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
      <Form.Group className="mb-3">
        <Form.Label className="small fw-semibold">소속 코드</Form.Label>
        <Form.Control
          placeholder="예: seed-org-001"
          value={orgCode}
          onChange={(e) => setOrgCode(e.target.value)}
          disabled={loading}
        />
      </Form.Group>
      <Button type="submit" variant="primary" className="w-100" disabled={loading}>
        {loading ? <><Spinner size="sm" className="me-2" />확인 중…</> : '소속 코드 인증'}
      </Button>
    </Form>
  )
}

// ── Step 2 — 역할·정보·동의 ──────────────────────────────
interface Step2Props {
  org: VerifyOrgResponse
  onBack: () => void
}

function StepRegister({ org, onBack }: Step2Props) {
  const navigate = useNavigate()

  const [role, setRole] = useState<UserRole>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [phone, setPhone] = useState('')
  // 역할별 추가 필드
  const [grade, setGrade] = useState('')
  const [classNum, setClassNum] = useState('')
  const [certCode, setCertCode] = useState('')
  // 동의
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [isUnder14, setIsUnder14] = useState(false)
  const [guardianAgreed, setGuardianAgreed] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildGroupInfo(): Record<string, unknown> {
    if (role === 'student') return { grade: Number(grade), classNum: Number(classNum) }
    if (role === 'nutritionist') return { certCode }
    return {}
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // 유효성 검사
    if (!name.trim() || !email.trim() || !password) {
      setError('이름, 이메일, 비밀번호를 모두 입력하세요'); return
    }
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    if (password !== confirmPw) { setError('비밀번호가 일치하지 않습니다'); return }
    if (!privacyAgreed) { setError('개인정보 수집·이용에 동의해야 합니다'); return }
    if (isUnder14 && !guardianAgreed) { setError('14세 미만은 법정대리인 동의가 필요합니다'); return }

    setLoading(true)
    try {
      await authApi.signup({
        tempToken: org.tempToken,
        role,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        groupInfo: buildGroupInfo(),
        privacyAgreed: true,
        guardianConsentRequired: isUnder14,
      })
      navigate('/login', { replace: true, state: { signupSuccess: true } })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? '회원가입에 실패했습니다'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      {/* 소속 정보 표시 */}
      <Alert variant="success" className="py-2 small mb-3">
        ✅ <strong>{org.orgName}</strong> 소속 인증 완료
      </Alert>

      {error && (
        <Alert variant="danger" className="py-2 small" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* 역할 선택 */}
      <Form.Group className="mb-3">
        <Form.Label className="small fw-semibold">역할 선택</Form.Label>
        <Row className="g-2">
          {ROLES.map(({ key, label, desc }) => (
            <Col xs={6} key={key}>
              <div
                className={`border rounded p-2 text-center small cursor-pointer ${
                  role === key ? 'border-primary bg-primary bg-opacity-10' : ''
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setRole(key)}
              >
                <div className="fw-semibold">{label}</div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>{desc}</div>
              </div>
            </Col>
          ))}
        </Row>
      </Form.Group>

      {/* 기본 정보 */}
      <Form.Group className="mb-2">
        <Form.Label className="small fw-semibold">이름</Form.Label>
        <Form.Control size="sm" placeholder="홍길동" value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} disabled={loading} />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label className="small fw-semibold">이메일</Form.Label>
        <Form.Control size="sm" type="email" placeholder="example@school.kr" value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} disabled={loading} />
      </Form.Group>

      <Row className="g-2 mb-2">
        <Col>
          <Form.Label className="small fw-semibold">비밀번호</Form.Label>
          <Form.Control size="sm" type="password" placeholder="8자 이상·영문·숫자·특수문자" value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} disabled={loading} />
        </Col>
        <Col>
          <Form.Label className="small fw-semibold">비밀번호 확인</Form.Label>
          <Form.Control size="sm" type="password" placeholder="다시 입력" value={confirmPw}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPw(e.target.value)} disabled={loading} />
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label className="small fw-semibold">연락처 (선택)</Form.Label>
        <Form.Control size="sm" placeholder="010-0000-0000" value={phone}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} disabled={loading} />
      </Form.Group>

      {/* 역할별 추가 필드 */}
      {role === 'student' && (
        <Row className="g-2 mb-3">
          <Col>
            <Form.Label className="small fw-semibold">학년</Form.Label>
            <Form.Select size="sm" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={loading}>
              <option value="">선택</option>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}학년</option>)}
            </Form.Select>
          </Col>
          <Col>
            <Form.Label className="small fw-semibold">반</Form.Label>
            <Form.Select size="sm" value={classNum} onChange={(e) => setClassNum(e.target.value)} disabled={loading}>
              <option value="">선택</option>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}반</option>)}
            </Form.Select>
          </Col>
        </Row>
      )}

      {role === 'nutritionist' && (
        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">영양사 인증코드</Form.Label>
          <Form.Control size="sm" placeholder="기관 발급 인증코드" value={certCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCertCode(e.target.value)} disabled={loading} />
        </Form.Group>
      )}

      {/* 동의 항목 */}
      <div className="border rounded p-3 bg-light mb-3">
        <Form.Check
          id="privacy-agreed"
          type="checkbox"
          label={<span className="small">개인정보 수집·이용 동의 <span className="text-danger">(필수)</span></span>}
          checked={privacyAgreed}
          onChange={(e) => setPrivacyAgreed(e.target.checked)}
          disabled={loading}
          className="mb-2"
        />
        <Form.Check
          id="under14"
          type="checkbox"
          label={<span className="small">만 14세 미만입니다</span>}
          checked={isUnder14}
          onChange={(e) => { setIsUnder14(e.target.checked); setGuardianAgreed(false) }}
          disabled={loading}
          className="mb-2"
        />
        {isUnder14 && (
          <Form.Check
            id="guardian-agreed"
            type="checkbox"
            label={<span className="small">법정대리인 동의를 받았습니다 <span className="text-danger">(필수)</span></span>}
            checked={guardianAgreed}
            onChange={(e) => setGuardianAgreed(e.target.checked)}
            disabled={loading}
            className="ms-3"
          />
        )}
      </div>

      <div className="d-flex gap-2">
        <Button variant="outline-secondary" className="flex-shrink-0" onClick={onBack} disabled={loading}>
          이전
        </Button>
        <Button type="submit" variant="primary" className="flex-grow-1" disabled={loading}>
          {loading ? <><Spinner size="sm" className="me-2" />가입 중…</> : '회원가입'}
        </Button>
      </div>
    </Form>
  )
}

// ── 메인 SignupPage ───────────────────────────────────────
export function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [org, setOrg] = useState<VerifyOrgResponse | null>(null)

  function handleVerified(orgData: VerifyOrgResponse) {
    setOrg(orgData)
    setStep(2)
  }

  return (
    <Container className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div className="text-center mb-4">
          <div className="fs-1">🍽️</div>
          <h1 className="fs-4 fw-bold text-primary">AllerReAlert</h1>
          <p className="text-muted small">회원가입</p>
        </div>

        <ProgressBar
          now={step === 1 ? 50 : 100}
          className="mb-3"
          style={{ height: 4 }}
          variant="primary"
        />
        <div className="d-flex justify-content-between small text-muted mb-3 px-1">
          <span className={step === 1 ? 'text-primary fw-semibold' : ''}>소속 코드 인증</span>
          <span className={step === 2 ? 'text-primary fw-semibold' : ''}>정보 입력</span>
        </div>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-4">
            {step === 1 && <StepVerifyOrg onVerified={handleVerified} />}
            {step === 2 && org && (
              <StepRegister org={org} onBack={() => setStep(1)} />
            )}
          </Card.Body>
        </Card>

        <div className="text-center mt-3 small text-muted">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary text-decoration-none fw-semibold">
            로그인
          </Link>
        </div>
      </div>
    </Container>
  )
}
