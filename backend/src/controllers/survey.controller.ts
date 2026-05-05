import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { listSurveys, getSurveyById, createSurvey } from '../services/survey/survey.service'
import { sendSuccess } from '../middlewares/response'

const listQuerySchema = z.object({
  meal_plan_id: z.string().optional(),
})

const createSchema = z.object({
  mealPlanId: z.string().min(1),
  type: z.enum(['need_check', 'menu_vote']),
  options: z.record(z.string(), z.unknown()),
  deadline: z.string().datetime({ message: 'deadline은 ISO 8601 형식이어야 합니다' }),
})

export async function listSurveysHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { meal_plan_id } = listQuerySchema.parse(req.query)
    const { sub: userId, role, orgId } = req.user!
    const surveys = await listSurveys(orgId, userId, role, meal_plan_id)
    sendSuccess(res, surveys)
  } catch (err) { next(err) }
}

export async function getSurveyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { sub: userId, role, orgId } = req.user!
    const survey = await getSurveyById(req.params.id, orgId, userId, role)
    sendSuccess(res, survey)
  } catch (err) { next(err) }
}

export async function createSurveyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body)
    const { sub: userId, orgId } = req.user!
    const survey = await createSurvey(body as Parameters<typeof createSurvey>[0], userId, orgId)
    sendSuccess(res, survey, 201)
  } catch (err) { next(err) }
}
