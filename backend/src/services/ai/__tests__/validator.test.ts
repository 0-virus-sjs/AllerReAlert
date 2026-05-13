import { describe, it, expect, vi } from 'vitest'
import { validateAlternate, validateMealPlan } from '../validator'
import type { AIProvider, AIMessage, AIUsage } from '../provider'

const MOCK_USAGE: AIUsage = { inputTokens: 10, outputTokens: 10 }

// 유효한 AlternateOutput JSON
const VALID_RESPONSE = JSON.stringify({
  candidates: [
    { name: '두부조림', category: 'side', calories: 150, nutrients: null, allergenCodes: [5], reason: '대두 포함이지만 테스트' },
    { name: '나물무침', category: 'side', calories: 80,  nutrients: null, allergenCodes: [],  reason: '알레르기 없음' },
  ],
})

// 알레르기 누설이 있는 응답
const LEAK_RESPONSE = JSON.stringify({
  candidates: [
    { name: '계란찜', category: 'side', calories: 120, nutrients: null, allergenCodes: [1], reason: '난류 포함' },
  ],
})

function makeProvider(responses: string[]): AIProvider {
  let i = 0
  return {
    name: 'mock',
    complete: vi.fn(async (_msgs: AIMessage[]) => ({
      content: responses[Math.min(i++, responses.length - 1)],
      usage: MOCK_USAGE,
    })),
  }
}

describe('validateAlternate — T-063 재요청 + 알레르기 누설 검증', () => {
  it('첫 번째 응답이 유효하면 즉시 반환', async () => {
    const provider = makeProvider([VALID_RESPONSE])
    const result = await validateAlternate(
      [{ role: 'user', content: '대체 식단 제안' }],
      provider,
      [],  // 제외 알레르기 없음
    )
    expect(result.candidates).toHaveLength(2)
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('JSON 파싱 실패 후 재요청 → 성공', async () => {
    const provider = makeProvider(['not-json', VALID_RESPONSE])
    const result = await validateAlternate(
      [{ role: 'user', content: '대체 식단 제안' }],
      provider,
      [],
    )
    expect(result.candidates).toHaveLength(2)
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('알레르기 누설 감지 → 재요청 → 누설 없는 응답 성공', async () => {
    const safeResponse = JSON.stringify({
      candidates: [
        { name: '나물무침', category: 'side', calories: 80, nutrients: null, allergenCodes: [], reason: '안전' },
      ],
    })
    const provider = makeProvider([LEAK_RESPONSE, safeResponse])

    const result = await validateAlternate(
      [{ role: 'user', content: '대체 식단' }],
      provider,
      [1],  // 난류 제외
    )

    expect(result.candidates[0].name).toBe('나물무침')
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('maxRetries(2) 초과 시 에러 throw', async () => {
    // 3번 모두 JSON 실패
    const provider = makeProvider(['bad', 'bad', 'bad'])
    await expect(
      validateAlternate([{ role: 'user', content: '대체 식단' }], provider, [])
    ).rejects.toThrow()
    expect(provider.complete).toHaveBeenCalledTimes(3)
  })

  it('알레르기 누설이 계속 발생하면 최대 횟수 후 에러', async () => {
    const provider = makeProvider([LEAK_RESPONSE, LEAK_RESPONSE, LEAK_RESPONSE])
    await expect(
      validateAlternate([{ role: 'user', content: '대체 식단' }], provider, [1])
    ).rejects.toThrow('후처리 검증 실패')
    expect(provider.complete).toHaveBeenCalledTimes(3)
  })
})

// ── validateMealPlan — 영양 기준 검증 ─────────────────────

const VALID_MEAL_PLAN = JSON.stringify({
  mealPlan: [
    {
      date: '2026-05-07',
      items: [
        { name: '현미밥',  category: 'rice',   calories: 300, nutrients: { carbs: 60, protein: 6,  fat: 2  }, allergenCodes: [] },
        { name: '미역국',  category: 'soup',   calories: 50,  nutrients: { carbs: 3,  protein: 2,  fat: 1  }, allergenCodes: [] },
        { name: '두부조림',category: 'side',   calories: 150, nutrients: { carbs: 5,  protein: 12, fat: 7  }, allergenCodes: [5] },
        { name: '사과',    category: 'dessert',calories: 100, nutrients: { carbs: 25, protein: 0,  fat: 0  }, allergenCodes: [] },
      ],
    },
  ],
})

describe('validateMealPlan — T-063 영양 기준 검증', () => {
  it('영양 기준 없으면 즉시 반환', async () => {
    const provider = makeProvider([VALID_MEAL_PLAN])
    const result = await validateMealPlan([{ role: 'user', content: '식단 생성' }], provider)
    expect(result.mealPlan).toHaveLength(1)
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('칼로리 범위 내이면 통과', async () => {
    const provider = makeProvider([VALID_MEAL_PLAN])
    const result = await validateMealPlan(
      [{ role: 'user', content: '식단 생성' }],
      provider,
      { calorieMin: 400, calorieMax: 800 },
    )
    expect(result.mealPlan[0].date).toBe('2026-05-07')
  })

  it('칼로리 미달이면 재요청 후 통과', async () => {
    const lowCalPlan = JSON.stringify({
      mealPlan: [{ date: '2026-05-07', items: [
        { name: '밥', category: 'rice', calories: 100, nutrients: null, allergenCodes: [] },
      ] }],
    })
    const provider = makeProvider([lowCalPlan, VALID_MEAL_PLAN])
    const result = await validateMealPlan(
      [{ role: 'user', content: '식단 생성' }],
      provider,
      { calorieMin: 500 },
    )
    expect(result.mealPlan[0].items.length).toBeGreaterThan(1)
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('칼로리 초과이면 재요청 후 통과', async () => {
    const highCalPlan = JSON.stringify({
      mealPlan: [{ date: '2026-05-07', items: [
        { name: '기름밥', category: 'rice', calories: 1500, nutrients: null, allergenCodes: [] },
      ] }],
    })
    const provider = makeProvider([highCalPlan, VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단 생성' }],
      provider,
      { calorieMax: 800 },
    )
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('단백질 미달이면 재요청 후 통과', async () => {
    const lowProteinPlan = JSON.stringify({
      mealPlan: [{ date: '2026-05-07', items: [
        { name: '흰밥', category: 'rice', calories: 300, nutrients: { carbs: 70, protein: 5, fat: 0 }, allergenCodes: [] },
      ] }],
    })
    const provider = makeProvider([lowProteinPlan, VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단 생성' }],
      provider,
      { proteinMin: 20 },
    )
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('Zod 스키마 오류 → 재요청 → 성공', async () => {
    const badPlan = JSON.stringify({ mealPlan: [{ date: 'not-a-date', items: [] }] })
    const provider = makeProvider([badPlan, VALID_MEAL_PLAN])
    const result = await validateMealPlan([{ role: 'user', content: '식단 생성' }], provider)
    expect(result.mealPlan).toHaveLength(1)
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })
})

// ── validateMealPlan — T-130 주 단위 영양소 검증 ──────────

// VALID_MEAL_PLAN 합계: calories=600, carbs=93g, protein=20g, fat=10g
// carbs 에너지 비율: 93*4/600 = 62%  protein: 20*4/600 = 13.3%

describe('validateMealPlan — T-130 주 단위 영양소 검증', () => {
  it('absolute 모드 — 주간 합계 ±10% 이내이면 통과', async () => {
    // target=600, actual=600 → diff=0 ✓
    const provider = makeProvider([VALID_MEAL_PLAN])
    const result = await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'calories', label: '칼로리', target: 600, unit: 'kcal', mode: 'absolute' }] },
    )
    expect(result.mealPlan).toHaveLength(1)
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('absolute 모드 — 주간 합계 범위 초과 시 재요청 → 성공', async () => {
    // 100 kcal vs target 650: |100-650|=550 > 65 → 재요청
    const lowCalPlan = JSON.stringify({
      mealPlan: [{ date: '2026-05-07', items: [
        { name: '밥', category: 'rice', calories: 100, nutrients: null, allergenCodes: [] },
      ]}],
    })
    const provider = makeProvider([lowCalPlan, VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'calories', label: '칼로리', target: 650, unit: 'kcal', mode: 'absolute' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('carbohydrate absolute 모드 통과', async () => {
    // carbs=93g, target=93 → diff=0 ✓
    const provider = makeProvider([VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'carbohydrate', label: '탄수화물', target: 93, unit: 'g', mode: 'absolute' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('protein absolute 모드 통과', async () => {
    const provider = makeProvider([VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'protein', label: '단백질', target: 20, unit: 'g', mode: 'absolute' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('fat absolute 모드 통과', async () => {
    const provider = makeProvider([VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'fat', label: '지방', target: 10, unit: 'g', mode: 'absolute' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('percent_of_energy 모드 — 탄수화물 비율 ±10% 이내이면 통과', async () => {
    // carbs=93g, calories=600 → 93*4/600=62%  target=60%, tolerance=6% → |2|<6 ✓
    const provider = makeProvider([VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'carbohydrate', label: '탄수화물', target: 60, unit: '%', mode: 'percent_of_energy' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('percent_of_energy 모드 — 지방 비율 fat(9kcal/g) 범위 초과 시 재요청', async () => {
    // lowFatPlan: fat=3g, calories=600 → 3*9/600=4.5%
    // target=15%, tolerance=1.5% → |4.5-15|=10.5 > 1.5 → 재요청
    // VALID_MEAL_PLAN retry: fat=10g, calories=600 → 15% → |15-15|=0 < 1.5 → 통과
    const lowFatPlan = JSON.stringify({
      mealPlan: [{ date: '2026-05-07', items: [
        { name: '현미밥', category: 'rice', calories: 600,
          nutrients: { carbs: 90, protein: 30, fat: 3 }, allergenCodes: [] },
      ]}],
    })
    const provider = makeProvider([lowFatPlan, VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'fat', label: '지방', target: 15, unit: '%', mode: 'percent_of_energy' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('percent_of_energy 모드 — 탄수화물 비율 범위 초과 시 재요청', async () => {
    // carbs=3g, calories=600 → 3*4/600=2%  target=60%, tolerance=6% → 재요청
    const lowCarbPlan = JSON.stringify({
      mealPlan: [{ date: '2026-05-07', items: [
        { name: '고기볶음', category: 'side', calories: 600,
          nutrients: { carbs: 3, protein: 40, fat: 35 }, allergenCodes: [16] },
      ]}],
    })
    const provider = makeProvider([lowCarbPlan, VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'carbohydrate', label: '탄수화물', target: 60, unit: '%', mode: 'percent_of_energy' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(2)
  })

  it('extractor 없는 키(calcium)는 주 단위 검증 스킵 → 통과', async () => {
    const provider = makeProvider([VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'calcium', label: '칼슘', target: 300, unit: 'mg', mode: 'absolute' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('nutrients 빈 배열이면 검증 없이 통과', async () => {
    const provider = makeProvider([VALID_MEAL_PLAN])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })

  it('AI가 calories=null 제공 시 weekSum=0 → 검증 스킵', async () => {
    const nullCalPlan = JSON.stringify({
      mealPlan: [{ date: '2026-05-07', items: [
        { name: '밥', category: 'rice', calories: null, nutrients: null, allergenCodes: [] },
      ]}],
    })
    const provider = makeProvider([nullCalPlan])
    await validateMealPlan(
      [{ role: 'user', content: '식단' }],
      provider,
      { nutrients: [{ key: 'calories', label: '칼로리', target: 600, unit: 'kcal', mode: 'absolute' }] },
    )
    expect(provider.complete).toHaveBeenCalledTimes(1)
  })
})
