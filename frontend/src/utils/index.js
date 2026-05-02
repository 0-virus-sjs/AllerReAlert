// 프론트엔드 공통 유틸리티

// 알레르기 코드 → 한글 이름 변환
const ALLERGEN_MAP = {
  1: '난류', 2: '우유', 3: '메밀', 4: '땅콩', 5: '대두',
  6: '밀', 7: '고등어', 8: '게', 9: '새우', 10: '돼지고기',
  11: '복숭아', 12: '토마토', 13: '아황산류', 14: '호두',
  15: '닭고기', 16: '쇠고기', 17: '오징어', 18: '조개류',
}

export const getAllergenName = (code) => ALLERGEN_MAP[code] ?? `알레르기${code}`

// 날짜를 'YYYY-MM-DD' 형식으로 포맷
export const formatDate = (date) => new Date(date).toISOString().slice(0, 10)

// TODO: 급식 메뉴에서 유저 알레르기 해당 항목 필터링 함수
// TODO: 로컬스토리지 래퍼 (JSON 직렬화/역직렬화 자동 처리)
