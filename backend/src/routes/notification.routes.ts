import { Router } from 'express'
import { authenticate } from '../middlewares/authenticate'
import {
  listNotificationsHandler,
  markReadHandler,
  markAllReadHandler,
  updateSettingsHandler,
  subscribePushHandler,
} from '../controllers/notification.controller'

const router = Router()
router.use(authenticate)

// T-054: 알림 목록 + 읽음 처리
router.get('/',           listNotificationsHandler)
router.put('/read-all',   markAllReadHandler)
router.put('/:id/read',   markReadHandler)

// T-055: 알림 설정 + 웹 푸시 구독
router.put('/settings',              updateSettingsHandler)
router.post('/web-push/subscribe',   subscribePushHandler)

export default router
