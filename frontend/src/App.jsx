import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'

// 최상위 컴포넌트 - URL 경로에 따라 페이지 컴포넌트를 렌더링
// 새 페이지 추가 시 Route를 여기에 추가
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}

export default App
