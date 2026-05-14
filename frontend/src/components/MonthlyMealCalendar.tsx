import type { MealPlan } from '../types/meal'
import { AllergenBadge } from './allergen/AllergenBadge'

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']

function toDateStr(iso: string) {
  return iso.slice(0, 10)
}

function formatDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getCalendarCells(ym: string): { date: Date; inMonth: boolean }[] {
  const [y, m] = ym.split('-').map(Number)
  const startWeekday = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const dayOffset = i - startWeekday + 1
    cells.push({
      date: new Date(y, m - 1, dayOffset),
      inMonth: dayOffset >= 1 && dayOffset <= daysInMonth,
    })
  }
  return cells
}

export type CalendarDayLevel = 'danger' | 'alt' | 'draft' | 'normal'

interface Props {
  month: string                                                     // 'YYYY-MM'
  today: string                                                     // 'YYYY-MM-DD'
  selectedDate: string                                              // 'YYYY-MM-DD'
  onSelectDate: (date: string) => void
  plans: MealPlan[]
  confirmedIds?: Set<string>
  getDayLevel?: (plan: MealPlan) => CalendarDayLevel                // 미지정 시 normal
  selectMode?: boolean
  selectedDates?: Set<string>
  onToggleDateSelect?: (date: string) => void
}

export function MonthlyMealCalendar(props: Props) {
  const { month, today, selectedDate, onSelectDate, plans, confirmedIds, getDayLevel,
          selectMode, selectedDates, onToggleDateSelect } = props
  const cells = getCalendarCells(month)

  return (
    <div style={{ border: '1.5px solid #3A3030', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
      {/* 범례 */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '6px 10px',
          background: '#FAFEFF',
          borderBottom: '1px solid #E0DBD4',
          fontSize: 10,
          color: '#666',
          alignItems: 'center',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: '#FDDDE8', border: '1px solid #E06080' }} />
          알레르기 포함
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: '#DAF9DE', border: '1px solid #5DBD6A' }} />
          대체식 있음
        </span>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#E8E4DE' }}>
        {KO_DAYS.map((d, i) => (
          <div
            key={d}
            style={{
              padding: '5px 0',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: i === 0 ? '#C04060' : i === 6 ? '#5090C0' : '#3A3030',
              borderRight: i < 6 ? '1px solid #C0BBB4' : 'none',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map(({ date, inMonth }, idx) => {
          const ds = formatDateStr(date)
          const plan = plans.find((p) => toDateStr(p.date) === ds)
          const level: CalendarDayLevel = inMonth && plan && getDayLevel ? getDayLevel(plan) : 'normal'
          const isSelected = ds === selectedDate
          const isToday = ds === today
          const dayOfWeek = idx % 7
          const isBulkChecked = selectMode && selectedDates?.has(ds)

          const bg = !inMonth
            ? '#F4F1EC'
            : isBulkChecked
              ? '#FFFBE6'
              : level === 'danger'
                ? '#FDDDE8'
                : level === 'alt'
                  ? '#DAF9DE'
                  : level === 'draft'
                    ? '#FFFBE6'
                    : plan
                      ? '#fff'
                      : '#FAFEFF'

          function handleClick() {
            if (!inMonth) return
            if (selectMode && onToggleDateSelect) onToggleDateSelect(ds)
            else onSelectDate(ds)
          }

          return (
            <button
              key={idx}
              onClick={handleClick}
              disabled={!inMonth}
              type="button"
              style={{
                padding: '4px 6px',
                minHeight: 110,
                background: bg,
                border: 'none',
                borderRight: dayOfWeek < 6 ? '1px solid #E0DBD4' : 'none',
                borderBottom: '1px solid #E0DBD4',
                outline: isBulkChecked ? '2px solid #E8A820' : isSelected ? '2px solid #A8D8E8' : isToday ? '2px solid #5DBD6A' : 'none',
                outlineOffset: -2,
                cursor: inMonth ? 'pointer' : 'default',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10,
                  color: !inMonth
                    ? '#C0BBB4'
                    : level === 'danger'
                      ? '#C04060'
                      : dayOfWeek === 0
                        ? '#C04060'
                        : dayOfWeek === 6
                          ? '#5090C0'
                          : '#666',
                  marginBottom: 2,
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {date.getDate()}
              </div>

              {level === 'danger' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 6,
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                  title="알레르기 주의"
                >
                  ⚠
                </span>
              )}

              {level === 'alt' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    fontSize: 8,
                    padding: '1px 4px',
                    background: '#5DBD6A',
                    color: '#fff',
                    borderRadius: 2,
                  }}
                >
                  대체
                </span>
              )}

              {level === 'draft' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    fontSize: 8,
                    padding: '1px 4px',
                    background: '#E8A820',
                    color: '#fff',
                    borderRadius: 2,
                  }}
                >
                  임시
                </span>
              )}

              {plan && inMonth && plan.items.slice(0, 2).map((item, j) => (
                <div key={j} style={{ marginBottom: 3 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: item.allergens.some((a) => confirmedIds?.has(a.allergen.id))
                        ? '#C04060'
                        : '#444',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </div>
                  {item.allergens.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, marginTop: 1 }}>
                      {item.allergens.map((a) => (
                        <AllergenBadge
                          key={a.allergen.id}
                          allergen={a.allergen}
                          dangerous={confirmedIds?.has(a.allergen.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {plan && plan.items.length > 2 && (
                <div style={{ fontSize: 9, color: '#999' }}>
                  +{plan.items.length - 2}개
                </div>
              )}
              {isBulkChecked && (
                <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 9, color: '#E8A820', fontWeight: 700 }}>✓</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}