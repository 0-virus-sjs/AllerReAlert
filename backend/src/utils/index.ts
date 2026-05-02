// 백엔드 공통 유틸리티

// ── 날짜 포맷 ─────────────────────────────────────────
// NEIS API는 날짜를 YYYYMMDD 형식으로 요구
export const toNeisDate = (date: Date): string => {
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

// ── 에러 메시지 표준화 ────────────────────────────────
export const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message
  return String(err)
}

// TODO: 알레르기 코드 ↔ 한글명 변환 함수
// TODO: 페이지네이션 헬퍼 (skip/take 계산)
// TODO: API 응답 포맷 통일 헬퍼 (success/error wrapper)
