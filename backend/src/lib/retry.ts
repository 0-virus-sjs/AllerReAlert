import { logger } from './logger'

/**
 * 지수 백오프 재시도 (실패 시 1s → 2s → 4s 대기 후 재시도, 최대 maxRetries회)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, label = 'job' }: { maxRetries?: number; label?: string } = {}
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        logger.warn({ err, attempt: attempt + 1, delay, label }, `[retry] 재시도 ${attempt + 1}/${maxRetries}`)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}
