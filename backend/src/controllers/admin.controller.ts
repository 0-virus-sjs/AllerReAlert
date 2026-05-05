import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { sendSuccess } from '../middlewares/response'
import {
  listOrganizations, createOrganization, updateOrganization,
  listUsers, changeUserRole, changeUserStatus,
  listMasterAllergens, createAllergen, updateAllergen, deleteAllergen,
  listAuditLogs, generateAuditLogsCsv,
} from '../services/admin/admin.service'
import type { OrgType, UserRole } from '@prisma/client'

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
})

// ── T-090: 단체 ──────────────────────────────────────────────────────────────

const orgListSchema = pageSchema.extend({
  orgType: z.enum(['school','company','welfare','military','other']).optional(),
  search:  z.string().optional(),
})

const orgBodySchema = z.object({
  name:           z.string().min(1),
  address:        z.string().optional(),
  orgType:        z.enum(['school','company','welfare','military','other']),
  gradeStructure: z.record(z.string(), z.unknown()).optional(),
  mealTime:       z.record(z.string(), z.unknown()).optional(),
})

export async function listOrgsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const q = orgListSchema.parse(req.query)
    const data = await listOrganizations({ ...q, orgType: q.orgType as OrgType | undefined })
    return sendSuccess(res, data)
  } catch (err) { next(err) }
}

export async function createOrgHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = orgBodySchema.parse(req.body)
    const data = await createOrganization({ ...body, orgType: body.orgType as OrgType })
    return sendSuccess(res, data, 201)
  } catch (err) { next(err) }
}

export async function updateOrgHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const body = orgBodySchema.partial().parse(req.body)
    const data = await updateOrganization(id, { ...body, orgType: body.orgType as OrgType | undefined })
    return sendSuccess(res, data)
  } catch (err) { next(err) }
}

// ── T-091: 사용자 ────────────────────────────────────────────────────────────

const userListSchema = pageSchema.extend({
  orgId:    z.string().optional(),
  role:     z.enum(['student','staff','guardian','nutritionist','admin']).optional(),
  isActive: z.enum(['true','false']).transform((v) => v === 'true').optional(),
  search:   z.string().optional(),
})

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const q = userListSchema.parse(req.query)
    const data = await listUsers({ ...q, role: q.role as UserRole | undefined })
    return sendSuccess(res, data)
  } catch (err) { next(err) }
}

export async function changeRoleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { role } = z.object({ role: z.enum(['student','staff','guardian','nutritionist','admin']) }).parse(req.body)
    const data = await changeUserRole(id, role as UserRole, req.user!.sub)
    return sendSuccess(res, data)
  } catch (err) { next(err) }
}

export async function changeStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body)
    const data = await changeUserStatus(id, isActive, req.user!.sub)
    return sendSuccess(res, data)
  } catch (err) { next(err) }
}

// ── T-092: 알레르기 마스터 ───────────────────────────────────────────────────

const allergenBodySchema = z.object({
  name:    z.string().min(1),
  code:    z.number().int().min(1),
  iconUrl: z.string().url().optional(),
})

export async function listAllergensMasterHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listMasterAllergens()
    return sendSuccess(res, data)
  } catch (err) { next(err) }
}

export async function createAllergenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = allergenBodySchema.parse(req.body)
    const data = await createAllergen(body)
    return sendSuccess(res, data, 201)
  } catch (err) { next(err) }
}

export async function updateAllergenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const body = allergenBodySchema.partial().parse(req.body)
    const data = await updateAllergen(id, body)
    return sendSuccess(res, data)
  } catch (err) { next(err) }
}

export async function deleteAllergenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await deleteAllergen(id)
    return sendSuccess(res, { id })
  } catch (err) { next(err) }
}

// ── T-093: 시스템 로그 ───────────────────────────────────────────────────────

const logsQuerySchema = pageSchema.extend({
  userId: z.string().optional(),
  from:   z.string().optional(),
  to:     z.string().optional(),
  action: z.string().optional(),
  format: z.enum(['json','csv']).default('json'),
})

export async function listLogsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const q = logsQuerySchema.parse(req.query)
    const result = await listAuditLogs(q)

    if (q.format === 'csv') {
      const csv = generateAuditLogsCsv(result.items)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"')
      return res.send(csv)
    }

    return sendSuccess(res, result)
  } catch (err) { next(err) }
}
