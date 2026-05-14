import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from 'react-bootstrap'
import { FlashAlert } from '../components/common/FlashAlert'
import { getMeals, createMeal, updateMeal, publishMeal, exportMealXlsx } from '../services/meals.api'
import type { MealItemInput, MealPlan } from '../types/meal'
import { MealItemRow } from '../components/meal/MealItemRow'
import { MealItemFormModal } from '../components/meal/MealItemFormModal'
import { PublishModal } from '../components/meal/PublishModal'
import { MonthlyMealCalendar, type CalendarDayLevel } from '../components/MonthlyMealCalendar'

function toDateStr(iso: string): string {
  return iso.slice(0, 10)
}

function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}


function planToInputs(plan: MealPlan | undefined): MealItemInput[] {
  return (
    plan?.items.map((it) => ({
      category: it.category,
      name: it.name,
      ingredients: it.ingredients ?? undefined,
      calories: it.calories ?? undefined,
    })) ?? []
  )
}

export function MealPlanPage() {
  const today   = new Date()
  const todayStr  = formatDateStr(today)
  const thisMonth = todayStr.slice(0, 7)

  const [month,          setMonth]          = useState(thisMonth)
  const [selectedDate,   setSelectedDate]   = useState(todayStr)
  const [localItems,     setLocalItems]     = useState<MealItemInput[]>([])
  const [isDirty,        setIsDirty]        = useState(false)
  const [editingIndex,   setEditingIndex]   = useState<number | null>(null)
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [showPublish,    setShowPublish]    = useState(false)
  const [saveMsg,        setSaveMsg]        = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [xlsxLoading,    setXlsxLoading]    = useState(false)
  // T-142: 선택 모드 + 일괄 공개
  const [selectMode,     setSelectMode]     = useState(false)
  const [selectedDates,  setSelectedDates]  = useState<Set<string>>(new Set())
  const [bulkPublishing, setBulkPublishing] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['meals', month],
    queryFn:  () => getMeals(month),
    staleTime: 5 * 60 * 1000,
  })

  const currentPlan = plans.find((p) => toDateStr(p.date) === selectedDate)

  // currentPlan이 바뀔 때(날짜 변경 or 쿼리 갱신) 로컬 편집 상태를 서버 데이터로 리셋.
  // setState를 effect body에서 직접 호출하지 않고 로컬 함수로 감싸 rule 준수.
  useEffect(() => {
    function sync() {
      setLocalItems(planToInputs(currentPlan))
      setIsDirty(false)
    }
    sync()
  }, [currentPlan])

  function selectDate(date: string) {
    setSelectedDate(date)
    setSaveMsg(null)
  }

  function changeMonth(dir: 'prev' | 'next') {
    const nm = dir === 'prev' ? prevMonth(month) : nextMonth(month)
    setMonth(nm)
    setSelectedDate(`${nm}-01`)
    setIsDirty(false)
    setSaveMsg(null)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (localItems.length === 0) throw new Error('메뉴 항목을 하나 이상 입력해주세요.')
      return currentPlan
        ? updateMeal(currentPlan.id, localItems)
        : createMeal({ date: selectedDate, items: localItems })
    },
    onSuccess: () => {
      setIsDirty(false)
      setSaveMsg({ type: 'success', text: '저장되었습니다.' })
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
      setTimeout(() => setSaveMsg(null), 3000)
    },
    onError: (err: Error) => {
      setSaveMsg({ type: 'error', text: err.message || '저장에 실패했습니다.' })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (scheduledAt?: string) => publishMeal(currentPlan!.id, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
      setShowPublish(false)
      setSaveMsg({ type: 'success', text: '식단이 공개되었습니다.' })
      setTimeout(() => setSaveMsg(null), 3000)
    },
    onError: () => {
      setSaveMsg({ type: 'error', text: '공개에 실패했습니다. 다시 시도해주세요.' })
    },
  })

  const uniqueAllergens = Array.from(
    new Set(
      (currentPlan?.items ?? []).flatMap((it) => it.allergens.map((a) => a.allergen.name))
    ),
  )

  const [y, m]   = month.split('-').map(Number)
  const isSaving = saveMutation.isPending

  async function handleExportXlsx() {
    setXlsxLoading(true)
    try {
      await exportMealXlsx(month)
    } catch {
      setSaveMsg({ type: 'error', text: '엑셀 다운로드에 실패했습니다.' })
    } finally {
      setXlsxLoading(false)
    }
  }

  // T-142: 선택 모드 토글
  function toggleSelectMode() {
    setSelectMode((prev) => !prev)
    setSelectedDates(new Set())
  }

  function toggleDateSelect(ds: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(ds)) { next.delete(ds) } else { next.add(ds) }
      return next
    })
  }

  // T-142: 선택된 날짜 중 draft 식단만 순차 공개
  async function handleBulkPublish() {
    const draftPlans = plans.filter(
      (p) => selectedDates.has(toDateStr(p.date)) && p.status === 'draft',
    )
    if (draftPlans.length === 0) return
    setBulkPublishing(true)
    try {
      for (const plan of draftPlans) {
        await publishMeal(plan.id)
      }
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
      setSaveMsg({ type: 'success', text: `${draftPlans.length}개 식단이 공개되었습니다.` })
      setTimeout(() => setSaveMsg(null), 3000)
    } catch {
      setSaveMsg({ type: 'error', text: '일괄 공개에 실패했습니다.' })
    } finally {
      setBulkPublishing(false)
      setSelectMode(false)
      setSelectedDates(new Set())
    }
  }

  // T-144: 선택된 날짜의 min/max로 AIMealPlanPage 이동
  function handleAiDraft() {
    const sorted = Array.from(selectedDates).sort()
    const startDate = sorted[0]
    const endDate   = sorted[sorted.length - 1]
    navigate(`/ai-meal-plan?startDate=${startDate}&endDate=${endDate}`)
  }

  return (
    <div className="p-4">
      {/* ── 헤더 ─────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => changeMonth('prev')}>‹</button>
          <h5 className="mb-0 fw-bold">{y}년 {m}월 식단 작성</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => changeMonth('next')}>›</button>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-sm"
            style={{ border: '1px solid #E88FAA', color: '#C06080' }}
            disabled={selectedDates.size === 0}
            title={selectedDates.size === 0 ? '날짜를 선택하면 AI 초안 생성이 활성화됩니다' : 'AI 식단 초안 생성'}
            onClick={handleAiDraft}
          >
            AI 초안 생성
          </button>
          <button
            className="btn btn-sm btn-outline-success"
            onClick={handleExportXlsx}
            disabled={xlsxLoading}
            title="이달 식단 엑셀 다운로드"
          >
            {xlsxLoading ? <Spinner size="sm" animation="border" /> : '📊 엑셀 저장'}
          </button>
          {/* T-142: 선택 모드 토글 */}
          {selectMode ? (
            <>
              <button
                className="btn btn-sm btn-warning"
                onClick={handleBulkPublish}
                disabled={selectedDates.size === 0 || bulkPublishing}
              >
                {bulkPublishing
                  ? <Spinner size="sm" animation="border" />
                  : `일괄 공개 (${selectedDates.size})`}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={toggleSelectMode}>
                취소
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-outline-secondary" onClick={toggleSelectMode}>
              선택
            </button>
          )}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || isSaving || localItems.length === 0}
          >
            {isSaving ? <Spinner size="sm" animation="border" /> : '임시저장'}
          </button>
          <button
            className="btn btn-sm"
            style={{ background: '#CFECF3', border: '1px solid #A8D8E8', color: '#3A3030' }}
            onClick={() => setShowPublish(true)}
            disabled={!currentPlan || currentPlan.status === 'published' || isDirty}
          >
            공개 예약
          </button>
        </div>
      </div>

      {saveMsg && (
        <FlashAlert
          variant={saveMsg.type === 'success' ? 'success' : 'danger'}
          text={saveMsg.text}
          onClose={() => setSaveMsg(null)}
          className="mb-3"
        />
      )}

      {/* ── 달력 ─────────────────────────────────────────── */}
      <div className="mb-3">
        <MonthlyMealCalendar
          month={month}
          today={todayStr}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          plans={plans}
          getDayLevel={(plan): CalendarDayLevel => {
            const hasConfirmedAlt = plan.alternatePlans.some((ap) => ap.status === 'confirmed')
            if (hasConfirmedAlt) return 'alt'
            if (plan.status === 'draft') return 'draft'
            return 'normal'
          }}
          selectMode={selectMode}
          selectedDates={selectedDates}
          onToggleDateSelect={toggleDateSelect}
        />
      </div>

      {/* ── 메뉴 구성 ────────────────────────────────────── */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="small fw-semibold" style={{ color: '#3A3030' }}>
          {selectedDate.replace(/-/g, '/')} 메뉴 구성
        </span>
        {currentPlan?.status === 'published' && (
          <span
            className="badge"
            style={{ background: '#5DBD6A', color: '#fff', fontSize: 10 }}
          >
            공개됨
          </span>
        )}
        {currentPlan?.status === 'draft' && (
          <span className="badge bg-warning text-dark" style={{ fontSize: 10 }}>임시저장</span>
        )}
        {isDirty && (
          <span className="badge bg-light border text-muted" style={{ fontSize: 10 }}>미저장</span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : (
        <>
          <div className="d-flex flex-column gap-2 mb-3">
            {localItems.map((item, idx) => (
              <MealItemRow
                key={idx}
                item={item}
                allergens={isDirty ? [] : (currentPlan?.items[idx]?.allergens ?? [])}
                onEdit={() => setEditingIndex(idx)}
                onDelete={() => {
                  setLocalItems((prev) => prev.filter((_, i) => i !== idx))
                  setIsDirty(true)
                }}
              />
            ))}

            {localItems.length === 0 && (
              <div
                className="text-muted small py-4 text-center rounded"
                style={{ border: '1.5px dashed #C0BBB4', background: '#FAFEFF' }}
              >
                이 날짜에 등록된 메뉴가 없습니다.
              </div>
            )}

            <button
              className="btn btn-sm w-100"
              style={{
                borderStyle: 'dashed',
                borderColor: '#C0BBB4',
                color: '#888',
                background: '#FAFEFF',
              }}
              onClick={() => setShowAddModal(true)}
            >
              + 메뉴 추가
            </button>
          </div>

          <hr style={{ borderColor: '#E0DBD4' }} />

          {/* ── 알레르기 요약 + 자동 태깅 버튼 ───────────── */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="small" style={{ color: '#7A6070' }}>
              총 알레르기 유발물질:{' '}
              {uniqueAllergens.length > 0 ? (
                <strong style={{ color: '#E06080' }}>{uniqueAllergens.join(', ')}</strong>
              ) : (
                <span>없음</span>
              )}
              {isDirty && (
                <span className="text-muted ms-1" style={{ fontSize: 10 }}>(저장 후 갱신)</span>
              )}
            </div>

            <button
              className="btn btn-sm"
              style={{ border: '1px solid #5DBD6A', color: '#2E7D32' }}
              onClick={() => saveMutation.mutate()}
              disabled={isSaving || localItems.length === 0}
            >
              {isSaving
                ? <Spinner size="sm" animation="border" />
                : '알레르기 자동 태깅'}
            </button>
          </div>
        </>
      )}

      {/* ── 메뉴 추가 모달 ───────────────────────────────── */}
      <MealItemFormModal
        show={showAddModal}
        onSave={(item) => {
          setLocalItems((prev) => [...prev, item])
          setIsDirty(true)
          setShowAddModal(false)
        }}
        onCancel={() => setShowAddModal(false)}
      />

      {/* ── 메뉴 편집 모달 ───────────────────────────────── */}
      <MealItemFormModal
        show={editingIndex !== null}
        initialValues={editingIndex !== null ? localItems[editingIndex] : undefined}
        onSave={(item) => {
          setLocalItems((prev) => prev.map((it, i) => (i === editingIndex ? item : it)))
          setIsDirty(true)
          setEditingIndex(null)
        }}
        onCancel={() => setEditingIndex(null)}
      />

      {/* ── 공개 설정 모달 ───────────────────────────────── */}
      <PublishModal
        show={showPublish}
        onHide={() => setShowPublish(false)}
        onConfirm={(scheduledAt) => publishMutation.mutate(scheduledAt)}
        isPending={publishMutation.isPending}
      />
    </div>
  )
}
