# API 명세 — 알라리알라 (Aller Re-Alert)

> **확장성 원칙**: 현재는 학교급식 대상으로 구현하되, 추후 학교 이외의 단체(사내 식당·복지관 등)로
> 확장할 수 있도록 `school` 대신 `organization` 기반으로 설계한다.

## 인증
- `POST /api/auth/signup`      - 회원가입
- `POST /api/auth/login`       - 로그인 → JWT 반환
- `POST /api/auth/refresh`     - 토큰 갱신
- `POST /api/auth/logout`      - 로그아웃
- `POST /api/auth/verify-org`  - 소속 코드 인증 (학교·기관 존재 여부 확인)

## 유저
- `GET  /api/users/me`                  - 내 프로필 조회
- `PUT  /api/users/me`                  - 프로필 수정
- `GET  /api/users/me/allergens`        - 알레르기 설정 조회
- `POST /api/users/me/allergens`        - 알레르기 등록
- `PUT  /api/users/me/allergens/:id`    - 알레르기 수정
- `DELETE /api/users/me/allergens/:id`  - 알레르기 삭제

## 단체 (Organization)
- `GET  /api/organizations?q=검색어&type=school` - 단체 검색
  - `type` 파라미터: school / company / welfare / military / other
  - school 유형인 경우 NEIS API 연동으로 학교 정보 조회 가능
- `POST /api/users/me/organization`              - 내 소속 단체 등록
- `DELETE /api/users/me/organization`            - 소속 단체 해제

## 급식
- `GET  /api/meals?orgId=&date=`          - 날짜별 급식 조회
- `GET  /api/meals?orgId=&month=`         - 월간 급식 조회
- `GET  /api/meals/:id`                   - 급식 상세
- `GET  /api/meals/:id/allergen-check`    - 본인 알레르기 대조 결과
- `GET  /api/users/me/alternate-meals?date=` - 본인 대체 식단 조회

## 설문·투표
- `GET  /api/surveys?mealPlanId=`         - 설문 목록
- `GET  /api/surveys/:id`                 - 설문 상세
- `POST /api/surveys/:id/responses`       - 설문 응답·투표 (1인 1표, 마감 전 변경 가능)

## 알림
- `GET  /api/notifications`                      - 알림 목록
- `PUT  /api/notifications/:id/read`             - 읽음 처리
- `PUT  /api/notifications/settings`             - 수신 채널·시간 설정
- `POST /api/notifications/web-push/subscribe`   - Web Push 구독 등록

## NEIS 연동
- `GET  /api/neis/meals?schoolCode=&date=`       - NEIS 급식 이력 조회 (AI 식단 생성 참고용)
