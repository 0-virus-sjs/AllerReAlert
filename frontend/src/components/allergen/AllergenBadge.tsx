import { OverlayTrigger, Tooltip, Badge } from 'react-bootstrap'
import type { AllergenRef } from '../../types/meal'

interface Props {
  allergen: AllergenRef
  /** 사용자 본인 알레르기와 일치할 때 true → 위험 강조 */
  dangerous?: boolean
  /** 자동 태깅 여부 표시 */
  autoTagged?: boolean
  size?: 'sm' | 'md'
}

export function AllergenBadge({ allergen, dangerous = false, autoTagged = false, size = 'sm' }: Props) {
  const bg = dangerous ? 'danger' : 'secondary'
  const fs = size === 'sm' ? '0.65rem' : '0.75rem'
  const label = `${allergen.code}. ${allergen.name}${autoTagged ? ' (자동)' : ''}`

  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip>
          {dangerous && <span className="fw-bold">⚠️ 알레르기 주의 · </span>}
          {label}
        </Tooltip>
      }
    >
      <Badge
        bg={bg}
        className="me-1"
        style={{ fontSize: fs, cursor: 'default', opacity: autoTagged && !dangerous ? 0.75 : 1 }}
        aria-label={label}
      >
        {allergen.code}
      </Badge>
    </OverlayTrigger>
  )
}
