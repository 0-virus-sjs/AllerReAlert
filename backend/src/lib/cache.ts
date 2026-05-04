import NodeCache from 'node-cache'

// 기본 TTL 5분 — Phase 2에서 Railway Redis Plugin으로 교체 가능
export const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 })

export const CacheKey = {
  mealList: (orgId: string, month: string) => `meals:list:${orgId}:${month}`,
  mealDetail: (id: string) => `meals:detail:${id}`,
}

// 해당 org의 모든 meal 캐시를 무효화
export function invalidateMealCache(orgId: string): void {
  const keys = cache.keys().filter((k) => k.startsWith(`meals:list:${orgId}:`))
  cache.del(keys)
}
