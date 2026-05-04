import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import {
  getUserAllergens,
  registerAllergen,
  updateAllergen,
  deleteAllergen,
  checkMealAllergens,
  getUserAlternateMeals,
} from '../services/allergen/allergen.service'
import { sendSuccess } from '../middlewares/response'

export async function listMasterAllergensHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const allergens = await prisma.allergen.findMany({
      where: { code: { gt: 0 } },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, iconUrl: true },
    })
    sendSuccess(res, allergens)
  } catch (err) {
    next(err)
  }
}

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

const updateSchema = z.object({
  customAllergenName: z.string().min(1).max(100).nullable().optional(),
})

export async function updateAllergenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { sub: userId, role } = req.user!
    const input = updateSchema.parse(req.body)
    const record = await updateAllergen(id, userId, role, {
      customAllergenName: input.customAllergenName ?? undefined,
    })
    sendSuccess(res, record)
  } catch (err) {
    next(err)
  }
}

export async function deleteAllergenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await deleteAllergen(id, req.user!.sub)
    sendSuccess(res, null)
  } catch (err) {
    next(err)
  }
}

export async function alternateMealsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub
    const date = req.query.date as string | undefined
    const result = await getUserAlternateMeals(userId, date)
    sendSuccess(res, result)
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
