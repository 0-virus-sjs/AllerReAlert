import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Spinner } from 'react-bootstrap'
import { getMeals } from '../services/meals.api'
import { createAlternatePlan, saveAlternatePlans } from '../services/alternates.api'
import type { MealItemInput, MealPlan } from '../types/meal'
import { AlternatePlanCard } from '../components/meal/AlternatePlanCard'

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

// 플랜에서 첫 번째 알레르기 항목 정보를 자동 선택 (메뉴 단위 UI 제거 대체)
function pickAllergenTarget(plan: MealPlan) {
  const item = plan.items.find((it) => it.allergens.length > 0)
  if (!item) return null
  return { replacesItemId: item.id, targetAllergenId: item.allergens[0].allergen.id }
}

export function AlternateMealPage() {
  const todayStr = new Date().toISOString().slice(0, 7)
  const [month,        setMonth]        = useState(todayStr)
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null)
  const [msg,          setMsg]          = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['meals', month],
    queryFn:  () => getMeals(month),
    staleTime: 5 * 60 * 1000,
  })

  // 알레르기 유발 메뉴가 있는 식단만 표시
  const allergenPlans = plans.filter((p) =>
    p.items.some((it) => it.allergens.length > 0),
  )

  async function handleSave(planId: string, candidates: MealItemInput[]) {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return

    setSavingPlanId(planId)
    setMsg(null)

    try {
      if (candidates.length > 0) {
        const target = pickAllergenTarget(plan)
        if (!target) {
          setMsg({ type: 'error', text: '알레르기 정보가 없는 식단입니다.' })
          return
        }
        for (const candidate of candidates) {
          await createAlternatePlan(planId, {
            targetAllergenId: target.targetAllergenId,
            items: [{
              replacesItemId: target.replacesItemId,
              name:      candidate.name,
              calories:  candidate.calories,
              nutrients: candidate.nutrients as Record<string, unknown> | undefined,
            }],
          })
        }
      }

      const result = await saveAlternatePlans(planId)
      const successText = result.action === 'confirmed'
        ? '대체 식단이 확정되었습니다.'
        : `설문이 ${result.plans.length}건 생성되었습니다.`
      setMsg({ type: 'success', text: successText })
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
      setTimeout(() => setMsg(null), 4000)
    } catch {
      setMsg({ type: 'error', text: '저장에 실패했습니다. 다시 시도해주세요.' })
    } finally {
      setSavingPlanId(null)
    }
  }

  const [y, m] = month.split('-').map(Number)

  return (
    <div className="p-4">
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setMonth(prevMonth(month))}>‹</button>
          <h5 className="mb-0 fw-bold">{y}년 {m}월 대체 식단 관리</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setMonth(nextMonth(month))}>›</button>
        </div>
        <span className="text-muted small">알레르기 유발 메뉴가 포함된 식단만 표시됩니다.</span>
      </div>

      {msg && (
        <Alert
          variant={msg.type === 'success' ? 'success' : 'danger'}
          className="py-2 mb-3 small"
          onClose={() => setMsg(null)}
          dismissible
        >
          {msg.text}
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : allergenPlans.length === 0 ? (
        <div
          className="text-muted small py-5 text-center rounded"
          style={{ border: '1.5px dashed #C0BBB4', background: '#FAFEFF' }}
        >
          {month.replace('-', '년 ')}월에 알레르기 유발 메뉴가 포함된 식단이 없습니다.
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {allergenPlans.map((plan) => (
            <AlternatePlanCard
              key={plan.id}
              plan={plan}
              onSave={handleSave}
              isSaving={savingPlanId === plan.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
