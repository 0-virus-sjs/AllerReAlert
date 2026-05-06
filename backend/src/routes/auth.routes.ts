import { Router } from 'express'
import {
  signupHandler,
  verifyOrgHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  authenticate,
} from '../controllers/auth.controller'
import { authLimiter } from '../middlewares/rateLimits'

const router = Router()

router.post('/verify-org', authLimiter, verifyOrgHandler)
router.post('/signup', authLimiter, signupHandler)
router.post('/login', authLimiter, loginHandler)
router.post('/refresh', authLimiter, refreshHandler)
router.post('/logout', authenticate, logoutHandler)

export default router
