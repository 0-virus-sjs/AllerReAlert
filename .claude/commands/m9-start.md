M9 시작. M2 RBAC + M1 DB 스키마 위에 진행한다.

M9 6개 Task(T-090~T-095) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- T-090: org_type enum(school/company/welfare/military/other) 기반 단체 관리.
- T-091: 역할 변경 + 활성/비활성 처리 모두 audit_logs에 before/after 기록.
- T-092: 알레르기 마스터 CRUD는 admin 전용 — RBAC 미들웨어로 보호.
- T-093: 페이지네이션 + 필터(사용자·기간·작업유형) 필수. 1년 보관 정책 반영.
- T-094: 4개 탭(학교 관리/사용자 관리/알레르기 마스터/시스템 로그) CRUD 모달 재사용 컴포넌트로 통일.

완료 기준:
- 관리자 패널 4개 탭 CRUD 정상 동작
- 역할 변경 후 audit_logs에 before/after 기록 확인
- 알레르기 마스터 추가/수정 후 prisma studio 반영 확인
- 시스템 로그 뷰어에서 기간 필터 + CSV 내보내기 확인
