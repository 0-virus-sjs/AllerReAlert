/**
 * T-111: dispatcher.ts 단위 테스트
 * - dispatch: 채널별 발송, 사용자 없음, push 구독 분기
 * - dispatchWithGuardians: 학생/비학생 분기, 보호자 병렬 발송
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    guardianStudent: { findMany: vi.fn() },
    notification: { create: vi.fn().mockResolvedValue({}) },
    pushSubscription: { findFirst: vi.fn() },
  },
}))

vi.mock('../email.adapter', () => ({
  emailAdapter: { channel: 'email', send: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('../push.adapter', () => ({
  pushAdapter: { channel: 'push', send: vi.fn().mockResolvedValue(undefined) },
}))

// 순환 참조 방지: 모킹 후 import
import { prisma } from '../../../lib/prisma'
import { dispatch, dispatchWithGuardians } from '../dispatcher'
import { emailAdapter } from '../email.adapter'
import { pushAdapter } from '../push.adapter'

const BASE_INPUT = {
  userId: 'u-1',
  title: '테스트 알림',
  body: '내용',
  type: 'allergen_alert' as const,
}

const EMAIL_USER = {
  email: 'test@test.com',
  groupInfo: null,
}

const PUSH_USER = {
  email: 'test@test.com',
  groupInfo: { notificationSettings: { channels: ['push'] } },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

// ── dispatch ─────────────────────────────────────────────

describe('dispatch', () => {
  it('사용자 없으면 발송하지 않는다', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await dispatch(BASE_INPUT)
    expect(emailAdapter.send).not.toHaveBeenCalled()
  })

  it('기본 채널(email)로 이메일을 발송한다', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(EMAIL_USER as never)
    await dispatch(BASE_INPUT)
    expect(emailAdapter.send).toHaveBeenCalledTimes(1)
    expect(pushAdapter.send).not.toHaveBeenCalled()
  })

  it('push 채널 설정 + 구독 있으면 웹 푸시만 발송한다', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(PUSH_USER as never)
    vi.mocked(prisma.pushSubscription.findFirst).mockResolvedValue({
      endpoint: 'https://push.example.com',
      p256dh: 'key',
      auth: 'auth',
    } as never)
    await dispatch(BASE_INPUT)
    expect(pushAdapter.send).toHaveBeenCalledTimes(1)
    expect(emailAdapter.send).not.toHaveBeenCalled()
  })

  it('push 채널이지만 구독 없으면 아무것도 발송하지 않는다', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(PUSH_USER as never)
    vi.mocked(prisma.pushSubscription.findFirst).mockResolvedValue(null)
    await dispatch(BASE_INPUT)
    expect(emailAdapter.send).not.toHaveBeenCalled()
    expect(pushAdapter.send).not.toHaveBeenCalled()
  })

  it('notification 레코드를 생성한다', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(EMAIL_USER as never)
    await dispatch(BASE_INPUT)
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u-1', title: '테스트 알림' }),
      })
    )
  })

  it('이메일 발송 실패해도 예외를 던지지 않는다', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(EMAIL_USER as never)
    vi.mocked(emailAdapter.send).mockRejectedValueOnce(new Error('SMTP 오류'))
    await expect(dispatch(BASE_INPUT)).resolves.toBeUndefined()
  })
})

// ── 방해 금지 시간 (quiet hours) ─────────────────────────

describe('dispatch — 방해 금지 시간', () => {
  const QUIET_USER = {
    email: 'test@test.com',
    groupInfo: { notificationSettings: { channels: ['email'], quietHoursStart: '22:00', quietHoursEnd: '07:00' } },
  }

  it('방해 금지 시간 내이면 발송 생략하고 notification 레코드만 생성한다', async () => {
    vi.useFakeTimers()
    // KST 03:00 = UTC 18:00
    vi.setSystemTime(new Date('2024-01-01T18:00:00Z'))
    vi.mocked(prisma.user.findUnique).mockResolvedValue(QUIET_USER as never)

    await dispatch(BASE_INPUT)

    expect(emailAdapter.send).not.toHaveBeenCalled()
    expect(prisma.notification.create).toHaveBeenCalledTimes(1)
  })

  it('방해 금지 시간 외이면 정상 발송한다', async () => {
    vi.useFakeTimers()
    // KST 12:00 = UTC 03:00
    vi.setSystemTime(new Date('2024-01-01T03:00:00Z'))
    vi.mocked(prisma.user.findUnique).mockResolvedValue(QUIET_USER as never)

    await dispatch(BASE_INPUT)

    expect(emailAdapter.send).toHaveBeenCalledTimes(1)
  })

  it('quietHours 미설정이면 항상 발송한다', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(EMAIL_USER as never)

    await dispatch(BASE_INPUT)

    expect(emailAdapter.send).toHaveBeenCalledTimes(1)
  })
})

// ── dispatchWithGuardians ────────────────────────────────

describe('dispatchWithGuardians', () => {
  it('학생이 아닌 사용자는 dispatch 단독 실행', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'nutritionist' } as never) // dispatchWithGuardians용
      .mockResolvedValueOnce(EMAIL_USER as never)               // dispatch 내부용
    await dispatchWithGuardians(BASE_INPUT)
    expect(emailAdapter.send).toHaveBeenCalledTimes(1)
    expect(prisma.guardianStudent.findMany).not.toHaveBeenCalled()
  })

  it('학생이고 보호자 없으면 학생에게만 발송', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'student' } as never)
      .mockResolvedValueOnce(EMAIL_USER as never)
    vi.mocked(prisma.guardianStudent.findMany).mockResolvedValue([])
    await dispatchWithGuardians(BASE_INPUT)
    expect(emailAdapter.send).toHaveBeenCalledTimes(1)
  })

  it('학생이고 보호자 1명 있으면 학생+보호자 각각 발송', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ role: 'student' } as never) // dispatchWithGuardians
      .mockResolvedValue(EMAIL_USER as never)              // dispatch × 2
    vi.mocked(prisma.guardianStudent.findMany).mockResolvedValue([
      { guardianId: 'g-1' } as never,
    ])
    await dispatchWithGuardians(BASE_INPUT)
    expect(emailAdapter.send).toHaveBeenCalledTimes(2)
  })
})
