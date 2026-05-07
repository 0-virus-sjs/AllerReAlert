import { api } from './api'
import type { UserAllergen } from '../types/allergen'

interface ApiOk<T> { success: boolean; data: T }

export interface ChildInfo {
  id: string
  name: string
  email: string
  orgId: string
  groupInfo: Record<string, unknown> | null
  linkedAt: string
}

export async function linkChild(linkCode: string): Promise<{ studentId: string; name: string }> {
  const { data } = await api.post<ApiOk<{ studentId: string; name: string }>>('/guardian/link', { linkCode })
  return data.data
}

export async function getChildren(): Promise<ChildInfo[]> {
  const { data } = await api.get<ApiOk<ChildInfo[]>>('/guardian/children')
  return data.data
}

export async function getChildAllergens(studentId: string): Promise<UserAllergen[]> {
  const { data } = await api.get<ApiOk<UserAllergen[]>>(`/guardian/children/${studentId}/allergens`)
  return data.data
}

export async function approveAllergen(
  allergenId: string,
  action: 'confirmed' | 'rejected',
  reason?: string
): Promise<void> {
  await api.put(`/guardian/approvals/${allergenId}`, { action, reason })
}
