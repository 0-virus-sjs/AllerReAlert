## Summary

<!-- 변경 내용을 간략히 설명해 주세요 -->

## Test plan

- [ ] 로컬에서 기능 동작 확인
- [ ] `cd backend && npm run lint && npm run typecheck` 통과
- [ ] `cd frontend && npm run lint && npx tsc --noEmit && npm run build` 통과

## .env.example 동기화 체크리스트

- [ ] 새 환경 변수를 추가했는가? → `.env.example`에 키 이름과 형식 추가 여부 확인
- [ ] Railway Variables에 새 키 등록했는가?
- [ ] Vercel Environment Variables에 새 `VITE_*` 키 등록했는가?
- [ ] **시크릿·DB URL·API 키가 코드/커밋에 포함되지 않았는가?**

## 관련 Task

- Task-ID: <!-- T-XXX -->
