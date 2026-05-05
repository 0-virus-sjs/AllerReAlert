import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, ButtonGroup, Container, ListGroup, Spinner } from 'react-bootstrap'
import { notificationsApi, type NotificationItem } from '../services/notifications.api'
import { usePushSubscription } from '../hooks/usePushSubscription'

const TYPE_LABEL: Record<string, string> = {
  allergen_alert:   '알레르기 주의',
  menu_change:      '메뉴 변경',
  survey_invite:    '설문 초대',
  survey_reminder:  '설문 리마인더',
  approval_request: '승인 요청',
  approval_result:  '승인 결과',
}

const TYPE_VARIANT: Record<string, string> = {
  allergen_alert: 'danger',
  menu_change:    'warning',
  default:        'secondary',
}

type Filter = 'all' | 'unread'

const POLL_INTERVAL = 30_000  // 30초 폴링

export function NotificationCenterPage() {
  const navigate = useNavigate()
  const { status: pushStatus, subscribe } = usePushSubscription()

  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [page] = useState(1)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationsApi.list(page)
      setItems(data.data.items)
      setUnreadCount(data.data.unreadCount)
    } finally {
      setLoading(false)
    }
  }, [page])

  // 초기 로딩 + 30초 폴링
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id)
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead()
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  function handleClick(item: NotificationItem) {
    if (!item.isRead) handleMarkRead(item.id)
    const mealPlanId = item.payload?.mealPlanId as string | undefined
    if (mealPlanId) navigate(`/meals/${mealPlanId}`)
  }

  const filtered = filter === 'unread' ? items.filter((n) => !n.isRead) : items

  return (
    <Container fluid className="py-3" style={{ maxWidth: 640 }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold mb-0">
          🔔 알림 센터
          {unreadCount > 0 && <Badge bg="danger" className="ms-2">{unreadCount}</Badge>}
        </h5>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline-secondary" onClick={handleMarkAllRead}>
            모두 읽음
          </Button>
        )}
      </div>

      {/* 웹 푸시 구독 배너 */}
      {pushStatus === 'default' && (
        <Alert variant="info" className="py-2 small d-flex align-items-center justify-content-between">
          <span>🔔 웹 푸시 알림을 받으시겠습니까?</span>
          <Button size="sm" variant="info" onClick={subscribe}>알림 허용</Button>
        </Alert>
      )}
      {pushStatus === 'subscribed' && (
        <Alert variant="success" className="py-2 small">✅ 웹 푸시 알림이 활성화됐습니다.</Alert>
      )}
      {pushStatus === 'denied' && (
        <Alert variant="warning" className="py-2 small">
          브라우저 설정에서 알림 권한을 허용해야 웹 푸시를 받을 수 있습니다.
        </Alert>
      )}

      {/* 필터 탭 */}
      <ButtonGroup size="sm" className="mb-3">
        <Button variant={filter === 'all' ? 'primary' : 'outline-primary'} onClick={() => setFilter('all')}>
          전체
        </Button>
        <Button variant={filter === 'unread' ? 'primary' : 'outline-primary'} onClick={() => setFilter('unread')}>
          미읽음 {unreadCount > 0 && `(${unreadCount})`}
        </Button>
      </ButtonGroup>

      {loading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-center py-4 small">알림이 없습니다</p>
      ) : (
        <ListGroup variant="flush">
          {filtered.map((item) => {
            const variant = TYPE_VARIANT[item.type] ?? TYPE_VARIANT.default
            return (
              <ListGroup.Item
                key={item.id}
                action
                className={`d-flex align-items-start gap-3 py-3 ${!item.isRead ? 'bg-light' : ''}`}
                onClick={() => handleClick(item)}
              >
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <Badge bg={variant} style={{ fontSize: '0.65rem' }}>
                      {TYPE_LABEL[item.type] ?? item.type}
                    </Badge>
                    {!item.isRead && <span className="rounded-circle bg-danger d-inline-block" style={{ width: 7, height: 7 }} />}
                  </div>
                  <div className="small fw-semibold">{item.title}</div>
                  <div className="small text-muted">{item.body}</div>
                </div>
                <div className="text-muted" style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                  {new Date(item.sentAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </ListGroup.Item>
            )
          })}
        </ListGroup>
      )}
    </Container>
  )
}
