import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Form, Badge, InputGroup, Spinner, Alert } from 'react-bootstrap'
import { fetchOrgs, createOrg, updateOrg, type Organization, type OrgInput, type OrgType } from '../../services/admin.api'
import { CrudModal } from '../../components/admin/CrudModal'

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  school: '학교', company: '사내식당', welfare: '복지관', military: '군부대', other: '기타',
}

const EMPTY: OrgInput = { name: '', address: '', orgType: 'school' }

export function OrgsTab() {
  const qc = useQueryClient()
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState<{ mode: 'create' | 'edit'; item?: Organization } | null>(null)
  const [form, setForm]     = useState<OrgInput>(EMPTY)
  const [err, setErr]       = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orgs', page, search],
    queryFn:  () => fetchOrgs({ page, search: search || undefined }),
  })

  const mutation = useMutation({
    mutationFn: () =>
      modal?.mode === 'edit' && modal.item
        ? updateOrg(modal.item.id, form)
        : createOrg(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orgs'] }); setModal(null) },
    onError:   (e: { response?: { data?: { error?: { message?: string } } } }) =>
      setErr(e?.response?.data?.error?.message ?? '오류가 발생했습니다.'),
  })

  function openCreate() { setForm(EMPTY); setErr(''); setModal({ mode: 'create' }) }
  function openEdit(item: Organization) {
    setForm({ name: item.name, address: item.address ?? '', orgType: item.orgType })
    setErr('')
    setModal({ mode: 'edit', item })
  }
  function handleSave() {
    if (!form.name.trim()) { setErr('단체명을 입력해주세요.'); return }
    mutation.mutate()
  }

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <InputGroup size="sm" style={{ maxWidth: 280 }}>
          <Form.Control placeholder="단체명 검색" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </InputGroup>
        <Button size="sm" variant="primary" onClick={openCreate}>+ 단체 추가</Button>
      </div>

      {isLoading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}

      <Table size="sm" hover>
        <thead className="table-light">
          <tr><th>단체명</th><th>유형</th><th>주소</th><th>구성원 수</th><th></th></tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((org) => (
            <tr key={org.id}>
              <td className="fw-medium">{org.name}</td>
              <td><Badge bg="secondary">{ORG_TYPE_LABELS[org.orgType]}</Badge></td>
              <td className="text-muted small">{org.address ?? '-'}</td>
              <td>{org._count.users}명</td>
              <td><Button size="sm" variant="outline-secondary" onClick={() => openEdit(org)}>편집</Button></td>
            </tr>
          ))}
          {!isLoading && data?.items.length === 0 && (
            <tr><td colSpan={5} className="text-center text-muted py-3">결과 없음</td></tr>
          )}
        </tbody>
      </Table>

      {/* 페이지네이션 */}
      {data && data.total > data.pageSize && (
        <div className="d-flex gap-2 justify-content-end">
          <Button size="sm" variant="outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
          <span className="small align-self-center">{page} / {Math.ceil(data.total / data.pageSize)}</span>
          <Button size="sm" variant="outline-secondary" disabled={page >= Math.ceil(data.total / data.pageSize)} onClick={() => setPage(p => p + 1)}>다음</Button>
        </div>
      )}

      <CrudModal
        show={!!modal}
        title={modal?.mode === 'edit' ? '단체 편집' : '단체 추가'}
        onHide={() => setModal(null)}
        onConfirm={handleSave}
        isPending={mutation.isPending}
      >
        {err && <Alert variant="danger" className="py-2 small">{err}</Alert>}
        <Form.Group className="mb-2">
          <Form.Label className="small fw-semibold">단체명 *</Form.Label>
          <Form.Control size="sm" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label className="small fw-semibold">유형</Form.Label>
          <Form.Select size="sm" value={form.orgType} onChange={(e) => setForm(f => ({ ...f, orgType: e.target.value as OrgType }))}>
            {Object.entries(ORG_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label className="small fw-semibold">주소</Form.Label>
          <Form.Control size="sm" value={form.address ?? ''} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
        </Form.Group>
      </CrudModal>
    </div>
  )
}
