import { defineConfig } from 'vitest/config'

export default defineConfig({
  // e2e/*.spec.ts are Playwright's (npm run e2e), not Vitest's.
  test: { include: ['tests/**/*.test.ts'] },
})
