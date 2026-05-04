import { Router } from 'express'
import {
  signupHandler,
  verifyOrgHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  authenticate,
} from '../controllers/auth.controller'

const router = Router()

router.post('/verify-org', verifyOrgHandler)
router.post('/signup', signupHandler)
router.post('/login', loginHandler)
router.post('/refresh', refreshHandler)
router.post('/logout', authenticate, logoutHandler)

export default router
