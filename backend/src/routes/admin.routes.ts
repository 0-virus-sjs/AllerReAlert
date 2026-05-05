import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import {
  listOrgsHandler, createOrgHandler, updateOrgHandler,
  listUsersHandler, changeRoleHandler, changeStatusHandler,
  listAllergensMasterHandler, createAllergenHandler, updateAllergenHandler, deleteAllergenHandler,
  listLogsHandler,
} from '../controllers/admin.controller'

const router = Router()

router.use(authenticate)
router.use(requireRole(['admin']))

// T-090: 단체 관리
router.get('/organizations',     listOrgsHandler)
router.post('/organizations',    createOrgHandler)
router.put('/organizations/:id', updateOrgHandler)

// T-091: 사용자 관리
router.get('/users',                    listUsersHandler)
router.put('/users/:id/role',           changeRoleHandler)
router.put('/users/:id/status',         changeStatusHandler)

// T-092: 알레르기 마스터
router.get('/allergens',        listAllergensMasterHandler)
router.post('/allergens',       createAllergenHandler)
router.put('/allergens/:id',    updateAllergenHandler)
router.delete('/allergens/:id', deleteAllergenHandler)

// T-093: 시스템 로그 (JSON + CSV 내보내기)
router.get('/logs', listLogsHandler)

export default router
