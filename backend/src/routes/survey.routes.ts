import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import {
  listSurveysHandler,
  getSurveyHandler,
  createSurveyHandler,
  submitResponseHandler,
  closeSurveyHandler,
} from '../controllers/survey.controller'

const router = Router()
router.use(authenticate)

// T-071: 설문 목록·상세 (전 역할), 생성 (영양사)
router.get('/',    listSurveysHandler)
router.get('/:id', getSurveyHandler)
router.post('/', requireRole(['nutritionist', 'admin']), createSurveyHandler)

// T-072: 투표 응답 (student·staff·guardian)
router.post('/:id/responses', requireRole(['student', 'staff', 'guardian']), submitResponseHandler)

// T-073: 수동 마감 (영양사 전용)
router.put('/:id/close', requireRole(['nutritionist', 'admin']), closeSurveyHandler)

export default router
