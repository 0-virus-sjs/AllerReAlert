import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from 'react-bootstrap'
import { getMeals } from '../services/meals.api'
import { AlternatePlanCard } from '../components/meal/AlternatePlanCard'

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export function AlternateMealPage() {
  const todayStr = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(todayStr)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['meals', month],
    queryFn:  () => getMeals(month),
    staleTime: 5 * 60 * 1000,
  })

  const allergenPlans = plans.filter((p) =>
    p.items.some((it) => it.allergens.length > 0),
  )

  const [y, m] = month.split('-').map(Number)

  return (
    <div className="p-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setMonth(prevMonth(month))}
          >
            ‹
          </button>
          <h5 className="mb-0 fw-bold">{y}년 {m}월 대체 식단 관리</h5>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setMonth(nextMonth(month))}
          >
            ›
          </button>
        </div>
        <span className="text-muted small">알레르기 유발 메뉴가 포함된 식단만 표시됩니다.</span>
      </div>

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
            <AlternatePlanCard key={plan.id} plan={plan} month={month} />
          ))}
        </div>
      )}
    </div>
  )
}