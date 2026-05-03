import { Response } from 'express'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    page?: number
    limit?: number
    total?: number
    [key: string]: unknown
  }
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse['meta']
): void => {
  const body: ApiResponse<T> = { success: true, data }
  if (meta) body.meta = meta
  res.status(statusCode).json(body)
}

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void => {
  const body: ApiResponse = { success: false, error: { code, message } }
  res.status(statusCode).json(body)
}
