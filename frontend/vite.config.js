import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 설정 파일
// - dev 서버 포트 변경, 프록시 설정 등을 여기서 관리
export default defineConfig({
  plugins: [react()],

  // 개발 서버 설정
  server: {
    port: 3000, // 기본 포트 (변경 가능)

    // 백엔드 API 프록시 설정 - 나중에 CORS 문제 없이 API 호출 가능
    // proxy: {
    //   '/api': 'http://localhost:5000',
    // },
  },
})
