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
    .toBe('auto')

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

  await page.waitForTimeout(240)

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
