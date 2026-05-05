import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Spinner, Badge } from 'react-bootstrap'
import { getSurveys, submitResponse } from '../services/surveys.api'
import type { Survey, SurveyOptionItem } from '../services/surveys.api'

// ── 카운트다운 타이머 ─────────────────────────────────────

function CountdownTimer({ deadline }: { deadline: string }) {
  const [text, setText] = useState('')

  useEffect(() => {
    function tick() {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setText('마감됨'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setText(h > 0 ? `${h}시간 ${m}분 ${s}초` : `${m}분 ${s}초`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [deadline])

  const isClose = new Date(deadline).getTime() - Date.now() < 2 * 3_600_000
  return (
    <span className={`small fw-semibold ${isClose ? 'text-danger' : 'text-secondary'}`}>
      ⏰ {text} 남음
    </span>
  )
}

// ── 설문 카드 ─────────────────────────────────────────────

function SurveyCard({ survey }: { survey: Survey }) {
  const queryClient = useQueryClient()
  const myResponse  = survey.responses[0]   // 본인 응답만 반환됨
  const isClosed    = survey.status === 'closed' || new Date(survey.deadline) < new Date()
  const opts        = survey.options

  const [selected, setSelected] = useState<string>(
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
    onSuccess: () => {
      setSubmitMsg({ ok: true, text: '응답이 저장됐습니다.' })
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setSubmitMsg({ ok: false, text: e?.response?.data?.message ?? '저장에 실패했습니다.' })
    },
  })

  const typeLabel  = survey.type === 'need_check' ? '필요 여부 확인' : '메뉴 투표'
  const typeBadge  = survey.type === 'need_check' ? 'info' : 'primary'
  const dateStr    = survey.mealPlan.date.slice(0, 10)

  // need_check 선택지
  const needCheckChoices: SurveyOptionItem[] = opts.choices?.length
    ? opts.choices
    : [{ key: 'yes', label: '네, 필요합니다' }, { key: 'no', label: '아니요, 괜찮습니다' }]

  // menu_vote 항목
  const menuItems: SurveyOptionItem[] = opts.items ?? []

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-2">
          <Badge bg={typeBadge}>{typeLabel}</Badge>
          <span className="small text-muted">식단일: {dateStr}</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          {!isClosed && <CountdownTimer deadline={survey.deadline} />}
          {isClosed && <Badge bg="secondary">마감</Badge>}
          {myResponse && !isClosed && (
            <span className="small text-success">✓ 응답 완료 (변경 가능)</span>
          )}
        </div>
      </div>

      <div className="card-body">
        <p className="fw-semibold mb-3">
          {opts.question ?? (survey.type === 'need_check'
            ? '대체 식단이 필요하신가요?'
            : '선호하는 대체 식단 메뉴를 선택해 주세요.')}
        </p>

        {submitMsg && (
          <Alert
            variant={submitMsg.ok ? 'success' : 'danger'}
            onClose={() => setSubmitMsg(null)}
            dismissible
            className="py-2"
          >
            {submitMsg.text}
          </Alert>
        )}

        {/* need_check: Yes / No 버튼 */}
        {survey.type === 'need_check' && (
          <div className="d-flex gap-2 flex-wrap">
            {needCheckChoices.map((c) => {
              const key = c.key ?? c.id ?? ''
              const isSelected = selected === key
              return (
                <button
                  key={key}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                  disabled={isClosed || isPending}
                  onClick={() => {
                    setSelected(key)
                    mutate(key)
                  }}
                >
                  {isPending && isSelected
                    ? <Spinner animation="border" size="sm" />
                    : c.label ?? key}
                </button>
              )
            })}
          </div>
        )}

        {/* menu_vote: 라디오 목록 */}
        {survey.type === 'menu_vote' && (
          <div className="d-flex flex-column gap-2">
            {menuItems.map((item) => {
              const id  = item.id ?? item.key ?? ''
              const lbl = item.name ?? item.label ?? id
              const checked = selected === id
              return (
                <label
                  key={id}
                  className={`d-flex align-items-center gap-3 p-3 rounded border cursor-pointer ${
                    checked ? 'border-primary bg-primary bg-opacity-10' : 'border-light'
                  } ${isClosed ? 'opacity-50' : ''}`}
                  style={{ cursor: isClosed ? 'default' : 'pointer' }}
                >
                  <input
                    type="radio"
                    name={`survey-${survey.id}`}
                    value={id}
                    checked={checked}
                    disabled={isClosed || isPending}
                    onChange={() => setSelected(id)}
                    className="form-check-input mt-0"
                  />
                  <span>{lbl}</span>
                </label>
              )
            })}

            {!isClosed && menuItems.length > 0 && (
              <button
                className="btn btn-primary mt-2 align-self-start"
                disabled={!selected || isPending}
                onClick={() => selected && mutate(selected)}
              >
                {isPending ? <Spinner animation="border" size="sm" /> : '투표하기'}
              </button>
            )}
          </div>
        )}
      </div>
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

  const open   = surveys.filter((s) => s.status === 'open' && new Date(s.deadline) > new Date())
  const closed = surveys.filter((s) => s.status === 'closed' || new Date(s.deadline) <= new Date())
  const list   = tab === 'open' ? open : closed

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

      {list.length === 0 ? (
        <div className="text-center text-muted py-5">
          {tab === 'open' ? '진행 중인 설문이 없습니다.' : '마감된 설문이 없습니다.'}
        </div>
      ) : (
        list.map((s) => <SurveyCard key={s.id} survey={s} />)
      )}
    </div>
  )
}
