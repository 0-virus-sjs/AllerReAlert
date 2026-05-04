import type { PrismaClient } from '@prisma/client'

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
): Promise<number> {
  const codes = detectAllergenCodes(mealItemName)
  if (codes.length === 0) return 0

  const allergens = await tx.allergen.findMany({
    where: { code: { in: codes } },
    select: { id: true },
  })
  if (allergens.length === 0) return 0

  await tx.mealItemAllergen.createMany({
    data: allergens.map(a => ({
      mealItemId,
      allergenId: a.id,
      isAutoTagged: true,
    })),
    skipDuplicates: true,  // 재호출 시 중복 방지 (멱등)
  })

  return allergens.length
}
