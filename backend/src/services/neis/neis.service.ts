import NodeCache from 'node-cache'
import { logger } from '../../lib/logger'

const NEIS_BASE = 'https://open.neis.go.kr/hub/mealServiceDietInfo'
const CACHE_TTL = 60 * 60 * 24  // 1일

const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 600 })

// ── 공개 타입 ──────────────────────────────────────────────

export interface NeisMealItem {
  name: string
  allergenCodes: number[]   // 식약처 알레르기 번호 (1~22)
  calories: number | null
  nutrients: string
}

export interface NeisDayMenu {
  date: string              // YYYYMMDD
  items: NeisMealItem[]
}

export interface NeisHistoryContext {
  period: { from: string; to: string }
  meals: NeisDayMenu[]
}

// ── 내부 유틸 ──────────────────────────────────────────────

function toNeisDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

function cacheKey(atptCode: string, schulCode: string, from: string, to: string): string {
  return `neis:${atptCode}:${schulCode}:${from}:${to}`
}

// "제육볶음 (5.6.9.13.)" → { name: '제육볶음', allergenCodes: [5,6,9,13] }
function parseNeisDish(raw: string): { name: string; allergenCodes: number[] } {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(.+?)\s*\(([0-9.]+)\)\s*$/)
  if (!match) return { name: trimmed, allergenCodes: [] }
  const allergenCodes = match[2]
    .split('.')
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 1 && n <= 22)
  return { name: match[1].trim(), allergenCodes }
}

// ── NEIS API 응답 타입 ─────────────────────────────────────

interface NeisRow {
  MLSV_YMD: string
  DDISH_NM: string
  MLSV_CAL: string
  NTR_INFO: string
}

interface NeisApiResponse {
  mealServiceDietInfo?: [
    { head: [{ list_total_count: number }, { RESULT: { CODE: string; MESSAGE: string } }] },
    { row: NeisRow[] },
  ]
  RESULT?: { CODE: string; MESSAGE: string }
}

// ── 공개 API ───────────────────────────────────────────────

/**
 * T-059: NEIS 급식 API로 학교 급식 이력 조회 (1일 캐시).
 * org_type !== school 인 경우 호출하지 말 것.
 */
export async function getNeisHistory(
  atptCode: string,
  schulCode: string,
  from: Date,
  to: Date,
): Promise<NeisHistoryContext> {
  const fromStr = toNeisDate(from)
  const toStr   = toNeisDate(to)
  const key     = cacheKey(atptCode, schulCode, fromStr, toStr)

  const cached = cache.get<NeisHistoryContext>(key)
  if (cached) {
    logger.debug({ key }, '[T-059] NEIS 캐시 히트')
    return cached
  }

  const apiKey = process.env.NEIS_API_KEY
  if (!apiKey) throw new Error('NEIS_API_KEY 환경 변수 미설정')

  const url = new URL(NEIS_BASE)
  url.searchParams.set('KEY',                apiKey)
  url.searchParams.set('Type',               'json')
  url.searchParams.set('pIndex',             '1')
  url.searchParams.set('pSize',              '365')
  url.searchParams.set('ATPT_OFCDC_SC_CODE', atptCode)
  url.searchParams.set('SD_SCHUL_CODE',      schulCode)
  url.searchParams.set('MLSV_FROM_YMD',      fromStr)
  url.searchParams.set('MLSV_TO_YMD',        toStr)

  logger.info({ atptCode, schulCode, fromStr, toStr }, '[T-059] NEIS API 호출')

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`NEIS API HTTP ${res.status}`)

  const json = (await res.json()) as NeisApiResponse

  // 결과 없음 (INFO-200)
  if (json.RESULT) {
    logger.info({ code: json.RESULT.CODE }, '[T-059] NEIS 데이터 없음')
    const empty: NeisHistoryContext = { period: { from: fromStr, to: toStr }, meals: [] }
    cache.set(key, empty)
    return empty
  }

  const rows = json.mealServiceDietInfo?.[1]?.row ?? []

  // 날짜별 그룹화
  const byDate = new Map<string, NeisMealItem[]>()
  for (const row of rows) {
    if (!byDate.has(row.MLSV_YMD)) byDate.set(row.MLSV_YMD, [])
    for (const rawDish of row.DDISH_NM.split('<br/>')) {
      const { name, allergenCodes } = parseNeisDish(rawDish)
      byDate.get(row.MLSV_YMD)!.push({
        name,
        allergenCodes,
        calories: parseFloat(row.MLSV_CAL) || null,
        nutrients: row.NTR_INFO,
      })
    }
  }

  const meals: NeisDayMenu[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }))

  const result: NeisHistoryContext = { period: { from: fromStr, to: toStr }, meals }
  cache.set(key, result)

  logger.info({ dayCount: meals.length }, '[T-059] NEIS 급식 이력 조회 완료')
  return result
}

/**
 * AI 프롬프트에 삽입할 문자열로 변환 (최근 30일).
 */
export function formatNeisForPrompt(history: NeisHistoryContext): string {
  if (history.meals.length === 0) return '(급식 이력 없음)'

  return history.meals
    .slice(-30)
    .map(({ date, items }) => {
      const y = date.slice(0, 4), m = date.slice(4, 6), d = date.slice(6, 8)
      const names = items.map((i) => i.name).join(', ')
      return `${y}-${m}-${d}: ${names}`
    })
    .join('\n')
}
