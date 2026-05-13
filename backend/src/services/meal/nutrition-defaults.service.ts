import { getSchoolStats } from '../analytics/analytics.service'

// ── 2020 한국인 영양소 섭취기준 (에너지 필요추정량 kcal/일) ──────────────────

interface DriEntry {
  minAge: number
  maxAge: number
  male: number
  female: number
}

const DRI_KCAL: DriEntry[] = [
  { minAge: 6,  maxAge: 8,  male: 1700, female: 1500 },
  { minAge: 9,  maxAge: 11, male: 2000, female: 1800 },
  { minAge: 12, maxAge: 14, male: 2500, female: 2000 },
  { minAge: 15, maxAge: 18, male: 2700, female: 2000 },
  { minAge: 19, maxAge: 29, male: 2600, female: 2100 },
  { minAge: 30, maxAge: 49, male: 2500, female: 2000 },
  { minAge: 50, maxAge: 64, male: 2200, female: 1800 },
]

// 학년(1~12) → 만 나이 매핑
// 초 1~6학년: 7~12세, 중 1~3학년: 13~15세, 고 1~3학년: 16~18세
const GRADE_TO_AGE: Record<number, number> = {
  1: 7, 2: 8, 3: 9, 4: 10, 5: 11, 6: 12,
  7: 13, 8: 14, 9: 15, 10: 16, 11: 17, 12: 18,
}

function driFor(age: number): DriEntry | undefined {
  return DRI_KCAL.find((r) => age >= r.minAge && age <= r.maxAge)
}

// ── 응답 타입 ────────────────────────────────────────────────────────────────

export interface NutrientDefault {
  key: string
  label: string
  target: number
  unit: string
  mode: 'absolute' | 'percent_of_energy'
}

export interface MealConditionDefaults {
  calories: number
  nutrients: NutrientDefault[]
}

function buildDefaults(calories: number): MealConditionDefaults {
  return {
    calories,
    nutrients: [
      { key: 'calories',     label: '칼로리',   target: calories, unit: 'kcal', mode: 'absolute' },
      { key: 'carbohydrate', label: '탄수화물', target: 60,       unit: '%',    mode: 'percent_of_energy' },
      { key: 'protein',      label: '단백질',   target: 20,       unit: '%',    mode: 'percent_of_energy' },
      { key: 'fat',          label: '지방',     target: 20,       unit: '%',    mode: 'percent_of_energy' },
      { key: 'calcium',      label: '칼슘',     target: 300,      unit: 'mg',   mode: 'absolute' },
      { key: 'sodium',       label: '나트륨',   target: 400,      unit: 'mg',   mode: 'absolute' },
    ],
  }
}

// fallback: 중학생 남녀 평균 (2500 + 2000) / 2
const FALLBACK_KCAL = 2250

// ── 핵심 함수 ────────────────────────────────────────────────────────────────
// T-126 학교 통계(성별·학년 분포)를 이용해 일 평균 칼로리 기본값을 산출한다.
// 성별 분포는 전체 비율을 각 학년에 균등 적용(학년별 성별 breakdown 미보유).

export async function getMealConditionDefaults(
  orgId: string,
): Promise<MealConditionDefaults> {
  const stats = await getSchoolStats(orgId)

  if (stats.totalStudents === 0) {
    return buildDefaults(FALLBACK_KCAL)
  }

  const { male, female, unknown } = stats.gender
  const total = stats.totalStudents

  // 성별 비율 (unknown은 남녀 평균으로 처리)
  const maleRatio    = male    / total
  const femaleRatio  = female  / total
  const unknownRatio = unknown / total

  let totalKcal        = 0
  let gradeStudentCount = 0

  for (const [gradeStr, count] of Object.entries(stats.grade)) {
    const grade = Number(gradeStr)
    const age   = GRADE_TO_AGE[grade]
    if (age == null) continue

    const dri = driFor(age)
    if (!dri) continue

    const avgKcal = (dri.male + dri.female) / 2
    const kcalPerStudent =
      maleRatio   * dri.male   +
      femaleRatio * dri.female +
      unknownRatio * avgKcal

    totalKcal        += count * kcalPerStudent
    gradeStudentCount += count
  }

  // 학년 미입력 학생 → grade 기반 평균으로 대체
  const unknownGradeCount = total - gradeStudentCount
  if (unknownGradeCount > 0) {
    const avgFromGrades = gradeStudentCount > 0
      ? totalKcal / gradeStudentCount
      : FALLBACK_KCAL
    totalKcal += unknownGradeCount * avgFromGrades
  }

  const calories = Math.round(totalKcal / total)
  return buildDefaults(calories)
}
