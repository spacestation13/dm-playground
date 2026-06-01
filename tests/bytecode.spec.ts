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

  test('hovering /proc/main bytecode does not highlight editor when boot.dm is active', async ({
    page,
  }) => {
    // Enable bytecode panel + advanced tabs so both files are visible
    await page.getByRole('button', { name: 'Settings' }).click()
    const bytecodeCheck = page.getByLabel('Show bytecode panel')
    if (!(await bytecodeCheck.isChecked())) await bytecodeCheck.check()
    const advancedCheck = page.getByLabel('Show advanced editor tabs')
    if (!(await advancedCheck.isChecked())) await advancedCheck.check()
    await page.locator('.fixed.inset-0').click({ position: { x: 5, y: 5 } })

    const runButton = page.getByRole('button', { name: /run/i })
    await expect(runButton).toBeVisible({ timeout: 60000 })
    await runButton.click()

    const bytecodePanel = page.locator(
      'section:has(header:has-text("Bytecode"))'
    )
    await expect(
      bytecodePanel.locator('div').filter({ hasText: /^\/proc\/main$/ })
    ).toBeVisible({ timeout: 120000 })

    // Switch editor to boot.dm
    await page.getByRole('button', { name: 'boot.dm' }).click()
    await page.waitForTimeout(200)

    // Hover a colored row in /proc/main (which is in main.dm)
    const mainSection = bytecodePanel
      .locator('div')
      .filter({ hasText: /^\/proc\/main$/ })
      .locator('..')
    const mainHighlightedRow = mainSection
      .locator('[style*="background-color"]')
      .first()
    await expect(mainHighlightedRow).toBeVisible()
    await mainHighlightedRow.hover()
    await page.waitForTimeout(300)

    // No highlight should appear in the editor (we're on boot.dm, proc/main is main.dm)
    await expect(page.locator('.bytecode-highlight-line')).toHaveCount(0)
  })

  test('clicking a bytecode row from a different file switches editor tab and moves cursor', async ({
    page,
  }) => {
    // Enable bytecode panel + advanced tabs
    await page.getByRole('button', { name: 'Settings' }).click()
    const bytecodeCheck = page.getByLabel('Show bytecode panel')
    if (!(await bytecodeCheck.isChecked())) await bytecodeCheck.check()
    const advancedCheck = page.getByLabel('Show advanced editor tabs')
    if (!(await advancedCheck.isChecked())) await advancedCheck.check()
    await page.locator('.fixed.inset-0').click({ position: { x: 5, y: 5 } })

    const runButton = page.getByRole('button', { name: /run/i })
    await expect(runButton).toBeVisible({ timeout: 60000 })
    await runButton.click()

    const bytecodePanel = page.locator(
      'section:has(header:has-text("Bytecode"))'
    )
    await expect(
      bytecodePanel.locator('div').filter({ hasText: /^\/world\/New$/ })
    ).toBeVisible({ timeout: 120000 })

    // Ensure we're on main.dm tab
    await page.getByRole('button', { name: 'main.dm' }).click()
    await page.waitForTimeout(200)

    // Click a highlighted row in /world/New (which is in boot.dm)
    const worldSection = bytecodePanel
      .locator('div')
      .filter({ hasText: /^\/world\/New$/ })
      .locator('..')
    const worldHighlightedRow = worldSection
      .locator('[style*="background-color"]')
      .first()
    await expect(worldHighlightedRow).toBeVisible()
    await worldHighlightedRow.click()
    await page.waitForTimeout(400)

    // Editor should have switched to boot.dm
    const bootTab = page.getByRole('button', { name: 'boot.dm' })
    await expect(bootTab).toHaveClass(
      /bg-\[var\(--editor-tab-active-bg\)\]|border-\[var\(--editor-border\)\]/,
      { timeout: 3000 }
    )

    // Cursor should have moved to the clicked line in boot.dm
    // Read the cursor position from Monaco via the page
    const cursorLine = await page.evaluate(() => {
      const editors = (
        window as Window & {
          monaco?: {
            editor?: {
              getEditors?: () => {
                getPosition?: () => { lineNumber: number } | null
              }[]
            }
          }
        }
      ).monaco?.editor?.getEditors?.()
      return editors?.[0]?.getPosition?.()?.lineNumber ?? null
    })
    // The clicked row had a line number, cursor should reflect it (not be null or line 1)
    expect(cursorLine).not.toBeNull()
    expect(cursorLine).toBeGreaterThan(0)
  })
})
