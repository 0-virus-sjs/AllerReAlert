import axios from 'axios'

// Axios 기본 클라이언트
// 모든 API 호출은 이 인스턴스를 통해 사용
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 요청 인터셉터 - 모든 요청에 JWT 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 응답 인터셉터 - 401 시 로그인 페이지로 이동
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// TODO: 각 도메인별 API 함수 파일로 분리
// 예: services/meal.service.js, services/allergy.service.js

export default api
