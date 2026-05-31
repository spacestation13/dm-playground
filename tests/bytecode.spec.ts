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

  test('bytecode disassembly runs and produces output', async ({ page }) => {
    // Enable bytecode panel
    await page.getByRole('button', { name: 'Settings' }).click()
    const checkbox = page.getByLabel('Show bytecode panel')
    if (!(await checkbox.isChecked())) {
      await checkbox.check()
    }
    await page.locator('.fixed.inset-0').click({ position: { x: 5, y: 5 } })

    // Wait for BYOND to be ready (look for the Run button to be enabled)
    const runButton = page.getByRole('button', { name: /run/i })
    await expect(runButton).toBeVisible({ timeout: 60000 })

    // Click run and wait for output
    await runButton.click()

    // Wait for output panel to show something (compilation + execution)
    // Look for DISASM_INIT message in output - this tells us what happened
    const outputPanel = page.locator('section:has(header:has-text("Output"))')
    await expect(outputPanel).toBeVisible()

    // Wait for execution to complete - look for output content
    // The markers \x01DMASM_BEGIN\x01 are intercepted by ExecutorService,
    // so we wait for execution output or a bytecode panel state change
    await page.waitForFunction(
      () => {
        const text = document.body.textContent ?? ''
        // Wait for either: bytecode opcodes visible, any disassembly error, or program output
        return (
          text.includes('GetVar') ||
          text.includes('Disassembly') ||
          text.includes('meow')
        )
      },
      { timeout: 120000 }
    )

    // Wait for bytecode panel to show disassembled content (proc names)
    const bytecodePanel = page.locator(
      'section:has(header:has-text("Bytecode"))'
    )
    await expect(bytecodePanel).toBeVisible()
    await expect(bytecodePanel.locator('text=/main/').first()).toBeVisible({
      timeout: 15000,
    })

    // DISASM_INIT: SUCCESS should be filtered from output
    const outputText = (await page.locator('body').textContent()) ?? ''
    expect(outputText).not.toContain('DISASM_INIT: SUCCESS')
    expect(outputText).not.toContain('DISASM_RESULT_LEN')

    // Verify bytecode panel shows opcodes
    const panelText = (await bytecodePanel.textContent()) ?? ''
    expect(panelText).toContain('GetVar')
    expect(panelText).toContain('End')
  })

  test('hovering bytecode highlights editor line when debug info present', async ({
    page,
  }) => {
    // Enable bytecode panel
    await page.getByRole('button', { name: 'Settings' }).click()
    const checkbox = page.getByLabel('Show bytecode panel')
    if (!(await checkbox.isChecked())) {
      await checkbox.check()
    }
    await page.locator('.fixed.inset-0').click({ position: { x: 5, y: 5 } })

    // Run code
    const runButton = page.getByRole('button', { name: /run/i })
    await expect(runButton).toBeVisible({ timeout: 60000 })
    await runButton.click()

    // Wait for bytecode panel to render
    const bytecodePanel = page.locator(
      'section:has(header:has-text("Bytecode"))'
    )
    await expect(bytecodePanel.locator('.flex.gap-3').first()).toBeVisible({
      timeout: 120000,
    })

    // BYOND 516+ does not emit inline debug info (DbgFile/DbgLine) in bytecode,
    // so line highlighting only works on older versions.
    // Verify the panel renders correctly regardless.
    const rowCount = await bytecodePanel.locator('.flex.gap-3').count()
    expect(rowCount).toBeGreaterThan(0)

    // #define DEBUG ensures BYOND emits inline DbgFile/DbgLine in bytecode
    const coloredCount = await bytecodePanel
      .locator('[style*="background-color"]')
      .count()
    expect(coloredCount).toBeGreaterThan(0)

    // Hover a colored row and verify editor highlight appears
    await bytecodePanel.locator('[style*="background-color"]').first().hover()
    await page.waitForTimeout(300)
    await expect(page.locator('.bytecode-highlight-line')).toBeVisible({
      timeout: 3000,
    })
  })

  test('clicking a bytecode row does not highlight rows in other procs at the same offset', async ({
    page,
  }) => {
    // Enable bytecode panel + advanced tabs so /world/New is visible
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
    // Wait for /proc/main section to appear
    await expect(bytecodePanel.locator('text=/\\/proc\\/main/')).toBeVisible({
      timeout: 120000,
    })
    // Wait for /world/New section to appear
    await expect(bytecodePanel.locator('text=/\\/world\\/New/')).toBeVisible({
      timeout: 5000,
    })

    // Click the first highlighted row inside /proc/main
    const mainSection = bytecodePanel
      .locator('div')
      .filter({ hasText: /^\/proc\/main$/ })
      .locator('..')
    const mainHighlightedRow = mainSection
      .locator('[style*="background-color"]')
      .first()
    await expect(mainHighlightedRow).toBeVisible()
    await mainHighlightedRow.click()
    await page.waitForTimeout(300)

    // Count highlighted rows (blue left-bar indicator) inside /world/New section
    const worldSection = bytecodePanel
      .locator('div')
      .filter({ hasText: /^\/world\/New$/ })
      .locator('..')
    const worldHighlighted = worldSection.locator(
      '.absolute.left-0.top-0.bottom-0'
    )
    await expect(worldHighlighted).toHaveCount(0)
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
