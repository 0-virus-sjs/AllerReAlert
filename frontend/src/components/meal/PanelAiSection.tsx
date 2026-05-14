import { useState } from 'react'
import { Alert, Form, Spinner } from 'react-bootstrap'
import { getMealPlanGenerationJob, startMealPlanGeneration } from '../../services/ai.api'
import type { GenerateMealPlanJob } from '../../services/ai.api'
import { getMealById, updateMeal } from '../../services/meals.api'
import { GeneratedMealGrid } from './GeneratedMealGrid'
import type { EditablePlan } from './GeneratedMealGrid'
import type { MealItemInput } from '../../types/meal'

const JOB_POLL_MS  = 2_000
const JOB_POLL_MAX = 180

function wait(ms: number) { return new Promise<void>((r) => { window.setTimeout(r, ms) }) }

function apiErrorMsg(e: unknown): string {
  const ae = e as { response?: { data?: { message?: string; error?: { message?: string } } } }
  return (
    ae.response?.data?.error?.message ??
    ae.response?.data?.message ??
    (e instanceof Error ? e.message : 'AI 식단 생성 중 오류가 발생했습니다.')
  )
}

interface Props {
  date:    string        // YYYY-MM-DD (고정)
  onSaved: () => void   // 저장 완료 후 달력 상태 갱신 트리거
  onClose: () => void
}

export function PanelAiSection({ date, onSaved, onClose }: Props) {
  const [preferences,  setPreferences]  = useState('')
  const [excludes,     setExcludes]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [jobStatus,    setJobStatus]    = useState<GenerateMealPlanJob | null>(null)
  const [editablePlans, setEditablePlans] = useState<EditablePlan[]>([])
  const [saving,       setSaving]       = useState(false)

  async function handleGenerate() {
    setError(null); setEditablePlans([]); setJobStatus(null); setLoading(true)
    try {
      const input = {
        period: { from: date, to: date },
        ...(preferences.trim() && { preferences: preferences.split(',').map((s) => s.trim()).filter(Boolean) }),
        ...(excludes.trim()    && { excludes:     excludes.split(',').map((s) => s.trim()).filter(Boolean) }),
      }
      const started = await startMealPlanGeneration(input)
      for (let i = 1; i <= JOB_POLL_MAX; i++) {
        await wait(JOB_POLL_MS)
        const job = await getMealPlanGenerationJob(started.jobId)
        setJobStatus(job)
        if (job.status === 'completed') {
          const summaries = job.result?.mealPlans ?? []
          const fullPlans = await Promise.all(summaries.map((s) => getMealById(s.id)))
          setEditablePlans(fullPlans.map((p) => ({
            id:    p.id,
            date:  p.date,
            items: p.items.map((it): MealItemInput => ({
              category:    it.category,
              name:        it.name,
              ingredients: it.ingredients ?? undefined,
              calories:    it.calories ?? undefined,
            })),
          })))
          return
        }
        if (job.status === 'failed') throw new Error(job.error ?? 'AI 식단 생성 job이 실패했습니다.')
      }
      throw new Error('AI 식단 생성 상태 확인 시간이 초과됐습니다.')
    } catch (e) {
      setError(apiErrorMsg(e))
    } finally {
      setLoading(false)
    }
  }

  function handleItemEdit(planIdx: number, itemIdx: number, updated: MealItemInput) {
    setEditablePlans((prev) =>
      prev.map((p, pi) =>
        pi !== planIdx ? p : { ...p, items: p.items.map((it, ii) => (ii !== itemIdx ? it : updated)) },
      ),
    )
  }

  async function handleSaveAll() {
    setSaving(true); setError(null)
    try {
      await Promise.all(editablePlans.map((p) => updateMeal(p.id, p.items)))
      onSaved()
      onClose()
    } catch (e) {
      setError(apiErrorMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        border: '1px solid #E88FAA',
        borderRadius: 6,
        background: '#FFF8FC',
        padding: '10px 12px',
        marginTop: 8,
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span style={{ fontSize: 12, fontWeight: 600, color: '#C06080' }}>🤖 AI 식단 생성</span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* 옵션 */}
      {editablePlans.length === 0 && (
        <>
          <Form.Control
            size="sm"
            placeholder="선호 식재료 (쉼표 구분, 선택)"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            className="mb-1"
            style={{ fontSize: 11 }}
          />
          <Form.Control
            size="sm"
            placeholder="제외 식재료 (쉼표 구분, 선택)"
            value={excludes}
            onChange={(e) => setExcludes(e.target.value)}
            className="mb-2"
            style={{ fontSize: 11 }}
          />

          {error && (
            <Alert variant="danger" className="py-1 mb-2" style={{ fontSize: 11 }}>
              {error}
            </Alert>
          )}
          {loading && jobStatus && (
            <Alert variant="info" className="py-1 mb-2" style={{ fontSize: 11 }}>
              생성 중: {jobStatus.status}
              {jobStatus.totalDays != null && ` · ${jobStatus.completedDays}/${jobStatus.totalDays}일`}
            </Alert>
          )}

          <button
            className="btn btn-sm w-100"
            style={{ background: '#E88FAA', color: '#fff', fontSize: 12 }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading
              ? <><Spinner size="sm" animation="border" className="me-1" />생성 중...</>
              : 'AI 식단 생성하기'}
          </button>
        </>
      )}

      {/* 결과 */}
      {editablePlans.length > 0 && (
        <>
          {error && (
            <Alert variant="danger" className="py-1 mb-2" style={{ fontSize: 11 }}>{error}</Alert>
          )}
          <GeneratedMealGrid
            plans={editablePlans}
            onItemEdit={handleItemEdit}
            onSaveAll={handleSaveAll}
            saving={saving}
          />
        </>
      )}
    </div>
  )
}
