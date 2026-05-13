import type { AIMessage } from './provider'
import type { NeisHistoryContext } from '../neis/neis.service'
import { formatNeisForPrompt } from '../neis/neis.service'
import type { NutrientItem } from './validator'

// ── 입력 타입 ──────────────────────────────────────────────

export interface MealPlanBuildInput {
  orgType: 'school' | 'company' | 'welfare' | 'military' | 'other'
  period: { from: Date; to: Date }
  budget?: number                         // 원/끼 (legacy)
  calorieTarget?: { min: number; max: number }  // legacy
  proteinMin?: number                     // g (legacy)
  preferences?: string[]
  excludes?: string[]
  neisHistory?: NeisHistoryContext        // org_type=school 만
  // T-130
  nutrients?: NutrientItem[]             // 동적 영양소 목표 (일 평균)
  perMealPrice?: number                  // 1식당 단가 (원, 정규화 후)
  priceCatalogContext?: string           // T-128 카탈로그 텍스트
}

// ── AI 출력 JSON 스키마 (T-063 Zod 검증과 1:1 대응) ───────

export interface MealItemOutput {
  category: 'rice' | 'soup' | 'side' | 'dessert'
  name: string
  calories: number | null
  nutrients?: { carbs?: number | null; protein?: number | null; fat?: number | null } | null
  allergenCodes: number[]
}

export interface DayMenuOutput {
  date: string        // YYYY-MM-DD
  items: MealItemOutput[]
}

export interface MealPlanOutput {
  mealPlan: DayMenuOutput[]
}

// ── 유틸 ──────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getWeekdays(from: Date, to: Date): string[] {
  const days: string[] = []
  const cur = new Date(from)
  while (cur <= to) {
    const dow = cur.getDay()
    if (dow >= 1 && dow <= 5) days.push(formatDate(cur))   // 월~금
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

const OUTPUT_FORMAT = `{
  "mealPlan": [
    {
      "date": "YYYY-MM-DD",
      "items": [
        {
          "category": "rice | soup | side | dessert",
          "name": "메뉴명",
          "calories": 300,
          "nutrients": { "carbs": 60.0, "protein": 8.0, "fat": 2.5 },
          "allergenCodes": [1, 5]
        }
      ]
    }
  ]
}`

// ── 프롬프트 빌더 ─────────────────────────────────────────

/**
 * T-061: 정규 식단 생성 프롬프트 빌더.
 * org_type=school인 경우에만 neisHistory를 컨텍스트로 포함.
 */
export function buildMealPlanMessages(input: MealPlanBuildInput): AIMessage[] {
  const weekdays = getWeekdays(input.period.from, input.period.to)

  const systemPrompt = [
    '당신은 학교·단체 급식 전문 영양사입니다.',
    '주어진 조건에 맞는 급식 식단표를 JSON 형식으로만 출력하세요.',
    '설명, 마크다운, 코드블록 없이 순수 JSON만 반환하세요.',
    '영양소 제약 조건은 반드시 충족해야 합니다. 일반적인 급식 상식과 다르더라도 지정된 목표를 따르세요.',
    'JSON을 출력하기 전에 각 날짜의 items calories 합계를 직접 계산하세요. 목표와 ±10% 이상 차이나면 메뉴 calories를 조정한 후 출력하세요.',
    '알레르기 유발물질이 포함된 메뉴는 allergenCodes 배열에 해당 코드를 반드시 포함하세요.',
    '식약처 알레르기 번호 기준: 1=난류 2=우유 3=메밀 4=땅콩 5=대두 6=밀 7=고등어 8=게 9=새우 10=돼지고기 11=복숭아 12=토마토 13=아황산류 14=호두 15=닭고기 16=쇠고기 17=오징어 18=조개류 19=잣',
  ].join('\n')

  const lines: string[] = []

  lines.push(`## 식단 작성 요청`)
  lines.push(``)
  lines.push(`### 기본 조건`)
  lines.push(`- 대상 날짜: ${weekdays.join(', ')} (${weekdays.length}일)`)
  lines.push(`- 기관 유형: ${input.orgType}`)

  // 단가 제약: T-130 perMealPrice 우선, 없으면 legacy budget
  const effectiveBudget = input.perMealPrice ?? input.budget
  if (effectiveBudget) lines.push(`- 1끼 예산: 약 ${effectiveBudget.toLocaleString()}원`)

  // 영양소 목표: T-130 nutrients 우선, 없으면 legacy calorieTarget/proteinMin
  if (input.nutrients && input.nutrients.length > 0) {
    lines.push(`- 구성: 밥(rice) 1, 국(soup) 1, 반찬(side) 2~3, 후식(dessert) 0~1`)
    lines.push(``)
    lines.push(`### 영양소 제약 조건 (반드시 충족 — 검증 후 거절됨)`)
    lines.push(`아래 수치는 하루 전체 메뉴(items) calories 합계 기준입니다.`)
    for (const n of input.nutrients) {
      if (n.mode === 'percent_of_energy') {
        lines.push(`- ${n.label}: ${n.target}% (주간 에너지 비율 기준)`)
      } else {
        lines.push(`- ${n.label}: ${n.target} ${n.unit}/일 (하루 items calories 합계가 이 값의 ±10% 이내)`)
      }
    }
    lines.push(`※ 출력 전 각 날짜별 calories 합계를 확인하고, 미달이면 메뉴 calories를 올려 조정하세요.`)
  } else {
    if (input.calorieTarget) {
      lines.push(`- 칼로리 목표: ${input.calorieTarget.min}~${input.calorieTarget.max} kcal/끼`)
    } else {
      lines.push(`- 칼로리 목표: 600~750 kcal/끼 (성인 기준)`)
    }
    if (input.proteinMin) lines.push(`- 단백질 최소: ${input.proteinMin}g/끼`)
    lines.push(`- 구성: 밥(rice) 1, 국(soup) 1, 반찬(side) 2~3, 후식(dessert) 0~1`)
  }

  if (input.preferences?.length) {
    lines.push(`- 선호 식재료/조리법: ${input.preferences.join(', ')}`)
  }

  if (input.excludes?.length) {
    lines.push(`- 제외 식재료: ${input.excludes.join(', ')}`)
  }

  // T-128 단가 카탈로그 — 단가 제약 있을 때만 포함
  if (effectiveBudget && input.priceCatalogContext) {
    lines.push(``)
    lines.push(`### 메뉴별 참고 단가 카탈로그 (예산 준수 참고용)`)
    lines.push(input.priceCatalogContext)
  }

  // NEIS 이력 — school 기관만 포함
  if (input.orgType === 'school' && input.neisHistory) {
    const ctx = formatNeisForPrompt(input.neisHistory)
    lines.push(``)
    lines.push(`### 최근 급식 이력 (참고용 — 중복 최소화)`)
    lines.push(ctx)
  }

  lines.push(``)
  lines.push(`### 출력 형식 (이 JSON 구조를 정확히 따를 것)`)
  lines.push(OUTPUT_FORMAT)

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: lines.join('\n') },
  ]
}
