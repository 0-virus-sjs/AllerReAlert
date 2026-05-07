import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { sendSuccess } from '../middlewares/response'
import {
  linkGuardianToStudent,
  getChildren,
  getChildAllergens,
} from '../services/guardian/guardian.service'

const linkSchema = z.object({
  linkCode: z.string().min(1).max(20),
})

export async function linkChildHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { linkCode } = linkSchema.parse(req.body)
    const result = await linkGuardianToStudent(req.user!.sub, linkCode)
    sendSuccess(res, result, 201)
  } catch (err) {
    next(err)
  }
}

export async function listChildrenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const children = await getChildren(req.user!.sub)
    sendSuccess(res, children)
  } catch (err) {
    next(err)
  }
}

export async function getChildAllergensHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentId } = req.params
    const allergens = await getChildAllergens(req.user!.sub, studentId)
    sendSuccess(res, allergens)
  } catch (err) {
    next(err)
  }
}
