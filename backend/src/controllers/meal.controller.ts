import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  createMealPlan,
  createBulkMealPlans,
  updateMealPlan,
  deleteMealPlan,
  publishMealPlan,
  getMealPlans,
  getMealPlanById,
} from '../services/meal/meal.service'
import { generateMealPdf } from '../services/meal/pdf.service'
import { sendSuccess } from '../middlewares/response'

const dateRegex    = /^\d{4}-\d{2}-\d{2}$/
const monthRegex   = /^\d{4}-\d{2}$/

// ── T-034 읽기 ────────────────────────────────────────

const listQuerySchema = z.object({
  month: z.string().regex(monthRegex, 'month 형식은 YYYY-MM'),
})

export async function listMealsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { month } = listQuerySchema.parse(req.query)
    const { orgId } = req.user!
    const plans = await getMealPlans(orgId, month)
    sendSuccess(res, plans)
  } catch (err) {
    next(err)
  }
}

export async function getMealHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { orgId } = req.user!
    const plan = await getMealPlanById(id, orgId)
    sendSuccess(res, plan)
  } catch (err) {
    next(err)
  }
}

// ─────────────────────────────────────────────────────

const mealItemSchema = z.object({
  category: z.enum(['rice', 'soup', 'side', 'dessert']),
  name: z.string().min(1, '메뉴 이름을 입력하세요').max(100),
  calories: z.number().int().nonnegative().optional(),
  nutrients: z.record(z.string(), z.unknown()).optional(),
})

const singleMealSchema = z.object({
  date: z.string().regex(dateRegex, '날짜 형식은 YYYY-MM-DD'),
  items: z.array(mealItemSchema).min(1, '메뉴 항목을 하나 이상 입력하세요'),
})

// 월간 일괄: { meals: [...] }
const bulkMealSchema = z.object({
  meals: z.array(singleMealSchema).min(1).max(31, '한 번에 최대 31일분 등록 가능'),
})

const createMealBodySchema = z.union([bulkMealSchema, singleMealSchema])

export async function createMealHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createMealBodySchema.parse(req.body)
    const { orgId, sub: createdBy } = req.user!

    if ('meals' in body) {
      const plans = await createBulkMealPlans(
        body.meals.map((m) => ({ ...m, orgId, createdBy })),
      )
      sendSuccess(res, plans, 201)
    } else {
      const plan = await createMealPlan({ ...body, orgId, createdBy })
      sendSuccess(res, plan, 201)
    }
  } catch (err) {
    next(err)
  }
}

// ── T-031 ─────────────────────────────────────────────

const updateMealBodySchema = z
  .object({
    date: z.string().regex(dateRegex, '날짜 형식은 YYYY-MM-DD').optional(),
    items: z.array(mealItemSchema).min(1).optional(),
  })
  .refine((b) => b.date !== undefined || b.items !== undefined, {
    message: 'date 또는 items 중 하나 이상 입력하세요',
  })

export async function updateMealHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const body = updateMealBodySchema.parse(req.body)
    const { sub: userId, orgId } = req.user!

    const plan = await updateMealPlan(id, userId, orgId, body)
    sendSuccess(res, plan)
  } catch (err) {
    next(err)
  }
}

export async function deleteMealHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { sub: userId, orgId } = req.user!

    await deleteMealPlan(id, userId, orgId)
    sendSuccess(res, null)
  } catch (err) {
    next(err)
  }
}

// ── T-032 ─────────────────────────────────────────────

const publishBodySchema = z.object({
  scheduledAt: z.string().optional(),  // ISO 8601 여부는 서비스에서 new Date() 검증
})

export async function publishMealHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { orgId } = req.user!
    const { scheduledAt } = publishBodySchema.parse(req.body)

    const plan = await publishMealPlan(id, orgId, scheduledAt)
    sendSuccess(res, plan)
  } catch (err) {
    next(err)
  }
}

// ── T-047 PDF 다운로드 ────────────────────────────────

const exportQuerySchema = z.object({
  month: z.string().regex(monthRegex, 'month 형식은 YYYY-MM'),
})

export async function exportMealPdfHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { month } = exportQuerySchema.parse(req.query)
    const { orgId, sub: userId } = req.user!

    const pdfBuffer = await generateMealPdf({ orgId, month, userId })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="meal-${month}.pdf"`)
    res.send(pdfBuffer)
  } catch (err) {
    next(err)
  }
}
