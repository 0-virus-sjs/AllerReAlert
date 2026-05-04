import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { createMealPlan, createBulkMealPlans } from '../services/meal/meal.service'
import { sendSuccess } from '../middlewares/response'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

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
