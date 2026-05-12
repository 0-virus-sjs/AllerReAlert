import { useState, type FormEvent } from 'react'
import {
  Container, Card, Row, Col, Badge, Alert, Button, Form, Modal, Spinner,
} from 'react-bootstrap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'
import { userApi, type UserProfile, type UpdateMePayload } from '../services/user.api'
import { authApi, type VerifyOrgResponse } from '../services/auth.api'

const ROLE_LABEL: Record<string, string> = {
  student:      '학생',
  staff:        '교직원',
  guardian:     '보호자',
  nutritionist: '영양사',
  admin:        '관리자',
}

const ORG_TYPE_LABEL: Record<string, string> = {
  school:   '학교',
  company:  '회사',
  welfare:  '복지관',
  military: '군',
  other:    '기타',
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => userApi.getMe(),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateMePayload) => userApi.updateMe(payload),
    onSuccess: (data) => qc.setQueryData(['me'], data),
  })

  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showRefillModal, setShowRefillModal] = useState(false)

  if (isLoading || !profile) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" size="sm" />
      </Container>
    )
  }

  const isStudent = profile.role === 'student'
  const canChangeOrg = profile.role !== 'nutritionist'

  return (
    <Container className="py-4" style={{ maxWidth: 640 }}>
      <h5 className="fw-bold mb-4">내 프로필</h5>

      <BasicInfoCard profile={profile} onSave={(p) => updateMutation.mutateAsync(p)} />

      <OrgInfoCard
        profile={profile}
        canChangeOrg={canChangeOrg}
        onChangeOrgClick={() => setShowOrgModal(true)}
      />

      {isStudent && (
        <StudentInfoCard profile={profile} onSave={(p) => updateMutation.mutateAsync(p)} />
      )}

      {isStudent && profile.linkCode && <LinkCodeCard linkCode={profile.linkCode} />}

      <ChangeOrgModal
        show={showOrgModal}
        onHide={() => setShowOrgModal(false)}
        onChanged={(needRefill) => {
          setShowOrgModal(false)
          qc.invalidateQueries({ queryKey: ['me'] })
          if (needRefill) setShowRefillModal(true)
        }}
      />

      {isStudent && (
        <StudentInfoRefillModal
          show={showRefillModal}
          onHide={() => setShowRefillModal(false)}
          onSaved={() => {
            setShowRefillModal(false)
            qc.invalidateQueries({ queryKey: ['me'] })
          }}
        />
      )}

      {/* fallback: store의 user 정보로 일관성 유지 */}
      {!profile && user && <Alert variant="warning" className="mt-3 small">프로필을 불러오지 못했습니다.</Alert>}
    </Container>
  )
}

// ── 기본 정보 카드 (이름·이메일·역할·연락처·가입일) ─────────
function BasicInfoCard({
  profile,
  onSave,
}: {
  profile: UserProfile
  onSave: (p: UpdateMePayload) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setName(profile.name)
    setPhone(profile.phone ?? '')
    setError(null)
    setEditing(true)
  }

  async function handleSave() {
    if (!name.trim()) { setError('이름을 입력하세요'); return }
    setSaving(true); setError(null)
    try {
      await onSave({ name: name.trim(), phone: phone.trim() })
      setEditing(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? '저장에 실패했습니다'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="shadow-sm mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom">
        <span className="fw-semibold small">기본 정보</span>
        {!editing ? (
          <Button size="sm" variant="outline-secondary" onClick={startEdit}>편집</Button>
        ) : (
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => setEditing(false)} disabled={saving}>취소</Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Spinner size="sm" className="me-1" />저장</> : '저장'}
            </Button>
          </div>
        )}
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
        <Row className="g-3">
          <Col xs={12}>
            <small className="text-muted d-block mb-1">이름</small>
            {!editing
              ? <span className="fw-semibold">{profile.name}</span>
              : <Form.Control size="sm" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />}
          </Col>
          <Col xs={12}>
            <small className="text-muted d-block mb-1">이메일</small>
            <span>{profile.email}</span>
          </Col>
          <Col xs={6}>
            <small className="text-muted d-block mb-1">역할</small>
            <Badge bg="secondary">{ROLE_LABEL[profile.role] ?? profile.role}</Badge>
          </Col>
          <Col xs={6}>
            <small className="text-muted d-block mb-1">연락처</small>
            {!editing
              ? <span>{profile.phone ?? '-'}</span>
              : <Form.Control size="sm" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />}
          </Col>
          <Col xs={12}>
            <small className="text-muted d-block mb-1">가입일</small>
            <span>{new Date(profile.createdAt).toLocaleDateString('ko-KR')}</span>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

// ── 소속 단체 정보 카드 ───────────────────────────────────
function OrgInfoCard({
  profile,
  canChangeOrg,
  onChangeOrgClick,
}: {
  profile: UserProfile
  canChangeOrg: boolean
  onChangeOrgClick: () => void
}) {
  const org = profile.organization
  return (
    <Card className="shadow-sm mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom">
        <span className="fw-semibold small">소속 단체</span>
        {canChangeOrg && (
          <Button size="sm" variant="outline-primary" onClick={onChangeOrgClick}>소속 변경</Button>
        )}
      </Card.Header>
      <Card.Body>
        <Row className="g-3">
          <Col xs={12}>
            <small className="text-muted d-block mb-1">단체명</small>
            <span className="fw-semibold">{org.name}</span>
          </Col>
          <Col xs={6}>
            <small className="text-muted d-block mb-1">유형</small>
            <Badge bg="info">{ORG_TYPE_LABEL[org.orgType] ?? org.orgType}</Badge>
          </Col>
          {org.address && (
            <Col xs={12}>
              <small className="text-muted d-block mb-1">주소</small>
              <span>{org.address}</span>
            </Col>
          )}
        </Row>
      </Card.Body>
    </Card>
  )
}

// ── 학생 정보 카드 (학년·반·학번) — 학생만 ────────────────
function StudentInfoCard({
  profile,
  onSave,
}: {
  profile: UserProfile
  onSave: (p: UpdateMePayload) => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [grade, setGrade] = useState<string>(profile.grade ? String(profile.grade) : '')
  const [classNo, setClassNo] = useState(profile.classNo ?? '')
  const [studentCode, setStudentCode] = useState(profile.studentCode ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missing = !profile.grade || !profile.classNo || !profile.studentCode

  function startEdit() {
    setGrade(profile.grade ? String(profile.grade) : '')
    setClassNo(profile.classNo ?? '')
    setStudentCode(profile.studentCode ?? '')
    setError(null)
    setEditing(true)
  }

  async function handleSave() {
    if (!grade) { setError('학년을 선택하세요'); return }
    if (!classNo) { setError('반을 선택하세요'); return }
    if (!studentCode.trim()) { setError('학번을 입력하세요'); return }
    setSaving(true); setError(null)
    try {
      await onSave({ grade: Number(grade), classNo, studentCode: studentCode.trim() })
      setEditing(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? '저장에 실패했습니다'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={`shadow-sm mb-3 ${missing ? 'border-warning' : ''}`}>
      <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom">
        <span className="fw-semibold small">학생 정보</span>
        {!editing ? (
          <Button size="sm" variant="outline-secondary" onClick={startEdit}>편집</Button>
        ) : (
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => setEditing(false)} disabled={saving}>취소</Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Spinner size="sm" className="me-1" />저장</> : '저장'}
            </Button>
          </div>
        )}
      </Card.Header>
      <Card.Body>
        {missing && !editing && (
          <Alert variant="warning" className="py-2 small mb-3">
            학년·반·학번 정보가 비어 있습니다. 편집 버튼으로 입력해주세요.
          </Alert>
        )}
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
        <Row className="g-3">
          <Col xs={6}>
            <small className="text-muted d-block mb-1">학년</small>
            {!editing
              ? <span>{profile.grade ? `${profile.grade}학년` : '-'}</span>
              : (
                <Form.Select size="sm" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={saving}>
                  <option value="">선택</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}학년</option>)}
                </Form.Select>
              )}
          </Col>
          <Col xs={6}>
            <small className="text-muted d-block mb-1">반</small>
            {!editing
              ? <span>{profile.classNo ? `${profile.classNo}반` : '-'}</span>
              : (
                <Form.Select size="sm" value={classNo} onChange={(e) => setClassNo(e.target.value)} disabled={saving}>
                  <option value="">선택</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={String(n)}>{n}반</option>)}
                </Form.Select>
              )}
          </Col>
          <Col xs={12}>
            <small className="text-muted d-block mb-1">학번</small>
            {!editing
              ? <span>{profile.studentCode ?? '-'}</span>
              : (
                <Form.Control
                  size="sm"
                  placeholder="예: 20250123"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  disabled={saving}
                />
              )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

// ── 학생 연동코드 카드 (기존 유지) ─────────────────────────
function LinkCodeCard({ linkCode }: { linkCode: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(linkCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Card className="shadow-sm border-warning mb-3">
      <Card.Header className="bg-warning bg-opacity-10 fw-semibold small">
        보호자 연동코드
      </Card.Header>
      <Card.Body>
        <p className="small text-muted mb-2">
          보호자 앱에서 이 코드를 입력하면 알레르기 등록을 승인받을 수 있습니다.
        </p>
        <div className="d-flex align-items-center gap-3">
          <span className="fw-bold fs-4 font-monospace" style={{ letterSpacing: '0.25rem' }}>
            {linkCode}
          </span>
          <Button size="sm" variant="outline-secondary" onClick={copy}>
            {copied ? '✓ 복사됨' : '복사'}
          </Button>
        </div>
        {copied && <Alert variant="success" className="mt-2 py-1 small mb-0">클립보드에 복사됐습니다.</Alert>}
      </Card.Body>
    </Card>
  )
}

// ── 소속 변경 모달 (단체 코드 인증 → 변경) ─────────────────
function ChangeOrgModal({
  show, onHide, onChanged,
}: {
  show: boolean
  onHide: () => void
  onChanged: (needRefill: boolean) => void
}) {
  const [orgCode, setOrgCode] = useState('')
  const [verifiedOrg, setVerifiedOrg] = useState<VerifyOrgResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setOrgCode('')
    setVerifiedOrg(null)
    setError(null)
    setLoading(false)
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    if (!orgCode.trim()) { setError('소속 코드를 입력하세요'); return }
    setError(null); setLoading(true)
    try {
      const { data } = await authApi.verifyOrg(orgCode.trim())
      setVerifiedOrg(data.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? '소속 코드를 찾을 수 없습니다'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!verifiedOrg) return
    setError(null); setLoading(true)
    try {
      const result = await userApi.changeOrg(verifiedOrg.tempToken)
      reset()
      onChanged(result.requiresStudentInfoRefill)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? '소속 변경에 실패했습니다'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={() => { reset(); onHide() }} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-6">소속 단체 변경</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
        {!verifiedOrg ? (
          <Form onSubmit={handleVerify}>
            <p className="small text-muted mb-3">
              이동할 단체에서 발급받은 소속 코드를 입력하세요.
            </p>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">소속 코드</Form.Label>
              <Form.Control
                placeholder="예: seed-org-001"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? <><Spinner size="sm" className="me-2" />확인 중…</> : '소속 코드 확인'}
            </Button>
          </Form>
        ) : (
          <>
            <Alert variant="success" className="py-2 small">
              ✅ <strong>{verifiedOrg.orgName}</strong> 단체로 변경합니다.
            </Alert>
            <p className="small text-muted mb-3">
              학생인 경우 기존 학년·반·학번 정보가 초기화됩니다. 알레르기 정보는 유지됩니다.
            </p>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => setVerifiedOrg(null)} disabled={loading}>
                다시 입력
              </Button>
              <Button variant="primary" className="flex-grow-1" onClick={handleConfirm} disabled={loading}>
                {loading ? <><Spinner size="sm" className="me-2" />변경 중…</> : '소속 변경 확정'}
              </Button>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  )
}

// ── 학생 정보 재입력 모달 (소속 변경 직후, 학생 전용) ───────
function StudentInfoRefillModal({
  show, onHide, onSaved,
}: {
  show: boolean
  onHide: () => void
  onSaved: () => void
}) {
  const [grade, setGrade] = useState('')
  const [classNo, setClassNo] = useState('')
  const [studentCode, setStudentCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!grade) { setError('학년을 선택하세요'); return }
    if (!classNo) { setError('반을 선택하세요'); return }
    if (!studentCode.trim()) { setError('학번을 입력하세요'); return }
    setSaving(true); setError(null)
    try {
      await userApi.updateMe({ grade: Number(grade), classNo, studentCode: studentCode.trim() })
      setGrade(''); setClassNo(''); setStudentCode('')
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? '저장에 실패했습니다'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
      <Modal.Header>
        <Modal.Title className="fs-6">학생 정보 재입력</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="small text-muted mb-3">
          소속이 변경되어 학년·반·학번을 다시 입력해야 합니다.
        </p>
        {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
        <Row className="g-2 mb-2">
          <Col>
            <Form.Label className="small fw-semibold">학년</Form.Label>
            <Form.Select size="sm" value={grade} onChange={(e) => setGrade(e.target.value)} disabled={saving}>
              <option value="">선택</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}학년</option>)}
            </Form.Select>
          </Col>
          <Col>
            <Form.Label className="small fw-semibold">반</Form.Label>
            <Form.Select size="sm" value={classNo} onChange={(e) => setClassNo(e.target.value)} disabled={saving}>
              <option value="">선택</option>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={String(n)}>{n}반</option>)}
            </Form.Select>
          </Col>
        </Row>
        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">학번</Form.Label>
          <Form.Control
            size="sm"
            placeholder="예: 20250123"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            disabled={saving}
          />
        </Form.Group>
        <Button variant="primary" className="w-100" onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner size="sm" className="me-2" />저장 중…</> : '저장'}
        </Button>
      </Modal.Body>
    </Modal>
  )
}
