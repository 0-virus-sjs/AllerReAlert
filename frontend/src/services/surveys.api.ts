import { api } from './api'

interface ApiOk<T> { success: boolean; data: T }

// ── 타입 ──────────────────────────────────────────────────

export interface SurveyOptionItem {
  key?:   string
  label?: string
  id?:    string
  name?:  string
}

export interface SurveyOptions {
  question?: string
  choices?:  SurveyOptionItem[]   // need_check
  items?:    SurveyOptionItem[]   // menu_vote
}

export interface SurveyResponseRecord {
  id:          string
  userId?:     string
  response:    Record<string, unknown>
  votedItemId: string | null
  createdAt:   string
}

export interface Survey {
  id:           string
  mealPlanId:   string
  type:         'need_check' | 'menu_vote'
  options:      SurveyOptions
  deadline:     string
  status:       'open' | 'closed'
  createdAt:    string
  mealPlan:     { id: string; date: string; orgId: string }
  createdByUser:{ id: string; name: string }
  responses:    SurveyResponseRecord[]
}

export interface SurveyResult {
  totalResponses: number
  choices:        Record<string, number>
}

// ── API 함수 ──────────────────────────────────────────────

export async function getSurveys(mealPlanId?: string): Promise<Survey[]> {
  const { data } = await api.get<ApiOk<Survey[]>>('/surveys', {
    params: mealPlanId ? { meal_plan_id: mealPlanId } : undefined,
  })
  return data.data
}

export async function getSurveyById(id: string): Promise<Survey> {
  const { data } = await api.get<ApiOk<Survey>>(`/surveys/${id}`)
  return data.data
}

export async function submitResponse(
  surveyId: string,
  body: { response: Record<string, unknown>; votedItemId?: string },
): Promise<void> {
  await api.post(`/surveys/${surveyId}/responses`, body)
}

export async function closeSurvey(surveyId: string): Promise<SurveyResult> {
  const { data } = await api.put<ApiOk<SurveyResult>>(`/surveys/${surveyId}/close`)
  return data.data
}
