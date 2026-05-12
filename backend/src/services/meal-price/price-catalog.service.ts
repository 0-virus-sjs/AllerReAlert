/**
 * T-128: 학교별 메뉴 참고 단가 카탈로그 빌더 + AI 프롬프트 어댑터
 *
 * - 빌더: NEIS 최근 12개월 메뉴 이력 → KEYWORD_PRICES 매칭 → DB upsert
 * - AI 어댑터: 학교의 카탈로그를 카테고리별 요약 텍스트로 반환 (AI 프롬프트 컨텍스트)
 */
import type { MealItemCategory, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { getNeisHistory } from '../neis/neis.service'
import {
  CATEGORY_BASE_PRICE,
  findKeywordPrice,
  guessCategory,
} from './static-prices'

// ── 빌더 ─────────────────────────────────────────────────

interface CatalogEntry {
  keyword:     string
  category:    MealItemCategory
  avgPrice:    number
  sampleCount: number
}

export interface BuildPriceCatalogOptions {
  /** 조회 기간 (개월). 기본 12 */
  months?: number
  /** 실행 전 해당 학교 기존 카탈로그 삭제 */
  reset?: boolean
  /** DB 미반영, 결과만 반환 */
  dryRun?: boolean
}

export interface BuildPriceCatalogResult {
  orgId:    string
  orgName:  string
  entries:  CatalogEntry[]
  upserted: number
  deleted:  number
}

/**
 * 단일 학교의 카탈로그 빌드.
 * Organization은 orgType=school + atptCode/schoolCode 필수.
 */
export async function buildPriceCatalogForOrg(
  orgId: string,
  options: BuildPriceCatalogOptions = {},
): Promise<BuildPriceCatalogResult> {
  const { months = 12, reset = false, dryRun = false } = options

  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org)                    throw new Error(`조직을 찾을 수 없습니다: ${orgId}`)
  if (org.orgType !== 'school') throw new Error(`school 단체만 지원 (현재: ${org.orgType})`)
  if (!org.atptCode || !org.schoolCode) {
    throw new Error(`NEIS 코드가 없습니다: atptCode=${org.atptCode}, schoolCode=${org.schoolCode}`)
  }

  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - months)

  const history = await getNeisHistory(org.atptCode, org.schoolCode, from, to)

  // (keyword → { category, price, count }) 집계
  // KEYWORD_PRICES에 매칭된 메뉴만 카탈로그에 포함 (의미 있는 데이터만)
  const map = new Map<string, CatalogEntry>()
  for (const day of history.meals) {
    for (const item of day.items) {
      const matched = findKeywordPrice(item.name)
      if (!matched) continue
      const existing = map.get(matched.keyword)
      if (existing) {
        existing.sampleCount += 1
      } else {
        map.set(matched.keyword, {
          keyword:     matched.keyword,
          category:    matched.category,
          avgPrice:    matched.price,
          sampleCount: 1,
        })
      }
    }
  }
  const entries = [...map.values()]

  let upserted = 0
  let deleted = 0

  if (!dryRun) {
    if (reset) {
      const res = await prisma.mealPriceCatalog.deleteMany({ where: { orgId } })
      deleted = res.count
    }
    for (const e of entries) {
      await prisma.mealPriceCatalog.upsert({
        where: { orgId_keyword: { orgId, keyword: e.keyword } },
        create: {
          orgId,
          keyword:     e.keyword,
          category:    e.category,
          avgPrice:    e.avgPrice,
          sampleCount: e.sampleCount,
        },
        update: {
          category:    e.category,
          avgPrice:    e.avgPrice,
          sampleCount: { increment: reset ? 0 : e.sampleCount },
        },
      })
      upserted += 1
    }
  }

  return { orgId, orgName: org.name, entries, upserted, deleted }
}

// ── AI 프롬프트 어댑터 ─────────────────────────────────────

const CATEGORY_LABEL: Record<MealItemCategory, string> = {
  rice:    '밥류',
  soup:    '국·탕·찌개',
  side:    '반찬',
  dessert: '후식',
}

const CATEGORY_ORDER: MealItemCategory[] = ['rice', 'soup', 'side', 'dessert']

/**
 * 학교의 카탈로그를 카테고리별로 정리한 텍스트로 반환.
 * AI 식단 생성 프롬프트에 그대로 삽입 가능.
 * 카탈로그가 비어 있으면 카테고리별 기본 단가만 안내.
 */
export async function getPriceCatalogForPrompt(
  orgId: string,
  client: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<string> {
  const rows = await client.mealPriceCatalog.findMany({
    where: { orgId },
    orderBy: [{ category: 'asc' }, { sampleCount: 'desc' }, { keyword: 'asc' }],
  })

  if (rows.length === 0) {
    const fallback = CATEGORY_ORDER
      .map((c) => `- ${CATEGORY_LABEL[c]}: 평균 ${CATEGORY_BASE_PRICE[c]}원/1식`)
      .join('\n')
    return `(학교별 카탈로그 없음 — 카테고리별 기본 단가 적용)\n${fallback}`
  }

  const byCategory = new Map<MealItemCategory, typeof rows>()
  for (const r of rows) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, [])
    byCategory.get(r.category)!.push(r)
  }

  const sections = CATEGORY_ORDER
    .filter((c) => byCategory.has(c))
    .map((c) => {
      const items = byCategory.get(c)!
      const lines = items.map((r) => `  - ${r.keyword}: ${r.avgPrice}원 (등장 ${r.sampleCount}회)`)
      return `[${CATEGORY_LABEL[c]}]\n${lines.join('\n')}`
    })

  return sections.join('\n\n')
}

// ── 내부 유틸: 카테고리 미매칭 메뉴 처리 (참고용) ───────────
// 키워드 매칭 안 된 메뉴는 카탈로그에 포함하지 않지만, 카테고리만 추정이 필요한 곳을 위해 export.
export { guessCategory }
