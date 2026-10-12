import { defineConfig, devices } from '@playwright/test'

// User flows in real browsers. The Worker runs in Wrangler's test harness, started by the fixture in
// e2e/fixtures.ts against the Zola build in public/ (`npm run e2e` builds first), so there is no
// webServer here and no Cloudflare credentials are needed.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  // A flaky flow should fail, not be retried away.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 17'] } },
  ],
})
