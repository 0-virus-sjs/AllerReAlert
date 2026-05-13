import { useState, useEffect, useMemo, useRef } from 'react'
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMealPlanGenerationJob, startMealPlanGeneration } from '../services/ai.api'
import type { GenerateMealPlanJob, GeneratedPlanSummary, NutrientItem, PriceConstraint } from '../services/ai.api'
import { fetchMealConditionDefaults } from '../services/meals.api'
import { searchNeisSchools } from '../services/neis.api'
import type { NeisSchool } from '../services/neis.api'
import { userApi } from '../services/user.api'

// ── 상수 ──────────────────────────────────────────────────

const MEAL_DAYS: Record<PriceConstraint['period'], number> = { month: 22, week: 5, day: 1 }
const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const JOB_POLL_MS = 2_000
const JOB_POLL_MAX = 180

// ── 날짜 헬퍼 ─────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function defaultPeriod() {
  const t = new Date()
  return {
    from: formatDate(new Date(t.getFullYear(), t.getMonth(), 1)),
    to:   formatDate(new Date(t.getFullYear(), t.getMonth() + 1, 0)),
  }
}

function displayDate(s: string) {
  const d = new Date(s)
  return `${s} (${KO_DAYS[d.getDay()]})`
}

function apiErrorMsg(e: unknown): string {
  const ae = e as { response?: { data?: { message?: string; error?: { message?: string } } } }
  return (
    ae.response?.data?.error?.message ??
    ae.response?.data?.message ??
    (e instanceof Error ? e.message : 'AI 식단 생성 중 오류가 발생했습니다.')
  )
}

function wait(ms: number) { return new Promise<void>((r) => { window.setTimeout(r, ms) }) }

// ── 영양소 행 ────────────────────────────────────────────

interface NutrientRowProps {
  item: NutrientItem
  onChange: (updated: NutrientItem) => void
  onDelete: () => void
}

function NutrientRow({ item, onChange, onDelete }: NutrientRowProps) {
  return (
    <div className="d-flex align-items-center gap-2 py-1">
      <span className="small fw-semibold text-nowrap" style={{ minWidth: 72 }}>{item.label}</span>
      <Form.Control
        type="number"
        size="sm"
        style={{ width: 90 }}
        min={0}
        value={item.target}
        onChange={(e) => onChange({ ...item, target: Number(e.target.value) })}
      />
      <span className="text-muted small text-nowrap">{item.unit}</span>
      {item.mode === 'percent_of_energy' && (
        <Badge bg="info" className="small">에너지%</Badge>
      )}
      <Button
        variant="outline-danger"
        size="sm"
        className="ms-auto py-0 px-2"
        style={{ fontSize: 11 }}
        onClick={onDelete}
      >
        삭제
      </Button>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────

export function AIMealPlanPage() {
  const navigate = useNavigate()
  const { from: defFrom, to: defTo } = defaultPeriod()

  // 기간
  const [periodFrom, setPeriodFrom] = useState(defFrom)
  const [periodTo,   setPeriodTo]   = useState(defTo)

  // 영양소 항목
  const [nutrients,    setNutrients]    = useState<NutrientItem[]>([])
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [addLabel,     setAddLabel]     = useState('')
  const [addTarget,    setAddTarget]    = useState('')
  const [addUnit,      setAddUnit]      = useState('g')
  const defaultsLoaded = useRef(false)

  // NEIS 학교 — profile에서 파생, 사용자가 다른 학교 선택 시 override
  const [schoolOverride, setSchoolOverride] = useState<{ atptCode: string; schulCode: string; name: string } | null>(null)
  const [schoolQuery,    setSchoolQuery]    = useState('')
  const [schoolResults,  setSchoolResults]  = useState<NeisSchool[]>([])
  const [showDropdown,   setShowDropdown]   = useState(false)

  // 단가 제약
  const [priceEnabled,  setPriceEnabled]  = useState(false)
  const [pricePeriod,   setPricePeriod]   = useState<PriceConstraint['period']>('day')
  const [priceAgg,      setPriceAgg]      = useState<PriceConstraint['aggregation']>('avg')
  const [priceValue,    setPriceValue]    = useState('')

  // 선호/제외
  const [preferences, setPreferences] = useState('')
  const [excludes,    setExcludes]    = useState('')

  // 실행 상태
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [result,    setResult]    = useState<GeneratedPlanSummary[] | null>(null)
  const [jobStatus, setJobStatus] = useState<GenerateMealPlanJob | null>(null)

  // ── API 쿼리 ──────────────────────────────────────────

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn:  userApi.getMe,
    staleTime: 5 * 60 * 1000,
  })

  const { data: defaults, refetch: refetchDefaults, isFetching: defaultsFetching } = useQuery({
    queryKey: ['meal-condition-defaults'],
    queryFn:  fetchMealConditionDefaults,
    staleTime: Infinity,
  })

  // ── Effects ───────────────────────────────────────────

  // 기본값 최초 로드 → 영양소 초기화
  useEffect(() => {
    if (defaults && !defaultsLoaded.current) {
      setNutrients(defaults.nutrients)
      defaultsLoaded.current = true
    }
  }, [defaults])

  // NEIS 학교 검색 디바운스 — 동기 setState 없이 setTimeout 콜백 안에서만 호출
  useEffect(() => {
    if (schoolQuery.length < 2) return
    const timer = setTimeout(async () => {
      try {
        const res = await searchNeisSchools(schoolQuery)
        setSchoolResults(res)
        setShowDropdown(res.length > 0)
      } catch { /* ignore */ }
    }, 400)
    return () => clearTimeout(timer)
  }, [schoolQuery])

  // ── 파생값 ────────────────────────────────────────────

  // 소속 학교: override > profile 순으로 fallback (effect 없이 파생)
  const neisAtptCode     = schoolOverride?.atptCode  ?? profile?.organization?.atptCode   ?? ''
  const neisSchulCode    = schoolOverride?.schulCode ?? profile?.organization?.schoolCode ?? ''
  const schoolDisplayName = schoolOverride?.name     ?? (profile?.organization?.atptCode && profile?.organization?.schoolCode ? profile.organization.name : '')

  // 쿼리가 짧으면 결과 숨김 (동기 setState 대신 파생값으로 처리)
  const visibleResults = schoolQuery.length >= 2 ? schoolResults : []

  const perMealPreview = useMemo(() => {
    const v = Number(priceValue)
    if (!priceEnabled || !v) return null
    return priceAgg === 'avg' ? v : Math.round(v / MEAL_DAYS[pricePeriod])
  }, [priceEnabled, priceValue, pricePeriod, priceAgg])

  // ── 핸들러 ────────────────────────────────────────────

  function handleSelectSchool(school: NeisSchool) {
    setSchoolOverride({ atptCode: school.atptCode, schulCode: school.schoolCode, name: school.name })
    setSchoolQuery('')
    setShowDropdown(false)
  }

  async function handleRecalculate() {
    const { data } = await refetchDefaults()
    if (data) setNutrients(data.nutrients)
  }

  function handleNutrientChange(idx: number, updated: NutrientItem) {
    setNutrients((prev) => prev.map((n, i) => (i === idx ? updated : n)))
  }

  function handleNutrientDelete(idx: number) {
    setNutrients((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleAddNutrient() {
    if (!addLabel.trim() || !addTarget) return
    const key = addLabel.trim().toLowerCase().replace(/\s+/g, '_')
    const mode: NutrientItem['mode'] = addUnit === '%' ? 'percent_of_energy' : 'absolute'
    setNutrients((prev) => [...prev, { key, label: addLabel.trim(), target: Number(addTarget), unit: addUnit, mode }])
    setAddLabel(''); setAddTarget(''); setAddUnit('g'); setShowAddForm(false)
  }

  function buildInput() {
    const input = {
      period: { from: periodFrom, to: periodTo },
      ...(nutrients.length > 0 && { nutrients }),
      ...(priceEnabled && priceValue && {
        priceConstraint: { period: pricePeriod, aggregation: priceAgg, value: Number(priceValue) },
      }),
      ...(preferences.trim() && { preferences: preferences.split(',').map((s) => s.trim()).filter(Boolean) }),
      ...(excludes.trim()    && { excludes:     excludes.split(',').map((s) => s.trim()).filter(Boolean) }),
      ...(neisAtptCode && neisSchulCode && { neisAtptCode, neisSchulCode }),
    }
    return input
  }

  async function handleGenerate() {
    if (!periodFrom || !periodTo) { setError('기간을 입력해 주세요.'); return }
    if (periodFrom > periodTo)    { setError('시작일이 종료일보다 늦습니다.'); return }
    setError(null); setResult(null); setJobStatus(null); setLoading(true)
    try {
      const started = await startMealPlanGeneration(buildInput())
      for (let i = 1; i <= JOB_POLL_MAX; i++) {
        await wait(JOB_POLL_MS)
        const job = await getMealPlanGenerationJob(started.jobId)
        setJobStatus(job)
        if (job.status === 'completed') { setResult(job.result?.mealPlans ?? []); return }
        if (job.status === 'failed')    { throw new Error(job.error ?? 'AI 식단 생성 job이 실패했습니다.') }
      }
      throw new Error('AI 식단 생성 상태 확인 시간이 초과됐습니다.')
    } catch (e) {
      setError(apiErrorMsg(e))
    } finally {
      setLoading(false)
    }
  }

  // ── 렌더 ──────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 760 }}>
      <h5 className="fw-bold mb-4">🤖 AI 식단 자동 생성</h5>

      {/* ── 기간 & 선호·제외 ── */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="bg-white border-bottom fw-semibold py-3 small">기본 조건</Card.Header>
        <Card.Body>
          <Row className="g-3 mb-3">
            <Col xs={12} sm={6}>
              <Form.Label className="small fw-semibold">기간 시작 *</Form.Label>
              <Form.Control type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
            </Col>
            <Col xs={12} sm={6}>
              <Form.Label className="small fw-semibold">기간 종료 *</Form.Label>
              <Form.Control type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
            </Col>
          </Row>
          <Row className="g-3">
            <Col xs={12} sm={6}>
              <Form.Label className="small fw-semibold">선호 식재료 (쉼표 구분, 선택)</Form.Label>
              <Form.Control type="text" placeholder="닭고기, 두부, 브로콜리" value={preferences} onChange={(e) => setPreferences(e.target.value)} />
            </Col>
            <Col xs={12} sm={6}>
              <Form.Label className="small fw-semibold">제외 식재료 (쉼표 구분, 선택)</Form.Label>
              <Form.Control type="text" placeholder="돼지고기, 새우" value={excludes} onChange={(e) => setExcludes(e.target.value)} />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── 영양소 목표 ── */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
          <span className="fw-semibold small">영양소 목표</span>
          <Button
            variant="outline-secondary"
            size="sm"
            style={{ fontSize: 12 }}
            onClick={handleRecalculate}
            disabled={defaultsFetching}
          >
            {defaultsFetching ? <Spinner size="sm" animation="border" /> : '↺ 재계산'}
          </Button>
        </Card.Header>
        <Card.Body>
          {nutrients.length === 0 && !defaultsFetching && (
            <p className="text-muted small text-center py-2">영양소 기본값을 불러오는 중...</p>
          )}
          {nutrients.map((n, idx) => (
            <NutrientRow
              key={n.key + idx}
              item={n}
              onChange={(u) => handleNutrientChange(idx, u)}
              onDelete={() => handleNutrientDelete(idx)}
            />
          ))}

          {/* 항목 추가 */}
          {showAddForm ? (
            <div className="border rounded p-2 mt-2 bg-light">
              <Row className="g-2 align-items-end">
                <Col xs={4}>
                  <Form.Label className="small">항목명</Form.Label>
                  <Form.Control size="sm" placeholder="예: 철분" value={addLabel} onChange={(e) => setAddLabel(e.target.value)} />
                </Col>
                <Col xs={3}>
                  <Form.Label className="small">목표값</Form.Label>
                  <Form.Control size="sm" type="number" min={0} placeholder="0" value={addTarget} onChange={(e) => setAddTarget(e.target.value)} />
                </Col>
                <Col xs={3}>
                  <Form.Label className="small">단위</Form.Label>
                  <Form.Control size="sm" placeholder="mg, g, %" value={addUnit} onChange={(e) => setAddUnit(e.target.value)} />
                </Col>
                <Col xs={2} className="d-flex gap-1">
                  <Button size="sm" onClick={handleAddNutrient} disabled={!addLabel || !addTarget}>추가</Button>
                  <Button size="sm" variant="light" onClick={() => setShowAddForm(false)}>✕</Button>
                </Col>
              </Row>
            </div>
          ) : (
            <Button variant="outline-primary" size="sm" className="mt-2" style={{ fontSize: 12 }} onClick={() => setShowAddForm(true)}>
              + 항목 추가
            </Button>
          )}
        </Card.Body>
      </Card>

      {/* ── NEIS 학교 급식 이력 ── */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="bg-white border-bottom fw-semibold py-3 small">
          NEIS 학교 급식 이력 참고
        </Card.Header>
        <Card.Body>
          {schoolDisplayName && (
            <div className="mb-2 d-flex align-items-center gap-2">
              <Badge bg="primary" className="small">{schoolDisplayName}</Badge>
              <span className="text-muted small">{neisAtptCode} / {neisSchulCode}</span>
            </div>
          )}
          <div className="position-relative">
            <Form.Control
              type="text"
              size="sm"
              placeholder="다른 학교 검색 (2자 이상)"
              value={schoolQuery}
              onChange={(e) => setSchoolQuery(e.target.value)}
              onFocus={() => visibleResults.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {showDropdown && visibleResults.length > 0 && (
              <div
                className="border rounded bg-white shadow-sm position-absolute w-100 mt-1"
                style={{ zIndex: 100, maxHeight: 200, overflowY: 'auto' }}
              >
                {visibleResults.map((s) => (
                  <button
                    key={`${s.atptCode}-${s.schoolCode}`}
                    type="button"
                    className="d-block w-100 text-start px-3 py-2 small border-0 bg-transparent hover-bg-light"
                    onMouseDown={() => handleSelectSchool(s)}
                  >
                    <span className="fw-semibold">{s.name}</span>
                    <span className="text-muted ms-2">{s.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {!neisAtptCode && !schoolDisplayName && (
            <p className="text-muted small mt-1 mb-0">
              소속 학교의 NEIS 코드가 없으면 급식 이력 참고가 생략됩니다.
            </p>
          )}
        </Card.Body>
      </Card>

      {/* ── 단가 제약 ── */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-bottom py-3 d-flex align-items-center gap-2">
          <Form.Check
            type="switch"
            id="price-toggle"
            checked={priceEnabled}
            onChange={(e) => setPriceEnabled(e.target.checked)}
            label={<span className="fw-semibold small">단가 제약 설정</span>}
            className="mb-0"
          />
        </Card.Header>
        {priceEnabled && (
          <Card.Body>
            <Row className="g-2 align-items-center">
              <Col xs={4} sm={3}>
                <Form.Select size="sm" value={pricePeriod} onChange={(e) => setPricePeriod(e.target.value as PriceConstraint['period'])}>
                  <option value="day">일</option>
                  <option value="week">주</option>
                  <option value="month">월</option>
                </Form.Select>
              </Col>
              <Col xs={4} sm={3}>
                <Form.Select size="sm" value={priceAgg} onChange={(e) => setPriceAgg(e.target.value as PriceConstraint['aggregation'])}>
                  <option value="avg">평균</option>
                  <option value="total">총합</option>
                </Form.Select>
              </Col>
              <Col xs={4} sm={3}>
                <Form.Control size="sm" type="number" min={0} placeholder="금액 (원)" value={priceValue} onChange={(e) => setPriceValue(e.target.value)} />
              </Col>
              {perMealPreview != null && (
                <Col xs={12} sm={3}>
                  <span className="text-muted small">
                    → 1식당 약 <strong>{perMealPreview.toLocaleString()}원</strong>
                  </span>
                </Col>
              )}
            </Row>
          </Card.Body>
        )}
      </Card>

      {/* ── 오류 / 진행 상태 ── */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">
          {error}
        </Alert>
      )}
      {loading && jobStatus && (
        <Alert variant="info" className="mb-3">
          AI 식단 생성 상태: <strong>{jobStatus.status}</strong>
          {jobStatus.totalDays != null && (
            <> · {jobStatus.completedDays}/{jobStatus.totalDays}일 처리</>
          )}
        </Alert>
      )}

      {/* ── 생성 버튼 ── */}
      <Button className="w-100 py-2 fw-semibold mb-4" onClick={handleGenerate} disabled={loading}>
        {loading
          ? <><Spinner animation="border" size="sm" className="me-2" />AI가 식단을 생성 중입니다...</>
          : '🤖 AI 식단 생성하기'
        }
      </Button>

      {/* ── 결과 ── */}
      {result && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-white border-bottom py-3">
            <span className="fw-semibold">생성 결과</span>
            <Badge bg="success" className="ms-2">
              {result.length}일치 · 총 {result.reduce((s, p) => s + p.itemCount, 0)}개 메뉴
            </Badge>
          </Card.Header>
          <div className="list-group list-group-flush">
            {result.map((plan) => (
              <div key={plan.id} className="list-group-item d-flex justify-content-between align-items-center py-3 px-4">
                <span className="small">{displayDate(plan.date)}</span>
                <Badge bg="light" text="dark" className="border">{plan.itemCount}개 메뉴</Badge>
              </div>
            ))}
          </div>
          <Card.Footer className="bg-white border-top py-3 text-end">
            <Button variant="outline-primary" size="sm" onClick={() => navigate('/meals')}>
              📝 식단 관리에서 확인하기
            </Button>
          </Card.Footer>
        </Card>
      )}
    </div>
  )
}
