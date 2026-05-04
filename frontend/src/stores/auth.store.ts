import { create } from 'zustand'
import type { AuthUser } from '../types/auth'

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  isInitialized: boolean   // 앱 시작 시 refresh 시도 완료 여부
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setInitialized: () => set({ isInitialized: true }),
}))
