export type UserRole = 'student' | 'staff' | 'guardian' | 'nutritionist' | 'admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  orgId: string
}
