/**
 * T-111: guardian.service.ts 단위 테스트
 * - linkGuardianToStudent: 연동코드 검증, 중복 방지
 * - getChildren: 자녀 목록
 * - getChildAllergens: 소유 검증
 * - approveAllergen: 승인/반려 흐름, 자녀 알림
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user:            { findUnique: vi.fn() },
    guardianStudent: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    userAllergen:    { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    notification:    { create: vi.fn().mockResolvedValue({}) },
    pushSubscription:{ findFirst: vi.fn().mockResolvedValue(null) },
  },
}))

vi.mock('../../../lib/crypto', () => ({
  decrypt: (s: string) => `dec(${s})`,
  encrypt: (s: string) => `enc(${s})`,
}))

vi.mock('../../notification/dispatcher', () => ({
  dispatch: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '../../../lib/prisma'
import {
  linkGuardianToStudent,
  getChildren,
  getChildAllergens,
  approveAllergen,
} from '../guardian.service'

const GUARDIAN_ID = 'g-1'
const STUDENT_ID  = 's-1'

beforeEach(() => vi.clearAllMocks())

// ── linkGuardianToStudent ────────────────────────────────

describe('linkGuardianToStudent', () => {
  it('유효한 연동코드로 연동 성공', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: STUDENT_ID, name: '박학생', role: 'student', orgId: 'org-1',
    } as never)
    vi.mocked(prisma.guardianStudent.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.guardianStudent.create).mockResolvedValue({} as never)

    const result = await linkGuardianToStudent(GUARDIAN_ID, 'ABCD1234')
    expect(result.studentId).toBe(STUDENT_ID)
    expect(prisma.guardianStudent.create).toHaveBeenCalled()
  })

  it('잘못된 연동코드 → 404', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await expect(linkGuardianToStudent(GUARDIAN_ID, 'WRONG')).rejects.toMatchObject({
      statusCode: 404, code: 'LINK_CODE_NOT_FOUND',
    })
  })

  it('학생이 아닌 계정 연동 시도 → 400', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u-2', name: '영양사', role: 'nutritionist', orgId: 'org-1',
    } as never)
    await expect(linkGuardianToStudent(GUARDIAN_ID, 'ABCD1234')).rejects.toMatchObject({
      code: 'INVALID_LINK_TARGET',
    })
  })

  it('이미 연동된 자녀 재연동 → 409', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: STUDENT_ID, name: '박학생', role: 'student', orgId: 'org-1',
    } as never)
    vi.mocked(prisma.guardianStudent.findUnique).mockResolvedValue({ id: 'link-1' } as never)
    await expect(linkGuardianToStudent(GUARDIAN_ID, 'ABCD1234')).rejects.toMatchObject({
      code: 'ALREADY_LINKED',
    })
  })
})

// ── getChildren ──────────────────────────────────────────

describe('getChildren', () => {
  it('연동 자녀 목록을 반환한다', async () => {
    vi.mocked(prisma.guardianStudent.findMany).mockResolvedValue([
      {
        createdAt: new Date(),
        student: { id: STUDENT_ID, name: '박학생', email: 's@t.com', orgId: 'org-1', groupInfo: null, linkCode: 'CODE1' },
      },
    ] as never)
    const result = await getChildren(GUARDIAN_ID)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(STUDENT_ID)
    expect((result[0] as Record<string, unknown>).linkCode).toBeUndefined() // linkCode 노출 금지
  })

  it('연동된 자녀 없으면 빈 배열', async () => {
    vi.mocked(prisma.guardianStudent.findMany).mockResolvedValue([])
    expect(await getChildren(GUARDIAN_ID)).toHaveLength(0)
  })
})

// ── getChildAllergens ────────────────────────────────────

describe('getChildAllergens', () => {
  it('본인 자녀가 아니면 403', async () => {
    vi.mocked(prisma.guardianStudent.findUnique).mockResolvedValue(null)
    await expect(getChildAllergens(GUARDIAN_ID, STUDENT_ID)).rejects.toMatchObject({
      code: 'NOT_YOUR_CHILD',
    })
  })

  it('자녀 알레르기 목록 반환 (customName 복호화)', async () => {
    vi.mocked(prisma.guardianStudent.findUnique).mockResolvedValue({ id: 'link-1' } as never)
    vi.mocked(prisma.userAllergen.findMany).mockResolvedValue([
      {
        id: 'ua-1', status: 'pending', customAllergenName: 'enc(땅콩)',
        allergen: { id: 'a-1', code: 4, name: '땅콩', iconUrl: null },
        approver: null, createdAt: new Date(), updatedAt: new Date(),
      },
    ] as never)
    const result = await getChildAllergens(GUARDIAN_ID, STUDENT_ID)
    expect(result[0].customAllergenName).toBe('dec(enc(땅콩))')
  })
})

// ── approveAllergen ──────────────────────────────────────

describe('approveAllergen', () => {
  const PENDING_UA = {
    id: 'ua-1', userId: STUDENT_ID, status: 'pending',
    allergen: { name: '난류' },
  }

  beforeEach(() => {
    vi.mocked(prisma.userAllergen.findUnique).mockResolvedValue(PENDING_UA as never)
    vi.mocked(prisma.guardianStudent.findUnique).mockResolvedValue({ id: 'link-1' } as never)
    vi.mocked(prisma.userAllergen.update).mockResolvedValue({
      id: 'ua-1', status: 'confirmed', rejectionReason: null,
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: 's@t.com', groupInfo: null,
    } as never)
  })

  it('승인 → status=confirmed, 자녀에게 승인 알림', async () => {
    const result = await approveAllergen(GUARDIAN_ID, 'ua-1', 'confirmed')
    expect(prisma.userAllergen.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'confirmed' }) })
    )
    expect(result.status).toBe('confirmed')
  })

  it('반려 + 사유 → status=rejected, rejectionReason 저장', async () => {
    vi.mocked(prisma.userAllergen.update).mockResolvedValue({
      id: 'ua-1', status: 'rejected', rejectionReason: '의사 확인 필요',
    } as never)
    const result = await approveAllergen(GUARDIAN_ID, 'ua-1', 'rejected', '의사 확인 필요')
    expect(prisma.userAllergen.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'rejected', rejectionReason: '의사 확인 필요' }),
      })
    )
    expect(result.status).toBe('rejected')
  })

  it('반려 시 사유 없으면 400', async () => {
    await expect(approveAllergen(GUARDIAN_ID, 'ua-1', 'rejected')).rejects.toMatchObject({
      code: 'REASON_REQUIRED',
    })
  })

  it('존재하지 않는 allergenId → 404', async () => {
    vi.mocked(prisma.userAllergen.findUnique).mockResolvedValue(null)
    await expect(approveAllergen(GUARDIAN_ID, 'NONE', 'confirmed')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('이미 처리된 알레르기 → 409', async () => {
    vi.mocked(prisma.userAllergen.findUnique).mockResolvedValue({
      ...PENDING_UA, status: 'confirmed',
    } as never)
    await expect(approveAllergen(GUARDIAN_ID, 'ua-1', 'confirmed')).rejects.toMatchObject({
      code: 'ALREADY_PROCESSED',
    })
  })

  it('본인 자녀가 아닌 알레르기 → 403', async () => {
    vi.mocked(prisma.guardianStudent.findUnique).mockResolvedValue(null)
    await expect(approveAllergen(GUARDIAN_ID, 'ua-1', 'confirmed')).rejects.toMatchObject({
      code: 'NOT_YOUR_CHILD',
    })
  })
})
