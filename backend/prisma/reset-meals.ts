/**
 * 식단 관련 데이터 전체 초기화 스크립트
 *
 * 삭제 대상:
 *   SurveyResponse → Survey
 *   AlternateMealItem → AlternateMealPlan
 *   MealItemAllergen → MealItem → MealPlan
 *   MealGenerationJob
 *   Notification (meal/survey 관련 타입)
 *
 * 유지 대상:
 *   Organization, User, UserAllergen, Allergen, PushSubscription 등
 *
 * 실행:
 *   npx ts-node prisma/reset-meals.ts
 */

import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close()
      resolve(ans.trim().toLowerCase() === 'y')
    })
  })
}

async function main() {
  // 삭제 전 현황 출력
  const [
    surveyResponseCount,
    surveyCount,
    altItemCount,
    altPlanCount,
    mealItemAllergenCount,
    mealItemCount,
    mealPlanCount,
    jobCount,
    notifCount,
  ] = await Promise.all([
    prisma.surveyResponse.count(),
    prisma.survey.count(),
    prisma.alternateMealItem.count(),
    prisma.alternateMealPlan.count(),
    prisma.mealItemAllergen.count(),
    prisma.mealItem.count(),
    prisma.mealPlan.count(),
    prisma.mealGenerationJob.count(),
    prisma.notification.count({
      where: { type: { in: ['allergen_alert', 'menu_change', 'survey_invite', 'survey_reminder'] } },
    }),
  ])

  console.log('\n=== 삭제 예정 레코드 ===')
  console.log(`  SurveyResponse   : ${surveyResponseCount}개`)
  console.log(`  Survey           : ${surveyCount}개`)
  console.log(`  AlternateMealItem: ${altItemCount}개`)
  console.log(`  AlternateMealPlan: ${altPlanCount}개`)
  console.log(`  MealItemAllergen : ${mealItemAllergenCount}개`)
  console.log(`  MealItem         : ${mealItemCount}개`)
  console.log(`  MealPlan         : ${mealPlanCount}개`)
  console.log(`  MealGenerationJob: ${jobCount}개`)
  console.log(`  Notification(식단/설문): ${notifCount}개`)
  console.log('========================\n')

  const ok = await confirm('위 데이터를 모두 삭제하시겠습니까? (y/N): ')
  if (!ok) {
    console.log('취소되었습니다.')
    return
  }

  console.log('\n삭제 시작...')

  await prisma.$transaction([
    // 1. 설문 응답 → 설문
    prisma.surveyResponse.deleteMany(),
    prisma.survey.deleteMany(),

    // 2. 대체 식단 아이템 → 대체 식단 플랜
    prisma.alternateMealItem.deleteMany(),
    prisma.alternateMealPlan.deleteMany(),

    // 3. 알레르기 태그 → 메뉴 아이템 → 식단 플랜
    prisma.mealItemAllergen.deleteMany(),
    prisma.mealItem.deleteMany(),
    prisma.mealPlan.deleteMany(),

    // 4. AI 생성 작업 로그
    prisma.mealGenerationJob.deleteMany(),

    // 5. 식단·설문 관련 알림
    prisma.notification.deleteMany({
      where: { type: { in: ['allergen_alert', 'menu_change', 'survey_invite', 'survey_reminder'] } },
    }),
  ])

  console.log('✓ 식단 데이터가 초기화되었습니다.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())