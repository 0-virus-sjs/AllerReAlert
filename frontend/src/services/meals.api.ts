import { api } from './api'
import type { MealPlan, MealItemInput } from '../types/meal'

interface ApiOk<T> { success: boolean; data: T }

export async function getMeals(month: string): Promise<MealPlan[]> {
  const { data } = await api.get<ApiOk<MealPlan[]>>('/meals', { params: { month } })
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
