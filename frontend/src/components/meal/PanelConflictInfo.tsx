import { useState } from 'react'
import type { MealPlan } from '../../types/meal'
import type { CalendarStatusEntry } from '../../services/meals.api'

interface Props {
  plan: MealPlan | undefined
  calendarStatus: CalendarStatusEntry | undefined
  schoolAllergenIds?: Set<string>
}

export function PanelConflictInfo({ plan, calendarStatus, schoolAllergenIds }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!calendarStatus || calendarStatus.conflictCount === 0) return null

  const conflictItems = (plan?.items ?? [])
    .map((it) => ({
      ...it,
      allergens: it.allergens.filter((a) => schoolAllergenIds?.has(a.allergen.id) ?? false),
    }))
    .filter((it) => it.allergens.length > 0)

  return (
    <div
      style={{
        marginTop: 6,
        padding: '6px 8px',
        background: '#FFF0F3',
        border: '1px solid #F4B0C0',
        borderRadius: 4,
        fontSize: 11,
      }}
    >
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          textAlign: 'left',
          fontWeight: 600,
          color: '#C04060',
          fontSize: 11,
        }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span>⚠ 알레르기 충돌 {calendarStatus.conflictCount}건 · 영향 학생 {calendarStatus.affectedStudents}명</span>
        <span style={{ marginLeft: 'auto', fontSize: 9 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && conflictItems.length > 0 && (
        <div style={{ marginTop: 5, paddingLeft: 10 }}>
          {conflictItems.map((item) => (
            <div key={item.id} style={{ color: '#8B2040', marginBottom: 3 }}>
              <span style={{ fontWeight: 500 }}>{item.name}</span>
              <span style={{ color: '#B04060', marginLeft: 4 }}>
                ({item.allergens.map((a) => a.allergen.name).join(', ')})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
