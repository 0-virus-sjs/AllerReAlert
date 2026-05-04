import { prisma } from '../../lib/prisma'
import { decrypt } from '../../lib/crypto'

const USER_ALLERGEN_INCLUDE = {
  allergen: { select: { id: true, code: true, name: true, iconUrl: true } },
  approver: { select: { id: true, name: true } },
} as const

function decodeEntry(ua: {
  id: string
  status: string
  customAllergenName: string | null
  createdAt: Date
  updatedAt: Date
  allergen: { id: string; code: number; name: string; iconUrl: string | null }
  approver: { id: string; name: string } | null
}) {
  return {
    id: ua.id,
    allergen: ua.allergen,
    customAllergenName: ua.customAllergenName ? decrypt(ua.customAllergenName) : null,
    status: ua.status,
    approver: ua.approver,
    createdAt: ua.createdAt,
    updatedAt: ua.updatedAt,
  }
}

export async function getUserAllergens(userId: string) {
  const records = await prisma.userAllergen.findMany({
    where: { userId },
    include: USER_ALLERGEN_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })
  return records.map(decodeEntry)
}
