import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Form, Badge, InputGroup, Spinner, Alert } from 'react-bootstrap'
import { fetchUsers, changeRole, changeStatus, type AdminUser, type UserRole } from '../../services/admin.api'
import { CrudModal } from '../../components/admin/CrudModal'

const ROLE_LABELS: Record<UserRole, string> = {
  student: '학생', staff: '교직원', guardian: '보호자', nutritionist: '영양사', admin: '관리자',
}
const ROLE_VARIANTS: Record<UserRole, string> = {
  student: 'primary', staff: 'info', guardian: 'success', nutritionist: 'warning', admin: 'danger',
}

export function UsersTab() {
  const qc = useQueryClient()
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [filterRole, setRole]   = useState('')
  const [roleModal, setRoleModal]     = useState<AdminUser | null>(null)
  const [statusModal, setStatusModal] = useState<AdminUser | null>(null)
  const [newRole, setNewRole]   = useState<UserRole>('student')
  const [err, setErr]           = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, filterRole],
    queryFn:  () => fetchUsers({ page, search: search || undefined, role: filterRole || undefined }),
  })

  const roleMutation = useMutation({
    mutationFn: () => changeRole(roleModal!.id, newRole),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setRoleModal(null) },
    onError:    (e: { response?: { data?: { error?: { message?: string } } } }) =>
      setErr(e?.response?.data?.error?.message ?? '오류가 발생했습니다.'),
  })

  const statusMutation = useMutation({
    mutationFn: () => changeStatus(statusModal!.id, !statusModal!.isActive),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setStatusModal(null) },
    onError:    (e: { response?: { data?: { error?: { message?: string } } } }) =>
      setErr(e?.response?.data?.error?.message ?? '오류가 발생했습니다.'),
  })

  function openRoleModal(user: AdminUser) {
    setNewRole(user.role); setErr(''); setRoleModal(user)
  }

  return (
    <div>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <InputGroup size="sm" style={{ maxWidth: 240 }}>
          <Form.Control placeholder="이름·이메일 검색" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </InputGroup>
        <Form.Select size="sm" style={{ maxWidth: 140 }} value={filterRole}
          onChange={(e) => { setRole(e.target.value); setPage(1) }}>
          <option value="">전체 역할</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Form.Select>
      </div>

      {isLoading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}

      <Table size="sm" hover responsive>
        <thead className="table-light">
          <tr><th>이름</th><th>이메일</th><th>역할</th><th>소속</th><th>상태</th><th></th></tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((user) => (
            <tr key={user.id} className={!user.isActive ? 'text-muted' : ''}>
              <td className="fw-medium">{user.name}</td>
              <td className="small">{user.email}</td>
              <td>
                <Badge bg={ROLE_VARIANTS[user.role]}>{ROLE_LABELS[user.role]}</Badge>
              </td>
              <td className="small">{user.organization.name}</td>
              <td>
                <Badge bg={user.isActive ? 'success' : 'secondary'}>
                  {user.isActive ? '활성' : '비활성'}
                </Badge>
              </td>
              <td>
                <div className="d-flex gap-1">
                  <Button size="sm" variant="outline-primary" onClick={() => openRoleModal(user)}>역할</Button>
                  <Button size="sm" variant={user.isActive ? 'outline-danger' : 'outline-success'}
                    onClick={() => { setErr(''); setStatusModal(user) }}>
                    {user.isActive ? '비활성화' : '활성화'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!isLoading && data?.items.length === 0 && (
            <tr><td colSpan={6} className="text-center text-muted py-3">결과 없음</td></tr>
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

      {/* 역할 변경 모달 */}
      <CrudModal show={!!roleModal} title={`역할 변경 — ${roleModal?.name}`}
        onHide={() => setRoleModal(null)} onConfirm={() => roleMutation.mutate()} isPending={roleMutation.isPending}>
        {err && <Alert variant="danger" className="py-2 small">{err}</Alert>}
        <Form.Group>
          <Form.Label className="small fw-semibold">새 역할</Form.Label>
          <Form.Select size="sm" value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Form.Select>
        </Form.Group>
      </CrudModal>

      {/* 상태 변경 확인 모달 */}
      <CrudModal
        show={!!statusModal}
        title={statusModal?.isActive ? '사용자 비활성화' : '사용자 활성화'}
        onHide={() => setStatusModal(null)}
        onConfirm={() => statusMutation.mutate()}
        isPending={statusMutation.isPending}
        confirmLabel={statusModal?.isActive ? '비활성화' : '활성화'}
        confirmVariant={statusModal?.isActive ? 'danger' : 'success'}
      >
        {err && <Alert variant="danger" className="py-2 small">{err}</Alert>}
        <p className="mb-0 small">
          <strong>{statusModal?.name}</strong>({statusModal?.email}) 을(를){' '}
          <strong>{statusModal?.isActive ? '비활성화' : '활성화'}</strong>하시겠습니까?
          {statusModal?.isActive && ' 비활성화 시 즉시 로그아웃됩니다.'}
        </p>
      </CrudModal>
    </div>
  )
}
