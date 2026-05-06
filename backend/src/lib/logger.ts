import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  // stdout 출력 → Railway가 자동 수집
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
  // 민감정보 마스킹 (NFR-SEC-001)
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'email',
      'phone',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.email',
      '*.phone',
      '*.allergens',
      '*.allergenCode',
      '*.encryptedAllergen',
    ],
    censor: '[REDACTED]',
  },
})
