import { useState } from 'react'
import {
  Container, Row, Col, Card, Badge, Button, Modal, Form,
  Spinner, Alert, InputGroup,
} from 'react-bootstrap'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getChildren,
  getChildAllergens,
  linkChild,
  approveAllergen,
  type ChildInfo,
} from '../services/guardian.api'
import type { UserAllergen } from '../types/allergen'

// ── 상태 배지 ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'warning',
    confirmed: 'success',
    rejected: 'danger',
  }
  const label: Record<string, string> = {
    pending: '승인 대기',
    confirmed: '승인됨',
    rejected: '반려됨',
  }
  return <Badge bg={map[status] ?? 'secondary'}>{label[status] ?? status}</Badge>
}

// ── 자녀 카드 ────────────────────────────────────────────
function ChildCard({ child }: { child: ChildInfo }) {
  const qc = useQueryClient()

  const { data: allergens = [], isLoading } = useQuery<UserAllergen[]>({
    queryKey: ['childAllergens', child.id],
    queryFn: () => getChildAllergens(child.id),
  })

  const [rejectTarget, setRejectTarget] = useState<UserAllergen | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  const approveMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'confirmed' | 'rejected'; reason?: string }) =>
      approveAllergen(id, action, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['childAllergens', child.id] })
      setRejectTarget(null)
      setReason('')
      setReasonError('')
    },
  })

  function handleApprove(allergen: UserAllergen) {
    approveMutation.mutate({ id: allergen.id, action: 'confirmed' })
  }

  function openRejectModal(allergen: UserAllergen) {
    setRejectTarget(allergen)
    setReason('')
    setReasonError('')
  }

  function handleRejectSubmit() {
    if (!reason.trim()) {
      setReasonError('반려 사유를 입력해주세요')
      return
    }
    approveMutation.mutate({ id: rejectTarget!.id, action: 'rejected', reason: reason.trim() })
  }

  const pending = allergens.filter((a) => a.status === 'pending')
  const others  = allergens.filter((a) => a.status !== 'pending')

  const groupInfo = child.groupInfo as Record<string, unknown> | null
  const grade = groupInfo?.grade as string | undefined
  const classNum = groupInfo?.class as string | undefined
  const subtitle = grade && classNum ? `${grade}학년 ${classNum}반` : child.email

  return (
    <>
      <Card className="mb-3 shadow-sm">
        <Card.Header className="d-flex align-items-center justify-content-between bg-white">
          <div>
            <strong>{child.name}</strong>
            <span className="text-muted ms-2 small">{subtitle}</span>
          </div>
          {pending.length > 0 && (
            <Badge bg="warning" text="dark">{pending.length}건 승인 대기</Badge>
          )}
        </Card.Header>

        <Card.Body>
          {isLoading && <Spinner size="sm" animation="border" />}

          {!isLoading && allergens.length === 0 && (
            <p className="text-muted small mb-0">등록된 알레르기가 없습니다.</p>
          )}

          {pending.length > 0 && (
            <>
              <p className="fw-semibold small text-warning mb-2">승인 대기</p>
              {pending.map((a) => (
                <div
                  key={a.id}
                  className="d-flex align-items-center justify-content-between border rounded px-3 py-2 mb-2 bg-warning bg-opacity-10"
                >
                  <div>
                    <span className="fw-medium">{a.allergen.name}</span>
                    {a.customAllergenName && (
                      <span className="text-muted small ms-2">({a.customAllergenName})</span>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={approveMutation.isPending}
                      onClick={() => handleApprove(a)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={approveMutation.isPending}
                      onClick={() => openRejectModal(a)}
                    >
                      반려
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}

          {others.length > 0 && (
            <>
              <p className="fw-semibold small text-muted mb-2 mt-3">처리 완료</p>
              {others.map((a) => (
                <div
                  key={a.id}
                  className="d-flex align-items-center justify-content-between border rounded px-3 py-2 mb-2 bg-light"
                >
                  <div>
                    <span className="fw-medium">{a.allergen.name}</span>
                    {a.customAllergenName && (
                      <span className="text-muted small ms-2">({a.customAllergenName})</span>
                    )}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </>
          )}
        </Card.Body>
      </Card>

      {/* 반려 사유 모달 */}
      <Modal show={!!rejectTarget} onHide={() => setRejectTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">반려 사유 입력</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted mb-3">
            <strong>{rejectTarget?.allergen.name}</strong> 알레르기 등록을 반려합니다.
            사유를 자녀에게 알림으로 전달합니다.
          </p>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="반려 사유를 입력하세요 (필수)"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonError('') }}
            isInvalid={!!reasonError}
          />
          <Form.Control.Feedback type="invalid">{reasonError}</Form.Control.Feedback>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>취소</Button>
          <Button
            variant="danger"
            size="sm"
            disabled={approveMutation.isPending}
            onClick={handleRejectSubmit}
          >
            {approveMutation.isPending ? <Spinner size="sm" animation="border" /> : '반려 확정'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────
export function GuardianApprovalsPage() {
  const qc = useQueryClient()
  const [linkCode, setLinkCode] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')

  const { data: children = [], isLoading, isError } = useQuery<ChildInfo[]>({
    queryKey: ['guardianChildren'],
    queryFn: getChildren,
  })

  const linkMutation = useMutation({
    mutationFn: linkChild,
    onSuccess: (res) => {
      setLinkSuccess(`${res.name} 학생이 연동되었습니다.`)
      setLinkCode('')
      setLinkError('')
      qc.invalidateQueries({ queryKey: ['guardianChildren'] })
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      setLinkError(err.response?.data?.error?.message ?? '연동에 실패했습니다')
      setLinkSuccess('')
    },
  })

  function handleLink() {
    if (!linkCode.trim()) { setLinkError('연동코드를 입력해주세요'); return }
    setLinkError('')
    setLinkSuccess('')
    linkMutation.mutate(linkCode.trim())
  }

  return (
    <Container className="py-4" style={{ maxWidth: 720 }}>
      <h5 className="fw-bold mb-1">자녀 알레르기 관리</h5>
      <p className="text-muted small mb-4">자녀의 알레르기 등록 요청을 승인하거나 반려합니다.</p>

      {/* 자녀 연동 */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <p className="fw-semibold small mb-2">자녀 연동</p>
          <p className="text-muted small mb-2">자녀 계정의 연동코드를 입력하세요. (자녀 앱 프로필에서 확인)</p>
          <InputGroup>
            <Form.Control
              placeholder="예: AB3K7XPQ"
              value={linkCode}
              onChange={(e) => { setLinkCode(e.target.value.toUpperCase()); setLinkError(''); setLinkSuccess('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
              isInvalid={!!linkError}
              style={{ textTransform: 'uppercase', letterSpacing: 2 }}
            />
            <Button
              variant="primary"
              disabled={linkMutation.isPending}
              onClick={handleLink}
            >
              {linkMutation.isPending ? <Spinner size="sm" animation="border" /> : '연동'}
            </Button>
            <Form.Control.Feedback type="invalid">{linkError}</Form.Control.Feedback>
          </InputGroup>
          {linkSuccess && <Alert variant="success" className="mt-2 py-2 small mb-0">{linkSuccess}</Alert>}
        </Card.Body>
      </Card>

      {/* 자녀 목록 */}
      {isLoading && (
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" /> 불러오는 중…
        </div>
      )}
      {isError && <Alert variant="danger">자녀 목록을 불러오지 못했습니다.</Alert>}

      {!isLoading && children.length === 0 && (
        <div className="text-center text-muted py-5">
          <p>연동된 자녀가 없습니다.</p>
          <p className="small">위에서 자녀 연동코드를 입력하세요.</p>
        </div>
      )}

      <Row>
        {children.map((child) => (
          <Col key={child.id} xs={12}>
            <ChildCard child={child} />
          </Col>
        ))}
      </Row>
    </Container>
  )
}
