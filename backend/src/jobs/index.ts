// node-cron 스케줄 잡 - 주기적으로 실행되는 백그라운드 작업
// app.ts에서 import해서 서버 시작 시 등록

// 주요 잡:
//   - 매일 오전 7시: 당일 급식 조회 → 알레르기 엔진 실행 → 알림 발송
//   - 매일 자정:    급식 캐시 갱신

// 사용 예:
// import cron from 'node-cron'
// cron.schedule('0 7 * * *', () => {
//   allergyEngine.processDailyMeals()
// })

// TODO: node-cron 설치 (npm install node-cron)
// TODO: 급식 알림 잡 구현
// TODO: 잡 실행 로그 DB 저장 (성공/실패 추적)

export {}
