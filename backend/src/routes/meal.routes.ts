import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import { createMealHandler } from '../controllers/meal.controller'

const router = Router()
router.use(authenticate)

// T-030: 식단 생성 (영양사 전용)
router.post('/', requireRole(['nutritionist']), createMealHandler)

export default router
