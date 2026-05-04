import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import { confirmAlternateHandler } from '../controllers/alternate.controller'

const router = Router()
router.use(authenticate)

// T-036: 대체 식단 확정 (영양사 전용)
router.put('/:id/confirm', requireRole(['nutritionist']), confirmAlternateHandler)

export default router
