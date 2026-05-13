import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Spinner } from 'react-bootstrap'
import { FlashAlert } from '../common/FlashAlert'
import type { MealPlan, MealItem, AlternatePlan, MealItemCategory, MealItemNutrients } from '../../types/meal'
import { MealItemFormModal } from './MealItemFormModal'
import type { MealItemInput } from '../../types/meal'
import { createAlternatePlan, saveAlternatePlans, confirmAlternatePlan } from '../../services/alternates.api'

// ── 타입 ─────────────────────────────────────────────────

interface CandidateMeal {
  originalItemId: string
  originalName:   string
  category:       MealItemCategory
  altName:        string
  altCalories?:   number
  altNutrients?:  MealItemNutrients
  isAllergen:     boolean
}

type CandidateSet = CandidateMeal[]

// ── 헬퍼 ─────────────────────────────────────────────────

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dow = KO_DAYS[new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${dow})`
}

function makeInitialCandidate(items: MealItem[]): CandidateSet {
  return items.map((item) => ({
    originalItemId: item.id,
    originalName:   item.name,
    category:       item.category,
    // 알레르기 유발 항목은 빈 이름으로 시작 (편집 필요), 나머지는 원본 복사
    altName:        item.allergens.length > 0 ? '' : item.name,
    isAllergen:     item.allergens.length > 0,
  }))
}

// ── 서브카드 공통 스타일 ──────────────────────────────────

const CARD_W = 210
const ITEM_ROW_BASE: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  gap:            4,
  padding:        '3px 6px',
  borderRadius:   4,
  marginBottom:   4,
  fontSize:       12,
}

// ── 원본 식단 서브카드 ────────────────────────────────────

function OriginalSubCard({ items }: { items: MealItem[] }) {
  return (
    <div style={{ minWidth: CARD_W, flexShrink: 0 }}>
      <div className="small fw-semibold text-muted mb-2 text-center">원본 식단</div>
      <div
        className="rounded p-2"
        style={{ background: '#F4F1EC', border: '1px solid #C0BBB4', minHeight: 100 }}
      >
        {items.map((item) => (
          <div key={item.id} style={{ ...ITEM_ROW_BASE, background: '#ECDFC7' }}>
            <span style={{ flex: 1, color: '#3A3030' }}>{item.name}</span>
            {item.allergens.length > 0 && (
              <span style={{ fontSize: 9, color: '#C04060' }} title={item.allergens.map((a) => a.allergen.name).join(', ')}>
                ⚠
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 대체 식단 서브카드 ────────────────────────────────────

interface AltSubCardProps {
  index:       number
  meals:       CandidateMeal[]
  locked:      boolean   // 설문 생성 후 편집 잠금
  confirmed:   boolean   // 확정됨
  showSelect:  boolean   // "이 식단 선택" 버튼 표시
  selecting:   boolean   // 확정 요청 중
  onEdit:      (mi: number) => void
  onRemove:    () => void
  onSelect:    () => void
}

function AltSubCard({
  index, meals, locked, confirmed, showSelect, selecting, onEdit, onRemove, onSelect,
}: AltSubCardProps) {
  return (
    <div style={{ minWidth: CARD_W, flexShrink: 0 }}>
      <div className="d-flex align-items-center justify-content-center mb-2" style={{ gap: 4 }}>
        <span className="small fw-semibold text-muted">대체 식단 {index + 1}</span>
        {!locked && (
          <button
            className="btn btn-sm p-0 lh-1"
            style={{ color: '#C04060', fontSize: 13, lineHeight: 1 }}
            onClick={onRemove}
            aria-label={`대체 식단 ${index + 1} 삭제`}
          >
            ×
          </button>
        )}
      </div>

      <div
        className="rounded p-2"
        style={{
          background: confirmed ? '#DAF9DE' : '#FFF8EC',
          border:     `1px solid ${confirmed ? '#5DBD6A' : '#E8C87A'}`,
          minHeight:  100,
        }}
      >
        {meals.map((meal, mi) => (
          <div
            key={mi}
            style={{
              ...ITEM_ROW_BASE,
              background: meal.isAllergen ? '#FFE8CC' : '#ECDFC7',
            }}
          >
            <span
              style={{
                flex:  1,
                color: meal.isAllergen && !meal.altName ? '#C04060' : '#3A3030',
              }}
            >
              {meal.altName || (meal.isAllergen ? '(미입력)' : meal.originalName)}
            </span>
            {/* 연필 편집 버튼 — 잠금 전 모든 항목에 표시 */}
            {!locked && (
              <button
                className="btn btn-sm p-0 lh-1"
                style={{ color: '#888', fontSize: 11 }}
                onClick={() => onEdit(mi)}
                aria-label="메뉴 수정"
                title="메뉴 수정"
              >
                ✏
              </button>
            )}
          </div>
        ))}

        {/* 설문 생성 후 "이 식단 선택" 버튼 */}
        {showSelect && !confirmed && (
          <button
            className="btn btn-sm w-100 mt-2"
            style={{ background: '#CFECF3', borderColor: '#A8D8E8', color: '#3A3030', fontSize: 11 }}
            onClick={onSelect}
            disabled={selecting}
          >
            {selecting ? <Spinner size="sm" animation="border" /> : '이 식단 선택'}
          </button>
        )}
        {confirmed && (
          <div className="text-center mt-2">
            <span
              className="badge"
              style={{ background: '#5DBD6A', color: '#fff', fontSize: 10 }}
            >
              확정됨
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 메인 카드 ─────────────────────────────────────────────

interface Props {
  plan:  MealPlan
  month: string  // 쿼리 캐시 무효화용
}

export function AlternatePlanCard({ plan, month }: Props) {
  const queryClient = useQueryClient()

  const [candidates,     setCandidates]     = useState<CandidateSet[]>([])
  const [editTarget,     setEditTarget]     = useState<{ ci: number; mi: number } | null>(null)
  const [draftPlans,     setDraftPlans]     = useState<AlternatePlan[]>([])
  const [surveysCreated, setSurveysCreated] = useState(false)
  const [confirmedId,    setConfirmedId]    = useState<string | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [selectingId,    setSelectingId]    = useState<string | null>(null)
  const [msg,            setMsg]            = useState<{ ok: boolean; text: string } | null>(null)

  const allergenNames = Array.from(
    new Set(plan.items.flatMap((it) => it.allergens.map((a) => a.allergen.name))),
  )
  // 대표 알레르기 (설문 대상자 산정용 — BE에 필요)
  const firstAllergenId = plan.items.flatMap((it) => it.allergens)[0]?.allergen.id

  // ── 후보 편집 ───────────────────────────────────────────

  function addCandidate() {
    if (candidates.length >= 3) return
    setCandidates((prev) => [...prev, makeInitialCandidate(plan.items)])
  }

  function removeCandidate(ci: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== ci))
  }

  function handleEditSave(item: MealItemInput) {
    if (!editTarget) return
    const { ci, mi } = editTarget
    setCandidates((prev) =>
      prev.map((c, cIdx) =>
        cIdx !== ci ? c :
          c.map((m, mIdx) =>
            mIdx !== mi ? m : {
              ...m,
              altName:     item.name,
              altCalories: item.calories,
              altNutrients: item.nutrients,
            }
          )
      )
    )
    setEditTarget(null)
  }

  // ── 저장 / 설문 올리기 ──────────────────────────────────

  const hasDraftsInDb   = plan.alternatePlans.some((ap) => ap.status === 'draft')
  const canSave         = candidates.length > 0 || hasDraftsInDb
  const isSurveyMode    = candidates.length >= 2  // 2개 이상 → 설문 버튼 활성

  async function handleSave() {
    if (!canSave || saving) return
    if (!firstAllergenId) {
      setMsg({ ok: false, text: '알레르기 정보가 없는 식단입니다.' })
      return
    }

    setSaving(true)
    setMsg(null)
    try {
      // 각 candidate set을 AlternatePlan 1개로 등록
      for (const candidateSet of candidates) {
        await createAlternatePlan(plan.id, {
          targetAllergenId: firstAllergenId,
          items: candidateSet.map((meal) => ({
            replacesItemId: meal.originalItemId,
            name:           meal.altName || meal.originalName,
            calories:       meal.altCalories,
            nutrients:      meal.altNutrients as Record<string, unknown> | undefined,
          })),
        })
      }

      const result = await saveAlternatePlans(plan.id)

      if (result.action === 'confirmed') {
        setMsg({ ok: true, text: '대체 식단이 확정되었습니다.' })
        setCandidates([])
      } else {
        // surveys_created: 설문 생성 완료 → "이 식단 선택" 버튼 표시
        setSurveysCreated(true)
        setDraftPlans(result.plans)
        setMsg({ ok: true, text: '설문이 생성되었습니다. 원하는 식단을 선택해 주세요.' })
      }
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
    } catch {
      setMsg({ ok: false, text: '저장에 실패했습니다. 다시 시도해주세요.' })
    } finally {
      setSaving(false)
    }
  }

  // ── "이 식단 선택" ────────────────────────────────────────

  async function handleSelect(ci: number) {
    const draft = draftPlans[ci]
    if (!draft) return
    setSelectingId(draft.id)
    try {
      await confirmAlternatePlan(draft.id)
      setConfirmedId(draft.id)
      setMsg({ ok: true, text: '식단이 최종 확정되었습니다.' })
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
    } catch {
      setMsg({ ok: false, text: '확정에 실패했습니다. 다시 시도해주세요.' })
    } finally {
      setSelectingId(null)
    }
  }

  // ── 편집 모달 initialValues ──────────────────────────────

  const editingMeal = editTarget
    ? candidates[editTarget.ci]?.[editTarget.mi]
    : undefined

  const editInitialValues: MealItemInput | undefined = editingMeal
    ? {
        category:  editingMeal.category,
        name:      editingMeal.altName,
        calories:  editingMeal.altCalories,
        nutrients: editingMeal.altNutrients,
      }
    : undefined

  // ── 렌더 ────────────────────────────────────────────────

  return (
    <div className="p-3 rounded" style={{ background: '#FAFEFF', border: '1.5px solid #3A3030' }}>

      {/* 헤더 */}
      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
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

      {/* 알림 메시지 */}
      {msg && (
        <FlashAlert
          variant={msg.ok ? 'success' : 'danger'}
          text={msg.text}
          onClose={() => setMsg(null)}
          className="mb-3"
        />
      )}

      {/* ── 좌우 스크롤 영역 ─────────────────────────────── */}
      <div className="d-flex gap-3 pb-1" style={{ overflowX: 'auto' }}>

        {/* 원본 식단 */}
        <OriginalSubCard items={plan.items} />

        {/* 대체 식단 후보들 */}
        {candidates.map((candidateSet, ci) => (
          <AltSubCard
            key={ci}
            index={ci}
            meals={candidateSet}
            locked={surveysCreated}
            confirmed={!!confirmedId && draftPlans[ci]?.id === confirmedId}
            showSelect={surveysCreated && !confirmedId}
            selecting={selectingId === draftPlans[ci]?.id}
            onEdit={(mi) => setEditTarget({ ci, mi })}
            onRemove={() => removeCandidate(ci)}
            onSelect={() => handleSelect(ci)}
          />
        ))}

        {/* 대체 식단 추가 버튼 — 설문 생성 전, 최대 3개 */}
        {!surveysCreated && candidates.length < 3 && (
          <div style={{ minWidth: 120, flexShrink: 0 }}>
            <div className="small fw-semibold text-muted mb-2 text-center">&nbsp;</div>
            <button
              className="d-flex align-items-center justify-content-center rounded w-100"
              style={{
                background:  'transparent',
                border:      '1.5px dashed #E88FAA',
                color:       '#C06080',
                fontSize:    12,
                minHeight:   100,
                cursor:      'pointer',
              }}
              onClick={addCandidate}
            >
              + 대체 식단<br />추가
            </button>
          </div>
        )}
      </div>

      {/* DB에 이미 확정된 대체 식단 표시 */}
      {plan.alternatePlans.filter((ap) => ap.status === 'confirmed').map((alt) => (
        <div
          key={alt.id}
          className="d-flex align-items-center gap-2 px-2 py-1 rounded small mt-2"
          style={{ background: '#DAF9DE', border: '1px solid #5DBD6A' }}
        >
          <span style={{ color: '#2E7D32', fontWeight: 600, flex: 1 }}>
            {alt.items.map((it) => it.name).join(' / ')}
          </span>
          <span className="badge" style={{ background: '#5DBD6A', color: '#fff', fontSize: 10 }}>
            확정
          </span>
        </div>
      ))}

      {/* ── 액션 버튼 ───────────────────────────────────── */}
      {!surveysCreated && (
        <div className="d-flex gap-2 mt-3">
          {/* 저장: 후보 1개일 때만 활성 */}
          <button
            className="btn btn-sm flex-grow-1"
            style={{ background: '#CFECF3', borderColor: '#A8D8E8', color: '#3A3030', fontSize: 12 }}
            onClick={handleSave}
            disabled={saving || isSurveyMode || !canSave}
          >
            {saving && !isSurveyMode
              ? <Spinner size="sm" animation="border" />
              : '저장'}
          </button>

          {/* 설문 올리기: 후보 2개 이상일 때만 활성 */}
          <button
            className="btn btn-sm flex-grow-1"
            style={{ background: '#E8EFFF', borderColor: '#A8BFFF', color: '#3A3030', fontSize: 12 }}
            onClick={handleSave}
            disabled={saving || !isSurveyMode}
          >
            {saving && isSurveyMode
              ? <Spinner size="sm" animation="border" />
              : '설문 올리기'}
          </button>
        </div>
      )}

      {/* 편집 모달 */}
      <MealItemFormModal
        show={editTarget !== null}
        initialValues={editInitialValues}
        onSave={handleEditSave}
        onCancel={() => setEditTarget(null)}
      />
    </div>
  )
}
