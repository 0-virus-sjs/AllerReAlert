import { Router } from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import allergenRouter from './allergen.routes'
import mealRouter from './meal.routes'
import alternateRouter from './alternate.routes'
import notificationRouter from './notification.routes'
import aiRouter from './ai.routes'
import surveyRouter from './survey.routes'
import analyticsRouter from './analytics.routes'
import adminRouter from './admin.routes'
import guardianRouter from './guardian.routes'
import { authenticate } from '../middlewares/authenticate'
import { listMasterAllergensHandler } from '../controllers/allergen.controller'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/users', allergenRouter)   // /users/me/allergens
router.use('/meals', mealRouter)
router.use('/alternates', alternateRouter)
router.use('/notifications', notificationRouter)
router.use('/ai', aiRouter)
router.use('/surveys', surveyRouter)
router.use('/analytics', analyticsRouter)
router.use('/admin',     adminRouter)
router.use('/guardian',  guardianRouter)

// 식약처 알레르기 마스터 목록 (로그인 필요)
router.get('/allergens', authenticate, listMasterAllergensHandler)

export default router
