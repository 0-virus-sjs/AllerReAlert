import { api } from './api'
import type { MealPlan, MealItemInput } from '../types/meal'
import type { NutrientItem } from './ai.api'

interface ApiOk<T> { success: boolean; data: T }

// ── T-129: 식단 생성 조건 기본값 ──────────────────────────

export interface MealConditionDefaults {
  calories:  number
  nutrients: NutrientItem[]
}

export async function fetchMealConditionDefaults(): Promise<MealConditionDefaults> {
  const { data } = await api.get<ApiOk<MealConditionDefaults>>('/meals/conditions/defaults')
  return data.data
}

export async function getMeals(month: string): Promise<MealPlan[]> {
  const { data } = await api.get<ApiOk<MealPlan[]>>('/meals', { params: { month } })
  return data.data
}

export async function getMealById(id: string): Promise<MealPlan> {
  const { data } = await api.get<ApiOk<MealPlan>>(`/meals/${id}`)
  return data.data
}

export async function createMeal(payload: {
  date: string
  items: MealItemInput[]
}): Promise<MealPlanWithStatus> {
  const { data } = await api.post<ApiOk<MealPlanWithStatus>>('/meals', payload)
  return data.data
}

export async function updateMeal(id: string, items: MealItemInput[]): Promise<MealPlanWithStatus> {
  const { data } = await api.put<ApiOk<MealPlanWithStatus>>(`/meals/${id}`, { items })
  return data.data
}

export async function deleteMeal(id: string): Promise<void> {
  await api.delete(`/meals/${id}`)
}

export async function publishMeal(id: string, scheduledAt?: string): Promise<MealPlanWithStatus> {
  const { data } = await api.put<ApiOk<MealPlanWithStatus>>(`/meals/${id}/publish`, { scheduledAt })
  return data.data
}

export async function exportMealPdf(month: string): Promise<void> {
  const response = await api.get('/meals/export', {
    params: { month },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `meal-plan-${month}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// T-151: 영양사 달력 상태 메타데이터
export type CalendarDayStatus =
  | 'no-meal'
  | 'draft'
  | 'published'
  | 'needs-review'
  | 'needs-alt'
  | 'has-alt'

export interface CalendarStatusEntry {
  date: string
  status: CalendarDayStatus
  hasAlternate: boolean
  conflictCount: number
  affectedStudents: number
  conflictAllergenIds: string[]
}

// T-157: 저장·수정·공개 응답에 포함되는 확장 타입
export type MealPlanWithStatus = MealPlan & { calendarStatus?: CalendarStatusEntry }

export async function getMealCalendarStatus(month: string): Promise<CalendarStatusEntry[]> {
  const { data } = await api.get<ApiOk<CalendarStatusEntry[]>>('/meals/calendar-status', { params: { month } })
  return data.data
}

// T-141: 월간 식단 xlsx 다운로드
export async function exportMealXlsx(month: string): Promise<void> {
  const response = await api.get('/meals/export/xlsx', {
    params: { month },
    responseType: 'blob',
  })
  const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const url = URL.createObjectURL(new Blob([response.data as BlobPart], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = `meal-plan-${month}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
