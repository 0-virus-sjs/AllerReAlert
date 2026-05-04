import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { verifyOrg } from '../services/auth.service'
import { sendSuccess } from '../middlewares/response'

const verifyOrgSchema = z.object({
  orgCode: z.string().min(1, '소속 코드를 입력하세요'),
})

export async function verifyOrgHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgCode } = verifyOrgSchema.parse(req.body)
    const result = await verifyOrg(orgCode)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
