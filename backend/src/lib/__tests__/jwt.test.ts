import { describe, it, expect, beforeEach } from 'vitest'
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  type JwtPayload,
} from '../jwt'

const payload: JwtPayload = {
  sub: 'user-001',
  role: 'student',
  orgId: 'org-001',
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-access-secret-at-least-32-chars!!'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars!!'
})

describe('signAccessToken / verifyAccessToken', () => {
  it('서명 후 검증 시 원본 payload 반환', () => {
    const token = signAccessToken(payload)
    const decoded = verifyAccessToken(token)
    expect(decoded.sub).toBe(payload.sub)
    expect(decoded.role).toBe(payload.role)
    expect(decoded.orgId).toBe(payload.orgId)
  })

  it('잘못된 시크릿으로 서명된 토큰 검증 실패', () => {
    process.env.JWT_SECRET = 'wrong-secret-that-is-at-least-32-chars!!'
    const token = signAccessToken(payload)
    process.env.JWT_SECRET = 'test-access-secret-at-least-32-chars!!'
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it('JWT_SECRET 미설정 시 에러', () => {
    delete process.env.JWT_SECRET
    expect(() => signAccessToken(payload)).toThrow('JWT_SECRET')
  })
})

describe('signRefreshToken / verifyRefreshToken', () => {
  it('리프레시 토큰 서명·검증 라운드트립', () => {
    const token = signRefreshToken(payload)
    const decoded = verifyRefreshToken(token)
    expect(decoded.sub).toBe(payload.sub)
  })

  it('액세스 토큰으로 리프레시 검증 실패 (시크릿 불일치)', () => {
    const accessToken = signAccessToken(payload)
    expect(() => verifyRefreshToken(accessToken)).toThrow()
  })

  it('JWT_REFRESH_SECRET 미설정 시 에러', () => {
    delete process.env.JWT_REFRESH_SECRET
    expect(() => signRefreshToken(payload)).toThrow('JWT_REFRESH_SECRET')
  })
})
