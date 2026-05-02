M1 시작. M0 결과물 위에 진행한다.

M1 9개 Task(T-010~T-018) 진행 순서를 선행 관계 기준으로 정렬해서
표로 보여달라. OK 하면 시작.

특별 주의:
- 모든 모델은 schema.prisma 추가 후 `prisma migrate dev --name <설명>`.
- Task 하나당 마이그레이션 하나 원칙.
- T-011: UserAllergen은 컬럼 레벨 AES-256. lib/crypto.ts 헬퍼부터 + 단위 테스트.
- T-017: 시드 스크립트는 idempotent.
- T-018: pg_dump 백업 잡은 코드만, 외부 스토리지는 옵션 물어본다.

완료 기준:
- prisma studio에서 모든 테이블 + 시드 데이터 확인
- 알레르기 19종 + 샘플 학교 1곳 + 테스트 계정 5종
