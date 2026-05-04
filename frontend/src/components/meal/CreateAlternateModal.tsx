import { useState, useMemo } from 'react'
import { Modal, Button, Form, Spinner } from 'react-bootstrap'
import type { MealPlan, AllergenRef, CreateAlternateInput } from '../../types/meal'

interface Props {
  show: boolean
  plan: MealPlan
  onSave: (input: CreateAlternateInput) => void
  onHide: () => void
  isPending: boolean
}

export function CreateAlternateModal({ show, plan, onSave, onHide, isPending }: Props) {
  const [targetAllergenId, setTargetAllergenId] = useState('')
  const [replacements,     setReplacements]     = useState<Record<string, { name: string; calories: string }>>({})
  const [error,            setError]            = useState('')

  // Unique allergens across all items in this plan
  const allergenOptions = useMemo<AllergenRef[]>(() => {
    const map = new Map<string, AllergenRef>()
    plan.items.forEach((item) => {
      item.allergens.forEach(({ allergen }) => map.set(allergen.id, allergen))
    })
    return Array.from(map.values()).sort((a, b) => a.code - b.code)
  }, [plan])

  // Items that contain the selected allergen
  const affectedItems = useMemo(
    () => plan.items.filter((item) =>
      item.allergens.some((a) => a.allergen.id === targetAllergenId),
    ),
    [plan, targetAllergenId],
  )

  const handleAllergenChange = (id: string) => {
    setTargetAllergenId(id)
    setError('')
    const init: Record<string, { name: string; calories: string }> = {}
    plan.items
      .filter((item) => item.allergens.some((a) => a.allergen.id === id))
      .forEach((item) => { init[item.id] = { name: '', calories: '' } })
    setReplacements(init)
  }

  const handleSave = () => {
    if (!targetAllergenId) { setError('대상 알레르기를 선택해주세요.'); return }
    if (affectedItems.length === 0) { setError('해당 알레르기가 포함된 메뉴가 없습니다.'); return }

    const items = affectedItems.map((item) => ({
      replacesItemId: item.id,
      name: replacements[item.id]?.name.trim() ?? '',
      calories: replacements[item.id]?.calories.trim()
        ? parseInt(replacements[item.id].calories, 10)
        : undefined,
    }))

    if (items.some((it) => !it.name)) {
      setError('모든 대체 메뉴 이름을 입력해주세요.')
      return
    }

    onSave({ targetAllergenId, items })
  }

  const handleHide = () => {
    setTargetAllergenId('')
    setReplacements({})
    setError('')
    onHide()
  }

  return (
    <Modal show={show} onHide={handleHide} centered>
      <Modal.Header closeButton style={{ background: '#CFECF3' }}>
        <Modal.Title style={{ fontSize: 14, fontWeight: 600 }}>대체 메뉴 등록</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

        <Form.Group className="mb-4">
          <Form.Label className="small fw-semibold">대상 알레르기</Form.Label>
          <Form.Select
            size="sm"
            value={targetAllergenId}
            onChange={(e) => handleAllergenChange(e.target.value)}
          >
            <option value="">선택해주세요</option>
            {allergenOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name} (코드 {a.code})</option>
            ))}
          </Form.Select>
          <Form.Text className="text-muted">
            선택한 알레르기가 포함된 메뉴에 대한 대체 메뉴를 입력합니다.
          </Form.Text>
        </Form.Group>

        {targetAllergenId && affectedItems.length > 0 && (
          <div>
            <div className="small fw-semibold mb-2">대체 메뉴 입력</div>
            <div className="d-flex flex-column gap-3">
              {affectedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded"
                  style={{ background: '#FDDDE8', border: '1px solid #E06080' }}
                >
                  <div className="small mb-2" style={{ color: '#C04060' }}>
                    원본: <strong>{item.name}</strong>
                    <span className="ms-1 text-muted" style={{ fontSize: 10 }}>
                      ({item.allergens.map((a) => a.allergen.name).join(', ')} 포함)
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <Form.Control
                      size="sm"
                      type="text"
                      placeholder="대체 메뉴 이름"
                      value={replacements[item.id]?.name ?? ''}
                      onChange={(e) =>
                        setReplacements((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], name: e.target.value },
                        }))
                      }
                      style={{ flex: 2 }}
                    />
                    <Form.Control
                      size="sm"
                      type="number"
                      min={0}
                      placeholder="칼로리(선택)"
                      value={replacements[item.id]?.calories ?? ''}
                      onChange={(e) =>
                        setReplacements((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], calories: e.target.value },
                        }))
                      }
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {targetAllergenId && affectedItems.length === 0 && (
          <div className="text-muted small p-3 text-center border rounded">
            이 식단에는 선택한 알레르기가 포함된 메뉴가 없습니다.
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" size="sm" onClick={handleHide} disabled={isPending}>취소</Button>
        <Button
          size="sm"
          style={{ background: '#CFECF3', borderColor: '#A8D8E8', color: '#3A3030' }}
          onClick={handleSave}
          disabled={isPending || !targetAllergenId}
        >
          {isPending ? <Spinner size="sm" animation="border" /> : '등록'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
