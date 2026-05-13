import { api } from './api'
import type { MealPlan, MealItemInput } from '../types/meal'
import type { NutrientItem } from './ai.api'

interface ApiOk<T> { success: boolean; data: T }

// ── T-129: 식단 생성 조건 기본값 ──────────────────────────

export interface MealConditionDefaults {
  calories:  number
  nutrients: NutrientItem[]
}

export async function fetchMealConditionDefaults(): Promise<MealConditionDefaults> {
  const { data } = await api.get<ApiOk<MealConditionDefaults>>('/meals/conditions/defaults')
  return data.data
}

export async function getMeals(month: string): Promise<MealPlan[]> {
  const { data } = await api.get<ApiOk<MealPlan[]>>('/meals', { params: { month } })
  return data.data
}

export async function getMealById(id: string): Promise<MealPlan> {
  const { data } = await api.get<ApiOk<MealPlan>>(`/meals/${id}`)
  return data.data
}

export async function createMeal(payload: {
  date: string
  items: MealItemInput[]
}): Promise<MealPlan> {
  const { data } = await api.post<ApiOk<MealPlan>>('/meals', payload)
  return data.data
}

export async function updateMeal(id: string, items: MealItemInput[]): Promise<MealPlan> {
  const { data } = await api.put<ApiOk<MealPlan>>(`/meals/${id}`, { items })
  return data.data
}

export async function deleteMeal(id: string): Promise<void> {
  await api.delete(`/meals/${id}`)
}

export async function publishMeal(id: string, scheduledAt?: string): Promise<MealPlan> {
  const { data } = await api.put<ApiOk<MealPlan>>(`/meals/${id}/publish`, { scheduledAt })
  return data.data
}

export async function exportMealPdf(month: string): Promise<void> {
  const response = await api.get('/meals/export', {
    params: { month },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `meal-plan-${month}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
