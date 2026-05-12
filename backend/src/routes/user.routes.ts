import { Router } from 'express'
import { getMeHandler, updateMeHandler, changeOrgHandler } from '../controllers/user.controller'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'

const router = Router()

router.use(authenticate)

router.get('/me', getMeHandler)
router.put('/me', updateMeHandler)
// T-124: 소속 단체 변경 — 영양사 호출 불가
router.put('/me/org', requireRole(['student', 'staff', 'guardian', 'admin']), changeOrgHandler)

export default router
