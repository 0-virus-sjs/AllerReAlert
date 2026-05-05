import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import {
  listNotificationsHandler,
  markReadHandler,
  markAllReadHandler,
} from '../controllers/notification.controller'

const router = Router()
router.use(authenticate)

// T-054: 알림 목록 + 읽음 처리
router.get('/',           listNotificationsHandler)
router.put('/read-all',   markAllReadHandler)
router.put('/:id/read',   markReadHandler)

// T-055: PUT /notifications/settings + POST /notifications/web-push/subscribe

export default router
