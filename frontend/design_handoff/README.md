# Handoff: AllerReAlert — 학교급식 알레르기 관리 시스템 웹 UI

## Overview

AllerReAlert는 학교급식에서 알레르기 보유 학생·교직원의 안전을 보장하고, 영양사의 식단 작성 업무를 AI로 보조하며, 대체식 수요를 설문·투표로 자동 집계하는 웹 애플리케이션입니다.

이 핸드오프 패키지는 Claude Code가 실제 프론트엔드 코드를 구현할 때 참고할 **와이어프레임 디자인 레퍼런스**입니다.

---

## About the Design Files

`wireframes/AllerReAlert Wireframes.html` 파일은 **HTML로 작성된 디자인 레퍼런스(와이어프레임)**입니다. 이 파일을 그대로 프로덕션에 사용하는 것이 아니라, 기존 레포지토리(`sjsong03036-sudo/AllerReAlert`)의 **React + TypeScript + React Bootstrap** 환경에서 동일한 레이아웃과 UX 흐름을 재현하는 것이 목표입니다.

---

## Fidelity

**Low-fidelity (Lo-fi) 와이어프레임**

레이아웃 구조, 컴포넌트 배치, 네비게이션 흐름, 색상 팔레트의 방향성을 보여주는 와이어프레임입니다. 개발 시 아래 사항을 참고하세요:

- 레이아웃과 컴포넌트 구조는 와이어프레임을 충실히 따릅니다
- 스타일링은 기존 코드베이스의 React Bootstrap + 커스텀 CSS를 활용합니다
- 색상 팔레트는 아래 Design Tokens를 참고합니다

---

## Tech Stack (기존 레포 기준)

| 영역 | 기술 |
|------|------|
| Framework | React 18, TypeScript |
| Bundler | Vite |
| UI Library | React Bootstrap, Bootstrap 5 |
| 상태관리 | Zustand |
| 서버 상태 | TanStack Query |
| HTTP | Axios |
| 라우팅 | React Router |

---

## Design Tokens

### 색상 팔레트

```css
/* 메인 팔레트 (ColorHunt #F9B2D7-#CFECF3-#DAF9DE-#F6FFDC) */
--color-sky:     #CFECF3;   /* Primary: 버튼, 사이드바, 탭 active, 헤더 */
--color-pink:    #F9B2D7;   /* 알레르기 경고 배경 (연한) */
--color-mint:    #DAF9DE;   /* 성공/대체식 확정 배경 */
--color-cream:   #F6FFDC;   /* 전체 페이지 배경 */

/* 텍스트 */
--color-ink:     #3A3030;   /* 기본 텍스트 */
--color-muted:   #7A6070;   /* 보조 텍스트, 라벨 */
--color-placeholder: #888;  /* 입력 placeholder */

/* 알레르기 경고 */
--color-alert-bg:     #FDDDE8;  /* 경고 배경 */
--color-alert-border: #E06080;  /* 경고 테두리 */
--color-alert-text:   #C04060;  /* 경고 텍스트 */

/* 상태 */
--color-success:  #5DBD6A;  /* 확정/성공 badge */
--color-danger:   #F97B8B;  /* 삭제/반려 버튼 */
--color-warning:  #E88FAA;  /* 진행중 badge */

/* 사이드바 (진한 하늘) */
--color-sidebar-bg:     #CFECF3;
--color-sidebar-active: rgba(255,255,255,0.18);
--color-sidebar-border: #A8D8E8;

/* 선택/primary 검은색 (체크박스, 설문 선택) */
--color-selected: #3A3030;
```

### 폰트

```css
--font-body:  'Noto Sans KR', 'Noto Sans', sans-serif;
--font-logo:  'Caveat', cursive;           /* AllerReAlert 로고 전용 */
--font-mono:  'IBM Plex Mono', monospace;  /* 수치, 날짜, 코드 */
```

### 폰트 사이즈

```css
--text-xs:   9px;
--text-sm:   10px;
--text-base: 11px;
--text-md:   12px;
--text-lg:   13px;
--text-xl:   14px;
--text-2xl:  16px;
--text-3xl:  22px;
```

---

## 네비게이션 구조

### 역할별 레이아웃 분리

| 역할 | 네비게이션 패턴 |
|------|----------------|
| 학생 / 교직원 | 상단 탭 바 (TopNav) |
| 보호자 | 상단 탭 바 (TopNav) |
| 영양사 | 좌측 사이드바 (SidebarNav) |
| 관리자 | 좌측 사이드바 (SidebarNav) |

### TopNav 탭 구성 (학생/교직원/보호자)

```
[AllerReAlert 로고]  [식단] [알림] [설문] [프로필]  [아바타]
```

- active 탭: `border-bottom: 2px solid #A8D8E8`, `color: #3A7090`
- 로고: Caveat 폰트, 14px

### SidebarNav 구성 (영양사)

```
width: 140px
배경: #CFECF3
items: [대시보드, 식단 작성, AI 생성, 대체 식단, 설문 관리, 수요 집계, 설정]
active item: background rgba(255,255,255,0.18), border-left 2px solid #A8D8E8
```

### SidebarNav 구성 (관리자)

```
items: [학교 관리, 사용자 관리, 알레르기 마스터, 시스템 로그, 설정]
```

---

## Screens / Views

### SCR-001 · 로그인

**목적**: 역할 선택 + 이메일/비밀번호 로그인

**레이아웃**:
- 전체: 중앙 정렬 카드 (max-width: 320px)
- 헤더: `background: #CFECF3`, height 80px, 로고(Caveat 22px) + 서브타이틀
- 바디: padding 20px

**컴포넌트**:
- **역할 탭**: 4개 버튼 그룹 (학생/교직원/보호자/영양사), 선택 시 `background: #CFECF3`, border `#A8D8E8`
- **이메일 입력**: 전체 너비, height 28px, border `#3A3030`
- **비밀번호 입력**: 전체 너비, height 28px
- **로그인 버튼**: primary, 전체 너비, height 32px, `background: #CFECF3`, `color: #3A3030`
- **회원가입 링크**: 하단 중앙

---

### SCR-002 · 회원가입 (3단계)

**목적**: 역할별 가입 폼 (학교코드 인증 포함)

**레이아웃**:
- 헤더: `background: #CFECF3`, height 50px, 제목 + 스텝 인디케이터(3개 원)
- 스텝 인디케이터: 원 지름 22px, 완료 `#CFECF3`, 미완료 `rgba(255,255,255,0.15)`

**3단계 구성**:
1. **기본 정보**: 이름, 이메일, 비밀번호, 학교코드 인증, 학년/반
2. **알레르기 등록**: 19종 체크리스트 + 기타 입력
3. **완료**: 확인 화면

---

### SCR-003 · 이용자 대시보드

**목적**: 오늘 급식 알레르기 요약 + 미응답 설문 표시

**레이아웃** (데스크탑):
- TopNav 포함
- 알레르기 경고 배너 (상단 고정)
- 오늘의 급식 카드 (2열 그리드)
- 미응답 설문 카드

**알레르기 경고 배너**:
```css
background: #FDDDE8;
border: 1.5px solid #E06080;
border-radius: 4px;
padding: 8px 12px;
```

**식단 아이템 카드**:
- 정상: `background: #FAFEFF`, border `#D8D4CE`
- 경고: `background: #FDDDE8`, border `#E06080`
- 경고 아이콘: ⚠ 텍스트 + 빨간 계열 색상

**레이아웃** (모바일):
- 상단 헤더 (로고 + 알레르기 뱃지 + 아바타)
- 알레르기 경고 카드
- 오늘 급식 리스트 (1열)
- 미응답 설문 카드
- 하단 탭 바 (홈/식단/설문/알림/내정보)

---

### SCR-004 · 식단 캘린더

**목적**: 월간/주간/일간 식단 조회 + 알레르기 하이라이트

**레이아웃 A** (데스크탑 — 월간 그리드):
- 상단: 월 네비게이션 + 뷰 전환 (일/주/월)
- 범례: 알레르기 포함 `#FDDDE8` / 대체식 `#DAF9DE`
- 7열 그리드 캘린더
  - 알레르기 포함 날짜: `background: #FDDDE8`
  - 대체식 있는 날짜: `background: #DAF9DE`
  - 날짜 클릭 → 상세 팝업

**레이아웃 B** (모바일 — 날짜 선택 + 리스트):
- 주간 날짜 스크롤 바 (선택 날짜: `background: #CFECF3`)
- 선택 날짜의 식단 리스트
- 각 메뉴 카드: 카테고리 + 메뉴명 + 알레르기 뱃지

**알레르기 뱃지**:
```css
background: #FDDDE8;
border: 1px solid #E06080;
color: #C04060;
border-radius: 3px;
padding: 1px 5px;
font-size: 10px;
```

---

### SCR-005 · 알레르기 프로필

**목적**: 19종 알레르기 체크리스트 등록/수정

**레이아웃**:
- 보호자 승인 대기 배너 (해당 시)
- 19종 체크리스트 (flex-wrap)
- 기타 입력 + 추가 버튼
- 저장 버튼

**체크박스 아이템**:
- 미선택: border `#C0BBB4`, background 투명
- 선택됨: border `#3A3030`, background `#3A3030`, 텍스트 흰색
- 승인 대기: border `#E88FAA`, background `#FFF0F5`

---

### SCR-006 · 설문·투표

**목적**: 대체식 필요 여부 + 메뉴 투표 (한 화면)

**레이아웃**:
- Step 1 카드: 대체식 필요 여부 (예/아니오)
  - "예, 필요합니다": `background: #3A3030`, `color: #fff`
  - "아니요": border `#C0BBB4`, 투명
- Step 2 카드 (Step 1 "예" 선택 시 활성): 대체 메뉴 선택
  - 선택된 메뉴: `background: #3A3030`, `color: #fff`
  - 미선택: `background: #FAFEFF`
- 제출 버튼: primary, 전체 너비

---

### SCR-007 · 알림 센터

**목적**: 알림 이력 조회 + 읽음 처리

**알림 타입별 색상**:
```
allergy (알레르기):  #E06080
survey  (설문):      #E88FAA
change  (식단변경):  #5090C0
approval(승인):      #5DBD6A
```

**레이아웃**:
- 헤더: 제목 + 미읽음 뱃지 + 전체읽음 버튼
- 알림 리스트: 색상 dot + 제목 + 내용 + 시간
- 읽음: background `#F8F6F2`, 미읽음: background `#FAFEFF`

---

### SCR-008 · 보호자 승인

**목적**: 자녀 알레르기 정보 승인/반려

**레이아웃**:
- 자녀 정보 카드 (아바타 + 이름/학반 + 요청일)
- 등록 요청 알레르기 뱃지
- 자녀 메모
- 승인/반려 버튼 (반려: `background: #F97B8B`)

---

### SCR-009 · 영양사 대시보드

**목적**: KPI 요약 + 일별 대체식 수요 차트 + 식단 현황

**레이아웃**:
- SidebarNav (140px) + 메인 영역
- KPI 카드 3개 (3열 그리드):
  - 이번 주 대체식 수요 (상단 border: `#E06080`)
  - 미응답 설문 (상단 border: `#E88FAA`)
  - 이번 달 알림 발송 (상단 border: `#5DBD6A`)
- 일별 수요 바 차트 (가로 바, 최댓값 날짜 강조)
- 최근 식단 현황 리스트

---

### SCR-010 · 식단 작성/편집

**목적**: 날짜별 메뉴 구성 입력 + 알레르기 자동 태깅

**레이아웃**:
- SidebarNav + 메인
- 상단: 날짜 탭 스크롤 바
- 메뉴 리스트 (카테고리 | 메뉴명 | 알레르기 뱃지 | 편집 버튼)
- 알레르기 자동 태깅 버튼 (Claude API 호출)
- 임시저장 / 공개 예약 버튼

---

### SCR-011 · AI 식단 생성 (스텝-바이-스텝 마법사)

**목적**: 조건 입력 → AI 초안 생성 → 검토/수정 → 확정

**스텝 인디케이터** (4단계):
- 완료: `background: #CFECF3`, border `#A8D8E8`
- 현재: `background: #CFECF3`, 강조
- 미완료: border `#C0BBB4`, 투명

**4단계**:
1. 조건 설정 (기간, 예산, 계절 식재료, 영양 기준)
2. AI 생성 (30초 이내, 진행 상태 표시)
3. 검토·수정 (날짜별 초안 카드, 알레르기 경고 표시)
4. 확정 (공개 예약 설정)

> ⚠️ AI 생성 식단은 영양사 검토 후 수동 공개. 자동 공개 불가.

---

### SCR-012 · 대체 식단 관리

**목적**: AI 대체 메뉴 제안 확인 + 확정 + 설문 연결

**레이아웃**:
- 날짜별 카드 (알레르기 뱃지 + 대체식 필요 인원 수)
- AI 제안 메뉴 후보 리스트
  - 확정됨: `background: #DAF9DE`, border `#5DBD6A`
  - 미확정: background `#F4F1EC`
- "AI 재제안" 버튼 (dashed border)
- "설문 자동 생성" 버튼 (primary)

---

### SCR-013 · 수요 집계 대시보드

**목적**: 알레르기 보유 이용자 현황 + 일별 대체식 수요 테이블

**레이아웃**:
- 알레르기 유형별 바 차트 (수직)
- 일별 수요 테이블
  - 헤더: `background: #CFECF3`
  - 대체식 필요 수치: `color: #C04060`, fontWeight 600 (최우선 강조)
- CSV / PDF 내보내기 버튼

---

### SCR-014 · 설문 관리 (영양사)

**목적**: 설문 생성/마감/결과 조회

**설문 카드**:
- 제목 + 대상 인원 + 상태 뱃지
- 진행률 바 (진행중: `#E88FAA`, 마감: `#5DBD6A`)
- 응답 수 (IBM Plex Mono)
- 마감 처리 버튼 (danger) / 결과 보기 버튼

---

### SCR-015 · 관리자 패널

**목적**: 학교·사용자·알레르기 마스터·로그 관리

**레이아웃**:
- SidebarNav (관리자용)
- 검색 인풋 + 검색 버튼
- 역할별 필터 탭 (전체/학생/교직원/보호자/영양사)
  - 선택: `background: #CFECF3`
- 사용자 테이블
  - 헤더: `background: #CFECF3`, `color: #3A3030`
  - 행: 이름 / 이메일 / 역할 / 상태 뱃지 / 편집 버튼

---

## Interactions & Behavior

### 알레르기 알림 엔진 (핵심 UX)
- 매일 급식 N시간 전 → 알레르기 보유 이용자에게 푸시/이메일 발송
- 식단 변경 시 → 즉시 재알림
- 알림 클릭 → SCR-007 알림 센터로 이동

### 식단 캘린더
- 날짜 클릭 → 상세 팝업 (메뉴 + 알레르기 툴팁)
- 월/주/일 뷰 전환

### 설문·투표 플로우
- Step 1 "예" 선택 → Step 2 자동 활성화
- 마감 전까지 응답 변경 가능
- 마감 후 변경 불가

### 보호자 승인
- 승인 → 즉시 `confirmed` 상태 전환
- 반려 → 사유 입력 모달 → 자녀에게 알림

### AI 식단 생성
- 30초 이내 생성 (로딩 상태 표시 필수)
- 생성 후 영양사 검토 화면으로 이동
- 직접 공개 버튼 없음 (검토 → 수정 → 확정 단계 필수)

---

## 반응형 대응

| 화면 | 데스크탑 | 모바일 |
|------|---------|--------|
| SCR-003 대시보드 | 상단 탭 + 2열 그리드 | 하단 탭 바 + 1열 리스트 |
| SCR-004 캘린더 | 월간 7열 그리드 | 주간 날짜 스크롤 + 일별 리스트 |
| 영양사 화면 | 사이드바 + 메인 | 햄버거 메뉴 + 풀스크린 |

---

## Files

```
design_handoff_allerrealert/
├── README.md                          ← 이 파일
└── wireframes/
    └── AllerReAlert Wireframes.html   ← 와이어프레임 레퍼런스
```

**참고 레포지토리**: `sjsong03036-sudo/AllerReAlert`
- PRD: `docs/create_prd.md`
- 작업 분해: `docs/Generate_task.md`
- API 명세: `docs/api/README.md`

---

## Notes for Claude Code

1. **기존 코드베이스 우선**: `frontend/src/pages/` 하위에 SCR-001~SCR-015에 대응하는 페이지 컴포넌트를 생성합니다.
2. **컴포넌트 재사용**: `frontend/src/components/domain/`의 `MealCard`, `AllergenBadge` 등 기존 컴포넌트를 최대한 활용합니다.
3. **알레르기 엔진 최우선**: 알레르기 하이라이트 표시 로직은 정확성이 최우선입니다. `confirmed` 상태의 알레르기만 대조에 사용합니다.
4. **역할 기반 라우팅**: React Router에서 역할별 레이아웃(TopNav vs SidebarNav)을 분기 처리합니다.
5. **색상 토큰**: 위의 Design Tokens를 CSS 변수 또는 Tailwind config로 등록하여 사용합니다.
