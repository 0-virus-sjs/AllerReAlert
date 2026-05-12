import { prisma } from '../../lib/prisma'
import { cache } from '../../lib/cache'

// ── 캐시 키 ─────────────────────────────────────────────────────────────────

const CacheKey = {
  allergyOverview: (orgId: string) => `analytics:overview:${orgId}`,
  dailyDemand:     (orgId: string, month: string) => `analytics:demand:${orgId}:${month}`,
  monthlyReport:   (orgId: string, month: string) => `analytics:report:${orgId}:${month}`,
  schoolStats:     (orgId: string) => `analytics:school-stats:${orgId}`,
}

// ── 타입 ─────────────────────────────────────────────────────────────────────

export interface AllergyOverviewItem {
  allergenId: string
  name: string
  code: number
  count: number
}

export interface DailyDemandItem {
  date: string          // YYYY-MM-DD
  totalCount: number
  allergenBreakdown: Array<{ allergenId: string; name: string; code: number; count: number }>
}

export interface MonthlyReport {
  month: string
  notificationCount: number
  alternateMealCount: number
  surveyParticipationRate: number   // 0~1
  surveyCount: number
}

export interface SchoolStats {
  totalStudents: number
  gender: {
    male: number
    female: number
    unknown: number   // gender 미입력 학생 (기존 데이터 호환)
  }
  grade: Record<number, number>   // { 1: 32, 2: 28, ... } — 0건인 학년은 제외
}

// ── T-080: 알레르기 유형별 분포 ─────────────────────────────────────────────
// 1시간 캐시 (allergen 등록은 잦지 않음)

export async function getAllergyOverview(orgId: string): Promise<AllergyOverviewItem[]> {
  const key = CacheKey.allergyOverview(orgId)
  const cached = cache.get<AllergyOverviewItem[]>(key)
  if (cached) return cached

  const rows = await prisma.userAllergen.findMany({
    where: {
      status: 'confirmed',
      user: { orgId },
    },
    select: {
      allergenId: true,
      allergen: { select: { name: true, code: true } },
    },
  })

  const map = new Map<string, AllergyOverviewItem>()
  for (const row of rows) {
    const existing = map.get(row.allergenId)
    if (existing) {
      existing.count++
    } else {
      map.set(row.allergenId, {
        allergenId: row.allergenId,
        name: row.allergen.name,
        code: row.allergen.code,
        count: 1,
      })
    }
  }

  const result = [...map.values()].sort((a, b) => b.count - a.count)
  cache.set(key, result, 3600)  // 1시간 캐시
  return result
}

// ── T-081: 일별 대체식 수요 집계 ────────────────────────────────────────────
// confirmed UserAllergen ∪ 설문 응답자 합산, 5분 캐시

export async function getDailyDemand(orgId: string, month: string): Promise<DailyDemandItem[]> {
  const key = CacheKey.dailyDemand(orgId, month)
  const cached = cache.get<DailyDemandItem[]>(key)
  if (cached) return cached

  const [year, mon] = month.split('-').map(Number)
  const from = new Date(Date.UTC(year, mon - 1, 1))
  const to   = new Date(Date.UTC(year, mon,     0, 23, 59, 59))

  // 해당 월의 모든 식단 (allergen 태그 + 설문 응답 포함)
  const mealPlans = await prisma.mealPlan.findMany({
    where: { orgId, date: { gte: from, lte: to } },
    include: {
      items: {
        include: {
          allergens: {
            include: { allergen: { select: { name: true, code: true } } },
          },
        },
      },
      surveys: {
        include: {
          responses: { select: { userId: true } },
        },
      },
    },
    orderBy: { date: 'asc' },
  })

  const result: DailyDemandItem[] = []

  for (const plan of mealPlans) {
    // 식단에 태그된 알레르겐 목록
    const allergenIds = [
      ...new Set(plan.items.flatMap((item) => item.allergens.map((a) => a.allergenId))),
    ]

    // Set A: 해당 알레르겐을 confirmed 보유한 이 org 사용자
    let confirmedRows: Array<{ userId: string; allergenId: string; allergen: { name: string; code: number } }> = []
    if (allergenIds.length > 0) {
      confirmedRows = await prisma.userAllergen.findMany({
        where: {
          allergenId: { in: allergenIds },
          status: 'confirmed',
          user: { orgId },
        },
        select: {
          userId: true,
          allergenId: true,
          allergen: { select: { name: true, code: true } },
        },
      })
    }

    // Set B: 설문 응답자 (any survey of this meal plan)
    const surveyUserIds = new Set(
      plan.surveys.flatMap((s) => s.responses.map((r) => r.userId)),
    )

    // Union: A ∪ B
    const allergenUserIds = new Set(confirmedRows.map((r) => r.userId))
    const totalUserIds    = new Set([...allergenUserIds, ...surveyUserIds])

    // 알레르겐별 인원 (Set A 기준)
    const breakdownMap = new Map<string, { allergenId: string; name: string; code: number; count: number }>()
    for (const row of confirmedRows) {
      const existing = breakdownMap.get(row.allergenId)
      if (existing) {
        existing.count++
      } else {
        breakdownMap.set(row.allergenId, {
          allergenId: row.allergenId,
          name: row.allergen.name,
          code: row.allergen.code,
          count: 1,
        })
      }
    }

    result.push({
      date: plan.date.toISOString().slice(0, 10),
      totalCount: totalUserIds.size,
      allergenBreakdown: [...breakdownMap.values()].sort((a, b) => b.count - a.count),
    })
  }

  cache.set(key, result, 300)  // 5분 캐시
  return result
}

// ── T-082: 월간 운영 리포트 (Phase 1 핵심 지표만) ───────────────────────────

export async function getMonthlyReport(orgId: string, month: string): Promise<MonthlyReport> {
  const key = CacheKey.monthlyReport(orgId, month)
  const cached = cache.get<MonthlyReport>(key)
  if (cached) return cached

  const [year, mon] = month.split('-').map(Number)
  const from = new Date(Date.UTC(year, mon - 1, 1))
  const to   = new Date(Date.UTC(year, mon,     0, 23, 59, 59))

  // 해당 org 사용자 ID 목록 (알림은 userId 기반)
  const orgUsers = await prisma.user.findMany({
    where: { orgId },
    select: { id: true },
  })
  const orgUserIds = orgUsers.map((u) => u.id)

  const [notificationCount, alternateMealCount, closedSurveys] = await Promise.all([
    // 알림 발송 건수: allergen_alert 타입, 해당 org 사용자, 해당 월
    prisma.notification.count({
      where: {
        userId: { in: orgUserIds },
        type: 'allergen_alert',
        sentAt: { gte: from, lte: to },
      },
    }),

    // 대체식 제공 건수: confirmed 상태 AlternateMealPlan, 해당 월 식단
    prisma.alternateMealPlan.count({
      where: {
        status: 'confirmed',
        mealPlan: { orgId, date: { gte: from, lte: to } },
      },
    }),

    // 설문 참여율: 해당 월 마감된 설문의 응답 수 / 대상 인원
    prisma.survey.findMany({
      where: {
        status: 'closed',
        mealPlan: { orgId },
        deadline: { gte: from, lte: to },
      },
      select: {
        _count: { select: { responses: true } },
        options: true,
      },
    }),
  ])

  // 설문 참여율 계산
  let totalResponses = 0
  let totalTargets   = 0
  for (const survey of closedSurveys) {
    const opts = survey.options as { allergenCode?: number }
    const code = opts?.allergenCode
    totalResponses += survey._count.responses

    if (code != null) {
      // 대상 인원 = 해당 알레르겐(code) confirmed 보유 org 사용자 수
      const targetCount = await prisma.userAllergen.count({
        where: {
          status: 'confirmed',
          allergen: { code },
          user: { orgId },
        },
      })
      totalTargets += targetCount
    }
  }

  const surveyParticipationRate =
    totalTargets > 0 ? Math.min(1, totalResponses / totalTargets) : 0

  const report: MonthlyReport = {
    month,
    notificationCount,
    alternateMealCount,
    surveyParticipationRate,
    surveyCount: closedSurveys.length,
  }

  cache.set(key, report, 300)
  return report
}

// ── T-126: 학교 통계 — 성별·학년별 인원 분포 ─────────────────────────────────
// 영양사 권한, 본인 소속 학교 한정. 30분 캐시.

export async function getSchoolStats(orgId: string): Promise<SchoolStats> {
  const key = CacheKey.schoolStats(orgId)
  const cached = cache.get<SchoolStats>(key)
  if (cached) return cached

  // 학생만 (활성 계정), 학교 한정
  const students = await prisma.user.findMany({
    where: { orgId, role: 'student', isActive: true },
    select: { gender: true, grade: true },
  })

  const stats: SchoolStats = {
    totalStudents: students.length,
    gender: { male: 0, female: 0, unknown: 0 },
    grade: {},
  }

  for (const s of students) {
    if (s.gender === 'male')        stats.gender.male++
    else if (s.gender === 'female') stats.gender.female++
    else                            stats.gender.unknown++

    if (s.grade != null) {
      stats.grade[s.grade] = (stats.grade[s.grade] ?? 0) + 1
    }
  }

  cache.set(key, stats, 1800)   // 30분
  return stats
}
