import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import { generateMealPlanHandler, suggestAlternatesHandler } from '../controllers/ai.controller'

const router = Router()

router.use(authenticate)
router.use(requireRole(['nutritionist']))

// T-064: 정규 식단 AI 생성
router.post('/generate-meal-plan', generateMealPlanHandler)

// T-065: 대체 식단 후보 AI 제안
router.post('/suggest-alternates', suggestAlternatesHandler)

export default router
