import { Card, Col, Row, Badge, ListGroup, Spinner } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import { fetchAllergyOverview, fetchMonthlyReport } from '../services/analytics.api'
import { getMeals } from '../services/meals.api'
import { getSurveys } from '../services/surveys.api'

function currentYearMonth() {
  return new Date().toISOString().slice(0, 7)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

interface SummaryCardProps {
  title: string
  value: number | string
  unit: string
  variant: 'primary' | 'warning' | 'danger' | 'success'
  description: string
  loading?: boolean
}

function SummaryCard({ title, value, unit, variant, description, loading }: SummaryCardProps) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Subtitle className="mb-2 text-muted small">{title}</Card.Subtitle>
        <div className="d-flex align-items-baseline gap-1 mb-1">
          {loading
            ? <Spinner size="sm" animation="border" variant={variant} />
            : <span className={`fs-2 fw-bold text-${variant}`}>{value}</span>
          }
          <span className="text-muted small">{unit}</span>
        </div>
        <Card.Text className="text-muted small mb-0">{description}</Card.Text>
      </Card.Body>
    </Card>
  )
}

export function NutritionistDashboardPage() {
  const month = currentYearMonth()
  const today = todayStr()

  const todayDisplay = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  // T-085: 실데이터 연결
  const { data: report, isLoading: rpLoading } = useQuery({
    queryKey: ['analytics-report', month],
    queryFn: () => fetchMonthlyReport(month),
  })

  const { data: meals, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', month],
    queryFn:  () => getMeals(month),
  })

  const { data: surveys, isLoading: svLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn:  () => getSurveys(),
  })

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn:  fetchAllergyOverview,
  })

  // 파생 값
  const draftCount = (meals ?? []).filter((m) => m.status === 'draft').length

  const closingTodayCount = (surveys ?? []).filter((s) => {
    if (s.status !== 'open') return false
    const deadlineDate = new Date(s.deadline).toISOString().slice(0, 10)
    return deadlineDate === today
  }).length

  const topAllergens = (overview ?? []).slice(0, 5)

  return (
    <div className="p-4">
      <div className="mb-4">
        <h5 className="fw-bold mb-0">영양사 대시보드</h5>
        <small className="text-muted">{todayDisplay}</small>
      </div>

      {/* 요약 카드 4종 */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="이번 달 알림 발송"
            value={report?.notificationCount ?? 0}
            unit="건"
            variant="primary"
            description="allergen_alert 발송 누계"
            loading={rpLoading}
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="미확정 식단"
            value={draftCount}
            unit="개"
            variant="warning"
            description="공개 전 draft 상태 식단"
            loading={mealsLoading}
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="오늘 마감 설문"
            value={closingTodayCount}
            unit="개"
            variant="danger"
            description="오늘 자정 마감 설문"
            loading={svLoading}
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="이번 달 대체식"
            value={report?.alternateMealCount ?? 0}
            unit="건"
            variant="success"
            description="확정된 대체 식단 제공 건수"
            loading={rpLoading}
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
            {ovLoading ? (
              <Card.Body className="text-center py-4">
                <Spinner size="sm" animation="border" />
              </Card.Body>
            ) : (
              <ListGroup variant="flush">
                {topAllergens.length === 0 && (
                  <ListGroup.Item className="text-muted small">데이터 없음</ListGroup.Item>
                )}
                {topAllergens.map((a) => (
                  <ListGroup.Item
                    key={a.allergenId}
                    className="d-flex justify-content-between align-items-center py-2 px-3"
                  >
                    <span className="small">{a.name}</span>
                    <Badge bg="secondary" pill>{a.count}명</Badge>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
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
