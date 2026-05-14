import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'

interface DraftSummary {
  id: string
  items: Array<{ name: string }>
}

/**
 * T-070 개선: mealPlan당 설문 1쌍만 생성 (후보별이 아님).
 *
 * 기존 방식(후보별 onAlternatePlanConfirmed 반복 호출)은
 * candidates × allergens 조합 수만큼 설문이 복제되는 버그를 유발함.
 *
 * - need_check: "대체 식단이 필요하신가요?" (1개)
 * - menu_vote:  "선호하는 대체 식단을 선택해 주세요." — 각 draft가 하나의 선택지 (1개)
 * - 마감: 생성 시점 +24시간 (상대 시간)
 */
export async function createSurveysForAlternatePlans(
  mealPlanId: string,
  drafts: DraftSummary[],
  orgId: string,
): Promise<void> {
  try {
    const nutritionist = await prisma.user.findFirst({
      where: { orgId, role: 'nutritionist' },
      select: { id: true },
    })
    if (!nutritionist) {
      logger.warn({ mealPlanId }, '[T-070] 영양사 미존재 — 설문 생성 생략')
      return
    }

    // 설문 생성 시점으로부터 24시간 후 마감 (상대 시간)
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // ── Step 1: need_check ────────────────────────────────
    const needCheckOptions: Prisma.InputJsonValue = {
      choices: ['필요합니다', '필요하지 않습니다'],
    }
    const needCheck = await prisma.survey.create({
      data: {
        mealPlanId,
        type: 'need_check',
        options: needCheckOptions,
        deadline,
        createdBy: nutritionist.id,
      },
    })

    // ── Step 2: menu_vote ─────────────────────────────────
    // 각 draft(대체 식단 후보)를 하나의 선택지로 표현
    const menuVoteOptions: Prisma.InputJsonValue = {
      choices: drafts.map((draft, idx) => ({
        id: draft.id,
        name: `대체 식단 ${idx + 1}`,
        summary: draft.items.map((i) => i.name).join(' / '),
        isOriginal: false,
      })),
    }
    await prisma.survey.create({
      data: {
        mealPlanId,
        type: 'menu_vote',
        options: menuVoteOptions,
        deadline,
        createdBy: nutritionist.id,
      },
    })

    logger.info(
      { mealPlanId, needCheckId: needCheck.id, draftCount: drafts.length },
      '[T-070] 설문 1쌍 생성 완료',
    )
  } catch (err) {
    logger.error({ err, mealPlanId }, '[T-070] 설문 자동 생성 실패')
  }
}
