import { prisma } from '../../lib/prisma'
import { decrypt } from '../../lib/crypto'
import { AppError } from '../../middlewares/errorHandler'
import { dispatch } from '../notification/dispatcher'
import { invalidateOrgAnalyticsCache } from '../../lib/cache'

const ALLERGEN_INCLUDE = {
  allergen: { select: { id: true, code: true, name: true, iconUrl: true } },
  approver: { select: { id: true, name: true } },
} as const

function decodeAllergenEntry(ua: {
  id: string
  status: string
  customAllergenName: string | null
  createdAt: Date
  updatedAt: Date
  allergen: { id: string; code: number; name: string; iconUrl: string | null }
  approver: { id: string; name: string } | null
}) {
  return {
    id: ua.id,
    allergen: ua.allergen,
    customAllergenName: ua.customAllergenName ? decrypt(ua.customAllergenName) : null,
    status: ua.status,
    approver: ua.approver,
    createdAt: ua.createdAt,
    updatedAt: ua.updatedAt,
  }
}

/** 보호자가 자녀 연동코드로 자녀를 연동한다 */
export async function linkGuardianToStudent(guardianId: string, linkCode: string) {
  const student = await prisma.user.findUnique({
    where: { linkCode: linkCode.toUpperCase() },
    select: { id: true, name: true, role: true, orgId: true },
  })

  if (!student) {
    throw new AppError(404, 'LINK_CODE_NOT_FOUND', '연동코드에 해당하는 학생을 찾을 수 없습니다')
  }
  if (student.role !== 'student') {
    throw new AppError(400, 'INVALID_LINK_TARGET', '학생 계정만 연동할 수 있습니다')
  }

  const existing = await prisma.guardianStudent.findUnique({
    where: { guardianId_studentId: { guardianId, studentId: student.id } },
  })
  if (existing) {
    throw new AppError(409, 'ALREADY_LINKED', '이미 연동된 자녀입니다')
  }

  await prisma.guardianStudent.create({ data: { guardianId, studentId: student.id } })

  return { studentId: student.id, name: student.name, orgId: student.orgId }
}

/** 보호자의 연동된 자녀 목록 */
export async function getChildren(guardianId: string) {
  const links = await prisma.guardianStudent.findMany({
    where: { guardianId },
    include: {
      student: {
        select: { id: true, name: true, email: true, groupInfo: true, orgId: true, linkCode: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return links.map((l) => ({
    linkedAt: l.createdAt,
    ...l.student,
    linkCode: undefined,
  }))
}

/** 보호자가 자녀의 알레르기 등록을 승인 또는 반려한다 (T-101) */
export async function approveAllergen(
  guardianId: string,
  allergenId: string,
  action: 'confirmed' | 'rejected',
  reason?: string
) {
  const allergen = await prisma.userAllergen.findUnique({
    where: { id: allergenId },
    select: { id: true, userId: true, status: true, allergen: { select: { name: true } } },
  })

  if (!allergen) throw new AppError(404, 'NOT_FOUND', '알레르기 항목을 찾을 수 없습니다')
  if (allergen.status !== 'pending') {
    throw new AppError(409, 'ALREADY_PROCESSED', '이미 처리된 알레르기 요청입니다')
  }

  // 보호자-자녀 연동 확인
  const link = await prisma.guardianStudent.findUnique({
    where: { guardianId_studentId: { guardianId, studentId: allergen.userId } },
  })
  if (!link) throw new AppError(403, 'NOT_YOUR_CHILD', '해당 자녀와 연동되어 있지 않습니다')

  if (action === 'rejected' && !reason?.trim()) {
    throw new AppError(400, 'REASON_REQUIRED', '반려 시 사유를 입력해야 합니다')
  }

  const updated = await prisma.userAllergen.update({
    where: { id: allergenId },
    data: {
      status: action,
      approvedBy: guardianId,
      rejectionReason: action === 'rejected' ? reason!.trim() : null,
    },
    select: { id: true, status: true, rejectionReason: true },
  })

  // 승인 시 confirmed 상태가 새로 생기므로 analytics 분포 무효화
  if (action === 'confirmed') {
    const student = await prisma.user.findUnique({
      where: { id: allergen.userId },
      select: { orgId: true },
    })
    if (student?.orgId) invalidateOrgAnalyticsCache(student.orgId)
  }

  // 반려 시 자녀에게 결과 알림
  if (action === 'rejected') {
    await dispatch({
      userId: allergen.userId,
      type: 'approval_result',
      title: '알레르기 등록이 반려되었습니다',
      body: `"${allergen.allergen.name}" 등록이 반려됐습니다. 사유: ${reason}`,
      data: { allergenId, action, reason },
    })
  } else {
    await dispatch({
      userId: allergen.userId,
      type: 'approval_result',
      title: '알레르기 등록이 승인되었습니다',
      body: `"${allergen.allergen.name}" 알레르기 등록이 승인됐습니다.`,
      data: { allergenId, action },
    })
  }

  return updated
}

/** 특정 자녀의 알레르기 목록 조회 (보호자 소유 확인 필수) */
export async function getChildAllergens(guardianId: string, studentId: string) {
  const link = await prisma.guardianStudent.findUnique({
    where: { guardianId_studentId: { guardianId, studentId } },
  })
  if (!link) {
    throw new AppError(403, 'NOT_YOUR_CHILD', '해당 자녀와 연동되어 있지 않습니다')
  }

  const allergens = await prisma.userAllergen.findMany({
    where: { userId: studentId },
    include: ALLERGEN_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })

  return allergens.map(decodeAllergenEntry)
}
