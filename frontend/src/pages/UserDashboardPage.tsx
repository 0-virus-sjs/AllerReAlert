import { useState } from 'react'
import { Alert, Spinner } from 'react-bootstrap'
import { useQuery } from '@tanstack/react-query'
import { getMeals, exportMealPdf } from '../services/meals.api'
import { getMyAllergens } from '../services/allergens.api'
import { AllergenList } from '../components/allergen/AllergenList'
import type { MealPlan } from '../types/meal'

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const CATEGORY_KO: Record<string, string> = {
  rice: '밥', soup: '국', side: '반찬', dessert: '후식',
}

function toDateStr(iso: string) { return iso.slice(0, 10) }

function formatDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function prevMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

function getDaysInMonth(ym: string): Date[] {
  const [y, m] = ym.split('-').map(Number)
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => new Date(y, m - 1, i + 1))
}

export function UserDashboardPage() {
  const today    = formatDateStr(new Date())
  const thisMonth = today.slice(0, 7)

  const [month,        setMonth]        = useState(thisMonth)
  const [selectedDate, setSelectedDate] = useState(today)
  const [pdfLoading,   setPdfLoading]   = useState(false)
  const [pdfError,     setPdfError]     = useState('')

  const { data: allPlans = [], isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', month],
    queryFn:  () => getMeals(month),
    staleTime: 5 * 60 * 1000,
  })

  const { data: myAllergens = [] } = useQuery({
    queryKey: ['my-allergens'],
    queryFn:  getMyAllergens,
  })

  // 이용자는 published 식단만 표시
  const plans: MealPlan[] = allPlans.filter((p) => p.status === 'published')

  // 본인의 confirmed 알레르기 코드 집합
  const confirmedCodes = myAllergens
    .filter((ua) => ua.status === 'confirmed')
    .map((ua) => ua.allergen.code)

  // 알레르기 대조용 — confirmed allergen id 집합
  const confirmedIds = new Set(
    myAllergens.filter((ua) => ua.status === 'confirmed').map((ua) => ua.allergen.id),
  )

  const currentPlan = plans.find((p) => toDateStr(p.date) === selectedDate)
  const todayPlan   = plans.find((p) => toDateStr(p.date) === today)

  const todayDangerItems = (todayPlan?.items ?? []).filter((item) =>
    item.allergens.some((a) => confirmedIds.has(a.allergen.id)),
  )

  const days  = getDaysInMonth(month)
  const [y, m] = month.split('-').map(Number)

  function changeMonth(dir: 'prev' | 'next') {
    const nm = dir === 'prev' ? prevMonth(month) : nextMonth(month)
    setMonth(nm)
    setSelectedDate(`${nm}-01`)
  }

  async function handleExportPdf() {
    setPdfLoading(true)
    setPdfError('')
    try {
      await exportMealPdf(month)
    } catch {
      setPdfError('PDF 다운로드에 실패했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="p-4">
      {/* ── 오늘 알레르기 경고 배너 (T-045) ──────────────── */}
      {month === thisMonth && todayDangerItems.length > 0 && (
        <Alert
          variant="danger"
          className="d-flex align-items-start gap-2 py-2 mb-3"
          style={{ fontSize: 13 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
          <div>
            <strong>오늘 급식에 내 알레르기 유발 식품이 포함되어 있습니다!</strong>
            <div className="mt-1 text-muted" style={{ fontSize: 12 }}>
              {todayDangerItems.map((item) => (
                <span key={item.id} className="me-2">
                  {item.name}
                  {' ('}
                  {item.allergens
                    .filter((a) => confirmedIds.has(a.allergen.id))
                    .map((a) => a.allergen.name)
                    .join(', ')}
                  {')'}
                </span>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {confirmedCodes.length === 0 && (
        <Alert variant="info" className="py-2 mb-3 small">
          등록된 알레르기가 없습니다.{' '}
          <a href="/allergens" className="alert-link">알레르기 설정</a>에서 먼저 등록해 주세요.
        </Alert>
      )}

      {/* ── 헤더: 월 네비게이션 + PDF ─────────────────────── */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => changeMonth('prev')}
          >‹</button>
          <h5 className="mb-0 fw-bold">{y}년 {m}월 식단</h5>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => changeMonth('next')}
          >›</button>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleExportPdf}
            disabled={pdfLoading}
            title="이달 식단 PDF 다운로드"
          >
            {pdfLoading
              ? <Spinner size="sm" animation="border" />
              : '🖨️ PDF 다운로드'}
          </button>
        </div>
      </div>

      {pdfError && (
        <Alert variant="danger" className="py-2 mb-2 small" dismissible onClose={() => setPdfError('')}>
          {pdfError}
        </Alert>
      )}

      {/* ── 날짜 탭 ──────────────────────────────────────── */}
      <div
        className="d-flex gap-1 mb-3 pb-1"
        style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
      >
        {days.map((date) => {
          const ds         = formatDateStr(date)
          const isSelected = ds === selectedDate
          const isToday    = ds === today
          const plan       = plans.find((p) => toDateStr(p.date) === ds)
          const hasDanger  = plan?.items.some((item) =>
            item.allergens.some((a) => confirmedIds.has(a.allergen.id)),
          ) ?? false

          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(ds)}
              style={{
                padding: '4px 10px 8px',
                border: `1.5px solid ${isSelected ? '#A8D8E8' : isToday ? '#5DBD6A' : '#C0BBB4'}`,
                background: isSelected ? '#CFECF3' : '#fff',
                color: isSelected ? '#3A3030' : '#888',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                borderRadius: 3,
                flexShrink: 0,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {date.getDate()}({KO_DAYS[date.getDay()]})
              {/* 식단 있음 + 위험 표시 도트 */}
              {plan && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: hasDanger ? '#E06080' : '#5DBD6A',
                    display: 'block',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── 선택 날짜 식단 (T-044) ───────────────────────── */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="small fw-semibold" style={{ color: '#3A3030' }}>
          {selectedDate.replace(/-/g, '/')} 식단
        </span>
        {selectedDate === today && (
          <span className="badge" style={{ background: '#5DBD6A', color: '#fff', fontSize: 10 }}>오늘</span>
        )}
      </div>

      {mealsLoading ? (
        <div className="text-center py-5"><Spinner /></div>
      ) : currentPlan ? (
        <div className="d-flex flex-column gap-2">
          {currentPlan.items.map((item) => {
            const isDangerous = item.allergens.some((a) => confirmedIds.has(a.allergen.id))
            return (
              <div
                key={item.id}
                className="d-flex align-items-start justify-content-between px-3 py-2 rounded"
                style={{
                  border: `1.5px solid ${isDangerous ? '#E06080' : '#E0DBD4'}`,
                  background: isDangerous ? '#FDDDE8' : '#FAFEFF',
                }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    {isDangerous && (
                      <span style={{ fontSize: 14 }} title="알레르기 주의">⚠️</span>
                    )}
                    <span
                      className="badge"
                      style={{ background: '#CFECF3', color: '#3A3030', fontSize: 10 }}
                    >
                      {CATEGORY_KO[item.category] ?? item.category}
                    </span>
                    <span className="fw-semibold" style={{ fontSize: 13, color: isDangerous ? '#C04060' : '#3A3030' }}>
                      {item.name}
                    </span>
                    {item.calories != null && (
                      <span className="text-muted" style={{ fontSize: 11 }}>{item.calories} kcal</span>
                    )}
                  </div>
                  {item.allergens.length > 0 && (
                    <AllergenList
                      allergens={item.allergens}
                      userAllergenCodes={confirmedCodes}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          className="text-muted small py-4 text-center rounded"
          style={{ border: '1.5px dashed #C0BBB4', background: '#FAFEFF' }}
        >
          {allPlans.find((p) => toDateStr(p.date) === selectedDate)
            ? '이 날짜의 식단은 아직 공개되지 않았습니다.'
            : '이 날짜에 등록된 식단이 없습니다.'}
        </div>
      )}

      {/* ── 인쇄용 스타일 ───────────────────────────────── */}
      <style>{`
        @media print {
          .btn, nav, aside { display: none !important; }
          .p-4 { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
