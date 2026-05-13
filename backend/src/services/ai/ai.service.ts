import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middlewares/errorHandler'
import { invalidateMealCache, invalidateOrgAnalyticsCache } from '../../lib/cache'
import { applyAutoTaggingBatch, type AutoTaggingTarget } from '../meal/tagging.service'
import { getNeisHistory, type NeisHistoryContext } from '../neis/neis.service'
import { getAIProvider } from './index'
import { buildMealPlanMessages } from './meal-plan-builder'
import { buildAlternateMessages } from './alternate-builder'
import { validateMealPlan, validateAlternate } from './validator'
import type { NutritionThresholds, NutrientItem } from './validator'
import type { DayMenuOutput } from './meal-plan-builder'
import { getPriceCatalogForPrompt } from '../meal-price/price-catalog.service'

// ── T-064 입력 타입 ────────────────────────────────────────

export interface PriceConstraint {
  period:      'month' | 'week' | 'day'
  aggregation: 'avg' | 'total'
  value:       number
}

export interface GenerateMealPlanInput {
  period: { from: string; to: string }   // YYYY-MM-DD
  budget?: number
  calorieTarget?: { min: number; max: number }
  proteinMin?: number
  preferences?: string[]
  excludes?: string[]
  neisAtptCode?: string   // school 기관만
  neisSchulCode?: string
  // T-130
  nutrients?:       NutrientItem[]
  priceConstraint?: PriceConstraint
}

// ── T-065 입력 타입 ────────────────────────────────────────

export interface SuggestAlternatesInput {
  mealItemId: string
  excludeAllergenCodes: number[]
}

// T-130: 1식당 단가 정규화 (aggregation=avg → 이미 일 평균, total → 기간 합계 ÷ 급식일 수)
const MEAL_DAYS_PER_PERIOD: Record<PriceConstraint['period'], number> = {
  day: 1, week: 5, month: 22,
}

function normalizeToPerMealPrice(pc: PriceConstraint): number {
  if (pc.aggregation === 'avg') return Math.round(pc.value)
  return Math.round(pc.value / MEAL_DAYS_PER_PERIOD[pc.period])
}

// ── Step 8: 생성 컨텍스트 타입 ─────────────────────────────

export interface MealPlanGenerationContext {
  orgId: string
  userId: string
  orgType: 'school' | 'company' | 'welfare' | 'military' | 'other'
  neisHistory?: NeisHistoryContext
  budget?: number
  calorieTarget?: { min: number; max: number }
  proteinMin?: number
  preferences?: string[]
  excludes?: string[]
  // T-130
  nutrients?: NutrientItem[]
  perMealPrice?: number
  priceCatalogContext?: string
}

// ── Step 8: 조직 정보 + NEIS 이력 조회 ────────────────────

export async function buildMealPlanGenerationContext(
  input: GenerateMealPlanInput,
  orgId: string,
  userId: string,
): Promise<MealPlanGenerationContext> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { orgType: true },
  })
  if (!org) throw new AppError(404, 'NOT_FOUND', '조직을 찾을 수 없습니다')

  const orgType = org.orgType as MealPlanGenerationContext['orgType']

  let neisHistory: NeisHistoryContext | undefined
  if (orgType === 'school' && input.neisAtptCode && input.neisSchulCode) {
    const from = new Date(input.period.from)
    const to   = new Date(input.period.to)
    const histFrom = new Date(from)
    histFrom.setDate(histFrom.getDate() - 90)
    neisHistory = await getNeisHistory(
      input.neisAtptCode,
      input.neisSchulCode,
      histFrom,
      new Date(to),
    ).catch(() => undefined)
  }

  // T-130: 단가 정규화 + 카탈로그 주입
  const perMealPrice = input.priceConstraint
    ? normalizeToPerMealPrice(input.priceConstraint)
    : undefined

  let priceCatalogContext: string | undefined
  if (perMealPrice) {
    priceCatalogContext = await getPriceCatalogForPrompt(orgId).catch(() => undefined)
  }

  return {
    orgId,
    userId,
    orgType,
    neisHistory,
    budget:        input.budget,
    calorieTarget: input.calorieTarget,
    proteinMin:    input.proteinMin,
    preferences:   input.preferences,
    excludes:      input.excludes,
    nutrients:          input.nutrients,
    perMealPrice,
    priceCatalogContext,
  }
}

// ── Step 8: AI 호출 + 검증 ────────────────────────────────

export async function generateMealPlanWithAI(
  ctx: MealPlanGenerationContext,
  period: { from: Date; to: Date },
): Promise<DayMenuOutput[]> {
  const messages = buildMealPlanMessages({
    orgType:             ctx.orgType,
    period,
    budget:              ctx.budget,
    calorieTarget:       ctx.calorieTarget,
    proteinMin:          ctx.proteinMin,
    preferences:         ctx.preferences,
    excludes:            ctx.excludes,
    neisHistory:         ctx.neisHistory,
    nutrients:           ctx.nutrients,
    perMealPrice:        ctx.perMealPrice,
    priceCatalogContext: ctx.priceCatalogContext,
  })

  const provider = getAIProvider()
  const nutrition: NutritionThresholds = {
    calorieMin: ctx.calorieTarget?.min,
    calorieMax: ctx.calorieTarget?.max,
    proteinMin: ctx.proteinMin,
    nutrients:  ctx.nutrients,
  }
  const aiResult = await validateMealPlan(messages, provider, nutrition)
  return aiResult.mealPlan
}

// ── Step 8: DB 저장 ───────────────────────────────────────

export async function saveGeneratedMealPlan(
  days: DayMenuOutput[],
  orgId: string,
  userId: string,
): Promise<Array<{ id: string; date: string; itemCount: number }>> {
  return prisma.$transaction(async (tx) => {
    const results = []
    const tagTargets: AutoTaggingTarget[] = []

    for (const day of days) {
      const [y, m, d] = day.date.split('-').map(Number)
      const date = new Date(Date.UTC(y, m - 1, d))

      // 같은 날짜의 기존 draft가 있으면 items만 교체, plan ID 재사용
      const existing = await tx.mealPlan.findFirst({
        where: { orgId, date, status: 'draft' },
        select: { id: true },
      })

      let planId: string
      if (existing) {
        await tx.mealItem.deleteMany({ where: { mealPlanId: existing.id } })
        planId = existing.id
      } else {
        const plan = await tx.mealPlan.create({
          data: { orgId, date, createdBy: userId },
        })
        planId = plan.id
      }

      for (const item of day.items) {
        const created = await tx.mealItem.create({
          data: {
            mealPlanId: planId,
            category:   item.category,
            name:       item.name,
            calories:   item.calories ?? undefined,
            nutrients:  item.nutrients as Prisma.InputJsonValue | undefined,
          },
        })
        tagTargets.push({ mealItemId: created.id, mealItemName: created.name })
      }

      results.push({ id: planId, date: day.date, itemCount: day.items.length })
    }

    await applyAutoTaggingBatch(tagTargets, tx)

    return results
  }, { timeout: 30000 }).then((res) => {
    // AI 생성 식단이 영양사 캘린더·analytics에 즉시 보이도록 캐시 무효화
    invalidateMealCache(orgId)
    invalidateOrgAnalyticsCache(orgId)
    return res
  })
}

// ── T-064: 식단 생성 (단일 호출 래퍼) ─────────────────────

export async function generateMealPlan(
  input: GenerateMealPlanInput,
  userId: string,
  orgId: string,
) {
  const ctx   = await buildMealPlanGenerationContext(input, orgId, userId)
  const days  = await generateMealPlanWithAI(ctx, {
    from: new Date(input.period.from),
    to:   new Date(input.period.to),
  })
  const savedPlans = await saveGeneratedMealPlan(days, orgId, userId)
  return { mealPlans: savedPlans }
}

// ── T-065: 대체 식단 제안 ──────────────────────────────────

export async function suggestAlternates(
  input: SuggestAlternatesInput,
  _userId: string,
) {
  if (input.excludeAllergenCodes.length === 0) {
    throw new AppError(400, 'BAD_REQUEST', '제외 알레르기 코드를 1개 이상 입력하세요')
  }

  const originalItem = await prisma.mealItem.findUnique({
    where:   { id: input.mealItemId },
    include: { mealPlan: { select: { id: true, orgId: true } } },
  })
  if (!originalItem) throw new AppError(404, 'NOT_FOUND', '식단 메뉴를 찾을 수 없습니다')

  const primaryCode = input.excludeAllergenCodes[0]
  const allergen = await prisma.allergen.findFirst({
    where: { code: primaryCode },
  })
  if (!allergen) {
    throw new AppError(404, 'NOT_FOUND', `알레르기 코드 ${primaryCode}를 찾을 수 없습니다`)
  }

  const messages = buildAlternateMessages({
    originalItem: {
      name:     originalItem.name,
      category: originalItem.category as 'rice' | 'soup' | 'side' | 'dessert',
      calories: originalItem.calories,
    },
    excludeAllergenCodes: input.excludeAllergenCodes,
    candidateCount: 3,
  })

  const provider = getAIProvider()
  const aiResult = await validateAlternate(messages, provider, input.excludeAllergenCodes)

  const altPlan = await prisma.alternateMealPlan.create({
    data: {
      mealPlanId:       originalItem.mealPlanId,
      targetAllergenId: allergen.id,
      status:           'draft',
      items: {
        create: aiResult.candidates.map((c) => ({
          replacesItemId: input.mealItemId,
          name:           c.name,
          calories:       c.calories ?? undefined,
          nutrients:      c.nutrients as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: { items: true },
  })

  return {
    altPlanId:  altPlan.id,
    candidates: altPlan.items.map((item, i) => ({
      id:       item.id,
      name:     item.name,
      category: aiResult.candidates[i]?.category ?? originalItem.category,
      calories: item.calories,
      reason:   aiResult.candidates[i]?.reason ?? '',
    })),
  }
}
