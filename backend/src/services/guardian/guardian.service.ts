import { prisma } from '../../lib/prisma'
import { decrypt } from '../../lib/crypto'
import { AppError } from '../../middlewares/errorHandler'

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
