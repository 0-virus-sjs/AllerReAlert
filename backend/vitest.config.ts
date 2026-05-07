import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // T-111: 핵심 모듈(알림 엔진·AI 검증·RBAC·보호자·알림 발송)만 측정
      include: [
        'src/services/allergy-engine/**',
        'src/services/ai/validator.ts',
        'src/services/ai/allergen-leak.ts',
        'src/services/guardian/guardian.service.ts',
        'src/services/notification/dispatcher.ts',
        'src/middlewares/requireRole.ts',
        'src/lib/crypto.ts',
        'src/lib/jwt.ts',
      ],
      exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts'],
      thresholds: {
        lines:      90,
        functions:  90,
        branches:   80,
        statements: 90,
      },
    },
  },
})
