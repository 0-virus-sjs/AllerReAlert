import { describe, it, expect } from 'vitest'
import { detectAllergenCodes } from '../tagging.service'

describe('detectAllergenCodes — 식약처 19종', () => {
  // ── 단일 알레르기 ──────────────────────────────────────────

  it('1 난류: 달걀볶음밥 → [1]', () => {
    expect(detectAllergenCodes('달걀볶음밥')).toContain(1)
  })

  it('1 난류: 계란찜 → [1]', () => {
    expect(detectAllergenCodes('계란찜')).toContain(1)
  })

  it('2 우유: 치즈돈까스 → [2]', () => {
    expect(detectAllergenCodes('치즈돈까스')).toContain(2)
  })

  it('2 우유: 우유급식 → [2]', () => {
    expect(detectAllergenCodes('우유급식')).toContain(2)
  })

  it('3 메밀: 메밀국수 → [3]', () => {
    expect(detectAllergenCodes('메밀국수')).toContain(3)
  })

  it('4 땅콩: 땅콩소스 → [4]', () => {
    expect(detectAllergenCodes('땅콩소스닭강정')).toContain(4)
  })

  it('5 대두: 된장찌개 → [5]', () => {
    expect(detectAllergenCodes('된장찌개')).toContain(5)
  })

  it('5 대두: 두부조림 → [5]', () => {
    expect(detectAllergenCodes('두부조림')).toContain(5)
  })

  it('5 대두: 콩나물국 → [5]', () => {
    expect(detectAllergenCodes('콩나물국')).toContain(5)
  })

  it('6 밀: 라면 → [6]', () => {
    expect(detectAllergenCodes('라면')).toContain(6)
  })

  it('6 밀: 칼국수 → [6]', () => {
    expect(detectAllergenCodes('칼국수')).toContain(6)
  })

  it('6 밀: 새우튀김 → [6, 9]', () => {
    const codes = detectAllergenCodes('새우튀김')
    expect(codes).toContain(6)
    expect(codes).toContain(9)
  })

  it('7 고등어: 고등어구이 → [7]', () => {
    expect(detectAllergenCodes('고등어구이')).toContain(7)
  })

  it('8 게: 꽃게탕 → [8]', () => {
    expect(detectAllergenCodes('꽃게탕')).toContain(8)
  })

  it('9 새우: 새우볶음 → [9]', () => {
    expect(detectAllergenCodes('새우볶음')).toContain(9)
  })

  it('10 돼지고기: 제육볶음 → [10]', () => {
    expect(detectAllergenCodes('제육볶음')).toContain(10)
  })

  it('10 돼지고기: 삼겹살구이 → [10]', () => {
    expect(detectAllergenCodes('삼겹살구이')).toContain(10)
  })

  it('11 복숭아: 복숭아주스 → [11]', () => {
    expect(detectAllergenCodes('복숭아주스')).toContain(11)
  })

  it('12 토마토: 토마토스파게티 → [12, 6]', () => {
    const codes = detectAllergenCodes('토마토스파게티')
    expect(codes).toContain(12)
    expect(codes).toContain(6)
  })

  it('14 호두: 호두과자 → [14]', () => {
    expect(detectAllergenCodes('호두과자')).toContain(14)
  })

  it('15 닭고기: 닭갈비 → [15]', () => {
    expect(detectAllergenCodes('닭갈비')).toContain(15)
  })

  it('15 닭고기: 삼계탕 → [15]', () => {
    expect(detectAllergenCodes('삼계탕')).toContain(15)
  })

  it('16 쇠고기: 쇠고기미역국 → [16]', () => {
    expect(detectAllergenCodes('쇠고기미역국')).toContain(16)
  })

  it('16 쇠고기: 불고기 → [16]', () => {
    expect(detectAllergenCodes('불고기')).toContain(16)
  })

  it('17 오징어: 오징어볶음 → [17]', () => {
    expect(detectAllergenCodes('오징어볶음')).toContain(17)
  })

  it('18 조개류: 바지락칼국수 → [18, 6]', () => {
    const codes = detectAllergenCodes('바지락칼국수')
    expect(codes).toContain(18)
    expect(codes).toContain(6)
  })

  it('19 잣: 잣죽 → [19]', () => {
    expect(detectAllergenCodes('잣죽')).toContain(19)
  })

  // ── 복합 알레르기 ──────────────────────────────────────────

  it('복합: 쇠고기된장국 → [5, 16]', () => {
    const codes = detectAllergenCodes('쇠고기된장국')
    expect(codes).toContain(5)
    expect(codes).toContain(16)
  })

  it('복합: 치즈돈까스 → [2, 6, 10]', () => {
    const codes = detectAllergenCodes('치즈돈까스')
    expect(codes).toContain(2)  // 치즈(우유)
    expect(codes).toContain(6)  // 돈까스(밀)
    expect(codes).toContain(10) // 돼지
  })

  // ── 알레르기 없음 ──────────────────────────────────────────

  it('알레르기 없음: 흰쌀밥 → []', () => {
    expect(detectAllergenCodes('흰쌀밥')).toHaveLength(0)
  })

  it('알레르기 없음: 깍두기 → []', () => {
    expect(detectAllergenCodes('깍두기')).toHaveLength(0)
  })

  it('알레르기 없음: 미역국 → []', () => {
    // 쇠고기 없는 미역국
    expect(detectAllergenCodes('미역국')).toHaveLength(0)
  })

  it('빈 문자열 → []', () => {
    expect(detectAllergenCodes('')).toHaveLength(0)
  })
})

// ── T-133: 식재료 OR 매핑 ─────────────────────────────────────────────────────
describe('detectAllergenCodes — 식재료 OR 매핑', () => {
  it('메뉴명에 없어도 식재료에 있으면 태깅 — "채소볶음" + "달걀,간장" → [1]', () => {
    const combined = '채소볶음 달걀,간장'
    expect(detectAllergenCodes(combined)).toContain(1)
  })

  it('메뉴명에 있으면 식재료 없어도 태깅 — "달걀말이" + "" → [1]', () => {
    expect(detectAllergenCodes('달걀말이')).toContain(1)
  })

  it('메뉴명+식재료 모두 감지 시 합집합 반환 — "된장국" + "두부,쇠고기" → [5, 16]', () => {
    const combined = '된장국 두부,쇠고기'
    const codes = detectAllergenCodes(combined)
    expect(codes).toContain(5)   // 된장(대두) + 두부(대두)
    expect(codes).toContain(16)  // 쇠고기
  })

  it('메뉴명+식재료 모두 무해하면 [] — "채소볶음" + "시금치,당근" → []', () => {
    const combined = '채소볶음 시금치,당근'
    expect(detectAllergenCodes(combined)).toHaveLength(0)
  })
})
