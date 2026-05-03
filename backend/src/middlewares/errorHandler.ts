import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { sendError } from './response'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message)
    return
  }

  if (err instanceof ZodError) {
    const first = err.issues[0]
    sendError(res, 400, 'VALIDATION_ERROR', first?.message ?? 'Validation failed')
    return
  }

  console.error(err)
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Internal server error')
}
