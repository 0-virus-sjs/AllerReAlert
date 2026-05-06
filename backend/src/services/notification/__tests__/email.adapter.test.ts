import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../email.adapter'

describe('escapeHtml', () => {
  it('HTML 메타문자(<, >, &, ", \') 모두 엔티티로 변환', () => {
    const dirty = `<script>alert("x&y")</script>`
    const safe = escapeHtml(dirty)
    expect(safe).toBe('&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;')
    expect(safe).not.toContain('<script>')
  })

  it('& 를 &amp; 로 우선 치환 (이중 인코딩 방지)', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;')
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('일반 텍스트는 그대로', () => {
    expect(escapeHtml('알레르기 알림 — 우유')).toBe('알레르기 알림 — 우유')
  })
})
