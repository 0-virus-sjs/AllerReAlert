import { Router } from 'express'
import authRouter from './auth.routes'

const router = Router()

router.use('/auth', authRouter)
// TODO: router.use('/meals', mealRouter)
// TODO: router.use('/users', userRouter)

export default router
