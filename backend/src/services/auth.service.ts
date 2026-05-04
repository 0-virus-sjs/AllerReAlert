import { prisma } from '../lib/prisma'
import { signTempToken } from '../lib/jwt'
import { AppError } from '../middlewares/errorHandler'

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
