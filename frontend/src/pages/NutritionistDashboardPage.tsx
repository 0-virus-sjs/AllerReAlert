import { Card, Col, Row, Badge, ListGroup } from 'react-bootstrap'

// T-085(M8)에서 실데이터 API로 교체할 플레이스홀더
const PLACEHOLDER = {
  notificationsSentToday: 12,
  draftMealPlans: 3,
  surveysClosingToday: 2,
  topAllergens: [
    { name: '난류',    count: 15 },
    { name: '우유',    count: 11 },
    { name: '밀',      count: 9 },
    { name: '대두',    count: 7 },
    { name: '땅콩',    count: 4 },
  ],
}

interface SummaryCardProps {
  title: string
  value: number
  unit: string
  variant: 'primary' | 'warning' | 'danger' | 'success'
  description: string
}

function SummaryCard({ title, value, unit, variant, description }: SummaryCardProps) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Subtitle className="mb-2 text-muted small">{title}</Card.Subtitle>
        <div className="d-flex align-items-baseline gap-1 mb-1">
          <span className={`fs-2 fw-bold text-${variant}`}>{value}</span>
          <span className="text-muted small">{unit}</span>
        </div>
        <Card.Text className="text-muted small mb-0">{description}</Card.Text>
      </Card.Body>
    </Card>
  )
}

export function NutritionistDashboardPage() {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="p-4">
      <div className="mb-4">
        <h5 className="fw-bold mb-0">영양사 대시보드</h5>
        <small className="text-muted">{today}</small>
      </div>

      {/* 요약 카드 4종 */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="오늘 알림 발송"
            value={PLACEHOLDER.notificationsSentToday}
            unit="건"
            variant="primary"
            description="알레르기 위험 알림 발송 완료"
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="미확정 식단"
            value={PLACEHOLDER.draftMealPlans}
            unit="개"
            variant="warning"
            description="공개 전 draft 상태 식단"
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="오늘 마감 설문"
            value={PLACEHOLDER.surveysClosingToday}
            unit="개"
            variant="danger"
            description="오늘 자정 마감 설문"
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="이번 달 대체식"
            value={8}
            unit="건"
            variant="success"
            description="확정된 대체 식단 제공 건수"
          />
        </Col>
      </Row>

      {/* 알레르기 수요 요약 */}
      <Row className="g-3">
        <Col xs={12} md={5}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white fw-semibold small border-bottom">
              알레르기 보유 현황 (상위 5종)
            </Card.Header>
            <ListGroup variant="flush">
              {PLACEHOLDER.topAllergens.map((a) => (
                <ListGroup.Item
                  key={a.name}
                  className="d-flex justify-content-between align-items-center py-2 px-3"
                >
                  <span className="small">{a.name}</span>
                  <Badge bg="secondary" pill>{a.count}명</Badge>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <Card.Footer className="bg-white border-top-0">
              <small className="text-muted">
                * T-085(M8)에서 실데이터로 교체 예정
              </small>
            </Card.Footer>
          </Card>
        </Col>

        <Col xs={12} md={7}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white fw-semibold small border-bottom">
              빠른 이동
            </Card.Header>
            <Card.Body className="d-flex flex-column gap-2">
              {[
                { href: '/meals',     label: '식단 작성 · 편집',   desc: 'SCR-010 식단 관리' },
                { href: '/ai',        label: 'AI 식단 생성',       desc: 'SCR-011 AI 식단 생성' },
                { href: '/surveys',   label: '설문 관리',          desc: 'SCR-014 설문 관리' },
                { href: '/analytics', label: '수요 집계 대시보드',  desc: 'SCR-013 수요 분석' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="d-flex justify-content-between align-items-center p-2 rounded text-decoration-none border"
                  style={{ color: 'inherit' }}
                >
                  <span className="small fw-medium">{item.label}</span>
                  <span className="text-muted small">{item.desc}</span>
                </a>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
