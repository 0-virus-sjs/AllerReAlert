import crypto from 'crypto'
import { describe, it, expect, beforeEach } from 'vitest'
import { encrypt, decrypt } from '../crypto'

beforeEach(() => {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex')
})

describe('encrypt / decrypt', () => {
  it('평문 → 암호화 → 복호화 라운드트립', () => {
    const plaintext = '알레르기:난류,우유,땅콩'
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })

  it('동일 평문도 호출마다 다른 암호문 (랜덤 IV)', () => {
    const plaintext = 'same-data'
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext))
  })

  it('암호문 변조 시 복호화 실패', () => {
    const encrypted = encrypt('test')
    const [iv, tag, data] = encrypted.split(':')
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}ff`
    expect(() => decrypt(tampered)).toThrow()
  })

  it('형식이 잘못된 문자열 복호화 시 에러', () => {
    expect(() => decrypt('invalid-format')).toThrow('암호화 데이터 형식이 올바르지 않습니다')
  })

  it('ENCRYPTION_KEY 미설정 시 에러', () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY')
  })
})
