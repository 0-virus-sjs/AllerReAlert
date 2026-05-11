import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import { generateMealPlanHandler, getMealGenerationJobHandler, suggestAlternatesHandler, recalculateNutritionHandler } from '../controllers/ai.controller'

const router = Router()

router.use(authenticate)
router.use(requireRole(['nutritionist']))

// T-064: 정규 식단 AI 생성 (비동기 job 등록 → 202)
router.post('/generate-meal-plan', generateMealPlanHandler)
// T-064: 생성 job 상태 조회
router.get('/generate-meal-plan/jobs/:jobId', getMealGenerationJobHandler)

// T-065: 대체 식단 후보 AI 제안
router.post('/suggest-alternates', suggestAlternatesHandler)

// T-066: 영양소 재산출 (Phase 2 stub — 합산 계산만 수행)
router.post('/recalculate-nutrition', recalculateNutritionHandler)

export default router
