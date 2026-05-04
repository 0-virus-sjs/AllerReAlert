import { api } from './api'
import type { MasterAllergen, UserAllergen } from '../types/allergen'

interface ApiOk<T> { success: boolean; data: T }

export async function getMasterAllergens(): Promise<MasterAllergen[]> {
  const { data } = await api.get<ApiOk<MasterAllergen[]>>('/allergens')
  return data.data
}

export async function getMyAllergens(): Promise<UserAllergen[]> {
  const { data } = await api.get<ApiOk<UserAllergen[]>>('/users/me/allergens')
  return data.data
}

export async function addAllergen(input: {
  allergenId?: string
  customAllergenName?: string
}): Promise<UserAllergen> {
  const { data } = await api.post<ApiOk<UserAllergen>>('/users/me/allergens', input)
  return data.data
}

export async function removeAllergen(id: string): Promise<void> {
  await api.delete(`/users/me/allergens/${id}`)
}
