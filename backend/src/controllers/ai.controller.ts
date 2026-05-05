import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { generateMealPlan, suggestAlternates } from '../services/ai/ai.service'
import { sendSuccess } from '../middlewares/response'

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// ── T-064: POST /ai/generate-meal-plan ────────────────────

const generateSchema = z.object({
  period: z.object({
    from: z.string().regex(dateRegex, 'from 형식은 YYYY-MM-DD'),
    to:   z.string().regex(dateRegex, 'to 형식은 YYYY-MM-DD'),
  }),
  budget:        z.number().positive().optional(),
  calorieTarget: z.object({ min: z.number().positive(), max: z.number().positive() }).optional(),
  proteinMin:    z.number().positive().optional(),
  preferences:   z.array(z.string()).optional(),
  excludes:      z.array(z.string()).optional(),
  neisAtptCode:  z.string().optional(),
  neisSchulCode: z.string().optional(),
})

export async function generateMealPlanHandler(req: Request, res: Response, next: NextFunction) {
  // T-064: 동기 처리 — 30초 타임아웃 (NFR-PFM-003)
  req.setTimeout(35_000)
  res.setTimeout(35_000)

  try {
    const input  = generateSchema.parse(req.body)
    const userId = req.user!.sub
    const orgId  = req.user!.orgId
    const result = await generateMealPlan(input, userId, orgId)
    sendSuccess(res, result, 201)
  } catch (err) {
    next(err)
  }
}

// ── T-066: POST /ai/recalculate-nutrition (Phase 2 stub) ──

const recalcSchema = z.object({
  items: z.array(
    z.object({
      name:      z.string().min(1),
      calories:  z.number().positive().optional(),
      nutrients: z.object({
        carbs:   z.number().nonnegative().optional(),
        protein: z.number().nonnegative().optional(),
        fat:     z.number().nonnegative().optional(),
      }).optional(),
    })
  ).min(1),
  calorieTarget: z.object({ min: z.number().positive(), max: z.number().positive() }).optional(),
  proteinMin:    z.number().positive().optional(),
})

export async function recalculateNutritionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, calorieTarget, proteinMin } = recalcSchema.parse(req.body)

    let totalCalories = 0
    let totalCarbs = 0
    let totalProtein = 0
    let totalFat = 0

    for (const item of items) {
      totalCalories += item.calories ?? 0
      totalCarbs    += item.nutrients?.carbs   ?? 0
      totalProtein  += item.nutrients?.protein ?? 0
      totalFat      += item.nutrients?.fat     ?? 0
    }

    const warnings: string[] = []
    const caloriesOk = calorieTarget
      ? totalCalories >= calorieTarget.min && totalCalories <= calorieTarget.max
      : true
    const proteinOk = proteinMin ? totalProtein >= proteinMin : true

    if (!caloriesOk && calorieTarget) {
      warnings.push(
        `총 칼로리 ${totalCalories} kcal가 목표 범위 (${calorieTarget.min}~${calorieTarget.max} kcal)를 벗어났습니다`,
      )
    }
    if (!proteinOk && proteinMin) {
      warnings.push(`총 단백질 ${totalProtein} g가 최소 기준 ${proteinMin} g에 미달합니다`)
    }

    sendSuccess(res, {
      totalCalories:   Math.round(totalCalories),
      totalNutrients:  {
        carbs:   Math.round(totalCarbs   * 10) / 10,
        protein: Math.round(totalProtein * 10) / 10,
        fat:     Math.round(totalFat     * 10) / 10,
      },
      validation: { caloriesOk, proteinOk, warnings },
    })
  } catch (err) {
    next(err)
  }
}

// ── T-065: POST /ai/suggest-alternates ────────────────────

const suggestSchema = z.object({
  mealItemId:           z.string().min(1),
  excludeAllergenCodes: z.array(z.number().int().min(1).max(22)).min(1),
})

export async function suggestAlternatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input  = suggestSchema.parse(req.body)
    const userId = req.user!.sub
    const result = await suggestAlternates(input, userId)
    sendSuccess(res, result, 201)
  } catch (err) {
    next(err)
  }
}
