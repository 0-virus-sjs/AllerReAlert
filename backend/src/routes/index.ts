import { Router } from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'
import mealRouter from './meal.routes'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/meals', mealRouter)

export default router
