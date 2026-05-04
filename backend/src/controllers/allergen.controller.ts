import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { getUserAllergens, registerAllergen, checkMealAllergens } from '../services/allergen/allergen.service'
import { sendSuccess } from '../middlewares/response'

export async function listUserAllergensHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const allergens = await getUserAllergens(req.user!.sub)
    sendSuccess(res, allergens)
  } catch (err) {
    next(err)
  }
}

const registerSchema = z.object({
  allergenId: z.string().min(1).optional(),
  customAllergenName: z.string().min(1).max(100).optional(),
})

export async function registerAllergenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body)
    const { sub: userId, role } = req.user!
    const record = await registerAllergen(userId, role, input)
    sendSuccess(res, record, 201)
  } catch (err) {
    next(err)
  }
}

export async function allergenCheckHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: mealPlanId } = req.params
    const userId = (req.query.user_id as string | undefined) ?? req.user!.sub
    const result = await checkMealAllergens(mealPlanId, userId)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
