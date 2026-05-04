import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import {
  listUserAllergensHandler,
  registerAllergenHandler,
} from '../controllers/allergen.controller'

const router = Router()
router.use(authenticate)

// T-040: 본인 알레르기 목록 조회
router.get('/me/allergens', listUserAllergensHandler)

// T-041: 알레르기 등록 (학생→pending, 나머지→confirmed)
router.post('/me/allergens', registerAllergenHandler)

// T-042: PUT/DELETE /users/me/allergens/:id

export default router
