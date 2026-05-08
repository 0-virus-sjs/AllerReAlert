/**
 * T-113: AllerReAlert 부하 테스트 (k6)
 *
 * 목표: 동시 500명 시뮬레이션, 핵심 API p95 응답 시간 검증
 *
 * NFR-PFM-001: 알레르기 대조 API 응답 3초 이내
 * NFR-PFM-002: 핵심 API p95 < 500ms (동시 500명)
 *
 * 실행:
 *   k6 run --env API_URL=https://api.allerrealert.kr/api/v1 \
 *           --env TEST_EMAIL=student@test.com \
 *           --env TEST_PASSWORD=Test1234! \
 *           k6/load-test.js
 *
 * 설치:
 *   brew install k6   (macOS)
 *   https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

// ── 환경 변수 ────────────────────────────────────────────
const BASE = __ENV.API_URL || 'http://localhost:5000/api/v1'
const EMAIL    = __ENV.TEST_EMAIL    || 'student@allerrealert.kr'
const PASSWORD = __ENV.TEST_PASSWORD || 'Test1234!'

// ── 커스텀 메트릭 ─────────────────────────────────────────
const loginDuration     = new Trend('login_duration',     true)
const mealListDuration  = new Trend('meal_list_duration',  true)
const allergenCheckDur  = new Trend('allergen_check_duration', true)
const notifListDuration = new Trend('notif_list_duration', true)
const errorRate         = new Rate('error_rate')
const totalRequests     = new Counter('total_requests')

// ── 부하 시나리오 ─────────────────────────────────────────
export const options = {
  scenarios: {
    // 램프업 → 500명 유지 → 램프다운
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 100 },  // 1분 동안 100명으로 증가
        { duration: '2m',  target: 500 },  // 2분 동안 500명으로 증가
        { duration: '3m',  target: 500 },  // 3분 동안 500명 유지
        { duration: '1m',  target: 0   },  // 1분 동안 0명으로 감소
      ],
    },
  },
  thresholds: {
    // NFR-PFM-002: p95 응답 500ms 이내
    http_req_duration:      ['p(95)<500'],
    // 알레르기 대조: NFR-PFM-001 3초 이내
    allergen_check_duration:['p(95)<3000'],
    // 로그인 p95 1초 이내
    login_duration:         ['p(95)<1000'],
    // 식단 목록 p95 500ms 이내
    meal_list_duration:     ['p(95)<500'],
    // 에러율 1% 미만
    error_rate:             ['rate<0.01'],
    // HTTP 오류율 1% 미만
    http_req_failed:        ['rate<0.01'],
  },
}

// ── 시나리오별 가중치 (실제 사용 패턴 반영) ────────────────
// 로그인 10% | 식단조회 50% | 알레르기대조 20% | 알림목록 20%

export default function () {
  const rand = Math.random()

  if (rand < 0.10) {
    scenarioLogin()
  } else if (rand < 0.60) {
    scenarioMealList()
  } else if (rand < 0.80) {
    scenarioAllergenCheck()
  } else {
    scenarioNotifications()
  }

  sleep(1) // 사용자당 1초 대기 (실제 사용 패턴)
}

// ── 헬스체크 (smoke test용) ─────────────────────────────
export function setup() {
  const res = http.get(`${BASE.replace('/api/v1', '')}/api/v1/health`)
  check(res, { 'health check OK': (r) => r.status === 200 })
  return {}
}

// ── 로그인 시나리오 ──────────────────────────────────────
function scenarioLogin() {
  group('로그인', () => {
    const start = Date.now()
    const res = http.post(
      `${BASE}/auth/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' } },
    )
    loginDuration.add(Date.now() - start)
    totalRequests.add(1)

    const ok = check(res, {
      '로그인 200': (r) => r.status === 200,
      '토큰 존재':  (r) => !!r.json('data.accessToken'),
    })
    errorRate.add(!ok)
  })
}

// ── 식단 목록 조회 시나리오 ──────────────────────────────
function scenarioMealList() {
  // 토큰 없이 접근하면 401 — 실제 테스트에서는 setup()에서 토큰을 발급받아 공유
  // 여기서는 응답 시간과 서버 안정성 위주로 측정
  const month = new Date().toISOString().slice(0, 7)

  // 먼저 로그인
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  )
  if (loginRes.status !== 200) { errorRate.add(1); return }
  const token = loginRes.json('data.accessToken')

  group('식단 목록 조회', () => {
    const start = Date.now()
    const res = http.get(`${BASE}/meals?month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    mealListDuration.add(Date.now() - start)
    totalRequests.add(1)

    const ok = check(res, {
      '식단 목록 200': (r) => r.status === 200,
      '배열 응답':     (r) => Array.isArray(r.json('data')),
    })
    errorRate.add(!ok)
  })
}

// ── 알레르기 대조 시나리오 (NFR-PFM-001 핵심) ─────────────
function scenarioAllergenCheck() {
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  )
  if (loginRes.status !== 200) { errorRate.add(1); return }
  const token = loginRes.json('data.accessToken')

  // 식단 목록에서 첫 번째 항목으로 대조
  const month = new Date().toISOString().slice(0, 7)
  const mealsRes = http.get(`${BASE}/meals?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meals = mealsRes.json('data')
  if (!Array.isArray(meals) || meals.length === 0) return

  group('알레르기 대조', () => {
    const start = Date.now()
    const res = http.get(`${BASE}/meals/${meals[0].id}/allergen-check`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    allergenCheckDur.add(Date.now() - start)
    totalRequests.add(1)

    const ok = check(res, {
      '알레르기 대조 200':       (r) => r.status === 200,
      'isDangerous 필드 존재':   (r) => typeof r.json('data.isDangerous') === 'boolean',
    })
    errorRate.add(!ok)
  })
}

// ── 알림 목록 조회 시나리오 ──────────────────────────────
function scenarioNotifications() {
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  )
  if (loginRes.status !== 200) { errorRate.add(1); return }
  const token = loginRes.json('data.accessToken')

  group('알림 목록', () => {
    const start = Date.now()
    const res = http.get(`${BASE}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    notifListDuration.add(Date.now() - start)
    totalRequests.add(1)

    const ok = check(res, {
      '알림 목록 200':    (r) => r.status === 200,
      'items 배열 존재':  (r) => Array.isArray(r.json('data.items')),
    })
    errorRate.add(!ok)
  })
}
