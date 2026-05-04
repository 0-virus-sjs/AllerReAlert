import { AllergenBadge } from './AllergenBadge'
import type { MealAllergenEntry } from '../../types/meal'

interface Props {
  allergens: MealAllergenEntry[]
  /** 이 코드에 해당하면 위험 강조 */
  userAllergenCodes?: number[]
  size?: 'sm' | 'md'
  /** 최대 표시 수 (초과 시 +N 표시) */
  maxVisible?: number
}

export function AllergenList({ allergens, userAllergenCodes = [], size = 'sm', maxVisible }: Props) {
  if (allergens.length === 0) return <span className="text-muted" style={{ fontSize: '0.7rem' }}>없음</span>

  const visible = maxVisible ? allergens.slice(0, maxVisible) : allergens
  const overflow = maxVisible && allergens.length > maxVisible ? allergens.length - maxVisible : 0

  return (
    <span className="d-inline-flex flex-wrap align-items-center gap-1">
      {visible.map(({ allergen, isAutoTagged }) => (
        <AllergenBadge
          key={allergen.id}
          allergen={allergen}
          dangerous={userAllergenCodes.includes(allergen.code)}
          autoTagged={isAutoTagged}
          size={size}
        />
      ))}
      {overflow > 0 && (
        <span className="text-muted" style={{ fontSize: '0.65rem' }}>+{overflow}</span>
      )}
    </span>
  )
}
