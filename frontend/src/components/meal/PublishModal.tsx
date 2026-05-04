import { useState } from 'react'
import { Modal, Button, Form, Spinner } from 'react-bootstrap'

interface Props {
  show: boolean
  onHide: () => void
  onConfirm: (scheduledAt?: string) => void
  isPending: boolean
}

function nowLocalDatetime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PublishModal({ show, onHide, onConfirm, isPending }: Props) {
  const [mode,     setMode]     = useState<'immediate' | 'scheduled'>('immediate')
  const [datetime, setDatetime] = useState(nowLocalDatetime)

  const handleConfirm = () => {
    if (mode === 'immediate') {
      onConfirm(undefined)
    } else {
      onConfirm(new Date(datetime).toISOString())
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton style={{ background: '#CFECF3' }}>
        <Modal.Title style={{ fontSize: 14, fontWeight: 600 }}>식단 공개 설정</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Check
            type="radio"
            id="publish-immediate"
            label="즉시 공개"
            checked={mode === 'immediate'}
            onChange={() => setMode('immediate')}
            className="small mb-2"
          />
          <Form.Check
            type="radio"
            id="publish-scheduled"
            label="예약 공개 (지정 시각에 자동 공개)"
            checked={mode === 'scheduled'}
            onChange={() => setMode('scheduled')}
            className="small"
          />
        </Form.Group>

        {mode === 'scheduled' && (
          <Form.Group>
            <Form.Label className="small fw-semibold">공개 예약 시각</Form.Label>
            <Form.Control
              type="datetime-local"
              size="sm"
              value={datetime}
              min={nowLocalDatetime()}
              onChange={(e) => setDatetime(e.target.value)}
            />
          </Form.Group>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onHide} disabled={isPending}>
          취소
        </Button>
        <Button
          size="sm"
          style={{ background: '#CFECF3', borderColor: '#A8D8E8', color: '#3A3030' }}
          onClick={handleConfirm}
          disabled={isPending}
        >
          {isPending ? <Spinner size="sm" animation="border" /> : '공개하기'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
