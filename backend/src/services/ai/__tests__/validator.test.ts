import { describe, it, expect, vi } from 'vitest'
import { validateAlternate } from '../validator'
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
    // 3번 모두 난류 포함
    const provider = makeProvider([LEAK_RESPONSE, LEAK_RESPONSE, LEAK_RESPONSE])
    await expect(
      validateAlternate([{ role: 'user', content: '대체 식단' }], provider, [1])
    ).rejects.toThrow('후처리 검증 실패')
    expect(provider.complete).toHaveBeenCalledTimes(3)
  })
})
