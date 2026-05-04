import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import {
  listMealsHandler,
  getMealHandler,
  createMealHandler,
  updateMealHandler,
  deleteMealHandler,
  publishMealHandler,
  exportMealPdfHandler,
} from '../controllers/meal.controller'
import { createAlternateHandler } from '../controllers/alternate.controller'
import { allergenCheckHandler } from '../controllers/allergen.controller'

const router = Router()
router.use(authenticate)

// T-047: 식단 PDF 다운로드 (전 역할) — /:id 보다 먼저 등록해야 shadow 방지
router.get('/export', exportMealPdfHandler)

// T-034: 식단 목록/단건 조회 (전 역할)
router.get('/',    listMealsHandler)
router.get('/:id', getMealHandler)

// T-030: 식단 생성 (영양사 전용)
router.post('/', requireRole(['nutritionist']), createMealHandler)

// T-031: 식단 수정 / 삭제 (영양사 전용)
router.put('/:id',        requireRole(['nutritionist']), updateMealHandler)
router.delete('/:id',     requireRole(['nutritionist']), deleteMealHandler)

// T-032: 식단 공개 (즉시 또는 예약)
router.put('/:id/publish', requireRole(['nutritionist']), publishMealHandler)

// T-036: 대체 식단 등록 (영양사 전용)
router.post('/:id/alternates', requireRole(['nutritionist']), createAlternateHandler)

// T-035: 알레르기 대조 결과
router.get('/:id/allergen-check', allergenCheckHandler)

export default router
