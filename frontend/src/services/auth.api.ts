import { api } from './api'
import type { AuthUser } from '../types/auth'

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface VerifyOrgResponse {
  orgId: string
  orgName: string
  orgType: string
  tempToken: string
}

export interface SignupPayload {
  tempToken: string
  role: string
  name: string
  email: string
  password: string
  phone?: string
  groupInfo?: Record<string, unknown>
  grade?: number
  classNo?: string
  studentCode?: string
  privacyAgreed: boolean
  guardianConsentRequired: boolean
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  verifyOrg: (orgCode: string) =>
    api.post<{ success: boolean; data: VerifyOrgResponse }>('/auth/verify-org', { orgCode }),

  signup: (payload: SignupPayload) =>
    api.post<{ success: boolean; data: AuthUser }>('/auth/signup', payload),
}
