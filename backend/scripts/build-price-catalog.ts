/**
 * T-128: 학교별 메뉴 참고 단가 카탈로그 빌더 (1회성 스크립트)
 *
 * 사용법:
 *   npm run build-price-catalog -- [--org=<orgId>] [--months=12] [--reset] [--dry-run]
 *
 * 동작:
 *   --org=<id> 명시 시: 해당 학교 1곳만
 *   생략 시:           NEIS 코드(atptCode/schoolCode)가 있는 모든 school 단체 순회
 *
 * --reset:  실행 전 해당 학교의 기존 meal_price_catalog 행 일괄 삭제 후 재적재
 * --dry-run: DB 미반영, 결과만 콘솔 출력
 */
import { PrismaClient } from '@prisma/client'
import { buildPriceCatalogForOrg } from '../src/services/meal-price/price-catalog.service'

const prisma = new PrismaClient()

interface Args {
  orgId: string | null
  months: number
  reset: boolean
  dryRun: boolean
}

function parseArgs(): Args {
  let orgId: string | null = null
  let months = 12
  let reset = false
  let dryRun = false
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--org=')) orgId = a.slice('--org='.length)
    else if (a.startsWith('--months=')) months = Number(a.slice('--months='.length))
    else if (a === '--reset') reset = true
    else if (a === '--dry-run') dryRun = true
  }
  if (!Number.isFinite(months) || months < 1) bail()
  return { orgId, months, reset, dryRun }
}

function bail(): never {
  console.error('Usage: npm run build-price-catalog -- [--org=<orgId>] [--months=12] [--reset] [--dry-run]')
  process.exit(1)
}

async function resolveTargetOrgIds(orgId: string | null): Promise<string[]> {
  if (orgId) return [orgId]
  const rows = await prisma.organization.findMany({
    where: {
      orgType: 'school',
      atptCode: { not: null },
      schoolCode: { not: null },
    },
    select: { id: true },
    orderBy: { name: 'asc' },
  })
  if (rows.length === 0) {
    console.error('NEIS 코드가 있는 school 단체가 없습니다. seed 또는 admin에서 atptCode/schoolCode 입력 필요')
    process.exit(1)
  }
  return rows.map((r) => r.id)
}

async function main() {
  const { orgId, months, reset, dryRun } = parseArgs()
  const targets = await resolveTargetOrgIds(orgId)
  console.log(`[가격 카탈로그] 대상 ${targets.length}곳, 최근 ${months}개월${reset ? ' [--reset]' : ''}${dryRun ? ' [--dry-run]' : ''}`)

  let okCount = 0
  let failCount = 0
  for (const id of targets) {
    try {
      const r = await buildPriceCatalogForOrg(id, { months, reset, dryRun })
      console.log(
        `  ✓ ${r.orgName}: ${r.entries.length}개 키워드 매칭` +
        (dryRun ? ' (dry-run)' : ` · upsert ${r.upserted}건` + (reset ? ` · 삭제 ${r.deleted}건` : '')),
      )
      if (dryRun) {
        for (const e of r.entries) {
          console.log(`      [${e.category}] ${e.keyword}: ${e.avgPrice}원 × ${e.sampleCount}`)
        }
      }
      okCount += 1
    } catch (e) {
      failCount += 1
      console.error(`  ✗ ${id}: ${(e as Error).message}`)
    }
  }
  console.log(`\n요약: 성공 ${okCount} · 실패 ${failCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
