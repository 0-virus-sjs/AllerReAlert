import type { MealItemCategory } from '@prisma/client'

/**
 * T-128: 정적 키워드→단가 fallback 테이블
 *
 * NEIS mealServiceDietInfo 응답에 단가 필드가 존재하지 않아 실질적으로 메인 단가 출처.
 * 단위: 원/1식. 한국 학교급식 평균을 근사한 값으로, 절대값보다 카테고리별 상대 비율이 더 의미가 있다.
 * 추후 운영 데이터(예: 영양사 입력)로 보정 가능.
 */

export const CATEGORY_BASE_PRICE: Record<MealItemCategory, number> = {
  rice:    500,
  soup:    800,
  side:    1500,
  dessert: 300,
}

interface KeywordPriceRow {
  keyword:  string
  category: MealItemCategory
  price:    number
}

export const KEYWORD_PRICES: KeywordPriceRow[] = [
  // ── 밥류 (rice) ──────────────────────────────────────────
  { keyword: '백미밥',   category: 'rice', price: 450 },
  { keyword: '잡곡밥',   category: 'rice', price: 500 },
  { keyword: '현미밥',   category: 'rice', price: 550 },
  { keyword: '콩나물밥', category: 'rice', price: 700 },
  { keyword: '볶음밥',   category: 'rice', price: 900 },
  { keyword: '비빔밥',   category: 'rice', price: 1300 },
  { keyword: '주먹밥',   category: 'rice', price: 800 },
  { keyword: '카레라이스', category: 'rice', price: 1500 },

  // ── 국·탕·찌개 (soup) ────────────────────────────────────
  { keyword: '미역국',     category: 'soup', price: 700 },
  { keyword: '된장국',     category: 'soup', price: 700 },
  { keyword: '김치찌개',   category: 'soup', price: 1100 },
  { keyword: '된장찌개',   category: 'soup', price: 900 },
  { keyword: '북엇국',     category: 'soup', price: 1000 },
  { keyword: '갈비탕',     category: 'soup', price: 2500 },
  { keyword: '닭곰탕',     category: 'soup', price: 2000 },
  { keyword: '육개장',     category: 'soup', price: 1800 },
  { keyword: '떡국',       category: 'soup', price: 1200 },
  { keyword: '계란국',     category: 'soup', price: 700 },

  // ── 반찬 (side) ──────────────────────────────────────────
  { keyword: '돈가스',     category: 'side', price: 1800 },
  { keyword: '돈까스',     category: 'side', price: 1800 },
  { keyword: '제육볶음',   category: 'side', price: 1800 },
  { keyword: '불고기',     category: 'side', price: 2200 },
  { keyword: '닭강정',     category: 'side', price: 2000 },
  { keyword: '치킨',       category: 'side', price: 2200 },
  { keyword: '계란말이',   category: 'side', price: 700 },
  { keyword: '오징어볶음', category: 'side', price: 2000 },
  { keyword: '생선구이',   category: 'side', price: 1700 },
  { keyword: '김치',       category: 'side', price: 300 },
  { keyword: '깍두기',     category: 'side', price: 300 },
  { keyword: '나물',       category: 'side', price: 500 },
  { keyword: '시금치무침', category: 'side', price: 500 },
  { keyword: '두부조림',   category: 'side', price: 800 },
  { keyword: '소시지',     category: 'side', price: 1200 },

  // ── 후식 (dessert) ──────────────────────────────────────
  { keyword: '요거트',   category: 'dessert', price: 500 },
  { keyword: '요구르트', category: 'dessert', price: 400 },
  { keyword: '과일',     category: 'dessert', price: 600 },
  { keyword: '사과',     category: 'dessert', price: 500 },
  { keyword: '바나나',   category: 'dessert', price: 400 },
  { keyword: '쿠키',     category: 'dessert', price: 300 },
  { keyword: '푸딩',     category: 'dessert', price: 400 },
]

// ── 카테고리 추정 보조 룰 ──────────────────────────────────
//   메뉴명이 KEYWORD_PRICES에 매칭되지 않을 때 카테고리만이라도 추정.
//   매칭 안 되면 side 디폴트.

const CATEGORY_SUFFIX_RULES: Array<{ pattern: RegExp; category: MealItemCategory }> = [
  { pattern: /(밥|덮밥|죽)$/,                   category: 'rice' },
  { pattern: /(국|탕|찌개|전골)$/,             category: 'soup' },
  { pattern: /(과일|요거트|요구르트|쿠키|푸딩|케이크|아이스크림)/, category: 'dessert' },
]

export function guessCategory(name: string): MealItemCategory {
  const trimmed = name.trim()
  for (const rule of CATEGORY_SUFFIX_RULES) {
    if (rule.pattern.test(trimmed)) return rule.category
  }
  return 'side'
}

/**
 * 메뉴명에서 KEYWORD_PRICES 매칭. 가장 긴 매칭 키워드 우선.
 * 매칭 없으면 null.
 */
export function findKeywordPrice(name: string): KeywordPriceRow | null {
  const trimmed = name.trim()
  let best: KeywordPriceRow | null = null
  for (const row of KEYWORD_PRICES) {
    if (trimmed.includes(row.keyword)) {
      if (!best || row.keyword.length > best.keyword.length) best = row
    }
  }
  return best
}
