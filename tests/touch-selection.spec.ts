import { expect, test } from '@playwright/test'

const NATIVE_TOUCH_SELECTION_SELECTOR =
  '[data-dm-native-touch-selection="true"]'

const localSettingsWithConsole = {
  state: {
    themeId: 'vs-dark',
    editor: {
      fontFamily: 'Consolas, "Liberation Mono", Courier, monospace',
      fontSize: 14,
      tabSize: 2,
    },
    streamCompilerOutput: false,
    showConsolePanel: true,
    showAdvancedEditorTabs: false,
  },
  version: 0,
}

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
  await expect(page.locator(NATIVE_TOUCH_SELECTION_SELECTOR)).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate((selector) => {
        const mirror = document.querySelector(selector)
        const selection = window.getSelection()
        if (!(mirror instanceof HTMLElement) || !selection?.anchorNode) {
          return false
        }

        return mirror.contains(selection.anchorNode)
      }, NATIVE_TOUCH_SELECTION_SELECTOR)
    )
    .toBe(true)

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

test('touch drags over Monaco can continue page scroll to lower panels', async ({
  browserName,
  isMobile,
  page,
}) => {
  test.skip(browserName !== 'chromium', 'CDP touch injection is Chromium-only')
  test.skip(!isMobile, 'This regression only applies to touch-capable projects')

  await page.addInitScript((persistedSettings) => {
    window.localStorage.setItem(
      'local-settings',
      JSON.stringify(persistedSettings)
    )
  }, localSettingsWithConsole)

  await page.goto('/')

  const viewLines = page.locator('.monaco-editor .view-lines').first()

  await expect(viewLines).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('.xterm').length))
    .toBeGreaterThan(0)

  const initialMetrics = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
    scrollY: window.scrollY,
    consoleTop: document.querySelector('.xterm')?.getBoundingClientRect().top,
  }))

  expect(initialMetrics.scrollHeight).toBeGreaterThan(
    initialMetrics.viewportHeight
  )
  expect(initialMetrics.scrollY).toBe(0)
  expect(initialMetrics.consoleTop).toBeDefined()
  expect(initialMetrics.consoleTop ?? 0).toBeGreaterThan(
    initialMetrics.viewportHeight
  )

  const bounds = await viewLines.boundingBox()
  expect(bounds).not.toBeNull()

  const target = bounds!
  const x = Math.round(target.x + target.width / 2)
  const startY = Math.round(target.y + target.height * 0.6)
  const totalDeltaY = 220
  const cdp = await page.context().newCDPSession(page)

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      {
        id: 1,
        x,
        y: startY,
        radiusX: 2,
        radiusY: 2,
        force: 1,
      },
    ],
  })

  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          id: 1,
          x,
          y: Math.round(startY - totalDeltaY * progress),
          radiusX: 2,
          radiusY: 2,
          force: 1,
        },
      ],
    })
    await page.waitForTimeout(16)
  }

  const scrollDuringDrag = await page.evaluate(() => window.scrollY)
  expect(scrollDuringDrag).toBeGreaterThan(40)

  const consoleTopDuringDrag = await page.evaluate(
    () => document.querySelector('.xterm')?.getBoundingClientRect().top ?? null
  )
  expect(consoleTopDuringDrag).not.toBeNull()
  expect(consoleTopDuringDrag!).toBeLessThan(
    initialMetrics.consoleTop ?? Infinity
  )

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })

  await page.waitForTimeout(180)

  const scrollAfterRelease = await page.evaluate(() => window.scrollY)
  expect(scrollAfterRelease).toBeGreaterThan(scrollDuringDrag)

  const consoleTopAfterRelease = await page.evaluate(
    () => document.querySelector('.xterm')?.getBoundingClientRect().top ?? null
  )
  expect(consoleTopAfterRelease).not.toBeNull()
  expect(consoleTopAfterRelease!).toBeLessThan(consoleTopDuringDrag!)
})
