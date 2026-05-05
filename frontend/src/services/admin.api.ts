import { api } from './api'

// ── 공통 ─────────────────────────────────────────────────────────────────────

interface PagedResult<T> {
  total: number
  page: number
  pageSize: number
  items: T[]
}

interface ApiOk<T> { data: T }

// ── T-090: 단체 ───────────────────────────────────────────────────────────────

export type OrgType = 'school' | 'company' | 'welfare' | 'military' | 'other'

export interface Organization {
  id: string
  name: string
  address: string | null
  orgType: OrgType
  createdAt: string
  _count: { users: number }
}

export interface OrgInput {
  name: string
  address?: string
  orgType: OrgType
}

export async function fetchOrgs(params?: { page?: number; orgType?: string; search?: string }) {
  const { data } = await api.get<ApiOk<PagedResult<Organization>>>('/admin/organizations', { params })
  return data.data
}

export async function createOrg(body: OrgInput) {
  const { data } = await api.post<ApiOk<Organization>>('/admin/organizations', body)
  return data.data
}

export async function updateOrg(id: string, body: Partial<OrgInput>) {
  const { data } = await api.put<ApiOk<Organization>>(`/admin/organizations/${id}`, body)
  return data.data
}

// ── T-091: 사용자 ─────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'staff' | 'guardian' | 'nutritionist' | 'admin'

export interface AdminUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  isActive: boolean
  orgId: string
  organization: { name: string }
  createdAt: string
}

export async function fetchUsers(params?: { page?: number; orgId?: string; role?: string; isActive?: string; search?: string }) {
  const { data } = await api.get<ApiOk<PagedResult<AdminUser>>>('/admin/users', { params })
  return data.data
}

export async function changeRole(id: string, role: UserRole) {
  const { data } = await api.put<ApiOk<AdminUser>>(`/admin/users/${id}/role`, { role })
  return data.data
}

export async function changeStatus(id: string, isActive: boolean) {
  const { data } = await api.put<ApiOk<AdminUser>>(`/admin/users/${id}/status`, { isActive })
  return data.data
}

// ── T-092: 알레르기 마스터 ────────────────────────────────────────────────────

export interface AllergenMaster {
  id: string
  name: string
  code: number
  iconUrl: string | null
}

export async function fetchAllergensMaster() {
  const { data } = await api.get<ApiOk<AllergenMaster[]>>('/admin/allergens')
  return data.data
}

export async function createAllergenMaster(body: { name: string; code: number; iconUrl?: string }) {
  const { data } = await api.post<ApiOk<AllergenMaster>>('/admin/allergens', body)
  return data.data
}

export async function updateAllergenMaster(id: string, body: Partial<{ name: string; code: number; iconUrl: string }>) {
  const { data } = await api.put<ApiOk<AllergenMaster>>(`/admin/allergens/${id}`, body)
  return data.data
}

export async function deleteAllergenMaster(id: string) {
  const { data } = await api.delete<ApiOk<{ id: string }>>(`/admin/allergens/${id}`)
  return data.data
}

// ── T-093: 시스템 로그 ────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  userId: string | null
  action: string
  targetType: string
  targetId: string | null
  before: unknown
  after: unknown
  createdAt: string
  user: { name: string; email: string; role: string } | null
}

export async function fetchLogs(params?: { page?: number; userId?: string; from?: string; to?: string; action?: string }) {
  const { data } = await api.get<ApiOk<PagedResult<AuditLog>>>('/admin/logs', { params })
  return data.data
}

export function logsExportUrl(params: { from?: string; to?: string; action?: string }): string {
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1')
  const qs = new URLSearchParams({ format: 'csv', ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)) })
  return `${base}/admin/logs?${qs}`
}
