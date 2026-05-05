import { api } from './api'

interface ApiOk<T> { success: boolean; data: T }

// ── T-064: 식단 생성 요청 ──────────────────────────────────

export interface GenerateMealPlanInput {
  period:        { from: string; to: string }
  budget?:       number
  calorieTarget?: { min: number; max: number }
  proteinMin?:   number
  preferences?:  string[]
  excludes?:     string[]
  neisAtptCode?: string
  neisSchulCode?: string
}

export interface GeneratedPlanSummary {
  id:        string
  date:      string   // YYYY-MM-DD
  itemCount: number
}

export interface GenerateMealPlanResult {
  mealPlans: GeneratedPlanSummary[]
}

export async function generateMealPlan(
  input: GenerateMealPlanInput,
): Promise<GenerateMealPlanResult> {
  const { data } = await api.post<ApiOk<GenerateMealPlanResult>>('/ai/generate-meal-plan', input, {
    timeout: 40_000,
  })
  return data.data
}

// ── T-065: 대체 식단 제안 ──────────────────────────────────

export interface SuggestAlternatesInput {
  mealItemId:           string
  excludeAllergenCodes: number[]
}

export interface AlternateCandidate {
  id:       string
  name:     string
  category: string
  calories: number | null
  reason:   string
}

export interface SuggestAlternatesResult {
  altPlanId:  string
  candidates: AlternateCandidate[]
}

export async function suggestAlternates(
  input: SuggestAlternatesInput,
): Promise<SuggestAlternatesResult> {
  const { data } = await api.post<ApiOk<SuggestAlternatesResult>>('/ai/suggest-alternates', input)
  return data.data
}
