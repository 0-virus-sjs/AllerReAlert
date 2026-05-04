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
  onEdit: () => void
  onDelete: () => void
}

export function MealItemRow({ item, allergens, onEdit, onDelete }: Props) {
  const hasAllergen = allergens.length > 0

  return (
    <div
      className="d-flex align-items-center gap-2 px-3 py-2 rounded"
      style={{
        background: '#FAFEFF',
        border: `1px solid ${hasAllergen ? '#E88FAA' : '#E0DBD4'}`,
        minHeight: 36,
      }}
    >
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

      {allergens.map((a) => (
        <span
          key={a.allergen.id}
          style={{
            background: '#FDDDE8',
            border: '1px solid #E06080',
            color: '#C04060',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 10,
            flexShrink: 0,
          }}
        >
          {a.allergen.name}
        </span>
      ))}

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
  )
}
