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
