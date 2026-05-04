import type { Request, Response, NextFunction } from 'express'
import { getUserAllergens } from '../services/allergen/allergen.service'
import { sendSuccess } from '../middlewares/response'

export async function listUserAllergensHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const allergens = await getUserAllergens(req.user!.sub)
    sendSuccess(res, allergens)
  } catch (err) {
    next(err)
  }
}
