// .env 파일의 환경변수를 process.env로 로드
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000; // .env에 PORT가 없으면 5000 사용

// 다른 도메인(프론트엔드)에서 API 요청을 허용
app.use(cors());

// 요청 body를 JSON으로 파싱
app.use(express.json());

// 서버 상태 확인용 엔드포인트 (AWS 헬스체크에서도 사용)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
