/**
 * NEIS 메뉴 이력으로 알레르기 키워드 사전 보강 (1회성 스크립트)
 *
 * 사용법:
 *   npm run extract-allergen-keywords -- [--atpt=J10] [--org=<orgId>] [--days=30] \
 *                                        [--limit=<N>] [--offset=0] [--reset] [--dry-run]
 *
 * 기본 동작 (인자 없음):
 *   schoolInfo로 ATPT=J10 학교 목록 전체(약 2,500곳)를 mealServiceDietInfo로 순회 → 사전 누적.
 *   네트워크 소요 시간이 크니 부분 실행은 --limit/--offset으로 슬라이스.
 *
 * 모드:
 *   --org=<id> 명시 시: 그 학교 1곳만 (학교 단위 호출, limit/offset 무시)
 *   그 외:              --atpt(기본 J10) 전체 학교 목록 → --offset부터 --limit개 순회
 *                       --limit 생략 시 끝까지.
 *
 * --reset:   실행 전 source='neis' 행 전체 삭제 후 적재 (manual 출처 보존)
 *            dry-run과 함께 쓰면 삭제는 skip.
 */
import { PrismaClient } from '@prisma/client'
import {
  getNeisHistory,
  getSchoolsByAtpt,
  type NeisSchool,
} from '../src/services/neis/neis.service'

const prisma = new PrismaClient()

interface Args {
  atptCode: string
  orgId: string | null
  days: number
  limit: number | null   // null = 학교 목록 끝까지
  offset: number
  dryRun: boolean
  reset: boolean
}

function parseArgs(): Args {
  let atptCode = 'J10'
  let orgId: string | null = null
  let days = 30
  let limit: number | null = null
  let offset = 0
  let dryRun = false
  let reset = false
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--atpt=')) atptCode = a.slice('--atpt='.length)
    else if (a.startsWith('--org=')) orgId = a.slice('--org='.length)
    else if (a.startsWith('--days=')) days = Number(a.slice('--days='.length))
    else if (a.startsWith('--limit=')) limit = Number(a.slice('--limit='.length))
    else if (a.startsWith('--offset=')) offset = Number(a.slice('--offset='.length))
    else if (a === '--dry-run') dryRun = true
    else if (a === '--reset') reset = true
  }
  if (!Number.isFinite(days) || days < 1) bail()
  if (limit !== null && (!Number.isFinite(limit) || limit < 1)) bail()
  if (!Number.isFinite(offset) || offset < 0) bail()
  return { atptCode, orgId, days, limit, offset, dryRun, reset }
}

function bail(): never {
  console.error(
    'Usage: npm run extract-allergen-keywords -- [--atpt=J10] [--org=<orgId>] [--days=30] ' +
    '[--limit=<N>] [--offset=0] [--reset] [--dry-run]',
  )
  process.exit(1)
}

interface NeisItemRow {
  name: string
  allergenCodes: number[]
}

async function fetchSingleSchool(orgId: string, from: Date, to: Date): Promise<NeisItemRow[]> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) { console.error(`조직을 찾을 수 없습니다: ${orgId}`); process.exit(1) }
  if (org.orgType !== 'school') { console.error(`school 단체만 지원합니다 (현재: ${org.orgType})`); process.exit(1) }
  if (!org.atptCode || !org.schoolCode) {
    console.error(`NEIS 코드가 비어 있습니다: atptCode=${org.atptCode}, schoolCode=${org.schoolCode}`)
    process.exit(1)
  }
  console.log(`[NEIS 추출] 학교 단위: ${org.name} (${org.atptCode}/${org.schoolCode})`)
  const history = await getNeisHistory(org.atptCode, org.schoolCode, from, to)
  return history.meals.flatMap((d) => d.items.map((i) => ({ name: i.name, allergenCodes: i.allergenCodes })))
}

async function fetchByAtpt(
  atptCode: string,
  from: Date,
  to: Date,
  limit: number | null,
  offset: number,
): Promise<NeisItemRow[]> {
  console.log(`[NEIS 추출] 광역 모드: ATPT=${atptCode}`)
  const all = await getSchoolsByAtpt(atptCode)
  if (all.length === 0) {
    console.error('schoolInfo 응답 없음 (NEIS_API_KEY 또는 ATPT 코드 확인 필요)')
    return []
  }
  console.log(`  학교 목록 ${all.length.toLocaleString()}곳 수신`)
  const slice: NeisSchool[] = limit === null
    ? all.slice(offset)
    : all.slice(offset, offset + limit)
  console.log(`  처리 대상 ${slice.length.toLocaleString()}곳 (offset=${offset}${limit === null ? '' : `, limit=${limit}`})`)

  const items: NeisItemRow[] = []
  let failed = 0
  for (let i = 0; i < slice.length; i++) {
    const s = slice[i]
    const tag = `[${i + 1}/${slice.length}] ${s.name} (${s.schoolCode})`
    try {
      const history = await getNeisHistory(s.atptCode, s.schoolCode, from, to)
      let count = 0
      for (const day of history.meals) {
        for (const it of day.items) {
          items.push({ name: it.name, allergenCodes: it.allergenCodes })
          count += 1
        }
      }
      console.log(`  ${tag} → ${count} items`)
    } catch (e) {
      failed += 1
      console.log(`  ${tag} → 실패: ${(e as Error).message}`)
    }
  }
  console.log(`  요약: 성공 ${slice.length - failed} · 실패 ${failed}`)
  return items
}

async function main() {
  const { atptCode, orgId, days, limit, offset, dryRun, reset } = parseArgs()

  if (reset && !dryRun) {
    const { count } = await prisma.allergenKeyword.deleteMany({ where: { source: 'neis' } })
    console.log(`[--reset] 기존 source='neis' ${count.toLocaleString()}건 삭제 (manual 출처는 보존)`)
  } else if (reset && dryRun) {
    const count = await prisma.allergenKeyword.count({ where: { source: 'neis' } })
    console.log(`[--reset · dry-run] 삭제 대상 source='neis' ${count.toLocaleString()}건 (실제 삭제 안 함)`)
  }

  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)

  const items = orgId
    ? await fetchSingleSchool(orgId, from, to)
    : await fetchByAtpt(atptCode, from, to, limit, offset)

  if (items.length === 0) {
    console.warn('NEIS 메뉴 데이터 없음. 조회 기간·API 키·학교 코드를 확인하세요')
    return
  }
  console.log(`  → 메뉴 row ${items.length.toLocaleString()}건 수집 (최근 ${days}일)`)

  // (allergenCode → (keyword → count)) 누적
  const counts = new Map<number, Map<string, number>>()
  for (const it of items) {
    const name = it.name.trim()
    if (!name) continue
    for (const code of it.allergenCodes) {
      if (code < 1 || code > 19) continue  // 식약처 19종 한정
      if (!counts.has(code)) counts.set(code, new Map())
      const map = counts.get(code)!
      map.set(name, (map.get(name) ?? 0) + 1)
    }
  }

  const allergens = await prisma.allergen.findMany({ select: { id: true, code: true, name: true } })
  const codeToAllergen = new Map(allergens.map((a) => [a.code, a]))

  let total = 0
  let upserts = 0
  for (const [code, kwMap] of counts) {
    const allergen = codeToAllergen.get(code)
    if (!allergen) continue
    for (const [keyword, count] of kwMap) {
      total += 1
      if (dryRun) {
        console.log(`  [${allergen.name}] ${keyword} (×${count})`)
        continue
      }
      await prisma.allergenKeyword.upsert({
        where: { allergenId_keyword: { allergenId: allergen.id, keyword } },
        create: {
          allergenId: allergen.id,
          keyword,
          source: 'neis',
          sampleCount: count,
        },
        update: { sampleCount: { increment: count } },
      })
      upserts += 1
    }
  }

  console.log(`\n키워드 총 ${total.toLocaleString()}개 — ${dryRun ? '(dry-run, DB 미반영)' : `${upserts.toLocaleString()}건 upsert 완료`}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
