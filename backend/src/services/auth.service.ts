import bcrypt from 'bcrypt'
import type { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, signTempToken, verifyRefreshToken, verifyTempToken } from '../lib/jwt'
import { AppError } from '../middlewares/errorHandler'

export interface SignupInput {
  tempToken: string
  role: UserRole
  name: string
  email: string
  password: string
  phone?: string
  groupInfo?: Record<string, unknown>
  privacyAgreed: boolean
  guardianConsentRequired: boolean
}

export async function signup(input: SignupInput) {
  // 임시 토큰으로 orgId 확인
  let orgId: string
  try {
    const payload = verifyTempToken(input.tempToken)
    if (payload.purpose !== 'signup') throw new Error()
    orgId = payload.orgId
  } catch {
    throw new AppError(401, 'INVALID_TEMP_TOKEN', '소속 인증 토큰이 유효하지 않습니다. 소속 코드 인증을 다시 진행하세요')
  }

  if (!input.privacyAgreed) {
    throw new AppError(400, 'CONSENT_REQUIRED', '개인정보 수집·이용 동의가 필요합니다')
  }

  const exists = await prisma.user.findUnique({ where: { email: input.email } })
  if (exists) {
    throw new AppError(409, 'EMAIL_DUPLICATE', '이미 사용 중인 이메일입니다')
  }

  const passwordHash = await bcrypt.hash(input.password, 12)

  const user = await prisma.user.create({
    data: {
      orgId,
      role: input.role,
      name: input.name,
      email: input.email,
      phone: input.phone,
      groupInfo: (input.groupInfo ?? {}) as Prisma.InputJsonValue,
      passwordHash,
      consentedAt: new Date(),
      guardianConsentRequired: input.guardianConsentRequired,
    },
    select: { id: true, name: true, email: true, role: true, orgId: true },
  })

  return user
}

export async function verifyOrg(orgCode: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgCode } })
  if (!org) {
    throw new AppError(404, 'ORG_NOT_FOUND', '소속 코드를 찾을 수 없습니다')
  }

  const tempToken = signTempToken({
    orgId: org.id,
    orgType: org.orgType,
    purpose: 'signup',
  })

  return {
    orgId: org.id,
    orgName: org.name,
    orgType: org.orgType,
    tempToken,
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다')
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다')
  }

  const jwtPayload = { sub: user.id, role: user.role, orgId: user.orgId }
  const accessToken = signAccessToken(jwtPayload)
  const refreshToken = signRefreshToken(jwtPayload)

  // 동시 로그인 제한: 신규 refresh 토큰 해시로 교체 (이전 토큰 무효화)
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
  })

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId },
  }
}

export async function refreshAccessToken(refreshToken: string) {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', '유효하지 않은 리프레시 토큰입니다')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user?.refreshTokenHash) {
    throw new AppError(401, 'TOKEN_REUSED', '이미 로그아웃된 세션입니다')
  }

  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash)
  if (!valid) {
    // 토큰 재사용 감지 — 모든 세션 강제 종료
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } })
    throw new AppError(401, 'TOKEN_REUSED', '토큰 재사용이 감지됐습니다. 다시 로그인하세요')
  }

  const jwtPayload = { sub: user.id, role: user.role, orgId: user.orgId }
  const newAccessToken = signAccessToken(jwtPayload)
  const newRefreshToken = signRefreshToken(jwtPayload)

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(newRefreshToken, 10) },
  })

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, orgId: user.orgId },
  }
}

export async function logout(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } })
}
