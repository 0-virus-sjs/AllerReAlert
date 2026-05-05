import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/node'
import { logger } from '../../lib/logger'
import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from './provider'

const MODEL        = 'claude-sonnet-4-6'
const MAX_TOKENS   = 4096
const TIMEOUT_MS   = 30_000

export const claudeAdapter: AIProvider = {
  name: 'claude',

  async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<AICompletionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경 변수 미설정')

    const client = new Anthropic({ apiKey })

    const systemMsg = messages.find((m) => m.role === 'system')
    const chatMsgs  = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const start = Date.now()

    try {
      const response = await client.messages.create(
        {
          model:      MODEL,
          max_tokens: options.maxTokens ?? MAX_TOKENS,
          ...(systemMsg && { system: systemMsg.content }),
          messages:   chatMsgs,
          ...(options.temperature !== undefined && { temperature: options.temperature }),
        },
        { timeout: options.timeoutMs ?? TIMEOUT_MS },
      )

      const block = response.content[0]
      const content = block.type === 'text' ? block.text : ''
      const usage = {
        inputTokens:  response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
      const elapsed = Date.now() - start

      logger.info({ model: MODEL, ...usage, elapsedMs: elapsed }, '[T-060] Claude 응답 완료')
      Sentry.addBreadcrumb({
        category: 'ai.claude',
        message:  'Claude API call',
        data:     { model: MODEL, ...usage, elapsedMs: elapsed },
        level:    'info',
      })

      return { content, usage }
    } catch (err) {
      logger.error({ err, elapsedMs: Date.now() - start }, '[T-060] Claude API 오류')
      throw err
    }
  },
}
