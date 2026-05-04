import { api } from './api'
import type { AlternatePlan, CreateAlternateInput } from '../types/meal'

interface ApiOk<T> { success: boolean; data: T }

export async function createAlternatePlan(
  mealPlanId: string,
  input: CreateAlternateInput,
): Promise<AlternatePlan> {
  const { data } = await api.post<ApiOk<AlternatePlan>>(
    `/meals/${mealPlanId}/alternates`,
    input,
  )
  return data.data
}

export async function confirmAlternatePlan(id: string): Promise<AlternatePlan> {
  const { data } = await api.put<ApiOk<AlternatePlan>>(`/alternates/${id}/confirm`)
  return data.data
}
