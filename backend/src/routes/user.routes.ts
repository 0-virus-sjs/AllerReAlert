import { Router } from 'express'
import { getMeHandler, updateMeHandler } from '../controllers/user.controller'
import { authenticate } from '../middlewares/authenticate'

const router = Router()

router.use(authenticate)

router.get('/me', getMeHandler)
router.put('/me', updateMeHandler)

export default router
