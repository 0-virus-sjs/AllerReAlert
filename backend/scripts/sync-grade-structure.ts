/// <reference types="node" />
/**
 * NEIS classInfo API로 DB의 모든 학교 gradeStructure를 동기화한다.
 *
 * 사전 조건:
 *   - .env (또는 환경변수)에 NEIS_API_KEY, DATABASE_URL, DIRECT_URL 설정
 *   - orgType=school이고 atptCode, schoolCode 가 모두 있는 학교만 처리
 *
 * 실행:
 *   npx tsx scripts/sync-grade-structure.ts [학교명...]
 *
 *   인수 없음 — DB의 모든 학교 처리
 *   인수 있음 — 학교명에 해당 문자열이 포함된 학교만 처리 (부분 일치, 복수 지정 가능)
 *
 * 옵션 (환경변수):
 *   AY=2024   — 학년도 지정 (기본값: 현재 연도)
 *   DRY_RUN=1 — DB 업데이트 없이 결과만 출력
 *
 * 예시:
 *   npx tsx scripts/sync-grade-structure.ts 판곡초
 *   npx tsx scripts/sync-grade-structure.ts 판곡초 평내중
 *   AY=2024 DRY_RUN=1 npx tsx scripts/sync-grade-structure.ts 평내고
 */

import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

// ── NEIS classInfo API 타입 ────────────────────────────────

interface ClassInfoRow {
  ATPT_OFCDC_SC_CODE: string
  SD_SCHUL_CODE: string
  AY: string         // 학년도
  GRADE: string      // 학년 (숫자 문자열)
  CLASS_NM: string   // 반명 (숫자 문자열)
  SCHUL_NM: string
}

interface ClassInfoResponse {
  classInfo?: [
    { head: [{ list_total_count: number }, { RESULT: { CODE: string; MESSAGE: string } }] },
    { row: ClassInfoRow[] },
  ]
  RESULT?: { CODE: string; MESSAGE: string }
}

// ── NEIS classInfo 호출 ────────────────────────────────────

async function fetchClassInfo(
  apiKey: string,
  atptCode: string,
  schoolCode: string,
  ay: string,
): Promise<ClassInfoRow[]> {
  const url = new URL('https://open.neis.go.kr/hub/classInfo')
  url.searchParams.set('KEY',                apiKey)
  url.searchParams.set('Type',               'json')
  url.searchParams.set('pIndex',             '1')
  url.searchParams.set('pSize',              '300')  // 학교당 최대 학급 수는 300 이하
  url.searchParams.set('ATPT_OFCDC_SC_CODE', atptCode)
  url.searchParams.set('SD_SCHUL_CODE',      schoolCode)
  url.searchParams.set('AY',                 ay)

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = (await res.json()) as ClassInfoResponse

  // INFO-200 (데이터 없음) 또는 API 오류
  if (json.RESULT) {
    if (json.RESULT.CODE === 'INFO-200') return []
    throw new Error(`NEIS 오류: ${json.RESULT.CODE} — ${json.RESULT.MESSAGE}`)
  }

  return json.classInfo?.[1]?.row ?? []
}

// ── gradeStructure 빌더 ────────────────────────────────────

interface GradeEntry { grade: number; classCount: number }

function buildGradeStructure(rows: ClassInfoRow[]): { grades: GradeEntry[] } {
  // grade → 반명 집합 (중복 제거)
  const gradeClassMap = new Map<number, Set<string>>()

  for (const row of rows) {
    const grade = parseInt(row.GRADE, 10)
    if (isNaN(grade) || grade < 1) continue
    if (!gradeClassMap.has(grade)) gradeClassMap.set(grade, new Set())
    gradeClassMap.get(grade)!.add(row.CLASS_NM.trim())
  }

  const grades: GradeEntry[] = Array.from(gradeClassMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([grade, classes]) => ({ grade, classCount: classes.size }))

  return { grades }
}

// ── 메인 ──────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.NEIS_API_KEY
  if (!apiKey) {
    console.error('❌ NEIS_API_KEY 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const ay        = process.env.AY ?? String(new Date().getFullYear())
  const dryRun    = process.env.DRY_RUN === '1'
  const nameArgs  = process.argv.slice(2)  // 학교명 필터 (부분 일치, 복수 가능)

  const filterDesc = nameArgs.length > 0 ? `필터: ${nameArgs.join(', ')}` : '전체 학교'
  console.log(`\n학년도: ${ay}  |  ${filterDesc}  |  DRY_RUN: ${dryRun ? '✅ (DB 미반영)' : '❌ (DB 반영)'}`)
  console.log('─'.repeat(60))

  // atptCode + schoolCode 가 있는 학교만 조회
  let schools = await prisma.organization.findMany({
    where: {
      orgType:    'school',
      atptCode:   { not: null },
      schoolCode: { not: null },
    },
    select: { id: true, name: true, atptCode: true, schoolCode: true },
  })

  // 학교명 필터 적용 (인수가 있는 경우)
  if (nameArgs.length > 0) {
    schools = schools.filter((s) =>
      nameArgs.some((q) => s.name.includes(q))
    )
  }

  if (schools.length === 0) {
    const hint = nameArgs.length > 0
      ? `"${nameArgs.join('", "')}"에 해당하는 학교가 없습니다.`
      : '처리할 학교가 없습니다. (orgType=school + atptCode + schoolCode 필요)'
    console.log(hint)
    return
  }

  console.log(`총 ${schools.length}개 학교 처리 시작\n`)

  let successCount = 0
  let skipCount    = 0
  let errorCount   = 0

  for (const school of schools) {
    const label = `[${school.name}] (${school.atptCode} / ${school.schoolCode})`
    try {
      const rows = await fetchClassInfo(apiKey, school.atptCode!, school.schoolCode!, ay)

      if (rows.length === 0) {
        console.log(`⚠️  ${label} — ${ay}년 학급 데이터 없음, 건너뜀`)
        skipCount++
      } else {
        const gradeStructure = buildGradeStructure(rows)
        const summary = gradeStructure.grades
          .map((g) => `${g.grade}학년 ${g.classCount}반`)
          .join(', ')

        if (dryRun) {
          console.log(`🔍 ${label}`)
          console.log(`   → ${summary}`)
        } else {
          await prisma.organization.update({
            where: { id: school.id },
            data:  { gradeStructure: gradeStructure as object },
          })
          console.log(`✅ ${label}`)
          console.log(`   → ${summary}`)
        }
        successCount++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ ${label} — ${msg}`)
      errorCount++
    }

    // NEIS API 과호출 방지 (학교 간 200ms 대기)
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`완료 — 성공: ${successCount}, 데이터 없음: ${skipCount}, 오류: ${errorCount}`)
  if (dryRun) console.log('※ DRY_RUN 모드 — DB는 변경되지 않았습니다.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
