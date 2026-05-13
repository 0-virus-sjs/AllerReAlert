import { useState } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import type { MealItemInput, MealItemCategory } from '../../types/meal'
import { MealItemFormModal } from './MealItemFormModal'

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const CATEGORY_LABEL: Record<MealItemCategory, string> = {
  rice: '밥', soup: '국', side: '반찬', dessert: '후식',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}(${KO_DAYS[d.getDay()]})`
}

export interface EditablePlan {
  id:    string
  date:  string
  items: MealItemInput[]
}

interface Props {
  plans:        EditablePlan[]
  onItemEdit:   (planIdx: number, itemIdx: number, updated: MealItemInput) => void
  onSaveAll:    () => void
  saving:       boolean
}

export function GeneratedMealGrid({ plans, onItemEdit, onSaveAll, saving }: Props) {
  const [editTarget, setEditTarget] = useState<{ planIdx: number; itemIdx: number } | null>(null)

  const editingItem =
    editTarget !== null
      ? plans[editTarget.planIdx]?.items[editTarget.itemIdx]
      : undefined

  function handleSave(updated: MealItemInput) {
    if (editTarget === null) return
    onItemEdit(editTarget.planIdx, editTarget.itemIdx, updated)
    setEditTarget(null)
  }

  return (
    <div>
      {/* 카드 그리드 */}
      <div className="d-flex flex-column gap-3 mb-4">
        {plans.map((plan, planIdx) => (
          <div
            key={plan.id}
            className="rounded p-3"
            style={{ border: '1.5px solid #C0BBB4', background: '#FAFEFF' }}
          >
            <div
              className="small fw-semibold mb-2"
              style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#3A3030' }}
            >
              {formatDate(plan.date)}
            </div>

            <div className="d-flex flex-column gap-1">
              {plan.items.map((item, itemIdx) => (
                <div
                  key={itemIdx}
                  className="d-flex align-items-center gap-2 px-2 py-1 rounded"
                  style={{ background: '#F4F1EC', border: '1px solid #E0DBD4' }}
                >
                  <span
                    className="badge flex-shrink-0"
                    style={{ background: '#CFECF3', color: '#3A3030', fontSize: 10 }}
                  >
                    {CATEGORY_LABEL[item.category]}
                  </span>
                  <span className="small flex-grow-1" style={{ color: '#3A3030' }}>{item.name}</span>
                  {item.ingredients && (
                    <span className="text-muted" style={{ fontSize: 10 }}>
                      {item.ingredients.split(',').slice(0, 2).join(', ')}
                      {item.ingredients.split(',').length > 2 && '…'}
                    </span>
                  )}
                  {item.calories !== undefined && (
                    <span
                      className="flex-shrink-0"
                      style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#888' }}
                    >
                      {item.calories}kcal
                    </span>
                  )}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="flex-shrink-0 py-0 px-2"
                    style={{ fontSize: 10 }}
                    onClick={() => setEditTarget({ planIdx, itemIdx })}
                  >
                    편집
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 최종 저장 버튼 */}
      <Button
        className="w-100 py-2 fw-semibold"
        onClick={onSaveAll}
        disabled={saving}
      >
        {saving
          ? <><Spinner animation="border" size="sm" className="me-2" />저장 중...</>
          : '✅ 최종 저장'}
      </Button>

      {/* 편집 모달 */}
      <MealItemFormModal
        show={editTarget !== null}
        initialValues={editingItem}
        onSave={handleSave}
        onCancel={() => setEditTarget(null)}
      />
    </div>
  )
}
