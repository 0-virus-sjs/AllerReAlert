import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  orgId: true,
  phone: true,
  groupInfo: true,
  grade: true,           // T-123 학생 학년
  classNo: true,         // T-123 학생 반
  studentCode: true,     // T-123 학생 학번
  linkCode: true,        // 학생 전용 보호자 연동코드 (T-100)
  consentedAt: true,
  guardianConsentRequired: true,
  createdAt: true,
  organization: {        // T-123 소속 단체 정보
    select: { id: true, name: true, address: true, orgType: true, mealTime: true },
  },
} satisfies Prisma.UserSelect

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect })
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다')
  return user
}

export interface UpdateMeInput {
  name?: string
  phone?: string
  groupInfo?: Record<string, unknown>
  notificationSettings?: Record<string, unknown>
}

export async function updateMe(userId: string, input: UpdateMeInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다')

  // notificationSettings는 groupInfo JSONB 내 중첩 저장
  const groupInfo = input.notificationSettings
    ? {
        ...(user.groupInfo as Record<string, unknown> ?? {}),
        ...(input.groupInfo ?? {}),
        notificationSettings: input.notificationSettings,
      }
    : input.groupInfo !== undefined
      ? (input.groupInfo as Prisma.InputJsonValue)
      : undefined

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(groupInfo !== undefined && { groupInfo: groupInfo as Prisma.InputJsonValue }),
    },
    select: userSelect,
  })
}
