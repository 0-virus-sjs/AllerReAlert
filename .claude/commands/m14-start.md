M14 시작. 모든 기능 마일스톤 완료 위에 진행한다.

M14 12개 Task(T-149~T-160) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-149: MealPlanPage의 `CalendarView` 타입과 slider 분기 코드 전부 제거. 달력 고정. 기존 달력의 날짜별 식단 표시(메뉴 미리보기)는 유지. 날짜 클릭 시 하단 또는 우측에 상세·편집 패널이 열리는 구조로 재편. AIMealPlanPage·AlternateMealPage로의 navigate 호출은 이 Task에서 제거하지 말고 T-154·T-155·T-158에서 처리.
- T-150: 기존 `CalendarDayLevel` 4단계를 7단계로 확장(`no-meal` / `draft` / `ai-draft` / `published` / `needs-review` / `needs-alt` / `has-alt`). MonthlyMealCalendar props 변경이 MealPlanPage 외 다른 호출부에 영향 없는지 확인.
- T-151: 기존 `GET /meals?school_id=&month=` 응답에 `calendarStatus` 맵을 추가하거나 별도 `GET /meals/calendar-status?month=` 엔드포인트를 추가. 응답 구조: `{ date: string, status: string, hasAlternate: boolean, conflictCount: number, affectedStudents: number }[]`. 기존 T-034 listMealsHandler 재사용 우선.
- T-152: T-051 allergy-engine/engine.ts의 `runAllergenCheck`는 단건·단일 날짜 대상. 월간 일괄 계산 버전을 같은 서비스 파일 안에 추가(`runMonthlyConflictScan`). published·draft 모두 포함, 상태별 분리 필요 시 파라미터로 제어.
- T-153: 패널은 달력 하단 고정 영역(데스크톱은 우측 패널 가능)으로 구현. 다른 날짜 클릭 시 패널이 닫히지 않고 내용만 전환. 패널 안에 저장/공개 버튼, 메뉴 목록, 알레르기 태그 포함. T-149에서 만든 날짜 선택 상태를 그대로 사용.
- T-154: AIMealPlanPage에서 사용 중인 `POST /ai/generate-meal-plan` 호출 로직과 GeneratedMealGrid 컴포넌트를 패널 안으로 이식. 생성 결과 저장 후 T-157의 재계산 트리거. AIMealPlanPage 라우트 제거는 T-158에서 처리.
- T-155: `needsAlt` 또는 `hasAlt` 상태일 때만 대체식단 작성 섹션 렌더링. 그 외 날짜에서는 DOM에서 완전히 숨김(CSS hidden 금지, 조건부 렌더링). AlternateMealPage의 CreateAlternateModal·AlternatePlanCard 재사용.
- T-156: 충돌 정보(문제 메뉴명, 알레르기 항목, 영향 학생 수)는 T-152 API에서 받아온 값을 그대로 표시. 학생 목록은 접이식. 색상은 기존 `danger` 레벨과 통일.
- T-157: 저장·공개 성공 후 `queryClient.invalidateQueries(['meals', month])`와 달력 상태 쿼리 양쪽 무효화. 백엔드는 별도 처리 불필요 — T-151 API가 항상 최신 DB 기준으로 응답하면 충분.
- T-158: AIMealPlanPage·AlternateMealPage 라우트는 직접 URL 접근 시 MealPlanPage로 리다이렉트. 컴포넌트 파일 삭제는 T-154·T-155에서 재사용이 완료된 뒤에만.
- T-159: 기존 e2e 테스트 구조 확인 후 Playwright 시나리오 5개 작성. CI 통과 확인.
- T-160: `docs/uat-checklist.md` 파일이 없으면 신규 생성. M14 달력 UX 관련 항목만 추가.

완료 기준:
- 영양사 로그인 → 식단 관리 진입 시 달력만 표시(슬라이더 버튼 없음)
- 날짜 클릭 → 해당 날짜 식단 패널이 페이지 이동 없이 열림
- 달력 날짜 셀에 7단계 상태 배지 표시
- AI 식단 생성이 패널 안에서 완료됨(AIMealPlanPage로 이동 없음)
- 알레르기 충돌 없는 날짜에서 대체식단 UI 미노출 확인
- 대체식단 필요 날짜에서 대체식단 작성 UI 노출 + 저장 후 달력 상태 갱신 확인
- 식단 저장 후 달력 상태가 자동 갱신됨
