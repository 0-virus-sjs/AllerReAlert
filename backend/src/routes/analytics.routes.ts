import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import {
  allergyOverviewHandler,
  dailyDemandHandler,
  monthlyReportHandler,
  analyticsExportHandler,
  schoolStatsHandler,
} from '../controllers/analytics.controller'

const router = Router()

router.use(authenticate)
router.use(requireRole(['nutritionist', 'admin']))

// T-080: 알레르기 유형별 분포
router.get('/allergy-overview', allergyOverviewHandler)

// T-081: 일별 대체식 수요
router.get('/daily-demand', dailyDemandHandler)

// T-082: 월간 운영 리포트
router.get('/report', monthlyReportHandler)

// T-083: CSV / PDF 내보내기
router.get('/export', analyticsExportHandler)

// T-126: 학교 통계 (성별·학년별 인원 분포)
router.get('/school-stats', schoolStatsHandler)

export default router
