import jwt from 'jsonwebtoken'
import type { OrgType, UserRole } from '@prisma/client'

export interface JwtPayload {
  sub: string    // user id
  role: UserRole
  orgId: string
}

export interface TempTokenPayload {
  orgId: string
  orgType: OrgType
  purpose: 'signup'
}

function accessSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET 환경 변수가 설정되지 않았습니다')
  return s
}

function refreshSecret(): string {
  const s = process.env.JWT_REFRESH_SECRET
  if (!s) throw new Error('JWT_REFRESH_SECRET 환경 변수가 설정되지 않았습니다')
  return s
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, accessSecret(), { expiresIn: '15m' })
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, refreshSecret(), { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, accessSecret()) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, refreshSecret()) as JwtPayload
}

export function signTempToken(payload: TempTokenPayload): string {
  return jwt.sign(payload, accessSecret(), { expiresIn: '10m' })
}

export function verifyTempToken(token: string): TempTokenPayload {
  return jwt.verify(token, accessSecret()) as TempTokenPayload
}
