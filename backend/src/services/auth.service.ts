import bcrypt from 'bcrypt'
import crypto from 'crypto'
import type { Prisma, UserRole, Gender } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, signTempToken, verifyRefreshToken, verifyTempToken } from '../lib/jwt'
import { AppError } from '../middlewares/errorHandler'

/** 학생 전용 8자리 연동코드 생성 (충돌 시 재시도) */
async function generateUniqueLinkCode(): Promise<string> {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동 문자(0,O,1,I) 제외
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from(crypto.randomBytes(8))
      .map((b) => CHARS[b % CHARS.length])
      .join('')
    const exists = await prisma.user.findUnique({ where: { linkCode: code }, select: { id: true } })
    if (!exists) return code
  }
  throw new Error('linkCode 생성 실패: 재시도 초과')
}

export interface SignupInput {
  tempToken: string
  role: UserRole
  name: string
  email: string
  password: string
  phone?: string
  groupInfo?: Record<string, unknown>
  grade?: number
  classNo?: string
  studentCode?: string
  gender?: Gender
  privacyAgreed: boolean
  guardianConsentRequired: boolean
}

export async function signup(input: SignupInput) {
  // 임시 토큰으로 orgId·orgType 확인
  let orgId: string
  let orgType: string
  try {
    const payload = verifyTempToken(input.tempToken)
    if (payload.purpose !== 'signup') throw new Error()
    orgId = payload.orgId
    orgType = payload.orgType
  } catch {
    throw new AppError(401, 'INVALID_TEMP_TOKEN', '소속 인증 토큰이 유효하지 않습니다. 소속 코드 인증을 다시 진행하세요')
  }

  // student 역할은 school 단체에서만 가입 가능 (T-122)
  if (input.role === 'student' && orgType !== 'school') {
    throw new AppError(400, 'INVALID_ROLE_FOR_ORG', '학생 역할은 학교 단체에서만 가입할 수 있습니다')
  }

  if (!input.privacyAgreed) {
    throw new AppError(400, 'CONSENT_REQUIRED', '개인정보 수집·이용 동의가 필요합니다')
  }

  const exists = await prisma.user.findUnique({ where: { email: input.email } })
  if (exists) {
    throw new AppError(409, 'EMAIL_DUPLICATE', '이미 사용 중인 이메일입니다')
  }

  const passwordHash = await bcrypt.hash(input.password, 12)
  const isStudent = input.role === 'student'
  const linkCode = isStudent ? await generateUniqueLinkCode() : undefined

  const user = await prisma.user.create({
    data: {
      orgId,
      role: input.role,
      name: input.name,
      email: input.email,
      phone: input.phone,
      groupInfo: (input.groupInfo ?? {}) as Prisma.InputJsonValue,
      // T-122: student 역할일 때만 학년/반/학번 매핑
      grade: isStudent ? input.grade : null,
      classNo: isStudent ? input.classNo : null,
      studentCode: isStudent ? input.studentCode : null,
      // T-126: student 역할일 때만 gender 매핑
      gender: isStudent ? input.gender : null,
      linkCode,
      passwordHash,
      consentedAt: new Date(),
      guardianConsentRequired: input.guardianConsentRequired,
    },
    select: { id: true, name: true, email: true, role: true, orgId: true, linkCode: true },
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
    gradeStructure: org.gradeStructure ?? null,
    tempToken,
  }
}

export async function login(email: string, password: string, ip?: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // T-106: 존재하지 않는 계정 로그인 시도 기록
    await prisma.auditLog.create({
      data: { action: 'LOGIN_FAIL', targetType: 'auth', ip, after: { email, reason: 'USER_NOT_FOUND' } },
    }).catch(() => {})
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다')
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    // T-106: 비밀번호 불일치 로그인 실패 기록
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN_FAIL', targetType: 'auth', ip, after: { reason: 'WRONG_PASSWORD' } },
    }).catch(() => {})
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
