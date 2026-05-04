// PRD §7.1 알레르기 대조 엔진 — 순수 함수 레이어
// DB 의존 없이 단위 테스트 가능하도록 설계

export interface MealAllergenEntry {
  allergenId: string
  allergenCode: number
  allergenName: string
}

export interface MealItemSnapshot {
  id: string
  name: string
  allergens: MealAllergenEntry[]
}

export interface UserAllergenEntry {
  allergenId: string
  status: 'pending' | 'confirmed' | 'rejected'
}

export interface UserSnapshot {
  userId: string
  orgId: string
  role: string
  allergens: UserAllergenEntry[]
}

export interface MatchedItem {
  mealItemId: string
  mealItemName: string
  matchedAllergens: MealAllergenEntry[]
}

export interface MatchResult {
  userId: string
  orgId: string
  matchedItems: MatchedItem[]
}

/**
 * PRD §7.1 핵심 알고리즘 — 순수 함수
 *
 * 1. meal_allergens 집합 구성
 * 2. confirmed UserAllergen 집합과 교집합 계산
 * 3. matched가 있는 사용자 추출
 *
 * confirmed 상태가 아닌 알레르기는 대조에서 제외한다.
 */
export function matchAllergens(
  mealItems: MealItemSnapshot[],
  users: UserSnapshot[]
): MatchResult[] {
  if (mealItems.length === 0 || users.length === 0) return []

  // 전체 식단의 allergenId 집합
  const mealAllergenIds = new Set<string>()
  for (const item of mealItems) {
    for (const a of item.allergens) {
      mealAllergenIds.add(a.allergenId)
    }
  }

  if (mealAllergenIds.size === 0) return []

  const results: MatchResult[] = []

  for (const user of users) {
    // confirmed 알레르기만 대조
    const confirmedIds = new Set(
      user.allergens
        .filter((a) => a.status === 'confirmed')
        .map((a) => a.allergenId)
    )
    if (confirmedIds.size === 0) continue

    // 식단 × 사용자 알레르기 교집합
    const matchedItems: MatchedItem[] = []

    for (const item of mealItems) {
      const matched = item.allergens.filter((a) => confirmedIds.has(a.allergenId))
      if (matched.length > 0) {
        matchedItems.push({
          mealItemId: item.id,
          mealItemName: item.name,
          matchedAllergens: matched,
        })
      }
    }

    if (matchedItems.length > 0) {
      results.push({ userId: user.userId, orgId: user.orgId, matchedItems })
    }
  }

  return results
}

/**
 * 단일 사용자에 대한 식단 위험도 체크 (T-035 allergen-check에서도 활용)
 */
export function isMealDangerousForUser(
  mealItems: MealItemSnapshot[],
  userAllergenIds: Set<string>
): boolean {
  if (userAllergenIds.size === 0) return false
  return mealItems.some((item) =>
    item.allergens.some((a) => userAllergenIds.has(a.allergenId))
  )
}
