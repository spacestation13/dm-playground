import { expect, test } from '@playwright/test'

test.describe('bytecode panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'load' })
    // Wait for the app to load
    await expect(page.locator('.monaco-editor').first()).toBeVisible()
  })

  test('panel toggle shows and hides bytecode panel', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click()

    const checkbox = page.getByLabel('Show bytecode panel')

    // Uncheck if checked
    if (await checkbox.isChecked()) {
      await checkbox.uncheck()
    }
    // Close settings
    await page.locator('.fixed.inset-0').click({ position: { x: 5, y: 5 } })

    // Bytecode panel should not be visible
    await expect(page.locator('text=Bytecode')).toHaveCount(0)

    // Open settings and enable
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByLabel('Show bytecode panel').check()
    await page.locator('.fixed.inset-0').click({ position: { x: 5, y: 5 } })

    // Bytecode panel should now be visible
    await expect(page.locator('header:has-text("Bytecode")')).toBeVisible()
  })
})
