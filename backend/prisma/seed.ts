import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // M1 (T-017)에서 알레르기 19종 + 샘플 학교/사용자 추가 예정
  console.log('Seed 완료 — 실제 데이터는 M1에서 추가')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
