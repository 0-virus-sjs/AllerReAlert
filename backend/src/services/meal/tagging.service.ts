import type { Prisma, PrismaClient } from '@prisma/client'

// 식약처 알레르기 유발물질 19종 키워드 사전
// allergen.code → 메뉴명/식재료 텍스트에서 탐지할 키워드 목록
// 안전 우선 원칙: 재현율(recall) > 정밀도(precision) → 의심 시 태깅, 영양사가 수동 보정
const ALLERGEN_KEYWORDS: Record<number, readonly string[]> = {
  1:  ['달걀', '계란', '메추리알', '오믈렛', '에그'],
  2:  ['우유', '치즈', '버터', '크림', '요구르트', '요거트', '밀크', '라떼'],
  3:  ['메밀', '냉면', '막국수'],
  4:  ['땅콩', '피넛'],
  5:  ['두부', '된장', '청국장', '두유', '대두', '순두부', '연두부', '콩비지', '콩나물'],
  6:  ['밀가루', '빵', '라면', '스파게티', '파스타', '국수', '우동', '만두', '피자',
       '케이크', '쿠키', '크래커', '칼국수', '수제비', '핫케이크', '튀김', '돈까스', '돈가스'],
  7:  ['고등어'],
  8:  ['꽃게', '대게', '게살', '킹크랩', '참게', '게장'],
  9:  ['새우'],
  10: ['돼지', '삼겹살', '소시지', '베이컨', '햄', '돈까스', '돈가스', '제육', '수육', '목살'],
  11: ['복숭아', '피치'],
  12: ['토마토'],
  13: ['건포도', '건과일', '황산'],
  14: ['호두'],
  15: ['닭', '치킨', '삼계탕'],
  16: ['쇠고기', '소고기', '불고기', '육개장', '스테이크', '한우', '갈비'],
  17: ['오징어', '꼴뚜기', '낙지'],
  18: ['조개', '홍합', '바지락', '굴', '전복', '가리비', '모시조개'],
  19: ['잣'],
}

/**
 * 메뉴명(+식재료 텍스트)에서 알레르기 코드 목록을 반환하는 순수 함수.
 * 단위 테스트 용이성을 위해 DB 의존 없이 분리.
 */
export function detectAllergenCodes(text: string): number[] {
  const normalized = text.trim()
  const matched: number[] = []

  for (const [codeStr, keywords] of Object.entries(ALLERGEN_KEYWORDS)) {
    if ((keywords as string[]).some(kw => normalized.includes(kw))) {
      matched.push(Number(codeStr))
    }
  }

  return matched
}

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

export interface AutoTaggingTarget {
  mealItemId: string
  mealItemName: string
  ingredients?: string
}

/**
 * MealItem 하나에 대해 자동 태깅을 적용한다.
 * Prisma 트랜잭션 클라이언트(tx) 안에서 호출해야 원자성을 보장한다.
 *
 * @returns 태깅된 알레르기 수 (0이면 해당 없음)
 */
export async function applyAutoTagging(
  mealItemId: string,
  mealItemName: string,
  tx: TxClient,
  ingredients?: string,
): Promise<number> {
  return applyAutoTaggingBatch([{ mealItemId, mealItemName, ingredients }], tx)
}

/**
 * 여러 MealItem의 자동 태깅을 한 번에 적용한다.
 * 메뉴명과 식재료 두 텍스트를 OR 합집합으로 처리 — 어느 쪽에서든 감지되면 태깅.
 *
 * @returns 생성 시도한 태깅 row 수 (0이면 해당 없음)
 */
export async function applyAutoTaggingBatch(
  targets: AutoTaggingTarget[],
  tx: TxClient,
): Promise<number> {
  const mealItemIdsByCode = new Map<number, string[]>()

  for (const target of targets) {
    const combinedText = target.ingredients
      ? `${target.mealItemName} ${target.ingredients}`
      : target.mealItemName
    const codes = detectAllergenCodes(combinedText)
    for (const code of codes) {
      const mealItemIds = mealItemIdsByCode.get(code) ?? []
      mealItemIds.push(target.mealItemId)
      mealItemIdsByCode.set(code, mealItemIds)
    }
  }

  const codes = [...mealItemIdsByCode.keys()]
  if (codes.length === 0) return 0

  const allergens = await tx.allergen.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true },
  })
  if (allergens.length === 0) return 0

  const rows: Prisma.MealItemAllergenCreateManyInput[] = []
  for (const allergen of allergens) {
    const mealItemIds = mealItemIdsByCode.get(allergen.code) ?? []
    for (const mealItemId of mealItemIds) {
      rows.push({
        mealItemId,
        allergenId: allergen.id,
        isAutoTagged: true,
      })
    }
  }

  if (rows.length === 0) return 0

  await tx.mealItemAllergen.createMany({
    data: rows,
    skipDuplicates: true,  // 재호출 시 중복 방지 (멱등)
  })

  return rows.length
}
