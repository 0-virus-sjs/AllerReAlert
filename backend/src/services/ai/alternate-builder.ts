import type { AIMessage } from './provider'
import { detectAllergenCodes } from '../meal/tagging.service'

// ── 알레르기 코드 → 한국어 이름 ───────────────────────────

const ALLERGEN_NAMES: Record<number, string> = {
  1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두',
  6: '밀', 7: '고등어', 8: '게', 9: '새우', 10: '돼지고기',
  11: '복숭아', 12: '토마토', 13: '아황산류', 14: '호두', 15: '닭고기',
  16: '쇠고기', 17: '오징어', 18: '조개류', 19: '잣',
}

// ── 입력 타입 ──────────────────────────────────────────────

export interface AlternateBuildInput {
  originalItem: {
    name: string
    category: 'rice' | 'soup' | 'side' | 'dessert'
    calories?: number | null
  }
  excludeAllergenCodes: number[]   // 제외해야 할 알레르기 코드 목록
  candidateCount?: number          // 기본 3
}

// ── AI 출력 JSON 스키마 (T-063 Zod 검증과 1:1 대응) ───────

export interface AlternateCandidateOutput {
  name: string
  category: 'rice' | 'soup' | 'side' | 'dessert'
  calories: number | null
  nutrients: { carbs?: number | null; protein?: number | null; fat?: number | null } | null
  allergenCodes: number[]
  reason: string
}

export interface AlternateOutput {
  candidates: AlternateCandidateOutput[]
}

// ── 알레르기 누설 검증 (PRD §11.3) ───────────────────────

export interface AllergenLeakResult {
  hasLeak: boolean
  leakedCandidates: Array<{ name: string; leakedCodes: number[] }>
}

/**
 * AI가 반환한 대체 후보에 제외 알레르기가 포함되어 있는지 이중 검증.
 *
 * 1차: allergenCodes 배열 직접 검사
 * 2차: 메뉴명 텍스트 키워드 검사 (tagging.service의 detectAllergenCodes 재사용)
 */
export function checkAllergenLeak(
  candidates: AlternateCandidateOutput[],
  excludeAllergenCodes: number[],
): AllergenLeakResult {
  const excludeSet = new Set(excludeAllergenCodes)
  const leakedCandidates: AllergenLeakResult['leakedCandidates'] = []

  for (const candidate of candidates) {
    const leaked = new Set<number>()

    // 1차: allergenCodes 배열
    for (const code of candidate.allergenCodes) {
      if (excludeSet.has(code)) leaked.add(code)
    }

    // 2차: 메뉴명 키워드 검사 (AI가 allergenCodes를 누락한 경우 대비)
    for (const code of detectAllergenCodes(candidate.name)) {
      if (excludeSet.has(code)) leaked.add(code)
    }

    if (leaked.size > 0) {
      leakedCandidates.push({ name: candidate.name, leakedCodes: [...leaked] })
    }
  }

  return { hasLeak: leakedCandidates.length > 0, leakedCandidates }
}

// ── 프롬프트 빌더 ─────────────────────────────────────────

const OUTPUT_FORMAT = `{
  "candidates": [
    {
      "name": "대체 메뉴명",
      "category": "rice | soup | side | dessert",
      "calories": 200,
      "nutrients": { "carbs": 20.0, "protein": 15.0, "fat": 8.0 },
      "allergenCodes": [],
      "reason": "대체 이유 (한 줄)"
    }
  ]
}`

/**
 * T-062: 대체 식단 제안 프롬프트 빌더 (PRD §7.4).
 * 반드시 제외 알레르기 코드를 명시하여 AI가 준수하도록 유도.
 */
export function buildAlternateMessages(input: AlternateBuildInput): AIMessage[] {
  const count = input.candidateCount ?? 3
  const excludeNames = input.excludeAllergenCodes
    .map((code) => `${code}번(${ALLERGEN_NAMES[code] ?? '알 수 없음'})`)
    .join(', ')

  const systemPrompt = [
    '당신은 알레르기 대체 식단 전문 영양사입니다.',
    '요청된 메뉴의 대체 후보를 JSON 형식으로만 출력하세요.',
    '설명, 마크다운, 코드블록 없이 순수 JSON만 반환하세요.',
    '⚠️ 핵심 제약: 제외 알레르기 코드에 해당하는 식재료가 절대 포함되어선 안 됩니다.',
    '식약처 알레르기 번호 기준: 1=난류 2=우유 3=메밀 4=땅콩 5=대두 6=밀 7=고등어 8=게 9=새우 10=돼지고기 11=복숭아 12=토마토 13=아황산류 14=호두 15=닭고기 16=쇠고기 17=오징어 18=조개류 19=잣',
  ].join('\n')

  const lines: string[] = []
  lines.push(`## 대체 식단 제안 요청`)
  lines.push(``)
  lines.push(`### 원본 메뉴`)
  lines.push(`- 메뉴명: ${input.originalItem.name}`)
  lines.push(`- 분류: ${input.originalItem.category}`)
  if (input.originalItem.calories) {
    lines.push(`- 원본 칼로리: 약 ${input.originalItem.calories} kcal`)
  }
  lines.push(``)
  lines.push(`### ⚠️ 제외 알레르기 (이 식재료가 포함된 메뉴 절대 금지)`)
  lines.push(`- ${excludeNames}`)
  lines.push(``)
  lines.push(`### 요구사항`)
  lines.push(`- 대체 후보 ${count}개 제안`)
  lines.push(`- 원본과 유사한 칼로리·영양소 균형 유지`)
  lines.push(`- 각 후보의 allergenCodes에 실제 포함된 알레르기 코드를 빠짐없이 기재`)
  lines.push(``)
  lines.push(`### 출력 형식 (이 JSON 구조를 정확히 따를 것)`)
  lines.push(OUTPUT_FORMAT)

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: lines.join('\n') },
  ]
}
