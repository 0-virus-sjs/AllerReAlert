import { z } from 'zod'
import { logger } from '../../lib/logger'
import type { AIProvider, AIMessage } from './provider'
import { checkAllergenLeak } from './alternate-builder'

// ── Zod 스키마 ─────────────────────────────────────────────

const NutrientsSchema = z
  .object({
    carbs:   z.number().nullable().optional(),
    protein: z.number().nullable().optional(),
    fat:     z.number().nullable().optional(),
  })
  .nullable()
  .optional()

export const MealItemOutputSchema = z.object({
  category:     z.enum(['rice', 'soup', 'side', 'dessert']),
  name:         z.string().min(1),
  calories:     z.number().positive().nullable().optional().default(null),
  nutrients:    NutrientsSchema,
  allergenCodes: z.array(z.number().int().min(1).max(22)).default([]),
})

export const MealPlanOutputSchema = z.object({
  mealPlan: z
    .array(
      z.object({
        date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD'),
        items: z.array(MealItemOutputSchema).min(1),
      }),
    )
    .min(1),
})

export const AlternateCandidateOutputSchema = z.object({
  name:          z.string().min(1),
  category:      z.enum(['rice', 'soup', 'side', 'dessert']),
  calories:      z.number().positive().nullable().optional().default(null),
  nutrients:     NutrientsSchema,
  allergenCodes: z.array(z.number().int().min(1).max(22)).default([]),
  reason:        z.string().default(''),
})

export const AlternateOutputSchema = z.object({
  candidates: z.array(AlternateCandidateOutputSchema).min(1).max(5),
})

export type MealPlanOutput   = z.infer<typeof MealPlanOutputSchema>
export type AlternateOutput  = z.infer<typeof AlternateOutputSchema>

// ── 영양 검증 옵션 ─────────────────────────────────────────

export interface NutritionThresholds {
  calorieMin?: number
  calorieMax?: number
  proteinMin?: number
}

// ── 내부 유틸 ──────────────────────────────────────────────

// AI 응답에서 JSON 추출 (마크다운 코드블록 제거)
function extractJson(text: string): string {
  const block = text.match(/```(?:json)?\n?([\s\S]+?)\n?```/)
  return block ? block[1].trim() : text.trim()
}

function buildRetryMessage(reason: string): AIMessage {
  return {
    role:    'user',
    content: `이전 응답이 올바르지 않습니다: ${reason}\n\nJSON만 다시 출력하세요. 설명 없이 순수 JSON만.`,
  }
}

// ── 공통 재시도 엔진 ───────────────────────────────────────

async function callWithValidation<T>(
  messages: AIMessage[],
  schema: z.ZodType<T>,
  provider: AIProvider,
  postValidate: (parsed: T) => string | null,  // null = OK, string = 에러 메시지
  maxRetries = 2,
  maxTokens?: number,
): Promise<T> {
  const conversationMsgs = [...messages]

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { content } = await provider.complete(conversationMsgs, { maxTokens: maxTokens ?? 4096 })

    // JSON 파싱
    let raw: unknown
    try {
      raw = JSON.parse(extractJson(content))
    } catch {
      if (attempt < maxRetries) {
        logger.warn({ attempt }, '[T-063] JSON 파싱 실패 — 재요청')
        conversationMsgs.push({ role: 'assistant', content })
        conversationMsgs.push(buildRetryMessage('유효한 JSON이 아닙니다.'))
        continue
      }
      throw new Error(`AI 응답 JSON 파싱 실패 (${maxRetries + 1}회 시도): ${content.slice(0, 200)}`)
    }

    // Zod 스키마 검증
    const result = schema.safeParse(raw)
    if (!result.success) {
      const errMsg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      if (attempt < maxRetries) {
        logger.warn({ attempt, errMsg }, '[T-063] Zod 검증 실패 — 재요청')
        conversationMsgs.push({ role: 'assistant', content })
        conversationMsgs.push(buildRetryMessage(`JSON 스키마 오류: ${errMsg}`))
        continue
      }
      throw new Error(`AI 응답 스키마 검증 실패: ${errMsg}`)
    }

    // 후처리 검증 (영양 / 알레르기 누설)
    const postError = postValidate(result.data)
    if (postError) {
      if (attempt < maxRetries) {
        logger.warn({ attempt, postError }, '[T-063] 후처리 검증 실패 — 재요청')
        conversationMsgs.push({ role: 'assistant', content })
        conversationMsgs.push(buildRetryMessage(postError))
        continue
      }
      throw new Error(`AI 응답 후처리 검증 실패: ${postError}`)
    }

    logger.info({ attempt, provider: provider.name }, '[T-063] AI 응답 검증 완료')
    return result.data
  }

  throw new Error('unreachable')
}

// ── 공개 API ───────────────────────────────────────────────

/**
 * T-063: 식단 생성 응답 검증 (영양 기준 포함).
 */
export async function validateMealPlan(
  messages: AIMessage[],
  provider: AIProvider,
  nutrition?: NutritionThresholds,
): Promise<MealPlanOutput> {
  return callWithValidation(
    messages,
    MealPlanOutputSchema,
    provider,
    (data) => {
      if (!nutrition) return null

      for (const day of data.mealPlan) {
        const totalCal = day.items.reduce((sum, i) => sum + (i.calories ?? 0), 0)
        const totalProtein = day.items.reduce(
          (sum, i) => sum + (i.nutrients?.protein ?? 0),
          0,
        )

        if (nutrition.calorieMin && totalCal > 0 && totalCal < nutrition.calorieMin) {
          return `${day.date} 칼로리(${totalCal} kcal)가 최소 기준(${nutrition.calorieMin} kcal) 미달입니다. 조정해주세요.`
        }
        if (nutrition.calorieMax && totalCal > nutrition.calorieMax) {
          return `${day.date} 칼로리(${totalCal} kcal)가 최대 기준(${nutrition.calorieMax} kcal) 초과입니다. 조정해주세요.`
        }
        if (nutrition.proteinMin && totalProtein > 0 && totalProtein < nutrition.proteinMin) {
          return `${day.date} 단백질(${totalProtein}g)이 최소 기준(${nutrition.proteinMin}g) 미달입니다. 단백질 메뉴를 추가해주세요.`
        }
      }

      return null
    },
    2,
    8192,   // 월간 식단 ~6,000 토큰 필요 — 4096이면 JSON 중간 절단됨
  )
}

/**
 * T-063: 대체 식단 응답 검증 (알레르기 누설 포함, PRD §11.3).
 */
export async function validateAlternate(
  messages: AIMessage[],
  provider: AIProvider,
  excludeAllergenCodes: number[],
): Promise<AlternateOutput> {
  return callWithValidation(
    messages,
    AlternateOutputSchema,
    provider,
    (data) => {
      if (excludeAllergenCodes.length === 0) return null

      const { hasLeak, leakedCandidates } = checkAllergenLeak(
        data.candidates,
        excludeAllergenCodes,
      )

      if (!hasLeak) return null

      const detail = leakedCandidates
        .map((c) => `'${c.name}'(코드: ${c.leakedCodes.join(',')})`)
        .join(', ')

      return `알레르기 누설 감지: ${detail}. 해당 메뉴를 반드시 알레르기 코드 [${excludeAllergenCodes.join(',')}] 를 포함하지 않는 메뉴로 교체하세요.`
    },
  )
}
