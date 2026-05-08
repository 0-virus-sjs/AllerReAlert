/**
 * T-113: 스모크 테스트 — 배포 후 핵심 API 기본 동작 확인
 *
 * 실행: k6 run --env API_URL=https://api.allerrealert.kr/api/v1 k6/smoke-test.js
 */
import http from 'k6/http'
import { check } from 'k6'

const BASE = __ENV.API_URL || 'http://localhost:5000/api/v1'

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed:   ['rate==0'],
    http_req_duration: ['p(100)<3000'],
  },
}

export default function () {
  // 헬스체크
  const health = http.get(BASE.replace('/api/v1', '') + '/api/v1/health')
  check(health, { 'health 200': (r) => r.status === 200 })

  // 알레르기 마스터 (공개 API)
  const allergens = http.get(`${BASE}/allergens`, {
    headers: { Authorization: 'Bearer dummy' },
  })
  // 401 or 200 모두 서버가 살아있다는 증거
  check(allergens, { '알레르기 API 응답': (r) => r.status < 500 })
}
