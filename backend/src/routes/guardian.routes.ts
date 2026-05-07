import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import { requireRole } from '../middlewares/requireRole'
import {
  linkChildHandler,
  listChildrenHandler,
  getChildAllergensHandler,
} from '../controllers/guardian.controller'

const router = Router()

router.use(authenticate, requireRole(['guardian']))

router.post('/link', linkChildHandler)
router.get('/children', listChildrenHandler)
router.get('/children/:studentId/allergens', getChildAllergensHandler)

export default router
