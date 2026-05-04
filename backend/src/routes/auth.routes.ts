import { Router } from 'express'
import { verifyOrgHandler } from '../controllers/auth.controller'

const router = Router()

router.post('/verify-org', verifyOrgHandler)

// T-021: POST /auth/signup
// T-022: POST /auth/login, /auth/refresh, /auth/logout

export default router
