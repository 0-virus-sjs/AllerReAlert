import type { MealPlan, AlternatePlan } from '../../types/meal'

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const dow = KO_DAYS[new Date(y, m - 1, d).getDay()]
  return `${m}/${d}(${dow})`
}

interface Props {
  plan: MealPlan
  onConfirm: (altPlanId: string) => void
  onAdd: () => void
  confirmingId: string | null
}

function AltPlanRow({
  alt,
  onConfirm,
  isConfirming,
}: {
  alt: AlternatePlan
  onConfirm: () => void
  isConfirming: boolean
}) {
  const isConfirmed = alt.status === 'confirmed'
  const itemNames   = alt.items.map((it) => it.name).join(' + ')
  const totalCal    = alt.items.reduce((sum, it) => sum + (it.calories ?? 0), 0)

  return (
    <div
      className="d-flex align-items-start gap-2 p-2 rounded"
      style={{
        background: isConfirmed ? '#DAF9DE' : '#F4F1EC',
        border: `1px solid ${isConfirmed ? '#5DBD6A' : '#C0BBB4'}`,
      }}
    >
      <div className="flex-grow-1">
        <div
          className="small"
          style={{ fontWeight: isConfirmed ? 600 : 400, color: '#3A3030' }}
        >
          {itemNames}
        </div>
        {totalCal > 0 && (
          <span
            style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#888' }}
          >
            {totalCal}kcal
          </span>
        )}
        <div className="mt-1 d-flex gap-1 flex-wrap">
          {alt.items.map((it) => (
            <span key={it.id} style={{ fontSize: 10, color: '#7A6070' }}>
              ← {it.replacesItem.name}
            </span>
          ))}
        </div>
      </div>

      {isConfirmed ? (
        <span
          className="badge flex-shrink-0"
          style={{ background: '#5DBD6A', color: '#fff', fontSize: 10 }}
        >
          확정
        </span>
      ) : (
        <button
          className="btn btn-sm flex-shrink-0"
          style={{ fontSize: 10, padding: '2px 10px', background: '#CFECF3', border: '1px solid #A8D8E8' }}
          onClick={onConfirm}
          disabled={isConfirming}
        >
          확정
        </button>
      )}
    </div>
  )
}

export function AlternatePlanCard({ plan, onConfirm, onAdd, confirmingId }: Props) {
  const allergenNames = Array.from(
    new Set(plan.items.flatMap((it) => it.allergens.map((a) => a.allergen.name))),
  )

  return (
    <div
      className="p-3 rounded"
      style={{ background: '#FAFEFF', border: '1.5px solid #3A3030' }}
    >
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span
            style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, fontWeight: 500 }}
          >
            {formatDate(plan.date)}
          </span>
          {allergenNames.map((name) => (
            <span
              key={name}
              style={{
                background: '#FDDDE8',
                border: '1px solid #E06080',
                color: '#C04060',
                borderRadius: 3,
                padding: '1px 6px',
                fontSize: 10,
              }}
            >
              {name} 포함
            </span>
          ))}
        </div>
        <span
          style={{
            background: '#FFF0F5',
            border: '1px solid #E88FAA',
            color: '#C06080',
            borderRadius: 3,
            padding: '1px 6px',
            fontSize: 10,
          }}
        >
          대체식 필요
        </span>
      </div>

      {/* 대체 식단 목록 */}
      {plan.alternatePlans.length > 0 && (
        <div className="mb-3">
          <div className="small text-muted mb-1">대체 메뉴 후보</div>
          <div className="d-flex flex-column gap-2">
            {plan.alternatePlans.map((alt) => (
              <AltPlanRow
                key={alt.id}
                alt={alt}
                onConfirm={() => onConfirm(alt.id)}
                isConfirming={confirmingId === alt.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* 대체 메뉴 추가 버튼 */}
      <button
        className="btn btn-sm w-100"
        style={{
          borderStyle: 'dashed',
          borderColor: '#E88FAA',
          color: '#C06080',
          background: 'transparent',
          fontSize: 12,
        }}
        onClick={onAdd}
      >
        + 대체 메뉴 추가
      </button>
    </div>
  )
}
