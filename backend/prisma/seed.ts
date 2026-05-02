import { prisma } from '../src/lib/prisma'

// 초기 데이터 삽입 스크립트
// 실행: npx prisma db seed

async function main() {
  // 테스트용 학교 1개
  await prisma.school.upsert({
    where: { neisCode: 'B100000000' },
    update: {},
    create: {
      neisCode: 'B100000000',
      name: '테스트초등학교',
      region: 'B10',
    },
  })

  // TODO: 알레르기 코드 마스터 데이터 (1~22번)
  // TODO: 관리자 계정 생성

  console.log('Seed 완료')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
