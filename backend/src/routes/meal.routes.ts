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
  exportMealXlsxHandler,
  mealConditionDefaultsHandler,
  calendarStatusHandler,
} from '../controllers/meal.controller'
import { createAlternateHandler, saveAlternatesHandler } from '../controllers/alternate.controller'
import { allergenCheckHandler } from '../controllers/allergen.controller'

const router = Router()
router.use(authenticate)

// T-047: 식단 PDF 다운로드 (전 역할) — /:id 보다 먼저 등록해야 shadow 방지
router.get('/export', exportMealPdfHandler)

// T-141: 월간 식단 xlsx 다운로드 (전 역할)
router.get('/export/xlsx', exportMealXlsxHandler)

// T-129: 식단 생성 조건 기본값 (영양사 전용) — /:id 보다 먼저 등록
router.get('/conditions/defaults', requireRole(['nutritionist']), mealConditionDefaultsHandler)

// T-151: 영양사 달력 상태 메타데이터 — /:id 보다 먼저 등록
router.get('/calendar-status', requireRole(['nutritionist']), calendarStatusHandler)

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

// T-136: 대체 식단 저장 — 1개 즉시 확정 / 2개↑ 설문 자동 생성
router.post('/:id/alternates/save', requireRole(['nutritionist']), saveAlternatesHandler)

// T-035: 알레르기 대조 결과
router.get('/:id/allergen-check', allergenCheckHandler)

export default router
