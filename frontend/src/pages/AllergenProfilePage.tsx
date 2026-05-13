import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge, Spinner } from 'react-bootstrap'
import { FlashAlert } from '../components/common/FlashAlert'
import { getMasterAllergens, getMyAllergens, addAllergen, removeAllergen } from '../services/allergens.api'
import type { AllergenStatus } from '../types/allergen'

const STATUS_LABEL: Record<AllergenStatus, string> = {
  pending:   '승인 대기',
  confirmed: '확정',
  rejected:  '반려',
}

const STATUS_BG: Record<AllergenStatus, string> = {
  pending:   'warning',
  confirmed: 'success',
  rejected:  'danger',
}

export function AllergenProfilePage() {
  const queryClient = useQueryClient()
  const [customInput, setCustomInput] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)

  const { data: masterList = [], isLoading: masterLoading } = useQuery({
    queryKey: ['allergens-master'],
    queryFn: getMasterAllergens,
    staleTime: Infinity,
  })

  const { data: myAllergens = [], isLoading: myLoading } = useQuery({
    queryKey: ['my-allergens'],
    queryFn: getMyAllergens,
  })

  const registeredByMasterId = useMemo(
    () => new Map(myAllergens.filter((ua) => !ua.customAllergenName).map((ua) => [ua.allergen.id, ua])),
    [myAllergens],
  )

  const customAllergens = useMemo(
    () => myAllergens.filter((ua) => ua.customAllergenName),
    [myAllergens],
  )

  const addMutation = useMutation({
    mutationFn: addAllergen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-allergens'] })
      setCustomInput('')
      flash('success', '알레르기가 등록되었습니다.')
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      flash('danger', err.response?.data?.error?.message ?? '등록에 실패했습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: removeAllergen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-allergens'] })
      flash('success', '삭제되었습니다.')
    },
    onError: () => flash('danger', '삭제에 실패했습니다.'),
  })

  function flash(type: 'success' | 'danger', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  function handleAddCustom() {
    const name = customInput.trim()
    if (!name) return
    addMutation.mutate({ customAllergenName: name })
  }

  const isLoading = masterLoading || myLoading

  return (
    <div className="p-4" style={{ maxWidth: 720 }}>
      <h5 className="fw-bold mb-1">내 알레르기 설정</h5>
      <p className="text-muted small mb-3">
        등록한 알레르기는 식단 조회 시 자동으로 강조 표시되고 알림 발송에 사용됩니다.
      </p>

      {msg && (
        <FlashAlert variant={msg.type} text={msg.text} onClose={() => setMsg(null)} className="mb-3" />
      )}

      {isLoading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : (
        <>
          {/* ── 식약처 19종 체크리스트 ──────────────────────── */}
          <section className="mb-4">
            <div className="fw-semibold small mb-2" style={{ color: '#3A3030' }}>
              식약처 19종 알레르기 유발물질
            </div>
            <div className="d-flex flex-wrap gap-2">
              {masterList.map((ma) => {
                const ua = registeredByMasterId.get(ma.id)
                const isRegistered = !!ua
                const isPending = addMutation.isPending && addMutation.variables?.allergenId === ma.id

                return (
                  <button
                    key={ma.id}
                    disabled={isRegistered || addMutation.isPending}
                    onClick={() => addMutation.mutate({ allergenId: ma.id })}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 4,
                      border: isRegistered
                        ? `1.5px solid ${ua.status === 'confirmed' ? '#5DBD6A' : ua.status === 'pending' ? '#FFC107' : '#E06080'}`
                        : '1.5px dashed #C0BBB4',
                      background: isRegistered
                        ? ua.status === 'confirmed' ? '#DAF9DE' : ua.status === 'pending' ? '#FFF8E1' : '#FDDDE8'
                        : '#FAFEFF',
                      color: isRegistered ? '#3A3030' : '#666',
                      fontSize: 12,
                      cursor: isRegistered ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isPending ? (
                      <Spinner size="sm" animation="border" style={{ width: 12, height: 12 }} />
                    ) : isRegistered ? (
                      <span style={{ color: ua.status === 'confirmed' ? '#2E7D32' : ua.status === 'pending' ? '#E65100' : '#C04060' }}>✓</span>
                    ) : (
                      <span style={{ color: '#AAA' }}>+</span>
                    )}
                    <span className="fw-semibold" style={{ fontSize: 10, color: '#888' }}>{ma.code}.</span>
                    {ma.name}
                    {isRegistered && (
                      <Badge bg={STATUS_BG[ua.status as AllergenStatus]} style={{ fontSize: 9 }}>
                        {STATUS_LABEL[ua.status as AllergenStatus]}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-muted mt-2" style={{ fontSize: 11 }}>
              항목을 클릭하면 등록됩니다. 학생은 보호자 승인 후 확정됩니다.
            </p>
          </section>

          {/* ── 기타 알레르기 입력 ─────────────────────────── */}
          <section className="mb-4">
            <div className="fw-semibold small mb-2" style={{ color: '#3A3030' }}>기타 알레르기</div>
            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ maxWidth: 240 }}
                placeholder="예) 아몬드, 연어..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                maxLength={100}
              />
              <button
                className="btn btn-sm"
                style={{ background: '#CFECF3', border: '1px solid #A8D8E8', color: '#3A3030' }}
                onClick={handleAddCustom}
                disabled={!customInput.trim() || addMutation.isPending}
              >
                {addMutation.isPending && !addMutation.variables?.allergenId ? (
                  <Spinner size="sm" animation="border" />
                ) : '추가'}
              </button>
            </div>

            {customAllergens.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {customAllergens.map((ua) => (
                  <div
                    key={ua.id}
                    className="d-flex align-items-center gap-1 px-2 py-1 rounded"
                    style={{ border: '1px solid #C0BBB4', background: '#FAFEFF', fontSize: 12 }}
                  >
                    <span>{ua.customAllergenName}</span>
                    <Badge bg={STATUS_BG[ua.status as AllergenStatus]} style={{ fontSize: 9 }}>
                      {STATUS_LABEL[ua.status as AllergenStatus]}
                    </Badge>
                    <button
                      className="btn btn-sm p-0 ms-1"
                      style={{ lineHeight: 1, color: '#999', fontSize: 12 }}
                      onClick={() => deleteMutation.mutate(ua.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="삭제"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 등록된 알레르기 삭제 관리 ─────────────────── */}
          {myAllergens.filter((ua) => !ua.customAllergenName).length > 0 && (
            <section>
              <div className="fw-semibold small mb-2" style={{ color: '#3A3030' }}>등록된 알레르기 관리</div>
              <div className="d-flex flex-column gap-1">
                {myAllergens
                  .filter((ua) => !ua.customAllergenName)
                  .map((ua) => (
                    <div
                      key={ua.id}
                      className="d-flex align-items-center justify-content-between px-3 py-2 rounded"
                      style={{ border: '1px solid #E0DBD4', background: '#FAFEFF', fontSize: 13 }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold" style={{ color: '#888', fontSize: 11 }}>
                          {ua.allergen.code}.
                        </span>
                        <span>{ua.allergen.name}</span>
                        <Badge bg={STATUS_BG[ua.status as AllergenStatus]} style={{ fontSize: 10 }}>
                          {STATUS_LABEL[ua.status as AllergenStatus]}
                        </Badge>
                        {ua.status === 'pending' && (
                          <span className="text-muted" style={{ fontSize: 10 }}>
                            보호자 승인 대기 중
                          </span>
                        )}
                      </div>
                      <button
                        className="btn btn-sm"
                        style={{ border: '1px solid #E06080', color: '#C04060', fontSize: 11 }}
                        onClick={() => deleteMutation.mutate(ua.id)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === ua.id}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
