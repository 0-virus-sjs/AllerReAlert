import { Router } from 'express'

// 각 도메인별 라우터를 여기서 한곳에 모아 app.ts에 등록
// 새 라우터 추가 시 아래에 import 후 router.use() 추가

// TODO: import authRouter from './auth.routes'
// TODO: import mealRouter from './meal.routes'
// TODO: import allergyRouter from './allergy.routes'
// TODO: import userRouter from './user.routes'

const router = Router()

// router.use('/auth', authRouter)       // 인증 (회원가입, 로그인, 토큰 갱신)
// router.use('/meals', mealRouter)      // 급식 데이터 조회
// router.use('/allergies', allergyRouter) // 알레르기 설정 CRUD
// router.use('/users', userRouter)      // 유저 프로필

export default router
