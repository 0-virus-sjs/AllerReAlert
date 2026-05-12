import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'
import { verifyTempToken } from '../lib/jwt'

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

// ── T-124: 소속 단체 변경 ─────────────────────────────────

export async function changeOrg(userId: string, tempToken: string, ip?: string) {
  // 1) tempToken 검증 — T-023 verify-org 플로우 재사용
  let newOrgId: string
  let newOrgType: string
  try {
    const payload = verifyTempToken(tempToken)
    if (payload.purpose !== 'signup') throw new Error()
    newOrgId = payload.orgId
    newOrgType = payload.orgType
  } catch {
    throw new AppError(401, 'INVALID_TEMP_TOKEN', '소속 인증 토큰이 유효하지 않습니다. 소속 코드 인증을 다시 진행하세요')
  }

  // 2) 현재 사용자 조회
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다')

  if (user.orgId === newOrgId) {
    throw new AppError(400, 'SAME_ORG', '현재 소속과 동일한 단체입니다')
  }

  // 3) role=student는 school 단체에서만 가입 가능 (T-122와 일관)
  if (user.role === 'student' && newOrgType !== 'school') {
    throw new AppError(400, 'INVALID_ROLE_FOR_ORG', '학생 역할은 학교 단체에서만 가입할 수 있습니다')
  }

  const isStudent = user.role === 'student'

  // 4) 트랜잭션: org 변경 + 학생 정보 초기화 + audit_logs
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: {
        orgId: newOrgId,
        ...(isStudent && { grade: null, classNo: null, studentCode: null }),
      },
      select: userSelect,
    })
    await tx.auditLog.create({
      data: {
        userId,
        action: 'user.org.change',
        targetType: 'user',
        targetId: userId,
        ip,
        before: {
          orgId: user.orgId,
          ...(isStudent && {
            grade: user.grade,
            classNo: user.classNo,
            studentCode: user.studentCode,
          }),
        },
        after: { orgId: newOrgId },
      },
    })
    return u
  })

  return {
    user: updated,
    // 학생인 경우 grade/classNo/studentCode가 초기화됐으므로 FE에서 재입력 모달 트리거
    requiresStudentInfoRefill: isStudent,
  }
}
