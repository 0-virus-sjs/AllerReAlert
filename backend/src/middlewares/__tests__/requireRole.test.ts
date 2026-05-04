import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import type { UserRole } from '@prisma/client'
import { requireRole } from '../requireRole'

// ── 테스트 헬퍼 ──────────────────────────────────────────
function makeReq(role?: UserRole): Partial<Request> {
  return role ? { user: { sub: 'u1', role, orgId: 'org1' } } : {}
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

function run(roles: UserRole[], role?: UserRole) {
  const req = makeReq(role) as Request
  const res = makeRes()
  const next = vi.fn() as NextFunction
  requireRole(roles)(req, res, next)
  return { res, next }
}

// ── PRD §3.1 RBAC 매트릭스 검증 ─────────────────────────

describe('식단 조회 — 전 역할 허용', () => {
  const roles: UserRole[] = ['student', 'staff', 'guardian', 'nutritionist', 'admin']
  for (const role of roles) {
    it(`${role} → PASS`, () => {
      const { next } = run(roles, role)
      expect(next).toHaveBeenCalled()
    })
  }
})

describe('알레르기 등록/수정(본인) — student·staff·guardian만 허용', () => {
  const allowed: UserRole[] = ['student', 'staff', 'guardian']
  const denied: UserRole[] = ['nutritionist', 'admin']

  for (const role of allowed) {
    it(`${role} → PASS`, () => {
      expect(run(allowed, role).next).toHaveBeenCalled()
    })
  }
  for (const role of denied) {
    it(`${role} → 403`, () => {
      const { res, next } = run(allowed, role)
      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })
  }
})

describe('알레르기 승인 — guardian만 허용', () => {
  const allowed: UserRole[] = ['guardian']
  const denied: UserRole[] = ['student', 'staff', 'nutritionist', 'admin']

  it('guardian → PASS', () => {
    expect(run(allowed, 'guardian').next).toHaveBeenCalled()
  })
  for (const role of denied) {
    it(`${role} → 403`, () => {
      const { res, next } = run(allowed, role)
      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })
  }
})

describe('설문 응답/투표 — student·staff만 허용', () => {
  const allowed: UserRole[] = ['student', 'staff']
  const denied: UserRole[] = ['guardian', 'nutritionist', 'admin']

  for (const role of allowed) {
    it(`${role} → PASS`, () => {
      expect(run(allowed, role).next).toHaveBeenCalled()
    })
  }
  for (const role of denied) {
    it(`${role} → 403`, () => {
      expect(run(allowed, role).next).not.toHaveBeenCalled()
    })
  }
})

describe('식단 작성/수정/삭제 + AI 식단 생성 + 설문 생성 — nutritionist만 허용', () => {
  const allowed: UserRole[] = ['nutritionist']
  const denied: UserRole[] = ['student', 'staff', 'guardian', 'admin']

  it('nutritionist → PASS', () => {
    expect(run(allowed, 'nutritionist').next).toHaveBeenCalled()
  })
  for (const role of denied) {
    it(`${role} → 403`, () => {
      expect(run(allowed, role).next).not.toHaveBeenCalled()
    })
  }
})

describe('수요 집계/리포트 조회 — nutritionist·admin 허용', () => {
  const allowed: UserRole[] = ['nutritionist', 'admin']
  const denied: UserRole[] = ['student', 'staff', 'guardian']

  for (const role of allowed) {
    it(`${role} → PASS`, () => {
      expect(run(allowed, role).next).toHaveBeenCalled()
    })
  }
  for (const role of denied) {
    it(`${role} → 403`, () => {
      expect(run(allowed, role).next).not.toHaveBeenCalled()
    })
  }
})

describe('사용자·학교·마스터 관리 — admin만 허용', () => {
  const allowed: UserRole[] = ['admin']
  const denied: UserRole[] = ['student', 'staff', 'guardian', 'nutritionist']

  it('admin → PASS', () => {
    expect(run(allowed, 'admin').next).toHaveBeenCalled()
  })
  for (const role of denied) {
    it(`${role} → 403`, () => {
      expect(run(allowed, role).next).not.toHaveBeenCalled()
    })
  }
})

describe('인증 없이 접근 → 401', () => {
  it('req.user 없음 → 401', () => {
    const { res, next } = run(['admin'])
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
