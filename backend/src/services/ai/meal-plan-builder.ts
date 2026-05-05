import type { AIMessage } from './provider'
import type { NeisHistoryContext } from '../neis/neis.service'
import { formatNeisForPrompt } from '../neis/neis.service'

// ── 입력 타입 ──────────────────────────────────────────────

export interface MealPlanBuildInput {
  orgType: 'school' | 'company' | 'welfare' | 'military' | 'other'
  period: { from: Date; to: Date }
  budget?: number                         // 원/끼
  calorieTarget?: { min: number; max: number }
  proteinMin?: number                     // g
  preferences?: string[]
  excludes?: string[]
  neisHistory?: NeisHistoryContext        // org_type=school 만
}

// ── AI 출력 JSON 스키마 (T-063 Zod 검증과 1:1 대응) ───────

export interface MealItemOutput {
  category: 'rice' | 'soup' | 'side' | 'dessert'
  name: string
  calories: number | null
  nutrients: { carbs?: number | null; protein?: number | null; fat?: number | null } | null
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
    '알레르기 유발물질이 포함된 메뉴는 allergenCodes 배열에 해당 코드를 반드시 포함하세요.',
    '식약처 알레르기 번호 기준: 1=난류 2=우유 3=메밀 4=땅콩 5=대두 6=밀 7=고등어 8=게 9=새우 10=돼지고기 11=복숭아 12=토마토 13=아황산류 14=호두 15=닭고기 16=쇠고기 17=오징어 18=조개류 19=잣',
  ].join('\n')

  const lines: string[] = []

  lines.push(`## 식단 작성 요청`)
  lines.push(``)
  lines.push(`### 기본 조건`)
  lines.push(`- 대상 날짜: ${weekdays.join(', ')} (${weekdays.length}일)`)
  lines.push(`- 기관 유형: ${input.orgType}`)

  if (input.budget) lines.push(`- 1끼 예산: 약 ${input.budget.toLocaleString()}원`)

  if (input.calorieTarget) {
    lines.push(`- 칼로리 목표: ${input.calorieTarget.min}~${input.calorieTarget.max} kcal/끼`)
  } else {
    lines.push(`- 칼로리 목표: 600~750 kcal/끼 (성인 기준)`)
  }

  if (input.proteinMin) lines.push(`- 단백질 최소: ${input.proteinMin}g/끼`)

  lines.push(`- 구성: 밥(rice) 1, 국(soup) 1, 반찬(side) 2~3, 후식(dessert) 0~1`)

  if (input.preferences?.length) {
    lines.push(`- 선호 식재료/조리법: ${input.preferences.join(', ')}`)
  }

  if (input.excludes?.length) {
    lines.push(`- 제외 식재료: ${input.excludes.join(', ')}`)
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
