/**
 * 사용자·조직·레퍼런스 데이터는 유지하고 업무 데이터만 초기화한다.
 *
 * 보존: organizations, users, guardian_students, user_allergens,
 *       allergens, allergen_keywords, meal_price_catalog
 * 삭제: meal_plans(cascade), alternate_meal_plans(cascade),
 *       surveys(cascade), meal_generation_jobs,
 *       notifications, audit_logs, push_subscriptions
 *
 * 실행: npx tsx scripts/reset-business-data.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('업무 데이터 초기화를 시작합니다...')

  // cascade 순서를 Prisma가 처리하도록 상위 테이블만 삭제
  const [jobs, notifications, auditLogs, push, surveys, altPlans, mealPlans] =
    await prisma.$transaction([
      prisma.mealGenerationJob.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.pushSubscription.deleteMany(),
      prisma.survey.deleteMany(),           // → survey_responses cascade
      prisma.alternateMealPlan.deleteMany(), // → alternate_meal_items cascade
      prisma.mealPlan.deleteMany(),          // → meal_items → meal_item_allergens cascade
    ])

  console.log(`meal_generation_jobs : ${jobs.count}건 삭제`)
  console.log(`notifications        : ${notifications.count}건 삭제`)
  console.log(`audit_logs           : ${auditLogs.count}건 삭제`)
  console.log(`push_subscriptions   : ${push.count}건 삭제`)
  console.log(`surveys              : ${surveys.count}건 삭제`)
  console.log(`alternate_meal_plans : ${altPlans.count}건 삭제`)
  console.log(`meal_plans           : ${mealPlans.count}건 삭제`)
  console.log('\n완료. 사용자·조직·레퍼런스 데이터는 유지되었습니다.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
