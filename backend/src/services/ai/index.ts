import { claudeAdapter } from './claude.adapter'
import { openaiAdapter } from './openai.adapter'
import type { AIProvider } from './provider'

export * from './provider'
export { claudeAdapter } from './claude.adapter'
export { openaiAdapter } from './openai.adapter'

/**
 * 환경 변수 AI_PROVIDER 기준으로 어댑터 선택.
 * 기본값: claude. 폴백: openai.
 */
export function getAIProvider(): AIProvider {
  return process.env.AI_PROVIDER === 'openai' ? openaiAdapter : claudeAdapter
}
