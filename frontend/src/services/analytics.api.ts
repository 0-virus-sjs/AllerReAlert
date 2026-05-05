import { api } from './api'

export interface AllergyOverviewItem {
  allergenId: string
  name: string
  code: number
  count: number
}

export interface DailyDemandItem {
  date: string
  totalCount: number
  allergenBreakdown: Array<{ allergenId: string; name: string; code: number; count: number }>
}

export interface MonthlyReport {
  month: string
  notificationCount: number
  alternateMealCount: number
  surveyParticipationRate: number
  surveyCount: number
}

export async function fetchAllergyOverview(): Promise<AllergyOverviewItem[]> {
  const res = await api.get<{ data: AllergyOverviewItem[] }>('/analytics/allergy-overview')
  return res.data.data
}

export async function fetchDailyDemand(month: string): Promise<DailyDemandItem[]> {
  const res = await api.get<{ data: DailyDemandItem[] }>('/analytics/daily-demand', {
    params: { month },
  })
  return res.data.data
}

export async function fetchMonthlyReport(month: string): Promise<MonthlyReport> {
  const res = await api.get<{ data: MonthlyReport }>('/analytics/report', {
    params: { month },
  })
  return res.data.data
}

export function analyticsExportUrl(format: 'csv' | 'pdf', month: string): string {
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1')
  return `${base}/analytics/export?format=${format}&month=${month}`
}
