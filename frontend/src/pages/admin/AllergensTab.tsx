import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Form, Alert, Spinner } from 'react-bootstrap'
import {
  fetchAllergensMaster, createAllergenMaster, updateAllergenMaster, deleteAllergenMaster,
  type AllergenMaster,
} from '../../services/admin.api'
import { CrudModal } from '../../components/admin/CrudModal'

export function AllergensTab() {
  const qc = useQueryClient()
  const [modal, setModal]   = useState<{ mode: 'create' | 'edit'; item?: AllergenMaster } | null>(null)
  const [delTarget, setDel] = useState<AllergenMaster | null>(null)
  const [form, setForm]     = useState<{ name: string; code: number | '' }>({ name: '', code: '' })
  const [err, setErr]       = useState('')

  const { data: allergens = [], isLoading } = useQuery({
    queryKey: ['admin-allergens'],
    queryFn:  fetchAllergensMaster,
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: form.name, code: Number(form.code) }
      return modal?.mode === 'edit' && modal.item
        ? updateAllergenMaster(modal.item.id, payload)
        : createAllergenMaster(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-allergens'] }); setModal(null) },
    onError:   (e: { response?: { data?: { error?: { message?: string } } } }) =>
      setErr(e?.response?.data?.error?.message ?? '오류가 발생했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAllergenMaster(delTarget!.id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-allergens'] }); setDel(null) },
    onError:    (e: { response?: { data?: { error?: { message?: string } } } }) =>
      setErr(e?.response?.data?.error?.message ?? '삭제 실패'),
  })

  function openCreate() { setForm({ name: '', code: '' }); setErr(''); setModal({ mode: 'create' }) }
  function openEdit(item: AllergenMaster) {
    setForm({ name: item.name, code: item.code }); setErr(''); setModal({ mode: 'edit', item })
  }
  function handleSave() {
    if (!form.name.trim()) { setErr('알레르기명을 입력해주세요.'); return }
    if (!form.code || Number(form.code) < 1) { setErr('코드번호를 입력해주세요.'); return }
    saveMutation.mutate()
  }

  return (
    <div>
      <div className="mb-3">
        <Button size="sm" variant="primary" onClick={openCreate}>+ 알레르기 추가</Button>
      </div>

      {isLoading && <div className="text-center py-4"><Spinner animation="border" size="sm" /></div>}

      <Table size="sm" hover style={{ maxWidth: 480 }}>
        <thead className="table-light">
          <tr><th>코드</th><th>알레르기명</th><th></th></tr>
        </thead>
        <tbody>
          {allergens.map((a) => (
            <tr key={a.id}>
              <td className="fw-semibold text-secondary">{a.code}</td>
              <td>{a.name}</td>
              <td>
                <div className="d-flex gap-1">
                  <Button size="sm" variant="outline-secondary" onClick={() => openEdit(a)}>편집</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => { setErr(''); setDel(a) }}>삭제</Button>
                </div>
              </td>
            </tr>
          ))}
          {!isLoading && allergens.length === 0 && (
            <tr><td colSpan={3} className="text-center text-muted py-3">데이터 없음</td></tr>
          )}
        </tbody>
      </Table>

      {/* 추가/편집 모달 */}
      <CrudModal show={!!modal} title={modal?.mode === 'edit' ? '알레르기 편집' : '알레르기 추가'}
        onHide={() => setModal(null)} onConfirm={handleSave} isPending={saveMutation.isPending}>
        {err && <Alert variant="danger" className="py-2 small">{err}</Alert>}
        <Form.Group className="mb-2">
          <Form.Label className="small fw-semibold">코드번호 *</Form.Label>
          <Form.Control size="sm" type="number" min={1} value={form.code}
            onChange={(e) => setForm(f => ({ ...f, code: Number(e.target.value) }))} />
        </Form.Group>
        <Form.Group>
          <Form.Label className="small fw-semibold">알레르기명 *</Form.Label>
          <Form.Control size="sm" value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        </Form.Group>
      </CrudModal>

      {/* 삭제 확인 모달 */}
      <CrudModal show={!!delTarget} title="알레르기 삭제"
        onHide={() => setDel(null)} onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending} confirmLabel="삭제" confirmVariant="danger">
        {err && <Alert variant="danger" className="py-2 small">{err}</Alert>}
        <p className="mb-0 small">
          <strong>{delTarget?.name}</strong> (코드 {delTarget?.code})을 삭제하시겠습니까?<br />
          <span className="text-danger">사용 중인 알레르기는 삭제할 수 없습니다.</span>
        </p>
      </CrudModal>
    </div>
  )
}
