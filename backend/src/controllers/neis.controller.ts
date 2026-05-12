import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { sendSuccess } from '../middlewares/response'
import { searchSchools } from '../services/neis/neis.service'

const searchSchoolsSchema = z.object({
  q: z.string().min(2, '검색어는 2자 이상 입력하세요').max(50),
})

// T-127: GET /neis/schools?q=
export async function searchSchoolsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = searchSchoolsSchema.parse(req.query)
    const data = await searchSchools(q)
    return sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}
