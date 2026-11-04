import { test, expect, type Page } from 'playwright/test'

// Shared behaviour suite; WAIA runs the same checks with its route metadata.
type ProbeWindow = Window & { __GLOW_TEST_TIME__?: number; __GLOW_TEST_SOURCE__?: number; __GLOW_TEST_TRACE__?: boolean; __drawCount?: number }
const route = () => test.info().project.metadata.glowRoute as string || '/lab/glow'
const siteName = () => route() === '/mist' ? 'mist' : 'glow'
async function clock(page: Page, time: number) {
  await page.evaluate(t => {
    (window as ProbeWindow).__GLOW_TEST_TIME__ = t
    delete document.querySelector<HTMLElement>('.thinking-glow-root')?.dataset.fluidTime
  }, time)
  await page.waitForFunction(t => Math.abs(Number(document.querySelector<HTMLElement>('.thinking-glow-root')?.dataset.fluidTime) - t) < 0.02, time)
}
async function pixels(page: Page) {
  return page.evaluate(() => new Promise<number[]>(resolve => requestAnimationFrame(() => {
    const canvas = document.querySelector('canvas')!
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl'))!
    const data = new Uint8Array(canvas.width * canvas.height * 4)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data)
    resolve(Array.from(data))
  })))
}
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
test(`URL selects vortex; controls preserve all presets at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport)
  await page.addInitScript(() => { (window as ProbeWindow).__GLOW_TEST_TIME__ = 7 })
  await page.goto(route())
  const root = page.locator('.thinking-glow-root')
  await expect(root).toHaveAttribute('data-style', 'mist')
  await expect(root).toHaveAttribute('data-webgl', 'true')
  await clock(page, 7)
  const mist = await pixels(page)
  await page.goto(`${route()}?style=vortex`)
  await expect(root).toHaveAttribute('data-style', 'vortex')
  await expect(root).toHaveAttribute('data-webgl', 'true')
  await clock(page, 7)
  await expect(page.locator(`[data-testid="${siteName()}-stage"]`)).toHaveText('')
  await expect(page.getByLabel('Style', { exact: true })).toHaveCount(0)
  const vortex = await pixels(page)
  const difference = vortex.reduce((sum, value, i) => sum + Math.abs(value - mist[i]), 0) / vortex.length
  expect(difference).toBeGreaterThan(2)
  await page.getByRole('button', { name: `Open ${siteName()} controls` }).click()
  const style = page.getByLabel('Style', { exact: false })
  await expect(style).toHaveValue('vortex')
  const preset = route() === '/mist' ? page.getByLabel('Palette') : page.getByLabel('Preset', { exact: true })
  for (const option of await preset.locator('option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value))) {
    await preset.selectOption(option)
    await clock(page, 7)
    await expect(root).toHaveAttribute('data-style', 'vortex')
    const data = await pixels(page)
    expect(data.filter((v, i) => i % 4 !== 3 && v > 5).length).toBeGreaterThan(1000)
  }
  await preset.selectOption(route() === '/mist' ? 'whatAmIAppreciatingNow' : 'gemini')
  await style.selectOption('mist')
  await page.getByRole('button', { name: `Close ${siteName()} controls` }).click()
  await clock(page, 7)
  expect(await pixels(page)).toEqual(mist)
  await page.goto(`${route()}?style=unknown`)
  await expect(root).toHaveAttribute('data-style', 'mist')
})
}

test('vortex carries colour, changes geometry, and keeps soft black space', async ({ page }) => {
  await page.goto(`${route()}?style=vortex`)
  await expect(page.locator('.thinking-glow-root')).toHaveAttribute('data-webgl', 'true')
  const samples: number[][] = []
  for (const time of [4, 8, 16, 30]) {
    await clock(page, time)
    const data = await pixels(page)
    let dark = 0, maximum = 0
    const sums = [0, 0, 0]
    for (let i = 0; i < data.length; i += 4) {
      const peak = Math.max(data[i], data[i + 1], data[i + 2])
      if (peak < 5) dark++
      maximum = Math.max(maximum, peak)
      for (let c = 0; c < 3; c++) sums[c] += data[i + c]
    }
    expect(dark / (data.length / 4)).toBeGreaterThan(0.15)
    expect(maximum).toBeGreaterThan(30)
    expect(maximum).toBeLessThan(115)
    samples.push(sums.map(v => v / (data.length / 4)))
  }
  expect(Math.abs(samples[0][0] - samples[1][0]) + Math.abs(samples[0][2] - samples[1][2])).toBeGreaterThan(1)
  expect(await page.evaluate(() => (document.querySelector('canvas')!.getContext('webgl2') || document.querySelector('canvas')!.getContext('webgl'))!.getError())).toBe(0)
})

test('reduced vortex is a settled still; hiding, offscreen and restoration work', async ({ page }) => {
  await page.addInitScript(() => {
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const draw = proto.drawArrays
      proto.drawArrays = function (...args) {
        (window as ProbeWindow).__drawCount = ((window as ProbeWindow).__drawCount || 0) + 1
        return draw.apply(this, args)
      }
    }
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${route()}?style=vortex`)
  const root = page.locator('.thinking-glow-root')
  await expect(root).toHaveAttribute('data-webgl', 'true')
  await expect(root).toHaveAttribute('data-reduced-motion', 'true')
  await page.waitForTimeout(1000)
  const still = await pixels(page)
  await page.waitForTimeout(250)
  expect(await pixels(page)).toEqual(still)
  expect(still.some((v, i) => i % 4 !== 3 && v > 30)).toBe(true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(root).toHaveAttribute('data-active', 'false')
  const count = await page.evaluate(() => (window as ProbeWindow).__drawCount)
  await page.waitForTimeout(200)
  expect(await page.evaluate(() => (window as ProbeWindow).__drawCount)).toBe(count)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(root).toHaveAttribute('data-active', 'true')
  await root.evaluate(el => { el.style.transform = 'translateY(200vh)' })
  await expect(root).toHaveAttribute('data-active', 'false')
  await root.evaluate(el => { el.style.transform = '' })
  await expect(root).toHaveAttribute('data-active', 'true')
  await page.evaluate(() => {
    const gl = (document.querySelector('canvas')!.getContext('webgl2') || document.querySelector('canvas')!.getContext('webgl'))!
    const extension = gl.getExtension('WEBGL_lose_context')!
    extension.loseContext(); setTimeout(() => extension.restoreContext(), 500)
  })
  await expect(root).toHaveAttribute('data-webgl', 'false')
  await expect(root).toHaveAttribute('data-webgl', 'true')
  await page.waitForTimeout(1000)
  expect(await pixels(page)).toEqual(still)
})

for (const backend of ['webgl1-half', 'webgl1-float', 'css'] as const) {
  test(`vortex fallback: ${backend}`, async ({ page }) => {
    await page.addInitScript(backend => {
      const context = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof context>) {
        if (String(args[0]) === 'webgl2' || backend === 'css' && String(args[0]).includes('webgl')) return null
        return context.apply(this, args)
      } as typeof context
      const extension = WebGLRenderingContext.prototype.getExtension
      WebGLRenderingContext.prototype.getExtension = function (name) {
        if (backend === 'webgl1-float' && name === 'OES_texture_half_float') return null
        return extension.call(this, name)
      }
    }, backend)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${route()}?style=vortex`)
    const root = page.locator('.thinking-glow-root')
    await expect(root).toHaveAttribute('data-style', 'vortex')
    await expect(root).toHaveAttribute('data-webgl', backend === 'css' ? 'false' : 'true')
    if (backend === 'css') {
      await expect(page.locator('.thinking-glow-fallback')).toBeVisible()
      await expect(page.locator('.thinking-glow-field').first()).toHaveCSS('animation-name', 'none')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await expect(page.locator('.thinking-glow-field').first()).toHaveCSS('animation-name', 'thinking-glow-orbit')
    } else {
      await clock(page, 7)
      await expect(root).toHaveAttribute('data-renderer', 'webgl')
      expect((await pixels(page)).some((v, i) => i % 4 !== 3 && v > 30)).toBe(true)
      expect(await page.evaluate(() => document.querySelector('canvas')!.getContext('webgl')!.getError())).toBe(0)
    }
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`vortex frame budget at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto(`${route()}?style=vortex`)
    await expect(page.locator('.thinking-glow-root')).toHaveAttribute('data-webgl', 'true')
    await page.waitForTimeout(1500)
    const mean = await page.evaluate(() => new Promise<number>(resolve => {
      const intervals: number[] = []; let last: number
      const tick = (t: number) => {
        if (last !== undefined) intervals.push(t - last)
        last = t
        if (intervals.length < 300) requestAnimationFrame(tick)
        else resolve(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      }; requestAnimationFrame(tick)
    }))
    console.log(`${route()} vortex ${viewport.width}x${viewport.height}: ${mean.toFixed(4)} ms`)
    expect(mean).toBeLessThan(16.7)
  })
}
