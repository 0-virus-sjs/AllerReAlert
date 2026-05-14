/**
 * 같은 (orgId, date)에 draft MealPlan이 여럿인 경우
 * 가장 최근에 생성된 것만 남기고 나머지를 삭제한다.
 *
 * 실행: npx tsx scripts/dedup-draft-meal-plans.ts
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  const drafts = await prisma.mealPlan.findMany({
    where: { status: 'draft' },
    select: { id: true, orgId: true, date: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // (orgId, date) 키로 그룹화 — 내림차순 정렬이므로 첫 번째가 최신
  const groups = new Map<string, typeof drafts>()
  for (const plan of drafts) {
    const key = `${plan.orgId}|${plan.date.toISOString().slice(0, 10)}`
    const group = groups.get(key) ?? []
    group.push(plan)
    groups.set(key, group)
  }

  let totalDeleted = 0
  for (const [key, group] of groups) {
    if (group.length <= 1) continue
    const [keep, ...toDelete] = group
    const deleteIds = toDelete.map((p) => p.id)
    console.log(`[${key}] 유지: ${keep.id} (${keep.createdAt.toISOString()}) / 삭제: ${deleteIds.length}건`)

    // 삭제할 plan의 MealItem ID 수집
    const items = await prisma.mealItem.findMany({
      where: { mealPlanId: { in: deleteIds } },
      select: { id: true },
    })
    const itemIds = items.map((i) => i.id)

    // replacesItemId FK(non-nullable)를 가진 AlternateMealItem 행만 제거
    // AlternateMealPlan 자체는 건드리지 않아 다른 plan에 속한 대체 식단은 보존됨
    if (itemIds.length > 0) {
      const blockingItems = await prisma.alternateMealItem.findMany({
        where: { replacesItemId: { in: itemIds } },
        select: { id: true },
      })
      const blockingIds = blockingItems.map((i) => i.id)
      if (blockingIds.length > 0) {
        await prisma.alternateMealItem.deleteMany({ where: { id: { in: blockingIds } } })
      }
    }

    await prisma.mealPlan.deleteMany({ where: { id: { in: deleteIds } } })
    totalDeleted += deleteIds.length
  }

  if (totalDeleted === 0) {
    console.log('중복 draft 없음 — 정리할 항목이 없습니다.')
  } else {
    console.log(`완료. 총 ${totalDeleted}건 삭제되었습니다.`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
