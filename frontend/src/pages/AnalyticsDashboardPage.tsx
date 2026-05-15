import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Spinner, Alert, Button, ButtonGroup, Table, Badge, ProgressBar } from 'react-bootstrap'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  fetchAllergyOverview,
  fetchDailyDemand,
  fetchMonthlyReport,
  fetchSchoolStats,
  analyticsExportUrl,
} from '../services/analytics.api'
import { getMeals } from '../services/meals.api'
import { getSurveys } from '../services/surveys.api'
import { userApi } from '../services/user.api'
import { useAuthStore } from '../stores/auth.store'

const CHART_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
]

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── 요약 위젯 카드 ─────────────────────────────────────────

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

// ── 학교 현황 카드 (T-126) ─────────────────────────────────

function SchoolStatsCard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['school-stats'],
    queryFn:  fetchSchoolStats,
  })

  if (isLoading) {
    return (
      <Card className="shadow-sm h-100">
        <Card.Header className="fw-semibold bg-white border-bottom small">학교 현황</Card.Header>
        <Card.Body className="text-center py-4"><Spinner size="sm" animation="border" /></Card.Body>
      </Card>
    )
  }

  if (!stats) return null

  const total = stats.totalStudents
  const { male, female, unknown } = stats.gender
  const knownTotal = male + female + unknown || 1

  // 학년별 정렬 (grade 키 오름차순)
  const gradeEntries = Object.entries(stats.grade)
    .map(([g, c]) => ({ grade: Number(g), count: c }))
    .sort((a, b) => a.grade - b.grade)

  return (
    <Card className="shadow-sm h-100">
      <Card.Header className="fw-semibold bg-white border-bottom small">학교 현황</Card.Header>
      <Card.Body className="d-flex flex-column gap-3">
        {/* 총원 */}
        <div>
          <div className="text-muted small mb-1">총 학생 수</div>
          <div className="d-flex align-items-baseline gap-3 flex-wrap">
            <span>
              <span className="fs-3 fw-bold text-primary">{total.toLocaleString()}</span>
              <span className="text-muted small ms-1">명</span>
            </span>
            <span className="d-inline-flex align-items-center gap-1">
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#E06080', display: 'inline-block', flexShrink: 0,
                }}
              />
              <span className="fw-semibold" style={{ color: '#C04060' }}>
                {stats.studentsWithAllergy.toLocaleString()}
              </span>
              <span className="text-muted small">명 알레르기 보유</span>
            </span>
          </div>
        </div>

        {/* 성별 분포 */}
        <div>
          <div className="text-muted small mb-1">성별 분포</div>
          <ProgressBar style={{ height: 12 }}>
            <ProgressBar variant="primary" now={(male / knownTotal) * 100} key="male" />
            <ProgressBar variant="danger"  now={(female / knownTotal) * 100} key="female" />
            {unknown > 0 && (
              <ProgressBar variant="secondary" now={(unknown / knownTotal) * 100} key="unknown" />
            )}
          </ProgressBar>
          <div className="d-flex gap-3 mt-1">
            <span className="text-muted small"><span className="text-primary fw-semibold">{male}</span>명 남</span>
            <span className="text-muted small"><span className="text-danger fw-semibold">{female}</span>명 여</span>
            {unknown > 0 && <span className="text-muted small">{unknown}명 미확인</span>}
          </div>
        </div>

        {/* 학년별 분포 */}
        {gradeEntries.length > 0 && (
          <div>
            <div className="text-muted small mb-1">학년별 인원</div>
            <div className="d-flex flex-wrap gap-1">
              {gradeEntries.map(({ grade, count }) => (
                <Badge key={grade} bg="light" text="dark" className="border">
                  {grade}학년 {count}명
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────

export function AnalyticsDashboardPage() {
  const [month, setMonth] = useState(currentYearMonth())
  const today = todayStr()
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn:  userApi.getMe,
    staleTime: 5 * 60 * 1000,
  })

  const { data: report, isLoading: rpLoading } = useQuery({
    queryKey: ['analytics-report', month],
    queryFn:  () => fetchMonthlyReport(month),
  })

  const { data: overview, isLoading: ovLoading, error: ovError } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn:  fetchAllergyOverview,
  })

  const { data: demand, isLoading: dmLoading, error: dmError } = useQuery({
    queryKey: ['analytics-demand', month],
    queryFn:  () => fetchDailyDemand(month),
  })

  const { data: meals, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', month],
    queryFn:  () => getMeals(month),
  })

  const { data: surveys, isLoading: svLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn:  () => getSurveys(),
  })

  const chartLoading = ovLoading || dmLoading || rpLoading
  const hasError = ovError || dmError

  const draftCount = (meals ?? []).filter((m) => m.status === 'draft').length
  const closingTodayCount = (surveys ?? []).filter((s) => {
    if (s.status !== 'open') return false
    return new Date(s.deadline).toISOString().slice(0, 10) === today
  }).length

  const pieData = (overview ?? []).slice(0, 10).map((item) => ({
    name: item.name, value: item.count,
  }))

  // 항목이 늘어날수록 Legend가 여러 줄로 늘어나므로 높이를 동적으로 확보
  const pieChartHeight = Math.max(280, 200 + Math.ceil(pieData.length / 2) * 26)

  const barData = (demand ?? []).map((item) => ({
    date: item.date.slice(5), count: item.totalCount,
  }))

  function handleExport(format: 'csv' | 'pdf') {
    const url = analyticsExportUrl(format, month)
    fetch(url, { headers: { Authorization: `Bearer ${accessToken ?? ''}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `analytics-${month}.${format}`
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  const todayDisplay = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-0">
            영양사 대시보드
            {profile?.organization.name && (
              <span className="text-muted fw-normal fs-6 ms-2">— {profile.organization.name}</span>
            )}
          </h5>
          <small className="text-muted">{todayDisplay}</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <input
            type="month"
            className="form-control form-control-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ width: 160 }}
          />
          <ButtonGroup size="sm">
            <Button variant="outline-secondary" onClick={() => handleExport('csv')}>CSV</Button>
            <Button variant="outline-secondary" onClick={() => handleExport('pdf')}>PDF</Button>
          </ButtonGroup>
        </div>
      </div>

      {/* 요약 위젯 4종 */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="이번 달 알림 발송" value={report?.notificationCount ?? 0} unit="건"
            variant="primary" description="allergen_alert 발송 누계" loading={rpLoading}
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="미확정 식단" value={draftCount} unit="개"
            variant="warning" description="공개 전 draft 상태 식단" loading={mealsLoading}
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="오늘 마감 설문" value={closingTodayCount} unit="개"
            variant="danger" description="오늘 자정 마감 설문" loading={svLoading}
          />
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <SummaryCard
            title="이번 달 대체식" value={report?.alternateMealCount ?? 0} unit="건"
            variant="success" description="확정된 대체 식단 제공 건수" loading={rpLoading}
          />
        </Col>
      </Row>

      {/* 학교 현황 카드 (T-126) */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <SchoolStatsCard />
        </Col>
        <Col xs={12} md={8}>
          <Card className="shadow-sm h-100">
            <Card.Header className="fw-semibold bg-white border-bottom small">
              이번 달 운영 지표 ({month})
            </Card.Header>
            {rpLoading ? (
              <Card.Body className="text-center py-4"><Spinner size="sm" animation="border" /></Card.Body>
            ) : (
              <Card.Body>
                <Row className="g-3 text-center">
                  <Col xs={4}>
                    <div className="text-muted small mb-1">알림 발송</div>
                    <div className="fs-4 fw-bold text-primary">{report?.notificationCount ?? '-'}</div>
                    <div className="text-muted small">건</div>
                  </Col>
                  <Col xs={4}>
                    <div className="text-muted small mb-1">대체식 제공</div>
                    <div className="fs-4 fw-bold text-success">{report?.alternateMealCount ?? '-'}</div>
                    <div className="text-muted small">건</div>
                  </Col>
                  <Col xs={4}>
                    <div className="text-muted small mb-1">설문 참여율</div>
                    <div className="fs-4 fw-bold text-info">
                      {report ? `${(report.surveyParticipationRate * 100).toFixed(1)}%` : '-'}
                    </div>
                    <div className="text-muted small">{report?.surveyCount ?? 0}건 마감</div>
                  </Col>
                </Row>
              </Card.Body>
            )}
          </Card>
        </Col>
      </Row>

      {chartLoading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {hasError && (
        <Alert variant="danger">데이터를 불러오는 중 오류가 발생했습니다.</Alert>
      )}

      {!chartLoading && !hasError && (
        <>
          {/* 차트 Row */}
          <Row className="g-3 mb-4">
            <Col xs={12} lg={5}>
              <Card className="h-100 shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom small">
                  알레르기 유형별 분포
                </Card.Header>
                <Card.Body>
                  {pieData.length === 0 ? (
                    <p className="text-muted text-center py-4">데이터 없음</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={pieChartHeight}>
                      <PieChart>
                        <Pie
                          data={pieData} cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100} dataKey="value"
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v}명`, '보유인원']} />
                        <Legend
                          formatter={(value, entry) => {
                            const pct = ((entry as { payload?: { percent?: number } }).payload?.percent ?? 0) * 100
                            return `${value} ${pct.toFixed(0)}%`
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={7}>
              <Card className="h-100 shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom small">
                  일별 대체식 필요 인원 ({month})
                </Card.Header>
                <Card.Body>
                  {barData.length === 0 ? (
                    <p className="text-muted text-center py-4">해당 월 식단 없음</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip formatter={(v) => [`${v}명`, '필요 인원']} />
                        <Bar dataKey="count" fill="#4e79a7" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* 상세 테이블 Row */}
          <Row className="g-3">
            <Col xs={12} lg={6}>
              <Card className="shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom small">
                  알레르기 분포 상세
                </Card.Header>
                <Card.Body className="p-0">
                  <Table size="sm" className="mb-0" hover>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">알레르기명</th>
                        <th>코드</th>
                        <th>보유인원</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(overview ?? []).length === 0 && (
                        <tr><td colSpan={3} className="text-center text-muted py-3">데이터 없음</td></tr>
                      )}
                      {(overview ?? []).map((item, idx) => (
                        <tr key={item.allergenId}>
                          <td className="ps-3">
                            <span
                              className="d-inline-block me-2"
                              style={{
                                width: 10, height: 10, borderRadius: '50%',
                                background: CHART_COLORS[idx % CHART_COLORS.length],
                              }}
                            />
                            {item.name}
                          </td>
                          <td><Badge bg="secondary">{item.code}</Badge></td>
                          <td className="fw-semibold">{item.count}명</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={6}>
              <Card className="shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom small">
                  일별 대체식 수요 상세 ({month})
                </Card.Header>
                <Card.Body className="p-0" style={{ maxHeight: 360, overflowY: 'auto' }}>
                  <Table size="sm" className="mb-0" hover>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">날짜</th>
                        <th>총인원</th>
                        <th>주요 알레르기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(demand ?? []).length === 0 && (
                        <tr><td colSpan={3} className="text-center text-muted py-3">데이터 없음</td></tr>
                      )}
                      {(demand ?? []).map((item) => (
                        <tr key={item.date}>
                          <td className="ps-3">{item.date}</td>
                          <td>
                            {item.totalCount > 0
                              ? <Badge bg="primary">{item.totalCount}명</Badge>
                              : <span className="text-muted">0명</span>
                            }
                          </td>
                          <td className="small text-muted">
                            {item.allergenBreakdown.slice(0, 3).map((a) => a.name).join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}
