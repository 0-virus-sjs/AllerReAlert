import { Router } from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import allergenRouter from './allergen.routes'
import mealRouter from './meal.routes'
import alternateRouter from './alternate.routes'
import { authenticate } from '../middlewares/authenticate'
import { listMasterAllergensHandler } from '../controllers/allergen.controller'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/users', allergenRouter)   // /users/me/allergens
router.use('/meals', mealRouter)
router.use('/alternates', alternateRouter)

// 식약처 알레르기 마스터 목록 (로그인 필요)
router.get('/allergens', authenticate, listMasterAllergensHandler)

export default router
