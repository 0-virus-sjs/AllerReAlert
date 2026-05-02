// AI 어댑터 - Claude / OpenAI 공통 인터페이스
// 여러 AI 모델을 교체 가능하게 추상화

// 주요 기능:
//   - parseIngredients(rawText)    → 급식 원재료 텍스트를 알레르기 성분 배열로 파싱
//   - generateAlertMessage(data)   → 알림 메시지 자연어 생성
//   - classifyAllergen(ingredient) → 성분 → 알레르기 항목 분류

// 환경변수:
//   AI_PROVIDER=claude | openai
//   ANTHROPIC_API_KEY=...
//   OPENAI_API_KEY=...

// TODO: Claude(Anthropic SDK) 어댑터 구현
// TODO: OpenAI 어댑터 구현
// TODO: 공통 인터페이스(AIAdapter)로 추상화

export {}
