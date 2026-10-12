import { expect, htmxIdle, test } from './fixtures'

test('a wrong answer says so and shows the rationale', async ({ page }) => {
  await page.goto('/questions/q001/')
  await htmxIdle(page)
  await page.getByLabel(/A\. Build a named-entity/).check()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText('Incorrect')).toBeVisible()
  await expect(page.getByText('The correct answer is B.')).toBeVisible()
  // the rationale is copied out of the page's hidden slot into #feedback and must be visible there
  const feedback = page.locator('#feedback')
  await expect(feedback.getByRole('heading', { name: 'Why' })).toBeVisible()
  await expect(feedback.getByText('Summarisation is a core capability')).toBeVisible()
})

test('a right answer says so', async ({ page }) => {
  await page.goto('/questions/q001/')
  await htmxIdle(page)
  await page.getByLabel(/B\. Use a summarisation/).check()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText('Correct', { exact: true })).toBeVisible()
})

test('the question page never prints the correct option', async ({ page }) => {
  await page.goto('/questions/q001/')
  const html = await page.content()
  expect(html).not.toMatch(/correct\s*[:=]/i)
})
