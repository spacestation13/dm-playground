import { expect, test } from '@playwright/test'

test('editor wheel events are not force-consumed when Monaco cannot scroll', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForSelector('.monaco-editor .view-lines')

  const wheelConsumption = await page.evaluate(() => {
    const target =
      document.querySelector('.monaco-editor .monaco-scrollable-element') ??
      document.querySelector('.monaco-editor')

    if (!(target instanceof HTMLElement)) {
      throw new Error('Unable to find Monaco wheel target')
    }

    const event = new WheelEvent('wheel', {
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    })

    const dispatchResult = target.dispatchEvent(event)

    return {
      dispatchResult,
      defaultPrevented: event.defaultPrevented,
    }
  })

  expect(wheelConsumption.defaultPrevented).toBe(false)
  expect(wheelConsumption.dispatchResult).toBe(true)
})
