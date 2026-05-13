import { api } from './api'

import type { GradeStructure } from './auth.api'
export type { GradeStructure }

export interface OrganizationInfo {
  id:             string
  name:           string
  address:        string | null
  orgType:        string
  mealTime:       Record<string, unknown> | null
  gradeStructure: GradeStructure | null
  atptCode:       string | null   // NEIS 시도교육청 코드 (school 기관)
  schoolCode:     string | null   // NEIS 표준 학교 코드
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
