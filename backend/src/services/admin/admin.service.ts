import { prisma } from '../../lib/prisma'
import { AppError } from '../../middlewares/errorHandler'
import type { OrgType, UserRole, Prisma } from '@prisma/client'

const PAGE_SIZE = 20

// ── T-090: 단체(Organization) CRUD ──────────────────────────────────────────

export async function listOrganizations(params: {
  page: number
  orgType?: OrgType
  search?: string
}) {
  const { page, orgType, search } = params
  const where: Prisma.OrganizationWhereInput = {
    ...(orgType && { orgType }),
    ...(search  && { name: { contains: search, mode: 'insensitive' } }),
  }

  const [total, items] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { users: true } } },
    }),
  ])

  return { total, page, pageSize: PAGE_SIZE, items }
}

export async function createOrganization(data: {
  name: string
  address?: string
  orgType: OrgType
  gradeStructure?: unknown
  mealTime?: unknown
}) {
  return prisma.organization.create({
    data: {
      name:    data.name,
      address: data.address,
      orgType: data.orgType,
      ...(data.gradeStructure !== undefined && { gradeStructure: data.gradeStructure as Prisma.InputJsonValue }),
      ...(data.mealTime       !== undefined && { mealTime:       data.mealTime       as Prisma.InputJsonValue }),
    },
  })
}

export async function updateOrganization(id: string, data: {
  name?: string
  address?: string
  orgType?: OrgType
  gradeStructure?: unknown
  mealTime?: unknown
}) {
  const existing = await prisma.organization.findUnique({ where: { id } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', '단체를 찾을 수 없습니다.')
  return prisma.organization.update({
    where: { id },
    data: {
      ...(data.name    !== undefined && { name:    data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.orgType !== undefined && { orgType: data.orgType }),
      ...(data.gradeStructure !== undefined && { gradeStructure: data.gradeStructure as Prisma.InputJsonValue }),
      ...(data.mealTime       !== undefined && { mealTime:       data.mealTime       as Prisma.InputJsonValue }),
    },
  })
}

// ── T-091: 사용자 조회·역할·활성화 변경 ─────────────────────────────────────

export async function listUsers(params: {
  page: number
  orgId?: string
  role?: UserRole
  isActive?: boolean
  search?: string
}) {
  const { page, orgId, role, isActive, search } = params
  const where: Prisma.UserWhereInput = {
    ...(orgId    && { orgId }),
    ...(role     && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(search   && {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, isActive: true, orgId: true,
        organization: { select: { name: true } },
        createdAt: true,
      },
    }),
  ])

  return { total, page, pageSize: PAGE_SIZE, items }
}

export async function changeUserRole(
  targetId: string,
  newRole: UserRole,
  adminId: string,
) {
  const user = await prisma.user.findUnique({ where: { id: targetId } })
  if (!user) throw new AppError(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.')
  if (user.role === newRole) throw new AppError(400, 'BAD_REQUEST', '동일한 역할입니다.')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetId },
      data:  { role: newRole },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    await tx.auditLog.create({
      data: {
        userId:     adminId,
        action:     'admin.user.role_change',
        targetType: 'user',
        targetId,
        before: { role: user.role },
        after:  { role: newRole },
      },
    })
    return updated
  })
}

export async function changeUserStatus(
  targetId: string,
  isActive: boolean,
  adminId: string,
) {
  const user = await prisma.user.findUnique({ where: { id: targetId } })
  if (!user) throw new AppError(404, 'NOT_FOUND', '사용자를 찾을 수 없습니다.')
  if (user.isActive === isActive) throw new AppError(400, 'BAD_REQUEST', '이미 해당 상태입니다.')

  const updateData: Prisma.UserUpdateInput = { isActive }
  if (!isActive) updateData.refreshTokenHash = null

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetId },
      data:  updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    await tx.auditLog.create({
      data: {
        userId:     adminId,
        action:     'admin.user.status_change',
        targetType: 'user',
        targetId,
        before: { isActive: user.isActive },
        after:  { isActive },
      },
    })
    return updated
  })
}

// ── T-092: 알레르기 마스터 CRUD ─────────────────────────────────────────────

export async function listMasterAllergens() {
  return prisma.allergen.findMany({ orderBy: { code: 'asc' } })
}

export async function createAllergen(data: { name: string; code: number; iconUrl?: string }) {
  const existing = await prisma.allergen.findUnique({ where: { code: data.code } })
  if (existing) throw new AppError(409, 'CONFLICT', `코드 ${data.code}는 이미 존재합니다.`)
  return prisma.allergen.create({ data })
}

export async function updateAllergen(
  id: string,
  data: { name?: string; code?: number; iconUrl?: string },
) {
  const existing = await prisma.allergen.findUnique({ where: { id } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', '알레르기를 찾을 수 없습니다.')

  if (data.code !== undefined && data.code !== existing.code) {
    const dup = await prisma.allergen.findUnique({ where: { code: data.code } })
    if (dup) throw new AppError(409, 'CONFLICT', `코드 ${data.code}는 이미 존재합니다.`)
  }
  return prisma.allergen.update({ where: { id }, data })
}

export async function deleteAllergen(id: string) {
  const existing = await prisma.allergen.findUnique({ where: { id } })
  if (!existing) throw new AppError(404, 'NOT_FOUND', '알레르기를 찾을 수 없습니다.')

  const inUse = await prisma.userAllergen.findFirst({ where: { allergenId: id } })
  if (inUse) throw new AppError(409, 'CONFLICT', '이미 사용자에게 등록된 알레르기는 삭제할 수 없습니다.')

  return prisma.allergen.delete({ where: { id } })
}

// ── T-093: 시스템 로그 조회 (1년 보관 정책) ──────────────────────────────────

export async function listAuditLogs(params: {
  page: number
  userId?: string
  from?: string
  to?: string
  action?: string
}) {
  const { page, userId, from, to, action } = params

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const where: Prisma.AuditLogWhereInput = {
    createdAt: {
      gte: from ? new Date(from) : oneYearAgo,
      ...(to && { lte: new Date(to) }),
    },
    ...(userId && { userId }),
    ...(action && { action: { contains: action, mode: 'insensitive' } }),
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    }),
  ])

  return { total, page, pageSize: PAGE_SIZE, items }
}

export function generateAuditLogsCsv(
  items: Awaited<ReturnType<typeof listAuditLogs>>['items'],
): string {
  const lines = ['﻿일시,사용자,이메일,역할,액션,대상유형,대상ID']
  for (const log of items) {
    const row = [
      new Date(log.createdAt).toLocaleString('ko-KR'),
      log.user?.name  ?? '-',
      log.user?.email ?? '-',
      log.user?.role  ?? '-',
      log.action,
      log.targetType,
      log.targetId ?? '-',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
    lines.push(row.join(','))
  }
  return lines.join('\r\n')
}
