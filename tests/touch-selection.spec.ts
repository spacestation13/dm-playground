import { expect, test } from '@playwright/test'

test('touch-capable devices enable Monaco text selection affordances', async ({
  browserName,
  isMobile,
  page,
}) => {
  test.skip(browserName !== 'chromium', 'CDP touch injection is Chromium-only')
  test.skip(!isMobile, 'This regression only applies to touch-capable projects')

  await page.goto('/')

  const editor = page.locator('.monaco-editor').first()
  const shell = page.locator('.dm-editor-shell').first()
  const viewLines = page.locator('.monaco-editor .view-lines').first()

  await expect(editor).toBeVisible()
  await expect(shell).toHaveClass(/dm-editor-shell-touch/)
  await expect(viewLines).toBeVisible()
  await expect
    .poll(() =>
      viewLines.evaluate(
        (element) => window.getComputedStyle(element).userSelect
      )
    )
    .not.toBe('none')
  await expect
    .poll(() =>
      viewLines.evaluate(
        (element) => window.getComputedStyle(element).touchAction
      )
    )
    .toBe('pan-y')

  const bounds = await viewLines.boundingBox()
  expect(bounds).not.toBeNull()

  const target = bounds!
  const startX = Math.round(target.x + 36)
  const endX = Math.round(target.x + 164)
  const y = Math.round(target.y + 12)
  const cdp = await page.context().newCDPSession(page)

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      {
        id: 1,
        x: startX,
        y,
        radiusX: 2,
        radiusY: 2,
        force: 1,
      },
    ],
  })

  await page.waitForTimeout(360)

  for (let step = 1; step <= 6; step += 1) {
    const progress = step / 6
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          id: 1,
          x: Math.round(startX + (endX - startX) * progress),
          y,
          radiusX: 2,
          radiusY: 2,
          force: 1,
        },
      ],
    })
    await page.waitForTimeout(16)
  }

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })

  await expect(
    page.locator('.monaco-editor .selected-text').first()
  ).toBeVisible()

  const selectedTextCount = await page
    .locator('.monaco-editor .selected-text')
    .count()
  expect(selectedTextCount).toBeGreaterThan(0)
})

test('touch-capable devices allow draft editing of inline numeric settings', async ({
  browserName,
  isMobile,
  page,
}) => {
  test.skip(browserName !== 'chromium', 'CDP touch injection is Chromium-only')
  test.skip(!isMobile, 'This regression only applies to touch-capable projects')

  await page.goto('/')

  const fontSizeInput = page.getByLabel('Font size')
  const tabSizeInput = page.getByLabel('Tab size')

  await expect(fontSizeInput).toBeVisible()
  await expect(tabSizeInput).toBeVisible()

  await fontSizeInput.fill('')
  await expect(fontSizeInput).toHaveValue('')
  await fontSizeInput.pressSequentially('1')
  await expect(fontSizeInput).toHaveValue('1')
  await fontSizeInput.pressSequentially('4')
  await expect(fontSizeInput).toHaveValue('14')
  await fontSizeInput.blur()
  await expect(fontSizeInput).toHaveValue('14')

  await tabSizeInput.fill('8')
  await expect(tabSizeInput).toHaveValue('8')
  await tabSizeInput.press('Backspace')
  await expect(tabSizeInput).toHaveValue('')
  await tabSizeInput.pressSequentially('4')
  await expect(tabSizeInput).toHaveValue('4')
  await tabSizeInput.blur()
  await expect(tabSizeInput).toHaveValue('4')
})
