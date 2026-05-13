import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { createAlternatePlan, confirmAlternatePlan, saveAlternatePlans } from '../services/alternate/alternate.service'
import { sendSuccess } from '../middlewares/response'

const alternateItemSchema = z.object({
  replacesItemId: z.string().min(1, 'replacesItemId를 입력하세요'),
  name:           z.string().min(1, '메뉴 이름을 입력하세요').max(100),
  calories:       z.number().int().nonnegative().optional(),
  nutrients:      z.record(z.string(), z.unknown()).optional(),
})

const createAlternateSchema = z.object({
  targetAllergenId: z.string().min(1, '대상 알레르기 ID를 입력하세요'),
  items:            z.array(alternateItemSchema).min(1, '대체 메뉴를 하나 이상 입력하세요'),
})

// POST /meals/:id/alternates
export async function createAlternateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const mealPlanId = req.params.id
    const { orgId }  = req.user!
    const body       = createAlternateSchema.parse(req.body)

    const plan = await createAlternatePlan({ ...body, mealPlanId, orgId })
    sendSuccess(res, plan, 201)
  } catch (err) {
    next(err)
  }
}

// POST /meals/:id/alternates/save  (T-136)
export async function saveAlternatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const mealPlanId          = req.params.id
    const { sub: userId, orgId } = req.user!

    const result = await saveAlternatePlans(mealPlanId, userId, orgId)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

// PUT /alternates/:id/confirm
export async function confirmAlternateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }             = req.params
    const { sub: userId, orgId } = req.user!

    const plan = await confirmAlternatePlan(id, userId, orgId)
    sendSuccess(res, plan)
  } catch (err) {
    next(err)
  }
}
