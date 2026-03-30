import { expect, test } from '@playwright/test'
import { brotliCompressSync } from 'node:zlib'

const toBase64Url = (value: Buffer) =>
  value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')

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

test('embed mode Run Code works with the real worker', async ({ page }) => {
  test.setTimeout(120000)
  test.slow()

  const project = {
    v: 1,
    f: {
      main: `/proc/main()\n\tworld.log << "playwright-ok"\n`,
      bootstrap: `/world/New()\n\t..()\n\tcall(/proc/main)()\n\teval("")\n\tshutdown()\n`,
    },
  }
  const params = new URLSearchParams({
    embed: '1',
  })
  const hashPayload = toBase64Url(
    brotliCompressSync(Buffer.from(JSON.stringify(project)))
  )

  const pageErrors: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.stack || error.message)
  })

  await page.goto(`/?${params.toString()}#${hashPayload}`)

  const runButton = page.getByRole('button', { name: 'Run Code' })
  await expect(runButton).toBeVisible()
  await runButton.click()

  await expect(runButton).toBeEnabled({ timeout: 30000 })
  await expect(
    page.locator('div.whitespace-pre-wrap').getByText('playwright-ok')
  ).toBeVisible({
    timeout: 30000,
  })

  expect(pageErrors).toEqual([])
})
