import { Router } from 'express'
import authRouter from './auth.routes'
import userRouter from './user.routes'

const router = Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
// TODO: router.use('/meals', mealRouter)

export default router
