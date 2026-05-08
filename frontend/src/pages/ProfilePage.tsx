import { useState } from 'react'
import { Container, Card, Row, Col, Badge, Alert, Button } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth.store'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  orgId: string
  phone: string | null
  linkCode: string | null
  createdAt: string
}

type ApiOk<T> = { success: boolean; data: T }

const ROLE_LABEL: Record<string, string> = {
  student:      '학생',
  staff:        '교직원',
  guardian:     '보호자',
  nutritionist: '영양사',
  admin:        '관리자',
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [copied, setCopied] = useState(false)

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<ApiOk<UserProfile>>('/users/me')
      return res.data.data
    },
  })

  function copyLinkCode() {
    if (!profile?.linkCode) return
    navigator.clipboard.writeText(profile.linkCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Container className="py-4" style={{ maxWidth: 600 }}>
      <h5 className="fw-bold mb-4">내 프로필</h5>

      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col xs={12}>
              <small className="text-muted d-block mb-1">이름</small>
              <span className="fw-semibold">{profile?.name ?? user?.name}</span>
            </Col>
            <Col xs={12}>
              <small className="text-muted d-block mb-1">이메일</small>
              <span>{profile?.email ?? user?.email}</span>
            </Col>
            <Col xs={6}>
              <small className="text-muted d-block mb-1">역할</small>
              <Badge bg="secondary">{ROLE_LABEL[profile?.role ?? user?.role ?? ''] ?? profile?.role}</Badge>
            </Col>
            {profile?.phone && (
              <Col xs={6}>
                <small className="text-muted d-block mb-1">연락처</small>
                <span>{profile.phone}</span>
              </Col>
            )}
            <Col xs={12}>
              <small className="text-muted d-block mb-1">가입일</small>
              <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ko-KR') : '-'}</span>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 학생 전용: 보호자 연동코드 */}
      {(profile?.role ?? user?.role) === 'student' && profile?.linkCode && (
        <Card className="shadow-sm border-warning">
          <Card.Header className="bg-warning bg-opacity-10 fw-semibold small">
            보호자 연동코드
          </Card.Header>
          <Card.Body>
            <p className="small text-muted mb-2">
              보호자 앱에서 이 코드를 입력하면 알레르기 등록을 승인받을 수 있습니다.
            </p>
            <div className="d-flex align-items-center gap-3">
              <span
                className="fw-bold fs-4 letter-spacing-2 font-monospace"
                style={{ letterSpacing: '0.25rem' }}
              >
                {profile.linkCode}
              </span>
              <Button size="sm" variant="outline-secondary" onClick={copyLinkCode}>
                {copied ? '✓ 복사됨' : '복사'}
              </Button>
            </div>
            {copied && <Alert variant="success" className="mt-2 py-1 small mb-0">클립보드에 복사됐습니다.</Alert>}
          </Card.Body>
        </Card>
      )}
    </Container>
  )
}
