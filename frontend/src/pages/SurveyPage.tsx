import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Spinner, Badge } from 'react-bootstrap'

import { getSurveys, submitResponse } from '../services/surveys.api'
import type { Survey, SurveyOptions, SurveyOptionItem } from '../services/surveys.api'
import { FlashAlert } from '../components/common/FlashAlert'

// ── 카운트다운 타이머 ─────────────────────────────────────

function CountdownTimer({ deadline }: { deadline: string }) {
  const [text,    setText]    = useState('')
  const [isClose, setIsClose] = useState(false)

  useEffect(() => {
    function tick() {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setText('마감됨'); setIsClose(true); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setText(h > 0 ? `${h}시간 ${m}분 ${s}초` : `${m}분 ${s}초`)
      setIsClose(diff < 2 * 3_600_000)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [deadline])

  return (
    <span className={`small fw-semibold ${isClose ? 'text-danger' : 'text-secondary'}`}>
      ⏰ {text} 남음
    </span>
  )
}

// ── 선택지 파싱 헬퍼 ──────────────────────────────────────
//
// 서버가 need_check의 choices를 string[], menu_vote의 choices를 {id,name}[]로 전송함.
// FE 타입(SurveyOptionItem[])과 불일치하므로 정규화.

type RawChoice = SurveyOptionItem | string

function parseNeedCheckChoices(opts: SurveyOptions): Array<{ key: string; label: string }> {
  if (!opts.choices?.length) {
    return [
      { key: 'yes', label: '네, 필요합니다' },
      { key: 'no',  label: '아니요, 괜찮습니다' },
    ]
  }
  return (opts.choices as RawChoice[]).map(c => {
    if (typeof c === 'string') return { key: c, label: c }
    const key   = c.key   ?? c.id    ?? ''
    const label = c.label ?? c.name  ?? key
    return { key, label }
  })
}

function parseMenuItems(opts: SurveyOptions): Array<{ id: string; name: string; summary: string }> {
  // 자동 생성 설문은 items 없이 choices에 {id,name,summary}[]을 담음
  const raw = opts.items?.length
    ? (opts.items as RawChoice[])
    : ((opts.choices ?? []) as RawChoice[])
  return raw
    .map(c => {
      if (typeof c === 'string') return { id: c, name: c, summary: '' }
      return { id: c.id ?? c.key ?? '', name: c.name ?? c.label ?? '', summary: c.summary ?? '' }
    })
    .filter(item => item.id)
}

// ── 설문 내용 (카드 래퍼 없이) ───────────────────────────

interface SurveyContentProps {
  survey:      Survey
  onAnswered?: (choice: string) => void
}

function SurveyContent({ survey, onAnswered }: SurveyContentProps) {
  const queryClient = useQueryClient()
  const myResponse  = survey.responses[0]
  const isClosed    = survey.status === 'closed' || new Date(survey.deadline) < new Date()
  const opts        = survey.options as SurveyOptions

  const [selected, setSelected]   = useState<string>(
    myResponse?.votedItemId ?? (myResponse?.response?.choice as string) ?? '',
  )
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: (choice: string) => {
      const isVote = survey.type === 'menu_vote'
      return submitResponse(survey.id, {
        response:    { choice },
        votedItemId: isVote ? choice : undefined,
      })
    },
    onSuccess: (_data, choice) => {
      setSubmitMsg({ ok: true, text: '응답이 저장됐습니다.' })
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      if (survey.type === 'need_check') onAnswered?.(choice)
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setSubmitMsg({ ok: false, text: e?.response?.data?.message ?? '저장에 실패했습니다.' })
    },
  })

  const typeLabel        = survey.type === 'need_check' ? '필요 여부 확인' : '메뉴 투표'
  const typeBadge        = survey.type === 'need_check' ? 'info' : 'primary'
  const needCheckChoices = survey.type === 'need_check' ? parseNeedCheckChoices(opts) : []
  const menuItems        = survey.type === 'menu_vote'  ? parseMenuItems(opts)        : []

  return (
    <>
      {/* 타입 뱃지 + 상태 표시 */}
      <div className="d-flex justify-content-between align-items-center px-3 py-3">
        <Badge bg={typeBadge}>{typeLabel}</Badge>
        <div className="d-flex align-items-center gap-3">
          {!isClosed && <CountdownTimer deadline={survey.deadline} />}
          {isClosed  && <Badge bg="secondary">마감</Badge>}
          {myResponse && !isClosed && (
            <span className="small text-success">✓ 응답 완료 (변경 가능)</span>
          )}
        </div>
      </div>

      {/* 질문 + 선택지 */}
      <div className="px-3 pb-3">
        <p className="fw-semibold mb-3">
          {opts.question ?? (survey.type === 'need_check'
            ? '대체 식단이 필요하신가요?'
            : '선호하는 대체 식단 메뉴를 선택해 주세요.')}
        </p>

        {submitMsg && (
          <FlashAlert
            variant={submitMsg.ok ? 'success' : 'danger'}
            text={submitMsg.text}
            onClose={() => setSubmitMsg(null)}
            className="mb-3"
          />
        )}

        {/* need_check: Yes / No 버튼 */}
        {survey.type === 'need_check' && (
          <div className="d-flex gap-2 flex-wrap">
            {needCheckChoices.map(({ key, label }) => {
              const isSelected = selected === key
              return (
                <button
                  key={key}
                  className={`btn btn-lg ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                  disabled={isClosed || isPending}
                  onClick={() => { setSelected(key); mutate(key) }}
                >
                  {isPending && isSelected
                    ? <Spinner animation="border" size="sm" />
                    : label}
                </button>
              )
            })}
          </div>
        )}

        {/* menu_vote: 가로 식단 카드 */}
        {survey.type === 'menu_vote' && (
          <div>
            {menuItems.length === 0 && (
              <p className="text-muted small mb-0">표시할 메뉴 후보가 없습니다.</p>
            )}
            <div className="d-flex gap-3 overflow-auto pb-1">
              {menuItems.map(({ id, name, summary }) => {
                const checked = selected === id
                const menuLines = summary ? summary.split(' / ') : []
                return (
                  <div
                    key={id}
                    className={`card flex-shrink-0 ${isClosed ? 'opacity-50' : ''}`}
                    style={{
                      minWidth: 150,
                      maxWidth: 200,
                      cursor:      isClosed ? 'default' : 'pointer',
                      border:      `2px solid ${checked ? '#0d6efd' : '#dee2e6'}`,
                      background:  checked ? '#f0f5ff' : '#fff',
                      transition:  'border-color 0.15s, background 0.15s',
                    }}
                    onClick={() => !isClosed && !isPending && setSelected(id)}
                  >
                    <div className="card-body p-3">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <input
                          type="radio"
                          name={`survey-${survey.id}`}
                          value={id}
                          checked={checked}
                          disabled={isClosed || isPending}
                          onChange={() => setSelected(id)}
                          className="form-check-input mt-0 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="fw-semibold small">{name}</span>
                      </div>
                      {menuLines.length > 0 && (
                        <ul className="list-unstyled mb-0 ps-1">
                          {menuLines.map((item, i) => (
                            <li key={i} className="small text-muted" style={{ lineHeight: 1.6 }}>
                              • {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {!isClosed && menuItems.length > 0 && (
              <button
                className="btn btn-primary mt-3"
                disabled={!selected || isPending}
                onClick={() => selected && mutate(selected)}
              >
                {isPending ? <Spinner animation="border" size="sm" /> : '투표하기'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── 단독 설문 카드 ────────────────────────────────────────

function SurveyCard({ survey }: { survey: Survey }) {
  const dateStr = survey.mealPlan.date.slice(0, 10)
  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="px-3 py-2 border-bottom bg-white">
        <span className="small text-muted">식단일: {dateStr}</span>
      </div>
      <SurveyContent survey={survey} />
    </div>
  )
}

// ── 그룹 카드 (need_check → menu_vote 슬라이드) ───────────
//
// 같은 식단에 묶인 두 설문을 카드 넘기듯 순서대로 표시.
// need_check에 응답하면 menu_vote 카드로 자동 전환.

function SurveyGroupCard({ needCheck, menuVote }: { needCheck: Survey; menuVote: Survey }) {
  const [step, setStep] = useState<0 | 1>(0)
  const dateStr = needCheck.mealPlan.date.slice(0, 10)

  // need_check 첫 번째 선택지(필요합니다)에 응답했을 때만 menu_vote로 이동
  const needCheckChoices = parseNeedCheckChoices(needCheck.options as SurveyOptions)
  const yesKey = needCheckChoices[0]?.key ?? '필요합니다'

  return (
    <div className="card border-0 shadow-sm mb-3">
      {/* 그룹 헤더 */}
      <div className="px-3 py-2 border-bottom bg-white d-flex justify-content-between align-items-center">
        <span className="small text-muted">식단일: {dateStr}</span>
        {step === 1 && <span className="small fw-semibold text-primary">메뉴 선택</span>}
      </div>

      {/* 슬라이딩 영역 */}
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            display:    'flex',
            width:      '200%',
            transform:  step === 0 ? 'translateX(0)' : 'translateX(-50%)',
            transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ width: '50%', minWidth: 0 }}>
            <SurveyContent
              survey={needCheck}
              onAnswered={(choice) => { if (choice === yesKey) setStep(1) }}
            />
          </div>
          <div style={{ width: '50%', minWidth: 0 }}>
            <SurveyContent survey={menuVote} />
          </div>
        </div>
      </div>

      {/* step 2에서 이전 질문으로 돌아가기 */}
      {step === 1 && (
        <div className="px-3 pb-2 pt-1 border-top">
          <button
            className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
            onClick={() => setStep(0)}
          >
            ← 이전 질문으로
          </button>
        </div>
      )}
    </div>
  )
}

// ── 페이지 ────────────────────────────────────────────────

export function SurveyPage() {
  const [tab, setTab] = useState<'open' | 'closed'>('open')

  const { data: surveys = [], isLoading, isError } = useQuery({
    queryKey: ['surveys'],
    queryFn:  () => getSurveys(),
    staleTime: 30_000,
  })

  const now    = new Date()
  const open   = surveys.filter(s => s.status === 'open' && new Date(s.deadline) > now)
  const closed = surveys.filter(s => s.status === 'closed' || new Date(s.deadline) <= now)

  // open 설문을 mealPlanId로 그룹화
  const openGroups = new Map<string, Survey[]>()
  for (const s of open) {
    if (!openGroups.has(s.mealPlanId)) openGroups.set(s.mealPlanId, [])
    openGroups.get(s.mealPlanId)!.push(s)
  }

  if (isLoading) return (
    <div className="d-flex justify-content-center py-5">
      <Spinner animation="border" variant="primary" />
    </div>
  )

  if (isError) return (
    <Alert variant="danger">설문 목록을 불러오지 못했습니다.</Alert>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      <h5 className="fw-bold mb-4">📋 설문·투표</h5>

      {/* 탭 */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'open' ? 'active' : 'text-dark'}`}
            onClick={() => setTab('open')}
          >
            진행 중
            {open.length > 0 && (
              <Badge bg="danger" className="ms-2">{open.length}</Badge>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'closed' ? 'active' : 'text-dark'}`}
            onClick={() => setTab('closed')}
          >
            마감됨
          </button>
        </li>
      </ul>

      {/* 진행 중 탭 — mealPlan 단위로 그룹화 */}
      {tab === 'open' && (
        openGroups.size === 0 ? (
          <div className="text-center text-muted py-5">진행 중인 설문이 없습니다.</div>
        ) : (
          Array.from(openGroups.entries()).map(([mealPlanId, group]) => {
            const needCheck = group.find(s => s.type === 'need_check')
            const menuVote  = group.find(s => s.type === 'menu_vote')
            if (needCheck && menuVote) {
              return (
                <SurveyGroupCard
                  key={mealPlanId}
                  needCheck={needCheck}
                  menuVote={menuVote}
                />
              )
            }
            const single = needCheck ?? menuVote!
            return <SurveyCard key={single.id} survey={single} />
          })
        )
      )}

      {/* 마감됨 탭 — 개별 카드 */}
      {tab === 'closed' && (
        closed.length === 0 ? (
          <div className="text-center text-muted py-5">마감된 설문이 없습니다.</div>
        ) : (
          closed.map(s => <SurveyCard key={s.id} survey={s} />)
        )
      )}
    </div>
  )
}
