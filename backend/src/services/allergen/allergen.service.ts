import type { UserRole } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { decrypt, encrypt } from '../../lib/crypto'
import { AppError } from '../../middlewares/errorHandler'

const USER_ALLERGEN_INCLUDE = {
  allergen: { select: { id: true, code: true, name: true, iconUrl: true } },
  approver: { select: { id: true, name: true } },
} as const

function decodeEntry(ua: {
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

// 학생은 보호자 승인 대기(pending), 나머지는 즉시 확정(confirmed)
const PENDING_ROLES: UserRole[] = ['student']

export interface RegisterAllergenInput {
  allergenId?: string       // 식약처 19종 중 하나의 id
  customAllergenName?: string  // 기타 자유 입력 (AES-256 암호화 저장)
}

export async function registerAllergen(
  userId: string,
  role: UserRole,
  input: RegisterAllergenInput
) {
  if (!input.allergenId && !input.customAllergenName?.trim()) {
    throw new AppError(400, 'BAD_REQUEST', 'allergenId 또는 customAllergenName 중 하나는 필수입니다')
  }

  let allergenId = input.allergenId

  // 기타 자유 입력 처리: 'code=0' 자리표시자 알레르기 사용(없으면 생성)
  if (!allergenId && input.customAllergenName) {
    const etcAllergen = await prisma.allergen.upsert({
      where: { code: 0 },
      update: {},
      create: { code: 0, name: '기타' },
    })
    allergenId = etcAllergen.id
  }

  // 중복 등록 방지
  const existing = await prisma.userAllergen.findFirst({
    where: { userId, allergenId },
  })
  if (existing) {
    throw new AppError(409, 'ALREADY_REGISTERED', '이미 등록된 알레르기입니다')
  }

  const status = PENDING_ROLES.includes(role) ? 'pending' : 'confirmed'

  const record = await prisma.userAllergen.create({
    data: {
      userId,
      allergenId: allergenId!,
      status,
      customAllergenName: input.customAllergenName
        ? encrypt(input.customAllergenName.trim())
        : null,
    },
    include: USER_ALLERGEN_INCLUDE,
  })

  // T-106: 알레르기 등록 감사 로그
  await prisma.auditLog.create({
    data: { userId, action: 'ALLERGEN_REGISTER', targetType: 'user_allergen', targetId: record.id,
      after: { allergenId: record.allergenId, status } },
  }).catch(() => {})

  return decodeEntry(record)
}

export async function getUserAllergens(userId: string) {
  const records = await prisma.userAllergen.findMany({
    where: { userId },
    include: USER_ALLERGEN_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })
  return records.map(decodeEntry)
}

// ── T-042: PUT/DELETE /users/me/allergens/:id ─────────────

export async function updateAllergen(
  id: string,
  userId: string,
  role: UserRole,
  input: { customAllergenName?: string }
) {
  const record = await prisma.userAllergen.findFirst({ where: { id, userId } })
  if (!record) throw new AppError(404, 'NOT_FOUND', '알레르기 항목을 찾을 수 없습니다')

  // 학생 수정 시 보호자 재승인 필요 — Phase 1: pending으로 되돌림 (Phase 2에서 알림 추가)
  const status = role === 'student' ? 'pending' : record.status

  const updated = await prisma.userAllergen.update({
    where: { id },
    data: {
      status,
      ...(input.customAllergenName !== undefined && {
        customAllergenName: input.customAllergenName
          ? encrypt(input.customAllergenName.trim())
          : null,
      }),
    },
    include: USER_ALLERGEN_INCLUDE,
  })

  // T-106: 알레르기 수정 감사 로그
  await prisma.auditLog.create({
    data: { userId, action: 'ALLERGEN_UPDATE', targetType: 'user_allergen', targetId: id,
      before: { status: record.status }, after: { status } },
  }).catch(() => {})

  return decodeEntry(updated)
}

export async function deleteAllergen(id: string, userId: string) {
  const record = await prisma.userAllergen.findFirst({ where: { id, userId } })
  if (!record) throw new AppError(404, 'NOT_FOUND', '알레르기 항목을 찾을 수 없습니다')
  await prisma.userAllergen.delete({ where: { id } })

  // T-106: 알레르기 삭제 감사 로그
  await prisma.auditLog.create({
    data: { userId, action: 'ALLERGEN_DELETE', targetType: 'user_allergen', targetId: id,
      before: { allergenId: record.allergenId } },
  }).catch(() => {})
}

// ── T-049: GET /users/me/alternate-meals?date= ───────────

export async function getUserAlternateMeals(userId: string, date?: string) {
  // 본인 confirmed 알레르기 ID 목록
  const userAllergens = await prisma.userAllergen.findMany({
    where: { userId, status: 'confirmed' },
    select: { allergenId: true },
  })
  const allergenIds = userAllergens.map((ua) => ua.allergenId)
  if (allergenIds.length === 0) return []

  // 해당 알레르기를 대상으로 하는 confirmed 대체 식단 조회
  const where: {
    targetAllergenId: { in: string[] }
    status: 'confirmed'
    mealPlan?: { date: { gte: Date; lt: Date } }
  } = {
    targetAllergenId: { in: allergenIds },
    status: 'confirmed',
  }

  if (date) {
    // date=YYYY-MM-DD → 해당 날짜 하루
    const start = new Date(date)
    const end   = new Date(date)
    end.setDate(end.getDate() + 1)
    where.mealPlan = { date: { gte: start, lt: end } }
  }

  return prisma.alternateMealPlan.findMany({
    where,
    include: {
      mealPlan:      { select: { id: true, date: true, orgId: true } },
      targetAllergen: { select: { id: true, code: true, name: true } },
      items: {
        include: {
          replacesItem: { select: { id: true, name: true, category: true } },
        },
      },
    },
    orderBy: { mealPlan: { date: 'asc' } },
  })
}

// ── T-035: GET /meals/:id/allergen-check ─────────────────
export async function checkMealAllergens(mealPlanId: string, userId: string) {
  const [mealPlan, userAllergens] = await Promise.all([
    prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        items: {
          include: {
            allergens: { include: { allergen: { select: { id: true, code: true, name: true } } } },
          },
        },
      },
    }),
    prisma.userAllergen.findMany({
      where: { userId, status: 'confirmed' },
      include: { allergen: { select: { id: true, code: true, name: true } } },
    }),
  ])

  if (!mealPlan) throw new AppError(404, 'NOT_FOUND', '식단을 찾을 수 없습니다')

  const userAllergenIds = new Set(userAllergens.map((ua) => ua.allergenId))

  const dangerous = mealPlan.items
    .map((item) => {
      const matched = item.allergens
        .filter((a) => userAllergenIds.has(a.allergenId))
        .map((a) => a.allergen)
      return matched.length > 0 ? { item: { id: item.id, name: item.name }, matchedAllergens: matched } : null
    })
    .filter(Boolean)

  return {
    mealPlanId,
    userId,
    isDangerous: dangerous.length > 0,
    dangerousItems: dangerous,
  }
}
