import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bit
const IV_LENGTH = 12  // 96 bit (GCM 권장)
const TAG_LENGTH = 16 // 128 bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY는 64자리 hex 문자열(32 bytes)이어야 합니다')
  }
  return key
}

// 반환 형식: <iv_hex>:<tag_hex>:<ciphertext_hex>
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encryptedData: string): string {
  const key = getKey()
  const parts = encryptedData.split(':')
  if (parts.length !== 3) throw new Error('암호화 데이터 형식이 올바르지 않습니다')
  const [ivHex, tagHex, dataHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  if (tag.length !== TAG_LENGTH) throw new Error('인증 태그 길이가 올바르지 않습니다')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}
