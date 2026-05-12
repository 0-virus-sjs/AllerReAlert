import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { sendSuccess } from '../middlewares/response'
import {
  getAllergyOverview,
  getDailyDemand,
  getMonthlyReport,
  getSchoolStats,
} from '../services/analytics/analytics.service'
import { generateAnalyticsCsv, generateAnalyticsPdf } from '../services/analytics/export.service'

const monthRegex = /^\d{4}-(?:0[1-9]|1[0-2])$/

const monthSchema = z.object({
  month: z.string().regex(monthRegex, 'month 형식은 YYYY-MM').optional(),
})

const exportSchema = z.object({
  month:  z.string().regex(monthRegex, 'month 형식은 YYYY-MM').optional(),
  format: z.enum(['csv', 'pdf']),
})

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// ── T-080: GET /analytics/allergy-overview ───────────────────────────────────

export async function allergyOverviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = req.user!
    const data = await getAllergyOverview(orgId)
    return sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

// ── T-081: GET /analytics/daily-demand?month=YYYY-MM ────────────────────────

export async function dailyDemandHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { month: rawMonth } = monthSchema.parse(req.query)
    const month = rawMonth ?? currentMonth()
    const { orgId } = req.user!
    const data = await getDailyDemand(orgId, month)
    return sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

// ── T-082: GET /analytics/report?month=YYYY-MM ───────────────────────────────

export async function monthlyReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { month: rawMonth } = monthSchema.parse(req.query)
    const month = rawMonth ?? currentMonth()
    const { orgId } = req.user!
    const data = await getMonthlyReport(orgId, month)
    return sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

// ── T-126: GET /analytics/school-stats ───────────────────────────────────────

export async function schoolStatsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId } = req.user!
    const data = await getSchoolStats(orgId)
    return sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

// ── T-083: GET /analytics/export?format=csv|pdf&month=YYYY-MM ───────────────

export async function analyticsExportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { format, month: rawMonth } = exportSchema.parse(req.query)
    const month = rawMonth ?? currentMonth()
    const { orgId } = req.user!

    const [overview, demand, report] = await Promise.all([
      getAllergyOverview(orgId),
      getDailyDemand(orgId, month),
      getMonthlyReport(orgId, month),
    ])

    if (format === 'csv') {
      const csv = generateAnalyticsCsv(overview, demand, report)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${month}.csv"`)
      return res.send(csv)
    }

    const pdf = await generateAnalyticsPdf(overview, demand, report)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${month}.pdf"`)
    return res.send(pdf)
  } catch (err) {
    next(err)
  }
}
