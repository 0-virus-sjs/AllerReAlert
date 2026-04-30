import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css' // 부트스트랩 전역 스타일
import './index.css' // 커스텀 전역 스타일 (부트스트랩 다음에 import해야 덮어쓰기 가능)
import App from './App.jsx'

// index.html의 <div id="root">에 React 앱 마운트
// BrowserRouter로 감싸야 react-router-dom의 Route, Link 사용 가능
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
