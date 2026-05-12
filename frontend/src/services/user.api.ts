import { api } from './api'

export interface OrganizationInfo {
  id: string
  name: string
  address: string | null
  orgType: string
  mealTime: Record<string, unknown> | null
}

export interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  orgId: string
  phone: string | null
  grade: number | null
  classNo: string | null
  studentCode: string | null
  linkCode: string | null
  groupInfo: Record<string, unknown> | null
  consentedAt: string | null
  guardianConsentRequired: boolean
  createdAt: string
  organization: OrganizationInfo
}

export interface UpdateMePayload {
  name?: string
  phone?: string
  grade?: number
  classNo?: string
  studentCode?: string
}

export interface ChangeOrgResponse {
  user: UserProfile
  requiresStudentInfoRefill: boolean
}

type ApiOk<T> = { success: boolean; data: T }

export const userApi = {
  getMe: () =>
    api.get<ApiOk<UserProfile>>('/users/me').then((r) => r.data.data),

  updateMe: (payload: UpdateMePayload) =>
    api.put<ApiOk<UserProfile>>('/users/me', payload).then((r) => r.data.data),

  changeOrg: (tempToken: string) =>
    api.put<ApiOk<ChangeOrgResponse>>('/users/me/org', { tempToken }).then((r) => r.data.data),
}
