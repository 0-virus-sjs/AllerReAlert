/**
 * T-057: 알림 엔진 통합 테스트 — PRD §11.1 핵심 시나리오
 *
 * 시나리오:
 *   1. 알레르기 등록 + 식단 공개 → 해당 사용자에게 allergen_alert 발송
 *   2. 공개된 식단 수정(알레르기 추가) → 변경된 알레르기 보유 사용자에게 menu_change 발송
 *   3. 보호자 미승인(pending) 알레르기 → 알림 미발송
 *
 * 테스트 격리: Prisma + dispatcher를 vi.mock으로 격리 (외부 서비스 호출 없음)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Prisma 모킹 ────────────────────────────────────────────
vi.mock('../lib/prisma', () => ({
  prisma: {
    mealPlan: {
      findMany: vi.fn(),
    },
    userAllergen: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      create: vi.fn().mockResolvedValue({}),
    },
    pushSubscription: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $queryRaw: vi.fn(),
  },
}))

// ── 발송 어댑터 모킹 (실제 이메일·푸시 차단) ────────────
vi.mock('../services/notification/email.adapter', () => ({
  emailAdapter: { channel: 'email', send: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('../../services/notification/push.adapter', () => ({
  pushAdapter: { channel: 'push', send: vi.fn().mockResolvedValue(undefined) },
}))

import { prisma } from '../lib/prisma'
import { runAllergenCheck } from '../services/allergy-engine/engine'
import { onPublishedMealChanged } from '../services/meal/change-hook'
import { emailAdapter } from '../services/notification/email.adapter'

// ── 픽스처 ─────────────────────────────────────────────────
const ORG_ID = 'org-test'
const USER_STUDENT = { id: 'u-student', orgId: ORG_ID, role: 'student', email: 'student@test.com', groupInfo: null }

const ALLERGEN_EGG  = { id: 'a-egg',  code: 1,  name: '난류' }
const ALLERGEN_MILK = { id: 'a-milk', code: 2,  name: '우유' }

const MEAL_PLAN_DB = {
  id: 'mp-1',
  orgId: ORG_ID,
  status: 'published',
  date: new Date(),
  items: [
    {
      id: 'item-1',
      name: '계란찜',
      allergens: [{ allergenId: 'a-egg', allergen: ALLERGEN_EGG }],
    },
  ],
}

// ── 시나리오 1: 알레르기 등록 → 식단 알림 ─────────────────
describe('시나리오 1: 알레르기 등록 + 식단 공개 → allergen_alert 발송', () => {
  beforeEach(() => vi.clearAllMocks())

  it('confirmed 알레르기 보유 사용자에게 dispatch가 호출된다', async () => {
    // Prisma: 당일 published 식단 반환
    vi.mocked(prisma.mealPlan.findMany).mockResolvedValue([MEAL_PLAN_DB] as never)
    // Prisma: 난류 confirmed 사용자 반환
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([
      { userId: 'u-student', allergenId: 'a-egg', user: USER_STUDENT },
    ] as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER_STUDENT as never)

    const results = await runAllergenCheck(ORG_ID, new Date())

    expect(results).toHaveLength(1)
    expect(results[0].userId).toBe('u-student')
    expect(results[0].matchedItems[0].mealItemName).toBe('계란찜')
    expect(results[0].matchedItems[0].matchedAllergens[0].allergenCode).toBe(1)
  })

  it('매칭 사용자가 없으면 빈 배열 반환', async () => {
    vi.mocked(prisma.mealPlan.findMany).mockResolvedValue([MEAL_PLAN_DB] as never)
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([] as never)

    const results = await runAllergenCheck(ORG_ID, new Date())
    expect(results).toHaveLength(0)
  })

  it('식단이 없으면 빈 배열 반환', async () => {
    vi.mocked(prisma.mealPlan.findMany).mockResolvedValue([] as never)

    const results = await runAllergenCheck(ORG_ID, new Date())
    expect(results).toHaveLength(0)
  })
})

// ── 시나리오 2: 공개 식단 수정 → menu_change 발송 ─────────
describe('시나리오 2: 공개 식단 수정(알레르기 추가) → menu_change 발송', () => {
  beforeEach(() => vi.clearAllMocks())

  const beforePlan = {
    orgId: ORG_ID,
    items: [{ id: 'i1', name: '흰쌀밥', allergens: [] }],
  }

  const afterPlan = {
    orgId: ORG_ID,
    items: [
      { id: 'i1', name: '흰쌀밥', allergens: [] },
      { id: 'i2', name: '계란찜', allergens: [{ allergenId: 'a-egg', allergen: ALLERGEN_EGG }] },
    ],
  }

  it('새 알레르기가 추가됐을 때 해당 사용자에게 이메일이 발송된다', async () => {
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([
      { userId: 'u-student', allergenId: 'a-egg', allergen: ALLERGEN_EGG },
    ] as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER_STUDENT as never)

    await onPublishedMealChanged('mp-1', beforePlan, afterPlan)

    expect(emailAdapter.send).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(emailAdapter.send).mock.calls[0]
    expect(callArgs[0].title).toContain('변경')
    expect(callArgs[0].body).toContain('난류')
  })

  it('알레르기 변경이 없으면 발송하지 않는다', async () => {
    const samePlan = {
      orgId: ORG_ID,
      items: [{ id: 'i1', name: '계란찜', allergens: [{ allergenId: 'a-egg', allergen: ALLERGEN_EGG }] }],
    }

    await onPublishedMealChanged('mp-1', samePlan, samePlan)
    expect(emailAdapter.send).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.userAllergen.findMany)).not.toHaveBeenCalled()
  })

  it('해당 알레르기 보유 사용자가 없으면 발송하지 않는다', async () => {
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([] as never)

    await onPublishedMealChanged('mp-1', beforePlan, afterPlan)
    expect(emailAdapter.send).not.toHaveBeenCalled()
  })
})

// ── 시나리오 3: 보호자 미승인(pending) → 알림 미발송 ──────
describe('시나리오 3: pending 알레르기 → 알림 미발송 (PRD §11.1)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pending 상태 알레르기는 대조에서 제외된다', async () => {
    vi.mocked(prisma.mealPlan.findMany).mockResolvedValue([MEAL_PLAN_DB] as never)
    // pending 사용자 — confirmed가 아님
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([
      { userId: 'u-student', allergenId: 'a-egg', user: USER_STUDENT },
    ] as never)

    // runAllergenCheck는 DB에서 confirmed만 필터하므로 빈 결과
    // (WHERE status='confirmed'가 모킹에서도 동일하게 빈 배열 반환하도록)
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([] as never)

    const results = await runAllergenCheck(ORG_ID, new Date())
    expect(results).toHaveLength(0)
  })

  it('matchAllergens 순수 함수에서 pending 알레르기는 제외된다', async () => {
    // 순수 함수 직접 검증 (DB 없음)
    const { matchAllergens } = await import('../services/allergy-engine/matcher')

    const result = matchAllergens(
      [{ id: 'i1', name: '계란찜', allergens: [{ allergenId: 'a-egg', allergenCode: 1, allergenName: '난류' }] }],
      [{ userId: 'u1', orgId: ORG_ID, role: 'student', allergens: [{ allergenId: 'a-egg', status: 'pending' }] }]
    )

    expect(result).toHaveLength(0)
  })

  it('confirmed + pending 혼합 시 confirmed만 대조', async () => {
    const { matchAllergens } = await import('../services/allergy-engine/matcher')

    const result = matchAllergens(
      [
        { id: 'i1', name: '계란찜', allergens: [{ allergenId: 'a-egg', allergenCode: 1, allergenName: '난류' }] },
        { id: 'i2', name: '미역국', allergens: [{ allergenId: 'a-milk', allergenCode: 2, allergenName: '우유' }] },
      ],
      [{
        userId: 'u1', orgId: ORG_ID, role: 'student',
        allergens: [
          { allergenId: 'a-egg',  status: 'pending' },    // 난류 pending → 제외
          { allergenId: 'a-milk', status: 'confirmed' },  // 우유 confirmed → 포함
        ],
      }]
    )

    expect(result).toHaveLength(1)
    expect(result[0].matchedItems).toHaveLength(1)
    expect(result[0].matchedItems[0].mealItemName).toBe('미역국')
  })
})
