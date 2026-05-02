import { PrismaClient } from '@prisma/client'

// PrismaClient 싱글턴 - 연결 풀 낭비 방지
// 개발 환경에서는 hot-reload 시 중복 인스턴스 생성을 막기 위해 global에 캐싱
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
