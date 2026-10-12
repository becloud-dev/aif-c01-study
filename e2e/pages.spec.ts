import { expect, test } from './fixtures'

const PAGES = ['/', '/study/', '/study/ai-ml-dl/', '/questions/', '/questions/q001/', '/exam/']

test.describe('static pages', () => {
  for (const path of PAGES) {
    test(`${path} renders without console errors`, async ({ page }) => {
      const problems: string[] = []
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
      page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page).toHaveTitle(/.+/)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(problems).toEqual([])
    })
  }

  test('an unknown path shows the 404 page', async ({ page }) => {
    const res = await page.goto('/nope/')
    expect(res?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  })
})
