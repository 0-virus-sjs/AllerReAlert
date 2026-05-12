import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import { searchSchoolsHandler } from '../controllers/neis.controller'

const router = Router()

router.use(authenticate)
router.use(requireRole(['nutritionist', 'admin']))

// T-127: 학교명 검색 (자동완성용)
router.get('/schools', searchSchoolsHandler)

export default router
