# API 명세

## 인증
- `POST /api/auth/signup`  - 회원가입
- `POST /api/auth/login`   - 로그인 → JWT 반환
- `POST /api/auth/refresh` - 토큰 갱신

## 유저
- `GET  /api/users/me`          - 내 프로필 조회
- `PUT  /api/users/me`          - 프로필 수정
- `GET  /api/users/me/allergies` - 알레르기 설정 조회
- `PUT  /api/users/me/allergies` - 알레르기 설정 수정

## 학교
- `GET  /api/schools?q=검색어` - 학교 검색 (NEIS 연동)
- `POST /api/users/me/schools` - 내 학교 등록
- `DELETE /api/users/me/schools/:id` - 학교 삭제

## 급식
- `GET /api/meals?schoolId=&date=` - 날짜별 급식 조회

## 알림
- `POST /api/notifications/subscribe` - Web Push 구독 등록
