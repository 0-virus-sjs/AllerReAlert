import { logger } from '../../lib/logger'
import { googleAdapter } from './google.adapter'
import { openaiAdapter } from './openai.adapter'
import { claudeAdapter } from './claude.adapter'
import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from './provider'

export * from './provider'
export { googleAdapter } from './google.adapter'
export { claudeAdapter } from './claude.adapter'
export { openaiAdapter } from './openai.adapter'

// 키 미설정 오류는 즉시 skip, API 오류만 다음 provider로 넘김
function isKeyMissing(err: unknown): boolean {
  return err instanceof Error && err.message.includes('환경 변수 미설정')
}

function createFallbackProvider(providers: AIProvider[]): AIProvider {
  return {
    name: providers.map((p) => p.name).join('→'),

    async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<AICompletionResult> {
      let lastErr: unknown

      for (const p of providers) {
        try {
          return await p.complete(messages, options)
        } catch (err) {
          lastErr = err
          if (isKeyMissing(err)) {
            logger.debug({ provider: p.name }, 'AI provider: 키 미설정, 다음 provider로 skip')
          } else {
            logger.warn({ provider: p.name, err }, 'AI provider: 호출 실패, 다음 provider로 fallback')
          }
        }
      }

      throw lastErr
    },
  }
}

/**
 * Google Gemini 우선, OpenAI → Claude 순으로 fallback.
 * 키 미설정 provider는 즉시 skip, API 오류는 경고 후 fallback.
 */
export function getAIProvider(): AIProvider {
  return createFallbackProvider([googleAdapter, openaiAdapter, claudeAdapter])
}
