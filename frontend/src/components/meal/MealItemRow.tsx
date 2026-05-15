import type { MealItemInput, MealAllergenEntry, MealItemCategory } from '../../types/meal'

const CATEGORY_LABELS: Record<MealItemCategory, string> = {
  rice: '밥',
  soup: '국',
  side: '반찬',
  dessert: '후식',
}

interface Props {
  item: MealItemInput
  allergens: MealAllergenEntry[]
  conflictAllergenIds?: Set<string>
  onEdit: () => void
  onDelete: () => void
}

export function MealItemRow({ item, allergens, conflictAllergenIds, onEdit, onDelete }: Props) {
  const hasDangerousAllergen = allergens.some((a) => conflictAllergenIds?.has(a.allergen.id))
  const hasAllergen = allergens.length > 0

  return (
    <div
      className="rounded"
      style={{
        background: '#FAFEFF',
        border: `1px solid ${hasDangerousAllergen ? '#E88FAA' : '#E0DBD4'}`,
      }}
    >
      {/* 알레르기 태그 — 메뉴명 위 별도 행 */}
      {hasAllergen && (
        <div className="d-flex flex-wrap gap-1 px-3 pt-2">
          {allergens.map((a) => {
            const isDangerous = conflictAllergenIds?.has(a.allergen.id) ?? false
            return (
              <span
                key={a.allergen.id}
                style={{
                  background: isDangerous ? '#FDDDE8' : '#f0f0f0',
                  border: `1px solid ${isDangerous ? '#E06080' : '#aaa'}`,
                  color: isDangerous ? '#C04060' : '#666',
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                {a.allergen.name}
              </span>
            )
          })}
        </div>
      )}

      {/* 메인 행 */}
      <div className="d-flex align-items-center gap-2 px-3 py-2" style={{ minHeight: 36 }}>
        <span
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: '#888',
            width: 30,
            flexShrink: 0,
          }}
        >
          {CATEGORY_LABELS[item.category]}
        </span>

        <span className="flex-grow-1 small" style={{ color: '#3A3030' }}>
          {item.name}
        </span>

        {item.calories != null && (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#aaa',
              flexShrink: 0,
            }}
          >
            {item.calories}kcal
          </span>
        )}

        <button
          className="btn btn-sm"
          style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0 }}
          onClick={onEdit}
        >
          편집
        </button>
        <button
          className="btn btn-sm"
          style={{ fontSize: 10, padding: '2px 8px', color: '#F97B8B', flexShrink: 0 }}
          onClick={onDelete}
        >
          삭제
        </button>
      </div>
    </div>
  )
}
