import { Alert } from 'react-bootstrap'

interface Props {
  variant:   'success' | 'danger' | 'warning' | 'info'
  text:      string
  onClose:   () => void
  className?: string
}

/**
 * Bootstrap Alert의 dismissible은 × 버튼을 position:absolute로 배치해
 * py-2 같은 작은 패딩에서 수직 정렬이 깨짐.
 * btn-close를 flex 흐름에 올려 상하 가운데 정렬을 보장.
 */
export function FlashAlert({ variant, text, onClose, className }: Props) {
  return (
    <Alert
      variant={variant}
      className={`d-flex align-items-center justify-content-between py-2 mb-0 ${className ?? ''}`}
    >
      <span className="small">{text}</span>
      <button
        type="button"
        className="btn-close ms-3 flex-shrink-0"
        onClick={onClose}
        aria-label="닫기"
      />
    </Alert>
  )
}
