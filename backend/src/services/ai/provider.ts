// AI Provider 공통 인터페이스 (T-060)
// 구현체: claudeAdapter (우선), openaiAdapter (폴백)

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AICompletionOptions {
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
}

export interface AIUsage {
  inputTokens: number
  outputTokens: number
}

export interface AICompletionResult {
  content: string
  usage: AIUsage
}

export interface AIProvider {
  readonly name: string
  complete(messages: AIMessage[], options?: AICompletionOptions): Promise<AICompletionResult>
}
