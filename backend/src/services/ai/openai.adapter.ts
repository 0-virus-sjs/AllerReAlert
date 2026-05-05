import OpenAI from 'openai'
import * as Sentry from '@sentry/node'
import { logger } from '../../lib/logger'
import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from './provider'

const MODEL      = 'gpt-4o'
const MAX_TOKENS = 4096
const TIMEOUT_MS = 30_000

export const openaiAdapter: AIProvider = {
  name: 'openai',

  async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<AICompletionResult> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY 환경 변수 미설정')

    const client = new OpenAI({
      apiKey,
      timeout: options.timeoutMs ?? TIMEOUT_MS,
    })

    const start = Date.now()

    try {
      const response = await client.chat.completions.create({
        model:      MODEL,
        max_tokens: options.maxTokens ?? MAX_TOKENS,
        messages:   messages.map((m) => ({ role: m.role, content: m.content })),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
      })

      const content = response.choices[0]?.message?.content ?? ''
      const usage = {
        inputTokens:  response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      }
      const elapsed = Date.now() - start

      logger.info({ model: MODEL, ...usage, elapsedMs: elapsed }, '[T-060] OpenAI 응답 완료')
      Sentry.addBreadcrumb({
        category: 'ai.openai',
        message:  'OpenAI API call',
        data:     { model: MODEL, ...usage, elapsedMs: elapsed },
        level:    'info',
      })

      return { content, usage }
    } catch (err) {
      logger.error({ err, elapsedMs: Date.now() - start }, '[T-060] OpenAI API 오류')
      throw err
    }
  },
}
