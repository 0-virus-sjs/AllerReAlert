import axios from 'axios'
import { useAuthStore } from '../stores/auth.store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1',
  withCredentials: true,   // Refresh 토큰 쿠키 전송 (Vercel↔Railway 크로스 도메인)
})

// ── 요청 인터셉터: Access 토큰 헤더 자동 첨부 ────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── 응답 인터셉터: TOKEN_EXPIRED → refresh 후 원본 재시도 ─
let isRefreshing = false
let waitQueue: Array<(token: string) => void> = []

function processQueue(token: string) {
  waitQueue.forEach((resolve) => resolve(token))
  waitQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const code = error.response?.data?.error?.code

    if (code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        // 이미 refresh 중이면 큐에 대기
        return new Promise((resolve) => {
          waitQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      isRefreshing = true
      try {
        const { data } = await api.post<{ success: boolean; data: { accessToken: string } }>(
          '/auth/refresh'
        )
        const newToken = data.data.accessToken
        useAuthStore.getState().setAuth(newToken, useAuthStore.getState().user!)
        processQueue(newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
