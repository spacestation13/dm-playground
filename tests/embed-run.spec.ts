import { expect, test } from '@playwright/test'

test('embed mode Run Code works with the real worker', async ({ page }) => {
  test.setTimeout(120000)
  test.slow()

  const code = `/world/New()\n\tworld.log << "playwright-ok"\n\t..()\n\tshutdown()\n`
  const params = new URLSearchParams({
    embed: '1',
    code: Buffer.from(code, 'utf8').toString('base64'),
  })

  const pageErrors: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.stack || error.message)
  })

  await page.goto(`/?${params.toString()}`)

  const runButton = page.getByRole('button', { name: 'Run Code' })
  await expect(runButton).toBeVisible()
  await runButton.click()

  await expect(page.locator('pre')).not.toHaveText(
    'Initializing runtime...\n',
    {
      timeout: 30000,
    }
  )

  await expect(runButton).toBeEnabled({ timeout: 30000 })
  await expect(page.locator('pre')).toContainText('playwright-ok', {
    timeout: 30000,
  })

  expect(pageErrors).toEqual([])
})
