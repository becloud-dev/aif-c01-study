import { expect, htmxIdle, test } from './fixtures'

test('an exam can be taken from start to report and the report persists', async ({ page }) => {
  await page.goto('/exam/')
  await htmxIdle(page)
  await page.getByRole('button', { name: 'Start exam' }).click()
  await expect(page.getByText(/Question 1 of 2/)).toBeVisible()
  await expect(page.getByText(/Time left/)).toBeVisible()

  await page.getByRole('radio').first().check()
  await expect(page.getByRole('radio').first()).toBeChecked()

  await page.getByRole('button', { name: 'Finish exam' }).click()
  await expect(page.getByRole('heading', { name: /Score \d+ \/ 1000/ })).toBeVisible()
  await expect(page.getByText(/Passed|Not passed/)).toBeVisible()

  await page.reload()
  await htmxIdle(page)
  await expect(page.getByRole('heading', { name: /Score \d+ \/ 1000/ })).toBeVisible()
})

test('a question can be flagged and navigated to', async ({ page }) => {
  await page.goto('/exam/')
  await htmxIdle(page)
  await page.getByRole('button', { name: 'Start exam' }).click()
  await page.getByRole('button', { name: 'Flag for review' }).click()
  await expect(page.getByRole('button', { name: 'Remove flag' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText(/Question 2 of 2/)).toBeVisible()
})
