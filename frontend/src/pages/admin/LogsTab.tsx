import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Form, InputGroup, Spinner, Badge } from 'react-bootstrap'
import { fetchLogs, logsExportUrl, type AuditLog } from '../../services/admin.api'
import { useAuthStore } from '../../stores/auth.store'

function actionBadge(action: string) {
  if (action.includes('role'))   return 'warning'
  if (action.includes('status')) return 'danger'
  if (action.includes('create')) return 'success'
  if (action.includes('update') || action.includes('change')) return 'info'
  if (action.includes('delete')) return 'danger'
  return 'secondary'
}

export function LogsTab() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const [page, setPage]         = useState(1)
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [action, setAction]     = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page, from, to, action],
    queryFn:  () => fetchLogs({ page, from: from || undefined, to: to || undefined, action: action || undefined }),
  })

  function handleExport() {
    const url = logsExportUrl({ from: from || undefined, to: to || undefined, action: action || undefined })
    fetch(url, { headers: { Authorization: `Bearer ${accessToken ?? ''}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'audit-logs.csv'
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  function formatLog(log: AuditLog) {
    return new Date(log.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  }

  return (
    <div>
      {/* 필터 */}
      <div className="d-flex gap-2 mb-3 flex-wrap align-items-end">
        <div>
          <Form.Label className="small mb-1">시작일</Form.Label>
          <Form.Control type="date" size="sm" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} style={{ width: 150 }} />
        </div>
        <div>
          <Form.Label className="small mb-1">종료일</Form.Label>
          <Form.Control type="date" size="sm" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} style={{ width: 150 }} />
        </div>
        <div>
          <Form.Label className="small mb-1">액션 검색</Form.Label>
          <InputGroup size="sm">
            <Form.Control placeholder="예: role_change" value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1) }} style={{ width: 180 }} />
          </InputGroup>
        </div>
        <Button size="sm" variant="outline-secondary" onClick={handleExport} className="align-self-end">
          CSV 내보내기
        </Button>
      </div>

      {isLoading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}

      <Table size="sm" hover responsive>
        <thead className="table-light">
          <tr><th>일시</th><th>사용자</th><th>역할</th><th>액션</th><th>대상</th></tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((log) => (
            <tr key={log.id}>
              <td className="small text-nowrap">{formatLog(log)}</td>
              <td className="small">{log.user?.name ?? '-'}<br /><span className="text-muted">{log.user?.email}</span></td>
              <td><Badge bg="secondary" className="small">{log.user?.role ?? '-'}</Badge></td>
              <td><Badge bg={actionBadge(log.action)} className="small">{log.action}</Badge></td>
              <td className="small text-muted">{log.targetType}{log.targetId ? ` / ${log.targetId.slice(0, 8)}…` : ''}</td>
            </tr>
          ))}
          {!isLoading && data?.items.length === 0 && (
            <tr><td colSpan={5} className="text-center text-muted py-3">로그 없음</td></tr>
          )}
        </tbody>
      </Table>

      {data && data.total > data.pageSize && (
        <div className="d-flex gap-2 justify-content-end">
          <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
          <span className="small align-self-center">{page} / {Math.ceil(data.total / data.pageSize)}</span>
          <Button size="sm" variant="outline-secondary" disabled={page >= Math.ceil(data.total / data.pageSize)} onClick={() => setPage(p => p + 1)}>다음</Button>
        </div>
      )}
    </div>
  )
}
