import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Spinner, Badge, Modal, Button } from 'react-bootstrap'
import { FlashAlert } from '../components/common/FlashAlert'
import { getSurveys, closeSurvey } from '../services/surveys.api'
import type { Survey, SurveyResult } from '../services/surveys.api'

// ── 참여율 게이지 ─────────────────────────────────────────

function ParticipationGauge({ responded, total }: { responded: number; total: number }) {
  const pct = total > 0 ? Math.round((responded / total) * 100) : 0
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span className="text-muted">참여율</span>
        <span className="fw-semibold">{responded} / {total}명 ({pct}%)</span>
      </div>
      <div className="progress" style={{ height: 10 }}>
        <div
          className={`progress-bar ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── 응답 분포 바 차트 ─────────────────────────────────────

function ResultBars({
  choices,
  total,
  options,
}: {
  choices:  Record<string, number>
  total:    number
  options:  Survey['options']
}) {
  const labelMap: Record<string, string> = {}

  // need_check choices (서버가 string[] 또는 {key,label}[]로 전송)
  for (const c of options.choices ?? []) {
    if (typeof c === 'string') { labelMap[c] = c; continue }
    if (c.key) labelMap[c.key] = c.label ?? c.key
  }
  // menu_vote items
  for (const item of options.items ?? []) {
    if (item.id)  labelMap[item.id]  = item.name  ?? item.id
    if (item.key) labelMap[item.key] = item.label ?? item.key
  }

  const entries = Object.entries(choices).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return <p className="text-muted small">응답 없음</p>

  return (
    <div className="d-flex flex-column gap-2">
      {entries.map(([key, count]) => {
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0
        const label = labelMap[key] ?? key
        return (
          <div key={key}>
            <div className="d-flex justify-content-between small mb-1">
              <span>{label}</span>
              <span className="text-muted">{count}표 ({pct}%)</span>
            </div>
            <div className="progress" style={{ height: 8 }}>
              <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 설문 행 ───────────────────────────────────────────────

function SurveyRow({
  survey,
  onSelect,
}: {
  survey:   Survey
  onSelect: (s: Survey) => void
}) {
  const isClosed = survey.status === 'closed' || new Date(survey.deadline) < new Date()
  const typeLabel = survey.type === 'need_check' ? '필요 여부' : '메뉴 투표'
  const typeBg    = survey.type === 'need_check' ? 'info'     : 'primary'
  const dateStr   = survey.mealPlan.date.slice(0, 10)
  const deadline  = new Date(survey.deadline).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <tr
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(survey)}
      className="align-middle"
    >
      <td><Badge bg={typeBg}>{typeLabel}</Badge></td>
      <td className="small">{dateStr}</td>
      <td className="small text-muted">{deadline}</td>
      <td>
        <span className="small">{survey.responses.length}명 응답</span>
      </td>
      <td>
        {isClosed
          ? <Badge bg="secondary">마감</Badge>
          : <Badge bg="success">진행 중</Badge>}
      </td>
    </tr>
  )
}

// ── 상세 모달 ─────────────────────────────────────────────

function SurveyDetailModal({
  survey,
  onClose,
}: {
  survey:  Survey
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [result, setResult] = useState<SurveyResult | null>(null)
  const [closeMsg, setCloseMsg] = useState<string | null>(null)

  const isClosed = survey.status === 'closed' || new Date(survey.deadline) < new Date()
  const totalResponded = survey.responses.length

  const { mutate: doClose, isPending } = useMutation({
    mutationFn: () => closeSurvey(survey.id),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['surveys-mgmt'] })
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setCloseMsg(e?.response?.data?.message ?? '마감 처리에 실패했습니다.')
    },
  })

  // 집계 데이터: 결과가 있으면 사용, 없으면 현재 응답에서 계산
  const displayChoices: Record<string, number> = result?.choices ?? (() => {
    const acc: Record<string, number> = {}
    for (const r of survey.responses) {
      const key = r.votedItemId ?? (r.response?.choice as string) ?? 'unknown'
      acc[key] = (acc[key] ?? 0) + 1
    }
    return acc
  })()

  const typeLabel = survey.type === 'need_check' ? '필요 여부 확인' : '메뉴 투표'
  const dateStr   = survey.mealPlan.date.slice(0, 10)

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-6 fw-bold">
          설문 상세 — {typeLabel} · {dateStr}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {closeMsg && (
          <FlashAlert variant="danger" text={closeMsg} onClose={() => setCloseMsg(null)} className="mb-3" />
        )}

        {result && (
          <Alert variant="success" className="py-2">
            설문이 마감됐습니다. 총 {result.totalResponses}명 응답.
          </Alert>
        )}

        <p className="text-muted small mb-1">마감 시각: {new Date(survey.deadline).toLocaleString('ko-KR')}</p>
        <p className="fw-semibold mb-4">
          {survey.options.question ?? (survey.type === 'need_check'
            ? '대체 식단이 필요하신가요?'
            : '선호하는 대체 식단 메뉴를 선택해 주세요.')}
        </p>

        <ParticipationGauge responded={totalResponded} total={totalResponded} />

        <hr className="my-3" />
        <p className="small fw-semibold text-muted mb-2">응답 분포</p>
        <ResultBars
          choices={displayChoices}
          total={totalResponded}
          options={survey.options}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>닫기</Button>
        {!isClosed && !result && (
          <Button variant="danger" onClick={() => doClose()} disabled={isPending}>
            {isPending ? <Spinner animation="border" size="sm" /> : '설문 마감하기'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}

// ── 페이지 ────────────────────────────────────────────────

export function SurveyManagementPage() {
  const [tab,      setTab]      = useState<'open' | 'closed'>('open')
  const [selected, setSelected] = useState<Survey | null>(null)

  const { data: surveys = [], isLoading, isError } = useQuery({
    queryKey: ['surveys-mgmt'],
    queryFn:  () => getSurveys(),
    staleTime: 30_000,
  })

  const open   = surveys.filter((s) => s.status === 'open' && new Date(s.deadline) > new Date())
  const closed = surveys.filter((s) => s.status === 'closed' || new Date(s.deadline) <= new Date())
  const list   = tab === 'open' ? open : closed

  return (
    <div style={{ maxWidth: 860 }}>
      <h5 className="fw-bold mb-4">📋 설문 관리</h5>

      {/* 탭 */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'open' ? 'active' : 'text-dark'}`}
            onClick={() => setTab('open')}
          >
            진행 중
            {open.length > 0 && <Badge bg="success" className="ms-2">{open.length}</Badge>}
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

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {isError && <Alert variant="danger">설문 목록을 불러오지 못했습니다.</Alert>}

      {!isLoading && !isError && (
        list.length === 0 ? (
          <div className="text-center text-muted py-5">
            {tab === 'open' ? '진행 중인 설문이 없습니다.' : '마감된 설문이 없습니다.'}
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small">유형</th>
                  <th className="small">식단일</th>
                  <th className="small">마감 시각</th>
                  <th className="small">참여</th>
                  <th className="small">상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <SurveyRow key={s.id} survey={s} onSelect={setSelected} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {selected && (
        <SurveyDetailModal
          survey={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
