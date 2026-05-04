import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { listUserAllergensHandler } from '../controllers/allergen.controller'

const router = Router()
router.use(authenticate)

// T-040: 본인 알레르기 목록 조회 (AES-256 복호화 후 응답)
router.get('/me/allergens', listUserAllergensHandler)

// T-041: POST /users/me/allergens (알레르기 등록)
// T-042: PUT/DELETE /users/me/allergens/:id

export default router
