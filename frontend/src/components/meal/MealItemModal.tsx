import { useState, useEffect } from 'react'
import { Modal, Button, Form, Spinner } from 'react-bootstrap'
import type { MealItemInput, MealItemCategory } from '../../types/meal'

const CATEGORIES: { value: MealItemCategory; label: string }[] = [
  { value: 'rice',    label: '밥' },
  { value: 'soup',    label: '국' },
  { value: 'side',    label: '반찬' },
  { value: 'dessert', label: '후식' },
]

interface Props {
  show: boolean
  initial?: MealItemInput
  onSave: (item: MealItemInput) => void
  onHide: () => void
}

export function MealItemModal({ show, initial, onSave, onHide }: Props) {
  const [category, setCategory] = useState<MealItemCategory>(initial?.category ?? 'rice')
  const [name,     setName]     = useState(initial?.name ?? '')
  const [calories, setCalories] = useState(initial?.calories?.toString() ?? '')
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    if (show) {
      setCategory(initial?.category ?? 'rice')
      setName(initial?.name ?? '')
      setCalories(initial?.calories?.toString() ?? '')
      setError('')
      setSaving(false)
    }
  }, [show, initial])

  const handleSave = () => {
    if (!name.trim()) {
      setError('메뉴 이름을 입력해주세요.')
      return
    }
    const cal = calories.trim() ? parseInt(calories, 10) : undefined
    if (calories.trim() && (isNaN(cal!) || cal! < 0)) {
      setError('칼로리는 0 이상의 숫자를 입력해주세요.')
      return
    }
    setSaving(true)
    onSave({ category, name: name.trim(), calories: cal })
  }

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton style={{ background: '#CFECF3' }}>
        <Modal.Title style={{ fontSize: 14, fontWeight: 600 }}>
          {initial ? '메뉴 수정' : '메뉴 추가'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <div className="alert alert-danger py-2 small mb-3">{error}</div>
        )}

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">카테고리</Form.Label>
          <Form.Select
            size="sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as MealItemCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">메뉴 이름</Form.Label>
          <Form.Control
            size="sm"
            type="text"
            placeholder="예) 잡곡밥, 된장국, 제육볶음"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label className="small fw-semibold">칼로리 <span className="text-muted fw-normal">(선택)</span></Form.Label>
          <Form.Control
            size="sm"
            type="number"
            min={0}
            placeholder="예) 580"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onHide} disabled={saving}>취소</Button>
        <Button
          size="sm"
          style={{ background: '#CFECF3', borderColor: '#A8D8E8', color: '#3A3030' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Spinner size="sm" animation="border" /> : '저장'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
