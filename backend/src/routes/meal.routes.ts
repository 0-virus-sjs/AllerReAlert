import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import {
  createMealHandler,
  updateMealHandler,
  deleteMealHandler,
  publishMealHandler,
} from '../controllers/meal.controller'

const router = Router()
router.use(authenticate)

// T-030: 식단 생성 (영양사 전용)
router.post('/', requireRole(['nutritionist']), createMealHandler)

// T-031: 식단 수정 / 삭제 (영양사 전용)
router.put('/:id', requireRole(['nutritionist']), updateMealHandler)
router.delete('/:id', requireRole(['nutritionist']), deleteMealHandler)

// T-032: 식단 공개 (즉시 또는 예약)
router.put('/:id/publish', requireRole(['nutritionist']), publishMealHandler)

export default router
