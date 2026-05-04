import { Router } from 'express'
import {
  verifyOrgHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  authenticate,
} from '../controllers/auth.controller'

const router = Router()

router.post('/verify-org', verifyOrgHandler)
router.post('/login', loginHandler)
router.post('/refresh', refreshHandler)
router.post('/logout', authenticate, logoutHandler)

// T-021: POST /auth/signup

export default router
