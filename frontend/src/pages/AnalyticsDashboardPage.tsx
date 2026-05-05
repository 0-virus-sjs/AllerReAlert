import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Spinner, Alert, Button, ButtonGroup, Table, Badge } from 'react-bootstrap'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  fetchAllergyOverview,
  fetchDailyDemand,
  fetchMonthlyReport,
  analyticsExportUrl,
} from '../services/analytics.api'
import { useAuthStore } from '../stores/auth.store'

// 도넛 차트용 색상 팔레트 (상위 10종)
const CHART_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
]

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// ── KPI 카드 ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  variant: 'primary' | 'success' | 'warning' | 'info'
}
function KpiCard({ label, value, unit, variant }: KpiCardProps) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Subtitle className="mb-1 text-muted small">{label}</Card.Subtitle>
        <div className="d-flex align-items-baseline gap-1">
          <span className={`fs-2 fw-bold text-${variant}`}>{value}</span>
          {unit && <span className="text-muted small">{unit}</span>}
        </div>
      </Card.Body>
    </Card>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────

export function AnalyticsDashboardPage() {
  const [month, setMonth] = useState(currentYearMonth())
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: overview, isLoading: ovLoading, error: ovError } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn:  fetchAllergyOverview,
  })

  const { data: demand, isLoading: dmLoading, error: dmError } = useQuery({
    queryKey: ['analytics-demand', month],
    queryFn:  () => fetchDailyDemand(month),
  })

  const { data: report, isLoading: rpLoading } = useQuery({
    queryKey: ['analytics-report', month],
    queryFn:  () => fetchMonthlyReport(month),
  })

  const isLoading = ovLoading || dmLoading || rpLoading
  const hasError  = ovError || dmError

  function handleExport(format: 'csv' | 'pdf') {
    const url = analyticsExportUrl(format, month)
    // 인증 헤더가 필요하므로 fetch + 다운로드 처리
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

  // 도넛 차트 데이터 (상위 10)
  const pieData = (overview ?? []).slice(0, 10).map((item) => ({
    name: item.name,
    value: item.count,
  }))

  // 바 차트 데이터: 날짜를 짧게 표시 (MM/DD)
  const barData = (demand ?? []).map((item) => ({
    date: item.date.slice(5),   // MM-DD
    count: item.totalCount,
  }))

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-0">수요 집계 대시보드</h5>
          <small className="text-muted">알레르기 분포 · 일별 대체식 수요 · 운영 리포트</small>
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
            <Button variant="outline-secondary" onClick={() => handleExport('csv')}>
              CSV 내보내기
            </Button>
            <Button variant="outline-secondary" onClick={() => handleExport('pdf')}>
              PDF 내보내기
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {hasError && (
        <Alert variant="danger">데이터를 불러오는 중 오류가 발생했습니다.</Alert>
      )}

      {!isLoading && !hasError && (
        <>
          {/* KPI 카드 */}
          {report && (
            <Row className="g-3 mb-4">
              <Col xs={12} sm={6} xl={3}>
                <KpiCard label="알림 발송 건수" value={report.notificationCount} unit="건" variant="primary" />
              </Col>
              <Col xs={12} sm={6} xl={3}>
                <KpiCard label="대체식 제공 건수" value={report.alternateMealCount} unit="건" variant="success" />
              </Col>
              <Col xs={12} sm={6} xl={3}>
                <KpiCard
                  label="설문 참여율"
                  value={`${(report.surveyParticipationRate * 100).toFixed(1)}%`}
                  variant="info"
                />
              </Col>
              <Col xs={12} sm={6} xl={3}>
                <KpiCard label="마감된 설문" value={report.surveyCount} unit="건" variant="warning" />
              </Col>
            </Row>
          )}

          {/* 차트 Row */}
          <Row className="g-3 mb-4">
            {/* 도넛 차트: 알레르기 유형별 분포 */}
            <Col xs={12} lg={5}>
              <Card className="h-100 shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom">
                  알레르기 유형별 분포
                </Card.Header>
                <Card.Body>
                  {pieData.length === 0 ? (
                    <p className="text-muted text-center py-4">데이터 없음</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v}명`, '보유인원']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* 바 차트: 일별 대체식 수요 */}
            <Col xs={12} lg={7}>
              <Card className="h-100 shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom">
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

          {/* 알레르기 분포 상세 테이블 */}
          <Row className="g-3">
            <Col xs={12} lg={6}>
              <Card className="shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom">
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
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-3">데이터 없음</td>
                        </tr>
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

            {/* 일별 수요 상세 테이블 */}
            <Col xs={12} lg={6}>
              <Card className="shadow-sm">
                <Card.Header className="fw-semibold bg-white border-bottom">
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
                        <tr>
                          <td colSpan={3} className="text-center text-muted py-3">데이터 없음</td>
                        </tr>
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
