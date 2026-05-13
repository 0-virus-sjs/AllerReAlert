import { useState } from 'react'
import { Modal, Button, Form, Row, Col } from 'react-bootstrap'
import type { MealItemInput, MealItemCategory } from '../../types/meal'

const CATEGORIES: { value: MealItemCategory; label: string }[] = [
  { value: 'rice',    label: '밥' },
  { value: 'soup',    label: '국' },
  { value: 'side',    label: '반찬' },
  { value: 'dessert', label: '후식' },
]

interface Props {
  show: boolean
  initialValues?: MealItemInput
  onSave: (item: MealItemInput) => void
  onCancel: () => void
}

interface FormState {
  category: MealItemCategory
  name: string
  ingredients: string
  calories: string
  carbs: string
  protein: string
  fat: string
}

function toFormState(v?: MealItemInput): FormState {
  return {
    category:    v?.category    ?? 'rice',
    name:        v?.name        ?? '',
    ingredients: v?.ingredients ?? '',
    calories:    v?.calories?.toString()         ?? '',
    carbs:       v?.nutrients?.carbs?.toString() ?? '',
    protein:     v?.nutrients?.protein?.toString() ?? '',
    fat:         v?.nutrients?.fat?.toString()   ?? '',
  }
}

function parseNum(s: string): number | undefined {
  const n = Number(s.trim())
  return s.trim() && !isNaN(n) && n >= 0 ? n : undefined
}

export function MealItemFormModal({ show, initialValues, onSave, onCancel }: Props) {
  const [form,  setForm]  = useState<FormState>(toFormState(initialValues))
  const [error, setError] = useState('')

  function handleShow() {
    setForm(toFormState(initialValues))
    setError('')
  }

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'name') setError('')
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError('메뉴 이름을 입력해주세요.')
      return
    }

    const calories = parseNum(form.calories)
    if (form.calories.trim() && calories === undefined) {
      setError('칼로리는 0 이상의 숫자를 입력해주세요.')
      return
    }

    const carbs   = parseNum(form.carbs)
    const protein = parseNum(form.protein)
    const fat     = parseNum(form.fat)
    const hasNutrients = carbs !== undefined || protein !== undefined || fat !== undefined

    const item: MealItemInput = {
      category:    form.category,
      name:        form.name.trim(),
      ...(form.ingredients.trim() && { ingredients: form.ingredients.trim() }),
      ...(calories !== undefined  && { calories }),
      ...(hasNutrients && { nutrients: { carbs, protein, fat } }),
    }

    onSave(item)
  }

  const titleLabel = initialValues ? '메뉴 수정' : '메뉴 추가'

  return (
    <Modal show={show} onHide={onCancel} onShow={handleShow} centered>
      <Modal.Header closeButton style={{ background: '#CFECF3' }}>
        <Modal.Title style={{ fontSize: 14, fontWeight: 600 }}>{titleLabel}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">카테고리</Form.Label>
          <Form.Select
            size="sm"
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
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
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">
            식재료 <span className="text-muted fw-normal">(선택, 콤마 구분)</span>
          </Form.Label>
          <Form.Control
            size="sm"
            type="text"
            placeholder="예) 달걀, 두부, 간장, 참기름"
            value={form.ingredients}
            onChange={(e) => set('ingredients', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="small fw-semibold">
            칼로리 <span className="text-muted fw-normal">(kcal, 선택)</span>
          </Form.Label>
          <Form.Control
            size="sm"
            type="number"
            min={0}
            placeholder="예) 580"
            value={form.calories}
            onChange={(e) => set('calories', e.target.value)}
          />
        </Form.Group>

        <Form.Label className="small fw-semibold">
          영양소 <span className="text-muted fw-normal">(g, 선택)</span>
        </Form.Label>
        <Row className="g-2">
          <Col>
            <Form.Control
              size="sm"
              type="number"
              min={0}
              placeholder="탄수화물"
              value={form.carbs}
              onChange={(e) => set('carbs', e.target.value)}
            />
          </Col>
          <Col>
            <Form.Control
              size="sm"
              type="number"
              min={0}
              placeholder="단백질"
              value={form.protein}
              onChange={(e) => set('protein', e.target.value)}
            />
          </Col>
          <Col>
            <Form.Control
              size="sm"
              type="number"
              min={0}
              placeholder="지방"
              value={form.fat}
              onChange={(e) => set('fat', e.target.value)}
            />
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onCancel}>취소</Button>
        <Button
          size="sm"
          style={{ background: '#CFECF3', borderColor: '#A8D8E8', color: '#3A3030' }}
          onClick={handleSave}
        >
          저장
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
