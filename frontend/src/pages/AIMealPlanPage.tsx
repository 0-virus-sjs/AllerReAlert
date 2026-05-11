import { useState } from 'react'
import { Alert, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { getMealPlanGenerationJob, startMealPlanGeneration } from '../services/ai.api'
import type { GenerateMealPlanInput, GenerateMealPlanJob, GeneratedPlanSummary } from '../services/ai.api'

// ── 날짜 포맷 헬퍼 ────────────────────────────────────────

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const JOB_POLL_INTERVAL_MS = 2_000
const JOB_POLL_MAX_ATTEMPTS = 180

function displayDate(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return `${dateStr} (${KO_DAYS[d.getDay()]})`
}

function getApiErrorMessage(e: unknown): string {
  const apiError = e as { response?: { data?: { message?: string; error?: { message?: string } } } }
  return (
    apiError.response?.data?.error?.message ??
    apiError.response?.data?.message ??
    (e instanceof Error ? e.message : 'AI 식단 생성 중 오류가 발생했습니다.')
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

// ── 기본 기간: 이번 달 1일 ~ 말일 ────────────────────────

function defaultPeriod() {
  const today = new Date()
  const from  = new Date(today.getFullYear(), today.getMonth(), 1)
  const to    = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { from: formatDateStr(from), to: formatDateStr(to) }
}

// ── 컴포넌트 ──────────────────────────────────────────────

export function AIMealPlanPage() {
  const navigate   = useNavigate()
  const { from: defFrom, to: defTo } = defaultPeriod()

  // 입력 폼 상태
  const [periodFrom,     setPeriodFrom]     = useState(defFrom)
  const [periodTo,       setPeriodTo]       = useState(defTo)
  const [calMin,         setCalMin]         = useState('')
  const [calMax,         setCalMax]         = useState('')
  const [proteinMin,     setProteinMin]     = useState('')
  const [budget,         setBudget]         = useState('')
  const [preferences,    setPreferences]    = useState('')
  const [excludes,       setExcludes]       = useState('')
  const [showNeis,       setShowNeis]       = useState(false)
  const [neisAtptCode,   setNeisAtptCode]   = useState('')
  const [neisSchulCode,  setNeisSchulCode]  = useState('')

  // 실행 상태
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [result,    setResult]    = useState<GeneratedPlanSummary[] | null>(null)
  const [jobStatus, setJobStatus] = useState<GenerateMealPlanJob | null>(null)

  function buildInput(): GenerateMealPlanInput {
    const input: GenerateMealPlanInput = {
      period: { from: periodFrom, to: periodTo },
    }
    if (calMin && calMax) {
      input.calorieTarget = { min: Number(calMin), max: Number(calMax) }
    }
    if (proteinMin) input.proteinMin = Number(proteinMin)
    if (budget)     input.budget     = Number(budget)
    if (preferences.trim()) {
      input.preferences = preferences.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (excludes.trim()) {
      input.excludes = excludes.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (showNeis && neisAtptCode && neisSchulCode) {
      input.neisAtptCode  = neisAtptCode.trim()
      input.neisSchulCode = neisSchulCode.trim()
    }
    return input
  }

  async function handleGenerate() {
    if (!periodFrom || !periodTo) {
      setError('기간을 입력해 주세요.')
      return
    }
    if (periodFrom > periodTo) {
      setError('시작일이 종료일보다 늦습니다.')
      return
    }
    setError(null)
    setResult(null)
    setJobStatus(null)
    setLoading(true)
    try {
      const input = buildInput()
      console.info('[AI meal generation] request', input)

      const started = await startMealPlanGeneration(input)
      console.info('[AI meal generation] job started', started)

      for (let attempt = 1; attempt <= JOB_POLL_MAX_ATTEMPTS; attempt += 1) {
        await wait(JOB_POLL_INTERVAL_MS)

        const job = await getMealPlanGenerationJob(started.jobId)
        setJobStatus(job)
        console.info('[AI meal generation] job status', {
          attempt,
          jobId: job.id,
          status: job.status,
          completedDays: job.completedDays,
          totalDays: job.totalDays,
          error: job.error,
        })

        if (job.status === 'completed') {
          const mealPlans = job.result?.mealPlans ?? []
          console.info('[AI meal generation] completed', {
            jobId: job.id,
            mealPlanCount: mealPlans.length,
            mealPlans,
          })
          setResult(mealPlans)
          return
        }

        if (job.status === 'failed') {
          console.error('[AI meal generation] failed', job)
          throw new Error(job.error ?? 'AI 식단 생성 job이 실패했습니다.')
        }
      }

      throw new Error('AI 식단 생성 상태 확인 시간이 초과됐습니다.')
    } catch (e: unknown) {
      console.error('[AI meal generation] request failed', e)
      const msg = getApiErrorMessage(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const totalItems = result?.reduce((s, p) => s + p.itemCount, 0) ?? 0

  return (
    <div style={{ maxWidth: 720 }}>
      <h5 className="fw-bold mb-4">🤖 AI 식단 자동 생성</h5>

      {/* ── 조건 입력 카드 ── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom fw-semibold py-3">생성 조건</div>
        <div className="card-body">

          {/* 기간 */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-semibold">기간 시작 *</label>
              <input
                type="date"
                className="form-control"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-semibold">기간 종료 *</label>
              <input
                type="date"
                className="form-control"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </div>
          </div>

          {/* 칼로리 목표 */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-semibold">칼로리 목표 최소 (kcal)</label>
              <input
                type="number"
                className="form-control"
                placeholder="예: 600"
                value={calMin}
                min={0}
                onChange={(e) => setCalMin(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-semibold">칼로리 목표 최대 (kcal)</label>
              <input
                type="number"
                className="form-control"
                placeholder="예: 900"
                value={calMax}
                min={0}
                onChange={(e) => setCalMax(e.target.value)}
              />
            </div>
          </div>

          {/* 단백질 / 예산 */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-semibold">단백질 최소 (g)</label>
              <input
                type="number"
                className="form-control"
                placeholder="예: 30"
                value={proteinMin}
                min={0}
                onChange={(e) => setProteinMin(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-6">
              <label className="form-label small fw-semibold">예산 (원, 선택)</label>
              <input
                type="number"
                className="form-control"
                placeholder="예: 3000"
                value={budget}
                min={0}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>

          {/* 선호 / 제외 식재료 */}
          <div className="mb-3">
            <label className="form-label small fw-semibold">선호 식재료 (쉼표 구분, 선택)</label>
            <input
              type="text"
              className="form-control"
              placeholder="예: 닭고기, 두부, 브로콜리"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label small fw-semibold">제외 식재료 (쉼표 구분, 선택)</label>
            <input
              type="text"
              className="form-control"
              placeholder="예: 돼지고기, 새우"
              value={excludes}
              onChange={(e) => setExcludes(e.target.value)}
            />
          </div>

          {/* NEIS 토글 */}
          <div className="border rounded p-3 bg-light">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none text-dark small fw-semibold"
              onClick={() => setShowNeis((v) => !v)}
            >
              {showNeis ? '▲' : '▼'} NEIS 학교 급식 이력 참고 (학교 기관 선택)
            </button>
            {showNeis && (
              <div className="row g-3 mt-2">
                <div className="col-12 col-sm-6">
                  <label className="form-label small">교육청 코드 (atptCode)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="예: B10"
                    value={neisAtptCode}
                    onChange={(e) => setNeisAtptCode(e.target.value)}
                  />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="form-label small">학교 코드 (schulCode)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="예: 7010536"
                    value={neisSchulCode}
                    onChange={(e) => setNeisSchulCode(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 오류 메시지 ── */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">
          {error}
        </Alert>
      )}

      {loading && jobStatus && (
        <Alert variant="info" className="mb-3">
          AI 식단 생성 상태: {jobStatus.status}
          {jobStatus.totalDays !== null && (
            <> · {jobStatus.completedDays}/{jobStatus.totalDays}일 처리</>
          )}
        </Alert>
      )}

      {/* ── 생성 버튼 ── */}
      <button
        className="btn btn-primary w-100 py-2 fw-semibold mb-4"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            AI가 식단을 생성 중입니다...
          </>
        ) : (
          '🤖 AI 식단 생성하기'
        )}
      </button>

      {/* ── 생성 결과 ── */}
      {result && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom py-3">
            <span className="fw-semibold">생성 결과</span>
            <span className="ms-2 badge bg-success">
              {result.length}일치 · 총 {totalItems}개 메뉴
            </span>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {result.map((plan) => (
                <li
                  key={plan.id}
                  className="list-group-item d-flex justify-content-between align-items-center py-3 px-4"
                >
                  <span className="small">{displayDate(plan.date)}</span>
                  <span className="badge bg-light text-dark border">
                    {plan.itemCount}개 메뉴
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-footer bg-white border-top py-3 text-end">
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => navigate('/meals')}
            >
              📝 식단 관리에서 확인하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
