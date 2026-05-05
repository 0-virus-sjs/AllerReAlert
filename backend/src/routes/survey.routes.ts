import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import {
  listSurveysHandler,
  getSurveyHandler,
  createSurveyHandler,
  submitResponseHandler,
} from '../controllers/survey.controller'

const router = Router()
router.use(authenticate)

// T-071: 설문 목록·상세 (전 역할), 생성 (영양사)
router.get('/',    listSurveysHandler)
router.get('/:id', getSurveyHandler)
router.post('/', requireRole(['nutritionist', 'admin']), createSurveyHandler)

// T-072: 투표 응답 (student·staff·guardian)
router.post('/:id/responses', requireRole(['student', 'staff', 'guardian']), submitResponseHandler)

// T-073: PUT  /surveys/:id/close

export default router
