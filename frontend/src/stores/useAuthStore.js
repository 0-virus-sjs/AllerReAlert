import { create } from 'zustand'

// Zustand 인증 스토어
// 로그인 상태, 유저 정보를 전역으로 관리
const useAuthStore = create((set) => ({
  user: null,      // { id, email, name, role }
  token: null,

  // 로그인 성공 시 호출
  login: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token })
  },

  // 로그아웃 시 호출
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))

// TODO: useAllergyStore  - 유저 알레르기 설정 상태
// TODO: useMealStore     - 급식 데이터 캐싱 상태
// TODO: useSchoolStore   - 등록한 학교 목록 상태

export default useAuthStore
