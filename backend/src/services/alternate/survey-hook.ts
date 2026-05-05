import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'

/**
 * T-070: 대체 식단 확정 → 설문 2단계 자동 생성 (PRD §7.3)
 *
 * Step 1. need_check  — "대체식이 필요한가요?" (해당 알레르기 보유자 대상)
 * Step 2. menu_vote   — "어떤 메뉴를 원하시나요?" (원래 식단 + 대체 후보 포함)
 *
 * deadline: 원래 식단 날짜 하루 전 자정 (조정 가능)
 */
export async function onAlternatePlanConfirmed(alternatePlanId: string): Promise<void> {
  try {
    const plan = await prisma.alternateMealPlan.findUnique({
      where: { id: alternatePlanId },
      include: {
        mealPlan: { select: { id: true, date: true, orgId: true } },
        targetAllergen: { select: { id: true, code: true, name: true } },
        items: {
          include: { replacesItem: { select: { id: true, name: true, category: true } } },
        },
      },
    })
    if (!plan) {
      logger.warn({ alternatePlanId }, '[T-070] 대체 식단 미존재 — 설문 생성 생략')
      return
    }

    // 영양사(createdBy) 찾기 — 설문 생성자로 사용
    const nutritionist = await prisma.user.findFirst({
      where: { orgId: plan.mealPlan.orgId, role: 'nutritionist' },
      select: { id: true },
    })
    if (!nutritionist) {
      logger.warn({ alternatePlanId }, '[T-070] 영양사 미존재 — 설문 생성 생략')
      return
    }

    // 마감: 식단 날짜 하루 전 오후 6시 (UTC)
    const mealDate = new Date(plan.mealPlan.date)
    const deadline = new Date(Date.UTC(
      mealDate.getUTCFullYear(),
      mealDate.getUTCMonth(),
      mealDate.getUTCDate() - 1,
      9, 0, 0,  // 한국 18:00 = UTC 09:00
    ))

    // ── Step 1: need_check 설문 ───────────────────────────
    const needCheckOptions: Prisma.InputJsonValue = {
      allergenCode: plan.targetAllergen.code,
      allergenName: plan.targetAllergen.name,
      choices: ['필요합니다', '필요하지 않습니다'],
    }
    const needCheck = await prisma.survey.create({
      data: {
        mealPlanId: plan.mealPlan.id,
        type: 'need_check',
        options: needCheckOptions,
        deadline,
        createdBy: nutritionist.id,
      },
    })

    // ── Step 2: menu_vote 설문 ────────────────────────────
    const originalItems = plan.items.map((item) => ({
      id: item.replacesItem.id,
      name: item.replacesItem.name,
      isOriginal: true,
    }))
    const alternateItems = plan.items.map((item) => ({
      id: item.id,
      name: item.name,
      isOriginal: false,
    }))

    const menuVoteOptions: Prisma.InputJsonValue = {
      allergenCode: plan.targetAllergen.code,
      allergenName: plan.targetAllergen.name,
      choices: [...originalItems, ...alternateItems],
    }
    await prisma.survey.create({
      data: {
        mealPlanId: plan.mealPlan.id,
        type: 'menu_vote',
        options: menuVoteOptions,
        deadline,
        createdBy: nutritionist.id,
      },
    })

    logger.info({ alternatePlanId, needCheckId: needCheck.id }, '[T-070] 설문 2단계 자동 생성 완료')
  } catch (err) {
    logger.error({ err, alternatePlanId }, '[T-070] 설문 자동 생성 실패')
  }
}
