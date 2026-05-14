/**
 * T-152: runMonthlyConflictScan 단위 테스트
 * prisma를 mock하여 DB 없이 로직 검증
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    mealPlan:     { findMany: vi.fn(), findFirst: vi.fn() },
    userAllergen: { findMany: vi.fn() },
  },
}))

import { prisma } from '../../../lib/prisma'
import { runMonthlyConflictScan, runDayConflictScan } from '../engine'

const mockMealPlan      = vi.mocked(prisma.mealPlan.findMany)
const mockMealPlanFirst = vi.mocked(prisma.mealPlan.findFirst)
const mockUserAllergen  = vi.mocked(prisma.userAllergen.findMany)

beforeEach(() => { vi.clearAllMocks() })

describe('runMonthlyConflictScan', () => {
  it('식단이 없으면 빈 배열 반환', async () => {
    mockMealPlan.mockResolvedValue([])
    const result = await runMonthlyConflictScan('org1', '2026-05')
    expect(result).toEqual([])
    expect(mockUserAllergen).not.toHaveBeenCalled()
  })

  it('알레르기 보유 학생이 없으면 충돌 없음', async () => {
    mockMealPlan.mockResolvedValue([
      {
        id: 'plan1', date: new Date('2026-05-01'), status: 'published', orgId: 'org1',
        items: [{ id: 'item1', name: '계란찜', allergens: [{ allergenId: 'a1', allergen: { id: 'a1', code: 1, name: '난류' } }] }],
      },
    ] as never)
    mockUserAllergen.mockResolvedValue([])

    const result = await runMonthlyConflictScan('org1', '2026-05')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-05-01')
    expect(result[0].conflictCount).toBe(0)
    expect(result[0].affectedStudents).toBe(0)
  })

  it('알레르기 충돌 발생 시 conflictCount·affectedStudents 정확히 반환', async () => {
    mockMealPlan.mockResolvedValue([
      {
        id: 'plan1', date: new Date('2026-05-02'), status: 'draft', orgId: 'org1',
        items: [
          { id: 'item1', name: '계란찜', allergens: [{ allergenId: 'a1', allergen: { id: 'a1', code: 1, name: '난류' } }] },
          { id: 'item2', name: '잡곡밥',  allergens: [] },
        ],
      },
    ] as never)
    mockUserAllergen.mockResolvedValue([
      { allergenId: 'a1', userId: 'u1', status: 'confirmed', user: { id: 'u1', orgId: 'org1', role: 'student' } },
    ] as never)

    const result = await runMonthlyConflictScan('org1', '2026-05')
    expect(result).toHaveLength(1)
    expect(result[0].conflictCount).toBe(1)
    expect(result[0].affectedStudents).toBe(1)
  })

  it('여러 날짜가 각각 독립적으로 계산됨', async () => {
    mockMealPlan.mockResolvedValue([
      {
        id: 'plan1', date: new Date('2026-05-05'), status: 'published', orgId: 'org1',
        items: [{ id: 'item1', name: '우유', allergens: [{ allergenId: 'a2', allergen: { id: 'a2', code: 2, name: '우유' } }] }],
      },
      {
        id: 'plan2', date: new Date('2026-05-06'), status: 'published', orgId: 'org1',
        items: [{ id: 'item2', name: '잡곡밥', allergens: [] }],
      },
    ] as never)
    mockUserAllergen.mockResolvedValue([
      { allergenId: 'a2', userId: 'u1', status: 'confirmed', user: { id: 'u1', orgId: 'org1', role: 'student' } },
    ] as never)

    const result = await runMonthlyConflictScan('org1', '2026-05')
    expect(result).toHaveLength(2)
    const may5 = result.find((r) => r.date === '2026-05-05')!
    const may6 = result.find((r) => r.date === '2026-05-06')!
    expect(may5.conflictCount).toBe(1)
    expect(may6.conflictCount).toBe(0)
  })

  it('statuses 파라미터로 published만 필터링', async () => {
    mockMealPlan.mockResolvedValue([])
    await runMonthlyConflictScan('org1', '2026-05', ['published'])
    expect(mockMealPlan).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['published'] } }) }),
    )
  })
})

describe('runDayConflictScan', () => {
  it('해당 날짜 식단이 없으면 null 반환', async () => {
    mockMealPlanFirst.mockResolvedValue(null)
    const result = await runDayConflictScan('org1', '2026-05-14')
    expect(result).toBeNull()
    expect(mockUserAllergen).not.toHaveBeenCalled()
  })

  it('알레르기 보유 학생이 없으면 conflictCount=0, affectedStudents=0', async () => {
    mockMealPlanFirst.mockResolvedValue({
      id: 'plan1', date: new Date('2026-05-14'), status: 'published', orgId: 'org1',
      items: [
        { id: 'item1', name: '계란찜', allergens: [{ allergenId: 'a1', allergen: { id: 'a1', code: 1, name: '난류' } }] },
      ],
    } as never)
    mockUserAllergen.mockResolvedValue([])

    const result = await runDayConflictScan('org1', '2026-05-14')
    expect(result).not.toBeNull()
    expect(result!.date).toBe('2026-05-14')
    expect(result!.conflictCount).toBe(0)
    expect(result!.affectedStudents).toBe(0)
    expect(result!.matches).toHaveLength(0)
  })

  it('알레르기 충돌 발생 시 conflictCount·affectedStudents 정확히 반환', async () => {
    mockMealPlanFirst.mockResolvedValue({
      id: 'plan1', date: new Date('2026-05-14'), status: 'draft', orgId: 'org1',
      items: [
        { id: 'item1', name: '계란찜', allergens: [{ allergenId: 'a1', allergen: { id: 'a1', code: 1, name: '난류' } }] },
        { id: 'item2', name: '잡곡밥', allergens: [] },
      ],
    } as never)
    mockUserAllergen.mockResolvedValue([
      { allergenId: 'a1', userId: 'u1', status: 'confirmed', user: { id: 'u1', orgId: 'org1', role: 'student' } },
    ] as never)

    const result = await runDayConflictScan('org1', '2026-05-14')
    expect(result!.date).toBe('2026-05-14')
    expect(result!.conflictCount).toBe(1)    // item1만 충돌
    expect(result!.affectedStudents).toBe(1)
  })

  it('여러 학생이 동일 메뉴에 충돌할 때 affectedStudents 정확히 집계', async () => {
    mockMealPlanFirst.mockResolvedValue({
      id: 'plan1', date: new Date('2026-05-14'), status: 'published', orgId: 'org1',
      items: [
        { id: 'item1', name: '우유국', allergens: [{ allergenId: 'a2', allergen: { id: 'a2', code: 2, name: '우유' } }] },
      ],
    } as never)
    mockUserAllergen.mockResolvedValue([
      { allergenId: 'a2', userId: 'u1', status: 'confirmed', user: { id: 'u1', orgId: 'org1', role: 'student' } },
      { allergenId: 'a2', userId: 'u2', status: 'confirmed', user: { id: 'u2', orgId: 'org1', role: 'student' } },
    ] as never)

    const result = await runDayConflictScan('org1', '2026-05-14')
    expect(result!.conflictCount).toBe(1)      // 메뉴 1개
    expect(result!.affectedStudents).toBe(2)   // 학생 2명
  })

  it('메뉴 항목이 없어도 conflictCount=0 반환', async () => {
    mockMealPlanFirst.mockResolvedValue({
      id: 'plan1', date: new Date('2026-05-14'), status: 'draft', orgId: 'org1',
      items: [],
    } as never)
    mockUserAllergen.mockResolvedValue([
      { allergenId: 'a1', userId: 'u1', status: 'confirmed', user: { id: 'u1', orgId: 'org1', role: 'student' } },
    ] as never)

    const result = await runDayConflictScan('org1', '2026-05-14')
    expect(result!.conflictCount).toBe(0)
    expect(result!.affectedStudents).toBe(0)
  })
})
