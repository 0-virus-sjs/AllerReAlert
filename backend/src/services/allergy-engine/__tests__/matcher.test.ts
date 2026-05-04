import { describe, it, expect } from 'vitest'
import { matchAllergens, isMealDangerousForUser, type MealItemSnapshot, type UserSnapshot } from '../matcher'

// ── 픽스처 ──────────────────────────────────────────────
const egg   = { allergenId: 'a1', allergenCode: 1, allergenName: '난류' }
const milk  = { allergenId: 'a2', allergenCode: 2, allergenName: '우유' }
const wheat = { allergenId: 'a6', allergenCode: 6, allergenName: '밀' }
const pork  = { allergenId: 'a10', allergenCode: 10, allergenName: '돼지고기' }

const rice:  MealItemSnapshot = { id: 'i1', name: '흰쌀밥',       allergens: [] }
const soup:  MealItemSnapshot = { id: 'i2', name: '미역국',       allergens: [milk] }
const bread: MealItemSnapshot = { id: 'i3', name: '통밀빵',       allergens: [wheat, egg] }
const porkR: MealItemSnapshot = { id: 'i4', name: '제육볶음',     allergens: [pork] }
const pasta: MealItemSnapshot = { id: 'i5', name: '크림파스타',   allergens: [wheat, milk, egg] }

function makeUser(userId: string, confirmedIds: string[], extraPending: string[] = []): UserSnapshot {
  return {
    userId,
    orgId: 'org1',
    role: 'student',
    allergens: [
      ...confirmedIds.map((id) => ({ allergenId: id, status: 'confirmed' as const })),
      ...extraPending.map((id) => ({ allergenId: id, status: 'pending' as const })),
    ],
  }
}

// ── matchAllergens ───────────────────────────────────────

describe('matchAllergens — 기본 동작', () => {
  it('식단이 비어 있으면 빈 배열 반환', () => {
    const user = makeUser('u1', ['a1'])
    expect(matchAllergens([], [user])).toEqual([])
  })

  it('사용자 목록이 비어 있으면 빈 배열 반환', () => {
    expect(matchAllergens([rice, soup], [])).toEqual([])
  })

  it('식단에 알레르기 태그가 없으면 빈 배열 반환', () => {
    const user = makeUser('u1', ['a1'])
    expect(matchAllergens([rice], [user])).toEqual([])
  })

  it('사용자에게 confirmed 알레르기가 없으면 제외', () => {
    const user = makeUser('u1', [])
    expect(matchAllergens([soup], [user])).toEqual([])
  })
})

describe('matchAllergens — 매칭 정확성', () => {
  it('단일 사용자·단일 메뉴·단일 알레르기 매칭', () => {
    const user = makeUser('u1', ['a2'])   // 우유 알레르기
    const result = matchAllergens([soup], [user])
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe('u1')
    expect(result[0].matchedItems).toHaveLength(1)
    expect(result[0].matchedItems[0].mealItemId).toBe('i2')
    expect(result[0].matchedItems[0].matchedAllergens[0].allergenCode).toBe(2)
  })

  it('사용자 알레르기가 식단에 없으면 제외', () => {
    const user = makeUser('u1', ['a4'])   // 땅콩 — 식단에 없음
    expect(matchAllergens([soup, bread], [user])).toEqual([])
  })

  it('복수 메뉴가 위험한 경우 모두 포함', () => {
    const user = makeUser('u1', ['a2', 'a6'])  // 우유 + 밀
    const result = matchAllergens([soup, bread, rice], [user])
    expect(result[0].matchedItems).toHaveLength(2)
    const itemIds = result[0].matchedItems.map((i) => i.mealItemId)
    expect(itemIds).toContain('i2')
    expect(itemIds).toContain('i3')
  })

  it('한 메뉴에 여러 알레르기가 매칭되면 모두 포함', () => {
    const user = makeUser('u1', ['a6', 'a2', 'a1'])  // 밀 + 우유 + 난류
    const result = matchAllergens([pasta], [user])
    expect(result[0].matchedItems[0].matchedAllergens).toHaveLength(3)
  })
})

describe('matchAllergens — 다중 사용자', () => {
  it('매칭 사용자만 결과에 포함', () => {
    const eggUser  = makeUser('u1', ['a1'])
    const safeUser = makeUser('u2', ['a4'])  // 땅콩 — 식단에 없음
    const result = matchAllergens([soup, bread], [eggUser, safeUser])
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe('u1')
  })

  it('두 사용자 모두 매칭', () => {
    const u1 = makeUser('u1', ['a2'])   // 우유
    const u2 = makeUser('u2', ['a6'])   // 밀
    const result = matchAllergens([soup, bread], [u1, u2])
    expect(result).toHaveLength(2)
  })

  it('서로 다른 메뉴가 위험한 경우 각자 정확히 분리', () => {
    const u1 = makeUser('u1', ['a2'])   // 우유 → soup 위험
    const u2 = makeUser('u2', ['a10'])  // 돼지고기 → porkR 위험
    const result = matchAllergens([soup, porkR], [u1, u2])
    const r1 = result.find((r) => r.userId === 'u1')!
    const r2 = result.find((r) => r.userId === 'u2')!
    expect(r1.matchedItems[0].mealItemId).toBe('i2')
    expect(r2.matchedItems[0].mealItemId).toBe('i4')
  })
})

describe('matchAllergens — pending/rejected 알레르기 제외', () => {
  it('pending 알레르기만 있는 사용자는 제외', () => {
    const user: UserSnapshot = {
      userId: 'u1', orgId: 'org1', role: 'student',
      allergens: [{ allergenId: 'a2', status: 'pending' }],
    }
    expect(matchAllergens([soup], [user])).toEqual([])
  })

  it('rejected 알레르기는 대조에서 제외', () => {
    const user: UserSnapshot = {
      userId: 'u1', orgId: 'org1', role: 'student',
      allergens: [{ allergenId: 'a2', status: 'rejected' }],
    }
    expect(matchAllergens([soup], [user])).toEqual([])
  })

  it('pending + confirmed 혼합 — confirmed만 대조', () => {
    const user = makeUser('u1', ['a2'], ['a1'])  // 우유 confirmed, 난류 pending
    const result = matchAllergens([soup, bread], [user])
    // 난류 pending이므로 bread는 매칭 안 됨 (soup만 매칭)
    const matched = result[0].matchedItems
    expect(matched).toHaveLength(1)
    expect(matched[0].mealItemId).toBe('i2')
    expect(matched[0].matchedAllergens.every((a) => a.allergenCode === 2)).toBe(true)
  })
})

describe('matchAllergens — orgId 전달', () => {
  it('결과에 orgId가 포함된다', () => {
    const user = makeUser('u1', ['a2'])
    const result = matchAllergens([soup], [user])
    expect(result[0].orgId).toBe('org1')
  })
})

// ── isMealDangerousForUser ───────────────────────────────

describe('isMealDangerousForUser', () => {
  it('사용자 알레르기 집합이 비면 false', () => {
    expect(isMealDangerousForUser([soup], new Set())).toBe(false)
  })

  it('식단에 알레르기 없으면 false', () => {
    expect(isMealDangerousForUser([rice], new Set(['a2']))).toBe(false)
  })

  it('일치하는 알레르기가 있으면 true', () => {
    expect(isMealDangerousForUser([soup], new Set(['a2']))).toBe(true)
  })

  it('빈 식단이면 false', () => {
    expect(isMealDangerousForUser([], new Set(['a2']))).toBe(false)
  })

  it('여러 메뉴 중 하나라도 매칭되면 true', () => {
    expect(isMealDangerousForUser([rice, soup], new Set(['a2']))).toBe(true)
  })
})
