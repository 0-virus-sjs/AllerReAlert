import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../middlewares/errorHandler'
import { applyAutoTagging } from '../meal/tagging.service'
import { getNeisHistory } from '../neis/neis.service'
import { getAIProvider } from './index'
import { buildMealPlanMessages } from './meal-plan-builder'
import { buildAlternateMessages } from './alternate-builder'
import { validateMealPlan, validateAlternate } from './validator'
import type { NutritionThresholds } from './validator'

// ── T-064 입력 타입 ────────────────────────────────────────

export interface GenerateMealPlanInput {
  period: { from: string; to: string }   // YYYY-MM-DD
  budget?: number
  calorieTarget?: { min: number; max: number }
  proteinMin?: number
  preferences?: string[]
  excludes?: string[]
  neisAtptCode?: string   // school 기관만
  neisSchulCode?: string
}

// ── T-065 입력 타입 ────────────────────────────────────────

export interface SuggestAlternatesInput {
  mealItemId: string
  excludeAllergenCodes: number[]
}

// ── T-064: 식단 생성 ───────────────────────────────────────

export async function generateMealPlan(
  input: GenerateMealPlanInput,
  userId: string,
  orgId: string,
) {
  // 조직 정보 (orgType 확인)
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { orgType: true },
  })
  if (!org) throw new AppError(404, 'NOT_FOUND', '조직을 찾을 수 없습니다')

  const orgType = org.orgType as 'school' | 'company' | 'welfare' | 'military' | 'other'

  // NEIS 이력 (school + 코드 제공 시만)
  let neisHistory = undefined
  if (orgType === 'school' && input.neisAtptCode && input.neisSchulCode) {
    const from = new Date(input.period.from)
    const to   = new Date(input.period.to)
    // 최근 90일 이력 조회
    const histFrom = new Date(from)
    histFrom.setDate(histFrom.getDate() - 90)
    neisHistory = await getNeisHistory(
      input.neisAtptCode,
      input.neisSchulCode,
      histFrom,
      new Date(to),
    ).catch(() => undefined)   // NEIS 실패해도 생성 계속 진행
  }

  // 프롬프트 빌드
  const messages = buildMealPlanMessages({
    orgType,
    period: { from: new Date(input.period.from), to: new Date(input.period.to) },
    budget:        input.budget,
    calorieTarget: input.calorieTarget,
    proteinMin:    input.proteinMin,
    preferences:   input.preferences,
    excludes:      input.excludes,
    neisHistory,
  })

  // AI 호출 + Zod 검증 (최대 2회 재시도)
  const provider = getAIProvider()
  const nutrition: NutritionThresholds = {
    calorieMin: input.calorieTarget?.min,
    calorieMax: input.calorieTarget?.max,
    proteinMin: input.proteinMin,
  }
  const aiResult = await validateMealPlan(messages, provider, nutrition)

  // DB 저장 — 날짜별 MealPlan + MealItems + 자동 태깅
  const savedPlans = await prisma.$transaction(async (tx) => {
    const results = []

    for (const day of aiResult.mealPlan) {
      const [y, m, d] = day.date.split('-').map(Number)
      const date = new Date(Date.UTC(y, m - 1, d))

      const plan = await tx.mealPlan.create({
        data: { orgId, date, createdBy: userId },
      })

      const items = await Promise.all(
        day.items.map((item) =>
          tx.mealItem.create({
            data: {
              mealPlanId: plan.id,
              category:   item.category,
              name:       item.name,
              calories:   item.calories ?? undefined,
              nutrients:  item.nutrients as Prisma.InputJsonValue | undefined,
            },
          }),
        ),
      )

      // T-033 자동 태깅
      await Promise.all(items.map((item) => applyAutoTagging(item.id, item.name, tx)))

      results.push({ id: plan.id, date: day.date, itemCount: items.length })
    }

    return results
  })

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

  // 원본 MealItem 로드
  const originalItem = await prisma.mealItem.findUnique({
    where:   { id: input.mealItemId },
    include: { mealPlan: { select: { id: true, orgId: true } } },
  })
  if (!originalItem) throw new AppError(404, 'NOT_FOUND', '식단 메뉴를 찾을 수 없습니다')

  // AlternateMealPlan.targetAllergenId 용 — 첫 번째 코드 기준
  const primaryCode = input.excludeAllergenCodes[0]
  const allergen = await prisma.allergen.findFirst({
    where: { code: primaryCode },
  })
  if (!allergen) {
    throw new AppError(404, 'NOT_FOUND', `알레르기 코드 ${primaryCode}를 찾을 수 없습니다`)
  }

  // 프롬프트 빌드
  const messages = buildAlternateMessages({
    originalItem: {
      name:     originalItem.name,
      category: originalItem.category as 'rice' | 'soup' | 'side' | 'dessert',
      calories: originalItem.calories,
    },
    excludeAllergenCodes: input.excludeAllergenCodes,
    candidateCount: 3,
  })

  // AI 호출 + 알레르기 누설 검증
  const provider = getAIProvider()
  const aiResult = await validateAlternate(messages, provider, input.excludeAllergenCodes)

  // DB 저장 — AlternateMealPlan(draft) + AlternateMealItems
  const altPlan = await prisma.alternateMealPlan.create({
    data: {
      mealPlanId:      originalItem.mealPlanId,
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
