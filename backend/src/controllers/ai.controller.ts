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
  // T-064: 동기 처리 — max_tokens 8192 기준 단일 호출 ~25s + 재시도 버퍼
  req.setTimeout(55_000)
  res.setTimeout(55_000)

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
    const suggestions: string[] = []

    const caloriesOk = calorieTarget
      ? totalCalories >= calorieTarget.min && totalCalories <= calorieTarget.max
      : true
    const proteinOk = proteinMin ? totalProtein >= proteinMin : true

    if (!caloriesOk && calorieTarget) {
      const diff = totalCalories - calorieTarget.max
      if (diff > 0) {
        warnings.push(`총 칼로리 ${totalCalories} kcal가 목표 상한(${calorieTarget.max} kcal)을 ${diff} kcal 초과했습니다`)
        suggestions.push(`고칼로리 반찬(튀김류·볶음류)을 구이·찜 조리법으로 교체하거나 1인분 제공량을 줄여 ${diff} kcal를 줄이세요.`)
      } else {
        const shortage = calorieTarget.min - totalCalories
        warnings.push(`총 칼로리 ${totalCalories} kcal가 목표 하한(${calorieTarget.min} kcal)보다 ${shortage} kcal 부족합니다`)
        suggestions.push(`밥량을 늘리거나 견과류·치즈 등 열량 보충 식품을 후식으로 추가해 ${shortage} kcal를 보충하세요.`)
      }
    }
    if (!proteinOk && proteinMin) {
      const shortage = Math.round((proteinMin - totalProtein) * 10) / 10
      warnings.push(`총 단백질 ${totalProtein} g가 최소 기준 ${proteinMin} g에 ${shortage} g 미달합니다`)
      suggestions.push(`두부·달걀·생선 반찬을 추가하거나 육류 제공량을 늘려 단백질 ${shortage} g를 보충하세요.`)
    }
    // 지방 비율 경고 (총 칼로리 대비 30% 초과)
    if (totalCalories > 0 && (totalFat * 9) / totalCalories > 0.3) {
      warnings.push('지방에서 오는 열량이 전체의 30%를 초과합니다')
      suggestions.push('튀김·전 메뉴를 줄이고 나물·생채류를 늘려 지방 비율을 낮추세요.')
    }

    sendSuccess(res, {
      totalCalories:  Math.round(totalCalories),
      totalNutrients: {
        carbs:   Math.round(totalCarbs   * 10) / 10,
        protein: Math.round(totalProtein * 10) / 10,
        fat:     Math.round(totalFat     * 10) / 10,
      },
      validation: { caloriesOk, proteinOk, warnings },
      suggestions,
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
