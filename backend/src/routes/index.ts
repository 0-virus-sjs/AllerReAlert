import { Router } from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import mealRouter from './meal.routes'
import alternateRouter from './alternate.routes'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/meals', mealRouter)
router.use('/alternates', alternateRouter)

export default router
