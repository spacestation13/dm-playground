import { expect, test } from '@playwright/test'

test('full mode advanced editor tabs are hidden by default', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'main.dm' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'bootstrap.dm' })).toHaveCount(
    0
  )

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Show advanced editor tabs').check()

  await expect(page.getByRole('button', { name: 'main.dm' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'bootstrap.dm' })).toBeVisible()
})
