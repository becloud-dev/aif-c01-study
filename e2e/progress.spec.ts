import { expect, htmxIdle, test } from './fixtures'

test('a topic can be marked complete and it is remembered', async ({ page }) => {
  await page.goto('/study/ai-ml-dl/')
  await htmxIdle(page)
  await page.getByRole('button', { name: 'Mark as complete' }).click()
  await expect(page.getByText('Completed')).toBeVisible()
  await page.reload()
  await htmxIdle(page)
  await expect(page.getByText('Completed')).toBeVisible()

  await page.goto('/study/')
  await htmxIdle(page)
  await expect(page.getByText('1 of 2 topics complete')).toBeVisible()
})

test('a completed topic can be marked not complete', async ({ page }) => {
  await page.goto('/study/ai-ml-dl/')
  await htmxIdle(page)
  await page.getByRole('button', { name: 'Mark as complete' }).click()
  await page.getByRole('button', { name: 'Mark as not complete' }).click()
  await expect(page.getByRole('button', { name: 'Mark as complete' })).toBeVisible()
})
