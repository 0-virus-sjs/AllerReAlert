import { Card, Badge } from 'react-bootstrap'
import type { MealPlan } from '../../types/meal'
import { AllergenList } from './AllergenList'

const CATEGORY_LABEL: Record<string, string> = {
  rice: '밥', soup: '국', side: '반찬', dessert: '후식',
}

interface Props {
  mealPlan: MealPlan
  /** 사용자 알레르기 코드 — 위험 메뉴 강조용 */
  userAllergenCodes?: number[]
  onClick?: () => void
  compact?: boolean
}

export function MealCard({ mealPlan, userAllergenCodes = [], onClick, compact = false }: Props) {
  // 사용자 알레르기와 교집합이 있는 아이템 수
  const dangerCount = mealPlan.items.filter((item) =>
    item.allergens.some(({ allergen }) => userAllergenCodes.includes(allergen.code))
  ).length

  const statusBg = mealPlan.status === 'published' ? 'success' : 'secondary'
  const statusLabel = mealPlan.status === 'published' ? '공개' : '초안'

  const dateLabel = new Date(mealPlan.date).toLocaleDateString('ko-KR', {
    month: 'numeric', day: 'numeric', weekday: 'short',
  })

  return (
    <Card
      className={`h-100 ${onClick ? 'cursor-pointer' : ''} ${dangerCount > 0 ? 'border-danger' : ''}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <Card.Header className="d-flex justify-content-between align-items-center py-1 px-2">
        <span className="small fw-semibold">{dateLabel}</span>
        <div className="d-flex gap-1 align-items-center">
          {dangerCount > 0 && (
            <Badge bg="danger" pill title={`알레르기 위험 메뉴 ${dangerCount}건`}>
              ⚠️ {dangerCount}
            </Badge>
          )}
          <Badge bg={statusBg} className="small">{statusLabel}</Badge>
        </div>
      </Card.Header>

      {!compact && (
        <Card.Body className="p-2">
          {mealPlan.items.length === 0 ? (
            <p className="text-muted small mb-0">식단 없음</p>
          ) : (
            <ul className="list-unstyled mb-0">
              {mealPlan.items.map((item) => {
                const isDangerous = item.allergens.some(({ allergen }) =>
                  userAllergenCodes.includes(allergen.code)
                )
                return (
                  <li key={item.id} className={`d-flex flex-column mb-1 ${isDangerous ? 'text-danger fw-semibold' : ''}`}>
                    <div className="d-flex align-items-center gap-1">
                      <span style={{ fontSize: '0.7rem' }} className="text-muted">
                        {CATEGORY_LABEL[item.category]}
                      </span>
                      <span className="small">{item.name}</span>
                      {isDangerous && <span title="알레르기 주의">⚠️</span>}
                    </div>
                    {item.allergens.length > 0 && (
                      <AllergenList
                        allergens={item.allergens}
                        userAllergenCodes={userAllergenCodes}
                        size="sm"
                        maxVisible={5}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card.Body>
      )}
    </Card>
  )
}
