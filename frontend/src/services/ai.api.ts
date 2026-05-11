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

export interface GenerateMealPlanJobStart {
  jobId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
}

export interface GenerateMealPlanJob {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  totalDays: number | null
  completedDays: number
  result: GenerateMealPlanResult | null
  error: string | null
}

export async function startMealPlanGeneration(
  input: GenerateMealPlanInput,
): Promise<GenerateMealPlanJobStart> {
  const { data } = await api.post<ApiOk<GenerateMealPlanJobStart>>('/ai/generate-meal-plan', input, {
    timeout: 40_000,
  })
  return data.data
}

export async function getMealPlanGenerationJob(jobId: string): Promise<GenerateMealPlanJob> {
  const { data } = await api.get<ApiOk<GenerateMealPlanJob>>(`/ai/generate-meal-plan/jobs/${jobId}`)
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
