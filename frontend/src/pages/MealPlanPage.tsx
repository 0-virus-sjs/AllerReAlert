import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from 'react-bootstrap'
import { FlashAlert } from '../components/common/FlashAlert'
import {
  getMeals,
  createMeal,
  updateMeal,
  publishMeal,
  exportMealXlsx,
  getMealCalendarStatus,
} from '../services/meals.api'
import type { CalendarStatusEntry } from '../services/meals.api'
import { fetchAllergyOverview } from '../services/analytics.api'
import type { MealItemInput, MealPlan } from '../types/meal'
import { MealItemFormModal } from '../components/meal/MealItemFormModal'
import { PublishModal } from '../components/meal/PublishModal'
import { DayDetailPanel } from '../components/meal/DayDetailPanel'
import { AlternatePlanCard } from '../components/meal/AlternatePlanCard'
import { PanelAiSection } from '../components/meal/PanelAiSection'
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

// 날짜 배열이 연속된 날짜인지 확인
function isConsecutiveDates(dates: Set<string>): boolean {
  if (dates.size <= 1) return true
  const sorted = Array.from(dates).sort()
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays !== 1) return false
  }
  return true
}

export function MealPlanPage() {
  const today = new Date()
  const todayStr = formatDateStr(today)
  const thisMonth = todayStr.slice(0, 7)

  const [month, setMonth] = useState(thisMonth)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [localItems, setLocalItems] = useState<MealItemInput[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [xlsxLoading, setXlsxLoading] = useState(false)
  // 선택 모드
  const [selectMode, setSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [bulkPublishing, setBulkPublishing] = useState(false)
  // AI 생성 섹션
  const [showAi, setShowAi] = useState(false)
  const aiSectionRef = useRef<HTMLDivElement>(null)

  const queryClient = useQueryClient()

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['meals', month],
    queryFn: () => getMeals(month),
    staleTime: 5 * 60 * 1000,
  })

  const { data: calendarStatuses = [] } = useQuery({
    queryKey: ['calendar-status', month],
    queryFn: () => getMealCalendarStatus(month),
    staleTime: 5 * 60 * 1000,
  })

  const { data: allergyOverview = [] } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: fetchAllergyOverview,
    staleTime: 60 * 60 * 1000,
  })

  const schoolAllergenIds = useMemo(
    () => new Set(allergyOverview.map((item) => item.allergenId)),
    [allergyOverview],
  )

  const statusByDate = new Map(calendarStatuses.map((s) => [s.date, s.status]))

  const currentPlan = plans.find((p) => toDateStr(p.date) === selectedDate)
  const selectedStatus = statusByDate.get(selectedDate)
  const showAlternate =
    !!currentPlan && (selectedStatus === 'needs-alt' || selectedStatus === 'has-alt')

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
    onSuccess: (data) => {
      setIsDirty(false)
      setSaveMsg({ type: 'success', text: '저장되었습니다.' })
      if (data.calendarStatus) {
        const entry = data.calendarStatus
        queryClient.setQueryData(
          ['calendar-status', month],
          (old: CalendarStatusEntry[] | undefined) =>
            old
              ? [...old.filter((e) => e.date !== entry.date), entry].sort((a, b) =>
                  a.date.localeCompare(b.date)
                )
              : [entry]
        )
      } else {
        queryClient.invalidateQueries({ queryKey: ['calendar-status', month] })
      }
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
      setTimeout(() => setSaveMsg(null), 3000)
    },
    onError: (err: Error) => {
      setSaveMsg({ type: 'error', text: err.message || '저장에 실패했습니다.' })
    },
  })

  const publishMutation = useMutation({
    mutationFn: (scheduledAt?: string) => publishMeal(currentPlan!.id, scheduledAt),
    onSuccess: (data) => {
      if (data.calendarStatus) {
        const entry = data.calendarStatus
        queryClient.setQueryData(
          ['calendar-status', month],
          (old: CalendarStatusEntry[] | undefined) =>
            old
              ? [...old.filter((e) => e.date !== entry.date), entry].sort((a, b) =>
                  a.date.localeCompare(b.date)
                )
              : [entry]
        )
      } else {
        queryClient.invalidateQueries({ queryKey: ['calendar-status', month] })
      }
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
      setShowPublish(false)
      setSaveMsg({ type: 'success', text: '식단이 공개되었습니다.' })
      setTimeout(() => setSaveMsg(null), 3000)
    },
    onError: () => {
      setSaveMsg({ type: 'error', text: '공개에 실패했습니다. 다시 시도해주세요.' })
    },
  })

  const [y, m] = month.split('-').map(Number)
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

  function toggleSelectMode() {
    setSelectMode((prev) => !prev)
    setSelectedDates(new Set())
    setShowAi(false)
  }

  function toggleDateSelect(ds: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(ds)) {
        next.delete(ds)
      } else {
        next.add(ds)
      }
      return next
    })
  }

  async function handleBulkPublish() {
    const draftPlans = plans.filter(
      (p) => selectedDates.has(toDateStr(p.date)) && p.status === 'draft'
    )
    if (draftPlans.length === 0) return
    setBulkPublishing(true)
    try {
      for (const plan of draftPlans) {
        await publishMeal(plan.id)
      }
      queryClient.invalidateQueries({ queryKey: ['meals', month] })
      queryClient.invalidateQueries({ queryKey: ['calendar-status', month] })
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

  // AI 버튼 클릭: 연속 날짜 검증 후 섹션 표시 + 스크롤
  function handleAiClick() {
    if (selectedDates.size === 0) return
    if (!isConsecutiveDates(selectedDates)) {
      setSaveMsg({ type: 'error', text: 'AI 식단 생성은 연속된 날짜만 선택 가능합니다.' })
      setTimeout(() => setSaveMsg(null), 4000)
      return
    }
    setShowAi(true)
    setTimeout(() => {
      aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  function handleAiSaved() {
    queryClient.invalidateQueries({ queryKey: ['meals', month] })
    queryClient.invalidateQueries({ queryKey: ['calendar-status', month] })
    setShowAi(false)
    setSelectMode(false)
    setSelectedDates(new Set())
    setSaveMsg({ type: 'success', text: 'AI 식단이 저장되었습니다.' })
    setTimeout(() => setSaveMsg(null), 3000)
  }

  // AI 폼에 전달할 날짜 범위
  const sortedSelected = Array.from(selectedDates).sort()
  const aiDateFrom = sortedSelected[0] ?? selectedDate
  const aiDateTo = sortedSelected[sortedSelected.length - 1] ?? selectedDate

  return (
    <div className="p-4">
      {/* ── 헤더 ─────────────────────────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => changeMonth('prev')}>
            ‹
          </button>
          <h5 className="mb-0 fw-bold">
            {y}년 {m}월 식단 작성
          </h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => changeMonth('next')}>
            ›
          </button>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-outline-success"
            onClick={handleExportXlsx}
            disabled={xlsxLoading}
            title="이달 식단 엑셀 다운로드"
          >
            {xlsxLoading ? <Spinner size="sm" animation="border" /> : '📊 엑셀 저장'}
          </button>

          {selectMode ? (
            <>
              <button
                className="btn btn-sm btn-warning"
                onClick={handleBulkPublish}
                disabled={selectedDates.size === 0 || bulkPublishing}
              >
                {bulkPublishing ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  `일괄 공개 (${selectedDates.size})`
                )}
              </button>
              <button
                className="btn btn-sm"
                style={{ border: '1px solid #E88FAA', color: '#C06080' }}
                onClick={handleAiClick}
                disabled={selectedDates.size === 0}
              >
                AI 생성 ({selectedDates.size})
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

      {/* ── 달력 — 전체 너비 ────────────────────────────── */}
      <MonthlyMealCalendar
        month={month}
        today={todayStr}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        plans={plans}
        confirmedIds={schoolAllergenIds}
        getDayLevel={(plan): CalendarDayLevel => {
          const ds = toDateStr(plan.date)
          return (statusByDate.get(ds) as CalendarDayLevel | undefined) ?? 'draft'
        }}
        selectMode={selectMode}
        selectedDates={selectedDates}
        onToggleDateSelect={toggleDateSelect}
      />

      {/* ── 달력 아래 행 ─────────────────────────────────── */}
      <div className="row mt-3" style={{ alignItems: 'flex-start' }}>
        {/* 식단 정보 카드 — 4열 */}
        <div className={showAlternate ? 'col-12 col-md-4' : 'col-12 col-md-4'}>
          <DayDetailPanel
            date={selectedDate}
            plan={currentPlan}
            calendarStatus={
              statusByDate.get(selectedDate) !== undefined
                ? calendarStatuses.find((s) => s.date === selectedDate)
                : undefined
            }
            localItems={localItems}
            isDirty={isDirty}
            isSaving={isSaving}
            isPublishing={publishMutation.isPending}
            isLoading={isLoading}
            onSave={() => saveMutation.mutate()}
            onPublish={() => setShowPublish(true)}
            onAddItem={() => setShowAddModal(true)}
            onEditItem={(idx) => setEditingIndex(idx)}
            onDeleteItem={(idx) => {
              setLocalItems((prev) => prev.filter((_, i) => i !== idx))
              setIsDirty(true)
            }}
          />
        </div>

        {/* 대체 식단 섹션 — 8열 (needs-alt / has-alt 날짜에서만) */}
        {showAlternate && currentPlan && (
          <div className="col-12 col-md-8">
            <AlternatePlanCard plan={currentPlan} month={month} />
          </div>
        )}
      </div>

      {/* ── AI 생성 섹션 — 최하단 (선택 모드에서 버튼 클릭 시 표시) ── */}
      {showAi && (
        <div ref={aiSectionRef} className="mt-4 pt-2" style={{ borderTop: '2px solid #E88FAA' }}>
          <PanelAiSection
            dateFrom={aiDateFrom}
            dateTo={aiDateTo}
            onSaved={handleAiSaved}
            onClose={() => setShowAi(false)}
          />
        </div>
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
