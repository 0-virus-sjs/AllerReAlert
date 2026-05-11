import { GoogleGenerativeAI } from '@google/generative-ai'
import * as Sentry from '@sentry/node'
import { logger } from '../../lib/logger'
import type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from './provider'

const MODEL      = 'gemini-1.5-pro'
const MAX_TOKENS = 4096

export const googleAdapter: AIProvider = {
  name: 'google',

  async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<AICompletionResult> {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('GOOGLE_API_KEY 환경 변수 미설정')

    const client = new GoogleGenerativeAI(apiKey)

    const systemMsg = messages.find((m) => m.role === 'system')
    const userMsgs  = messages.filter((m) => m.role !== 'system')

    // Gemini는 system instruction을 별도 필드로 받음
    const geminiModel = client.getGenerativeModel({
      model: MODEL,
      ...(systemMsg && { systemInstruction: systemMsg.content }),
    })

    // history(user/model 교대) + 마지막 user 메시지 분리
    const history = userMsgs.slice(0, -1).map((m) => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const lastMsg = userMsgs[userMsgs.length - 1]?.content ?? ''

    const start = Date.now()

    try {
      const chat = geminiModel.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? MAX_TOKENS,
          ...(options.temperature !== undefined && { temperature: options.temperature }),
        },
      })

      const result  = await chat.sendMessage(lastMsg)
      const content = result.response.text()
      const usage   = {
        inputTokens:  result.response.usageMetadata?.promptTokenCount     ?? 0,
        outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      }
      const elapsed = Date.now() - start

      logger.info({ model: MODEL, ...usage, elapsedMs: elapsed }, '[AI] Google Gemini 응답 완료')
      Sentry.addBreadcrumb({
        category: 'ai.google',
        message:  'Google Gemini API call',
        data:     { model: MODEL, ...usage, elapsedMs: elapsed },
        level:    'info',
      })

      return { content, usage }
    } catch (err) {
      logger.error({ err, elapsedMs: Date.now() - start }, '[AI] Google Gemini API 오류')
      throw err
    }
  },
}
