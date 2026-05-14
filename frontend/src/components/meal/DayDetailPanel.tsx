import { Spinner } from 'react-bootstrap'
import type { MealPlan, MealItemInput } from '../../types/meal'
import type { CalendarStatusEntry } from '../../services/meals.api'
import { MealItemRow } from './MealItemRow'
import { PanelConflictInfo } from './PanelConflictInfo'

interface Props {
  date: string
  plan: MealPlan | undefined
  calendarStatus: CalendarStatusEntry | undefined
  localItems: MealItemInput[]
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  isLoading: boolean
  onSave: () => void
  onPublish: () => void
  onAddItem: () => void
  onEditItem: (index: number) => void
  onDeleteItem: (index: number) => void
}

export function DayDetailPanel({
  date, plan, calendarStatus, localItems, isDirty,
  isSaving, isPublishing, isLoading,
  onSave, onPublish, onAddItem, onEditItem, onDeleteItem,
}: Props) {
  const uniqueAllergens = Array.from(
    new Set((plan?.items ?? []).flatMap((it) => it.allergens.map((a) => a.allergen.name))),
  )

  const canPublish = !!plan && plan.status !== 'published' && !isDirty

  return (
    <div
      style={{
        border: '1.5px solid #E0DBD4',
        borderRadius: 6,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 360,
      }}
    >
      {/* ── 패널 헤더 ───────────────────────────────── */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #E0DBD4',
          background: '#FAFEFF',
          borderRadius: '4px 4px 0 0',
        }}
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-1">
          <span style={{ fontWeight: 600, fontSize: 13, color: '#3A3030' }}>
            {date.replace(/-/g, '/')} 식단
          </span>
          <div className="d-flex gap-1">
            {plan?.status === 'published' && (
              <span className="badge" style={{ background: '#5DBD6A', color: '#fff', fontSize: 10 }}>
                공개됨
              </span>
            )}
            {plan?.status === 'draft' && (
              <span className="badge bg-warning text-dark" style={{ fontSize: 10 }}>
                임시저장
              </span>
            )}
            {isDirty && (
              <span className="badge bg-light border text-muted" style={{ fontSize: 10 }}>
                미저장
              </span>
            )}
          </div>
        </div>

        {/* T-156: 충돌 상세 (접이식) */}
        <PanelConflictInfo plan={plan} calendarStatus={calendarStatus} />
      </div>

      {/* ── 패널 바디 ───────────────────────────────── */}
      <div style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div className="text-center py-5">
            <Spinner size="sm" />
          </div>
        ) : (
          <>
            {/* 메뉴 목록 */}
            <div className="d-flex flex-column gap-2 mb-2">
              {localItems.map((item, idx) => (
                <MealItemRow
                  key={idx}
                  item={item}
                  allergens={isDirty ? [] : (plan?.items[idx]?.allergens ?? [])}
                  onEdit={() => onEditItem(idx)}
                  onDelete={() => onDeleteItem(idx)}
                />
              ))}

              {localItems.length === 0 && (
                <div
                  className="text-muted small py-3 text-center rounded"
                  style={{ border: '1.5px dashed #C0BBB4', background: '#FAFEFF', fontSize: 12 }}
                >
                  이 날짜에 등록된 메뉴가 없습니다.
                </div>
              )}

              <button
                className="btn btn-sm w-100"
                style={{
                  borderStyle: 'dashed',
                  borderColor: '#C0BBB4',
                  color: '#888',
                  background: '#FAFEFF',
                  fontSize: 12,
                }}
                onClick={onAddItem}
              >
                + 메뉴 추가
              </button>
            </div>

            <hr style={{ borderColor: '#E0DBD4', margin: '8px 0' }} />

            {/* 알레르기 요약 */}
            <div className="small mb-3" style={{ color: '#7A6070', fontSize: 12 }}>
              알레르기:{' '}
              {uniqueAllergens.length > 0 ? (
                <strong style={{ color: '#E06080' }}>{uniqueAllergens.join(', ')}</strong>
              ) : (
                <span>없음</span>
              )}
              {isDirty && (
                <span className="text-muted ms-1" style={{ fontSize: 10 }}>(저장 후 갱신)</span>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="d-flex gap-2 mt-auto">
              <button
                className="btn btn-sm flex-fill"
                style={{ border: '1px solid #5DBD6A', color: '#2E7D32', fontSize: 12 }}
                onClick={onSave}
                disabled={isSaving || localItems.length === 0}
              >
                {isSaving
                  ? <Spinner size="sm" animation="border" />
                  : isDirty ? '저장' : '자동 태깅'}
              </button>
              <button
                className="btn btn-sm flex-fill"
                style={{
                  background: '#CFECF3',
                  border: '1px solid #A8D8E8',
                  color: '#3A3030',
                  fontSize: 12,
                }}
                onClick={onPublish}
                disabled={!canPublish || isPublishing}
              >
                {isPublishing ? <Spinner size="sm" animation="border" /> : '공개 예약'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
