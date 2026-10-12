import { test as base, expect, type Page } from '@playwright/test'
import { createTestHarness } from 'wrangler'

type Harness = ReturnType<typeof createTestHarness>

/**
 * Every test gets the Worker from Wrangler's test harness at its own URL, serving the Zola build in
 * `public/`. `reset()` may change the port, so `baseURL` is read after it.
 */
export const test = base.extend<object, { harness: Harness }>({
  harness: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright reads a fixture's dependencies from this pattern
    async ({}, use) => {
      const harness = createTestHarness({ workers: [{ configPath: './wrangler.jsonc' }] })
      await harness.listen()
      await use(harness)
      await harness.close()
    },
    { scope: 'worker' },
  ],

  baseURL: async ({ harness }, use) => {
    await harness.reset()
    const { url } = await harness.listen()
    await use(url.href)
  },

  page: async ({ page }, use) => {
    // hx-confirm uses the browser's confirm(); a dialog nobody handles stalls the test.
    page.on('dialog', (dialog) => dialog.accept())
    await use(page)
  },
})

export { expect }

/**
 * Waits until htmx has started and has nothing in flight. A visible element is not enough: htmx is
 * `defer`red and may still be settling a swap, and a click before it is ready does a plain navigation.
 */
export async function htmxIdle(page: Page) {
  await page.waitForFunction(
    () =>
      document.readyState === 'complete' &&
      'htmx' in window &&
      !document.querySelector('.htmx-request, .htmx-swapping, .htmx-settling, .htmx-added'),
  )
}
