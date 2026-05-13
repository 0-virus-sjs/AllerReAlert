import { useState } from 'react'
import { Spinner } from 'react-bootstrap'
import type { MealPlan, MealItemInput } from '../../types/meal'
import { MealItemFormModal } from './MealItemFormModal'

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dow = KO_DAYS[new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${dow})`
}

interface Props {
  plan: MealPlan
  onSave: (planId: string, candidates: MealItemInput[]) => void
  isSaving: boolean
}

export function AlternatePlanCard({ plan, onSave, isSaving }: Props) {
  const [candidates,    setCandidates]    = useState<MealItemInput[]>([])
  const [showFormModal, setShowFormModal] = useState(false)

  const allergenNames = Array.from(
    new Set(plan.items.flatMap((it) => it.allergens.map((a) => a.allergen.name))),
  )

  function addCandidate(item: MealItemInput) {
    setCandidates((prev) => [...prev, item])
    setShowFormModal(false)
  }

  function removeCandidate(idx: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== idx))
  }

  const hasDraftAlternates = plan.alternatePlans.some((ap) => ap.status === 'draft')
  const canSave = candidates.length > 0 || hasDraftAlternates

  return (
    <div className="p-3 rounded" style={{ background: '#FAFEFF', border: '1.5px solid #3A3030' }}>
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 500 }}>
            {formatDate(plan.date)}
          </span>
          {allergenNames.map((name) => (
            <span
              key={name}
              style={{
                background: '#FDDDE8', border: '1px solid #E06080',
                color: '#C04060', borderRadius: 3, padding: '1px 6px', fontSize: 10,
              }}
            >
              {name} 포함
            </span>
          ))}
        </div>
      </div>

      {/* 원본 메뉴 목록 */}
      <div className="mb-3">
        <div className="small text-muted mb-1">원본 메뉴</div>
        <div className="d-flex flex-column gap-1">
          {plan.items.map((item) => (
            <div
              key={item.id}
              className="d-flex align-items-center gap-2 px-2 py-1 rounded small"
              style={{ background: '#F4F1EC', border: '1px solid #C0BBB4' }}
            >
              <span style={{ color: '#3A3030' }}>{item.name}</span>
              {item.allergens.length > 0 && (
                <span style={{ fontSize: 10, color: '#C04060' }}>
                  ({item.allergens.map((a) => a.allergen.name).join(', ')})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 기존 대체 식단 (confirmed) */}
      {plan.alternatePlans.filter((ap) => ap.status === 'confirmed').map((alt) => (
        <div key={alt.id} className="mb-2">
          <div className="small text-muted mb-1">확정된 대체 식단</div>
          <div
            className="px-2 py-1 rounded small d-flex align-items-center gap-2"
            style={{ background: '#DAF9DE', border: '1px solid #5DBD6A' }}
          >
            <span style={{ color: '#2E7D32', fontWeight: 600 }}>
              {alt.items.map((it) => it.name).join(' + ')}
            </span>
            <span className="badge" style={{ background: '#5DBD6A', color: '#fff', fontSize: 10 }}>확정</span>
          </div>
        </div>
      ))}

      {/* 로컬 후보 목록 */}
      {candidates.length > 0 && (
        <div className="mb-2">
          <div className="small text-muted mb-1">추가할 후보</div>
          <div className="d-flex flex-column gap-1">
            {candidates.map((c, idx) => (
              <div
                key={idx}
                className="d-flex align-items-center gap-2 px-2 py-1 rounded small"
                style={{ background: '#FFF8EC', border: '1px solid #E8C87A' }}
              >
                <span className="flex-grow-1" style={{ color: '#3A3030' }}>{c.name}</span>
                {c.calories !== undefined && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#888' }}>
                    {c.calories}kcal
                  </span>
                )}
                <button
                  className="btn btn-sm p-0 lh-1"
                  style={{ color: '#C04060', fontSize: 14, lineHeight: 1 }}
                  onClick={() => removeCandidate(idx)}
                  aria-label="후보 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="d-flex gap-2 mt-2">
        <button
          className="btn btn-sm flex-grow-1"
          style={{ borderStyle: 'dashed', borderColor: '#E88FAA', color: '#C06080', background: 'transparent', fontSize: 12 }}
          onClick={() => setShowFormModal(true)}
          disabled={isSaving}
        >
          + 대체식단 추가
        </button>
        <button
          className="btn btn-sm"
          style={{ background: '#CFECF3', borderColor: '#A8D8E8', color: '#3A3030', fontSize: 12 }}
          onClick={() => onSave(plan.id, candidates)}
          disabled={!canSave || isSaving}
        >
          {isSaving ? <Spinner size="sm" animation="border" /> : '저장'}
        </button>
      </div>

      <MealItemFormModal
        show={showFormModal}
        onSave={addCandidate}
        onCancel={() => setShowFormModal(false)}
      />
    </div>
  )
}
