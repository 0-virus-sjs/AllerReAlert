import { describe, it, expect } from 'vitest'
import { checkAllergenLeak, type AlternateCandidateOutput } from '../alternate-builder'

function makeCandidate(
  name: string,
  allergenCodes: number[],
): AlternateCandidateOutput {
  return {
    name,
    category: 'side',
    calories: 200,
    nutrients: null,
    allergenCodes,
    reason: '테스트',
  }
}

describe('checkAllergenLeak — PRD §11.3 알레르기 누설 검증', () => {
  it('누설 없음 — 제외 알레르기가 후보에 없으면 hasLeak=false', () => {
    const candidates = [
      makeCandidate('흰쌀밥', []),
      makeCandidate('미역국', []),
    ]
    const result = checkAllergenLeak(candidates, [1, 2]) // 난류·우유 제외
    expect(result.hasLeak).toBe(false)
    expect(result.leakedCandidates).toHaveLength(0)
  })

  it('allergenCodes 배열에서 누설 감지', () => {
    const candidates = [
      makeCandidate('계란찜', [1]),   // 난류 포함 — 누설
      makeCandidate('흰쌀밥', []),
    ]
    const result = checkAllergenLeak(candidates, [1])  // 난류 제외
    expect(result.hasLeak).toBe(true)
    expect(result.leakedCandidates).toHaveLength(1)
    expect(result.leakedCandidates[0].name).toBe('계란찜')
    expect(result.leakedCandidates[0].leakedCodes).toContain(1)
  })

  it('메뉴명 키워드에서 누설 감지 (AI가 allergenCodes 누락한 경우)', () => {
    // allergenCodes=[] 이지만 메뉴명에 "달걀" 포함
    const candidates = [makeCandidate('달걀볶음밥', [])]
    const result = checkAllergenLeak(candidates, [1])   // 난류(달걀) 제외
    expect(result.hasLeak).toBe(true)
    expect(result.leakedCandidates[0].leakedCodes).toContain(1)
  })

  it('복수 후보 중 일부만 누설', () => {
    const candidates = [
      makeCandidate('두부조림', [5]),  // 대두 — 누설
      makeCandidate('나물무침', []),
      makeCandidate('닭갈비', [15]),   // 닭고기 — 누설
    ]
    const result = checkAllergenLeak(candidates, [5, 15])
    expect(result.hasLeak).toBe(true)
    expect(result.leakedCandidates).toHaveLength(2)
  })

  it('제외 알레르기 목록이 비면 항상 hasLeak=false', () => {
    const candidates = [makeCandidate('계란찜', [1, 2])]
    const result = checkAllergenLeak(candidates, [])
    expect(result.hasLeak).toBe(false)
  })

  it('후보 목록이 비면 hasLeak=false', () => {
    const result = checkAllergenLeak([], [1, 2, 3])
    expect(result.hasLeak).toBe(false)
  })

  it('allergenCodes + 메뉴명 양쪽에서 동일 코드 감지 시 중복 없이 반환', () => {
    // 코드 1(난류)이 allergenCodes에도 있고 메뉴명 "달걀"에서도 감지됨
    const candidates = [makeCandidate('달걀찜', [1])]
    const result = checkAllergenLeak(candidates, [1])
    // leakedCodes에 1이 한 번만 있어야 함
    const leaked = result.leakedCandidates[0].leakedCodes
    expect(leaked.filter((c) => c === 1)).toHaveLength(1)
  })
})
