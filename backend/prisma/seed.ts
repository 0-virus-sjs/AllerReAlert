import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// 식약처 알레르기 유발물질 19종 (식품위생법 시행규칙 기준)
const ALLERGENS = [
  { code: 1,  name: '난류' },
  { code: 2,  name: '우유' },
  { code: 3,  name: '메밀' },
  { code: 4,  name: '땅콩' },
  { code: 5,  name: '대두' },
  { code: 6,  name: '밀' },
  { code: 7,  name: '고등어' },
  { code: 8,  name: '게' },
  { code: 9,  name: '새우' },
  { code: 10, name: '돼지고기' },
  { code: 11, name: '복숭아' },
  { code: 12, name: '토마토' },
  { code: 13, name: '아황산류' },
  { code: 14, name: '호두' },
  { code: 15, name: '닭고기' },
  { code: 16, name: '쇠고기' },
  { code: 17, name: '오징어' },
  { code: 18, name: '조개류' },
  { code: 19, name: '잣' },
]

async function main() {
  // ── 알레르기 19종 upsert ───────────────────────────
  for (const a of ALLERGENS) {
    await prisma.allergen.upsert({
      where: { code: a.code },
      update: { name: a.name },
      create: { code: a.code, name: a.name },
    })
  }
  console.log('✅ 알레르기 19종 시드 완료')

  // ── 샘플 학교 3곳 (NEIS 실제 코드 반영) ───────────────
  const SCHOOLS = [
    {
      id: 'seed-org-001',
      name: '판곡초등학교',
      address: '경기도 남양주시',
      atptCode: 'J10',
      schoolCode: '7652136',
      gradeStructure: { grades: [1,2,3,4,5,6].map((g) => ({ grade: g, classCount: 4 })) },
      mealTime: { breakfast: null, lunch: '12:00', dinner: null },
    },
    {
      id: 'seed-org-002',
      name: '평내중학교',
      address: '경기도 남양주시',
      atptCode: 'J10',
      schoolCode: '7652138',
      gradeStructure: { grades: [1,2,3].map((g) => ({ grade: g, classCount: 6 })) },
      mealTime: { breakfast: null, lunch: '12:30', dinner: null },
    },
    {
      id: 'seed-org-003',
      name: '평내고등학교',
      address: '경기도 남양주시',
      atptCode: 'J10',
      schoolCode: '7530771',
      gradeStructure: { grades: [1,2,3].map((g) => ({ grade: g, classCount: 8 })) },
      mealTime: { breakfast: '07:30', lunch: '13:00', dinner: '18:00' },
    },
  ]

  const orgs = await Promise.all(
    SCHOOLS.map((s) =>
      prisma.organization.upsert({
        where: { id: s.id },
        // 시드 재실행 시에도 이름·주소·NEIS 코드는 최신 값으로 유지
        update: {
          name: s.name,
          address: s.address,
          atptCode: s.atptCode,
          schoolCode: s.schoolCode,
          gradeStructure: s.gradeStructure,
        },
        create: { ...s, orgType: 'school' },
      }),
    ),
  )
  const org = orgs[0] // 기본 사용자 시드는 첫 번째 학교(판곡초)에 연결
  console.log(`✅ 샘플 학교 ${orgs.length}곳 시드 완료:`, orgs.map((o) => o.name).join(', '))

  // ── 테스트 계정 5종 ────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 12)

  const accounts = [
    { id: 'seed-user-admin', role: 'admin' as const,        email: 'admin@allerrealert.kr',       name: '시스템관리자' },
    { id: 'seed-user-nutr',  role: 'nutritionist' as const, email: 'nutritionist@allerrealert.kr',name: '김영양사' },
    { id: 'seed-user-staff', role: 'staff' as const,        email: 'staff@allerrealert.kr',       name: '이교직원' },
    {
      id: 'seed-user-stu', role: 'student' as const,
      email: 'student@allerrealert.kr', name: '박학생',
      grade: 5, classNo: '3', gender: 'male' as const,
    },
    { id: 'seed-user-grd',   role: 'guardian' as const,     email: 'guardian@allerrealert.kr',    name: '최보호자' },
  ]

  for (const a of accounts) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        id: a.id,
        orgId: org.id,
        role: a.role,
        name: a.name,
        email: a.email,
        passwordHash: await hash('Test1234!'),
        ...('grade' in a && { grade: a.grade }),
        ...('classNo' in a && { classNo: a.classNo }),
        ...('gender' in a && { gender: a.gender }),
      },
    })
  }
  console.log('✅ 테스트 계정 5종 시드 완료')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
