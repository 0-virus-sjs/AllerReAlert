import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import {
  listUserAllergensHandler,
  registerAllergenHandler,
  updateAllergenHandler,
  deleteAllergenHandler,
} from '../controllers/allergen.controller'

const router = Router()
router.use(authenticate)

// T-040: 본인 알레르기 목록 조회
router.get('/me/allergens', listUserAllergensHandler)

// T-041: 알레르기 등록 (학생→pending, 나머지→confirmed)
router.post('/me/allergens', registerAllergenHandler)

// T-042: 알레르기 수정·삭제 (학생 수정 시 pending 리셋 — Phase 2에서 보호자 알림 추가)
router.put('/me/allergens/:id', updateAllergenHandler)
router.delete('/me/allergens/:id', deleteAllergenHandler)

export default router
