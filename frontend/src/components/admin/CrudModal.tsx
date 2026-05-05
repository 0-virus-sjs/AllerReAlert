import { Modal, Button, Spinner } from 'react-bootstrap'

interface Props {
  show: boolean
  title: string
  onHide: () => void
  onConfirm: () => void
  isPending: boolean
  confirmLabel?: string
  confirmVariant?: string
  children: React.ReactNode
}

export function CrudModal({
  show, title, onHide, onConfirm, isPending,
  confirmLabel = '저장', confirmVariant = 'primary', children,
}: Props) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 15 }}>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onHide} disabled={isPending}>취소</Button>
        <Button variant={confirmVariant} size="sm" onClick={onConfirm} disabled={isPending}>
          {isPending ? <Spinner size="sm" animation="border" /> : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
