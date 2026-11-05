import { test, expect, type Page } from 'playwright/test'

type ProbeWindow = Window & { __GLOW_TEST_TIME__?: number; __layerDraws?: number; __GLOW_TEST_SAMPLE_LAYERS__?: boolean; __GLOW_TEST_LAYERS__?: { hash: number; bright: number; error: number }[] }
const route = () => test.info().project.metadata.glowRoute as string || '/lab/glow'
const site = () => route() === '/mist' ? 'mist' : 'glow'

async function clock(page: Page, time: number) {
  await page.evaluate(t => {
    (window as ProbeWindow).__GLOW_TEST_TIME__ = t
    document.querySelectorAll<HTMLElement>('.thinking-glow-root').forEach(root => { delete root.dataset.fluidTime })
  }, time)
  await page.waitForFunction(t => Array.from(document.querySelectorAll<HTMLElement>('.thinking-glow-root')).every(root => Math.abs(Number(root.dataset.fluidTime) - t) < 0.02), time)
}

async function fields(page: Page) {
  if (await page.locator('[data-layered="true"]').count()) {
    await page.evaluate(() => { (window as ProbeWindow).__GLOW_TEST_SAMPLE_LAYERS__ = true })
    await page.waitForFunction(() => (window as ProbeWindow).__GLOW_TEST_SAMPLE_LAYERS__ === false)
    return page.evaluate(() => (window as ProbeWindow).__GLOW_TEST_LAYERS__!)
  }
  return page.evaluate(() => new Promise<{ hash: number; bright: number; error: number }[]>(resolve => requestAnimationFrame(() => {
    resolve(Array.from(document.querySelectorAll('canvas')).map(canvas => {
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl'))!
      const pixels = new Uint8Array(canvas.width * canvas.height * 4)
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      let hash = 2166136261, bright = 0
      for (let i = 0; i < pixels.length; i++) {
        hash = Math.imul(hash ^ pixels[i], 16777619)
        if (i % 4 !== 3 && pixels[i] > 30) bright++
      }
      return { hash, bright, error: gl.getError() }
    }))
  })))
}

for (const style of ['mist', 'vortex', 'blend']) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    test(`layered ${style} composes the approved fields at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.addInitScript(() => { (window as ProbeWindow).__GLOW_TEST_TIME__ = 7 })
      await page.goto(`${route()}?preset=layered&style=${style}`)
      const roots = page.locator('.thinking-glow-root')
      await expect(roots).toHaveCount(1)
      await expect(roots).toHaveAttribute('data-layered', 'true')
      await expect(page.locator('canvas')).toHaveCount(1)
      for (const root of await roots.all()) {
        await expect(root).toHaveAttribute('data-webgl', 'true')
        await expect(root).toHaveAttribute('data-style', style)
      }
      await expect(roots.nth(0)).toHaveAttribute('data-position', 'full')
      await expect(page.getByTestId(`${site()}-stage`)).toHaveText('')
      await clock(page, 7)
      const layered = await fields(page)
      for (const field of layered) {
        expect(field.bright).toBeGreaterThan(1000)
        expect(field.error).toBe(0)
      }
      await page.goto(`${route()}?preset=gemini&style=${style}`)
      await expect(roots).toHaveCount(1)
      await expect(roots).toHaveAttribute('data-position', 'top')
      await expect(roots).toHaveAttribute('data-style', style)
      await expect(roots).toHaveAttribute('data-webgl', 'true')
      await clock(page, 7)
      expect((await fields(page))[0]).toEqual(layered[1])
      if (route() === '/mist') {
        await page.goto(`${route()}?style=${style}`)
        await expect(roots).toHaveAttribute('data-position', 'full')
        await expect(roots).toHaveAttribute('data-style', style)
        await expect(roots).toHaveAttribute('data-webgl', 'true')
        await clock(page, 7)
        expect((await fields(page))[0]).toEqual(layered[0])
      }
    })
  }

  test(`layered ${style} settles, pauses both layers, and restores the shared context`, async ({ page }) => {
    await page.addInitScript(() => {
      for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
        const draw = proto.drawArrays
        proto.drawArrays = function (...args) {
          (window as ProbeWindow).__layerDraws = ((window as ProbeWindow).__layerDraws ?? 0) + 1
          return draw.apply(this, args)
        }
      }
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${route()}?preset=layered&style=${style}`)
    const roots = page.locator('.thinking-glow-root')
    await expect(roots).toHaveCount(1)
    await expect(roots).toHaveAttribute('data-layered', 'true')
    for (const root of await roots.all()) {
      await expect(root).toHaveAttribute('data-webgl', 'true')
      await expect(root).toHaveAttribute('data-reduced-motion', 'true')
    }
    await page.waitForTimeout(1000)
    const still = await fields(page)
    const screenshot = await page.screenshot()
    await page.waitForTimeout(250)
    expect(await fields(page)).toEqual(still)
    expect(await page.screenshot()).toEqual(screenshot)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    for (const root of await roots.all()) await expect(root).toHaveAttribute('data-active', 'false')
    const count = await page.evaluate(() => (window as ProbeWindow).__layerDraws)
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => (window as ProbeWindow).__layerDraws)).toBe(count)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    for (const root of await roots.all()) await expect(root).toHaveAttribute('data-active', 'true')
    await page.locator('[data-layered]').evaluate(el => { (el as HTMLElement).style.transform = 'translateY(200vh)' })
    for (const root of await roots.all()) await expect(root).toHaveAttribute('data-active', 'false')
    await page.locator('[data-layered]').evaluate(el => { (el as HTMLElement).style.transform = '' })
    for (const root of await roots.all()) await expect(root).toHaveAttribute('data-active', 'true')
    await page.evaluate(() => document.querySelectorAll('canvas').forEach(canvas => {
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl'))!
      const extension = gl.getExtension('WEBGL_lose_context')!
      extension.loseContext(); setTimeout(() => extension.restoreContext(), 600)
    }))
    for (const root of await roots.all()) await expect(root).toHaveAttribute('data-webgl', 'false')
    for (const root of await roots.all()) await expect(root).toHaveAttribute('data-webgl', 'true')
    await page.waitForTimeout(1000)
    expect(await fields(page)).toEqual(still)
  })
}

for (const backend of ['webgl1-half', 'webgl1-float', 'css']) {
  test(`layered supports all styles with ${backend}`, async ({ page }) => {
    await page.addInitScript(backend => {
      const getContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof getContext>) {
        if (String(args[0]) === 'webgl2' || backend === 'css' && String(args[0]).includes('webgl')) return null
        return getContext.apply(this, args)
      } as typeof getContext
      const extension = WebGLRenderingContext.prototype.getExtension
      WebGLRenderingContext.prototype.getExtension = function (name) {
        if (backend === 'webgl1-float' && name === 'OES_texture_half_float') return null
        return extension.call(this, name)
      }
    }, backend)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const style of ['mist', 'vortex', 'blend']) {
      await page.goto(`${route()}?preset=layered&style=${style}`)
      const roots = page.locator('.thinking-glow-root')
      await expect(roots).toHaveCount(1)
      await expect(roots).toHaveAttribute('data-layered', 'true')
      for (const root of await roots.all()) {
        await expect(root).toHaveAttribute('data-webgl', backend === 'css' ? 'false' : 'true')
        if (backend === 'css') {
          await expect(root.locator('.thinking-glow-fallback')).toHaveCount(2)
          for (const fallback of await root.locator('.thinking-glow-fallback').all()) await expect(fallback).toBeVisible()
          await expect(root.locator('.thinking-glow-field').first()).toHaveCSS('animation-name', 'none')
        } else await expect(root).toHaveAttribute('data-renderer', 'webgl')
      }
      if (backend !== 'css') {
        await clock(page, 7)
        for (const field of await fields(page)) { expect(field.bright).toBeGreaterThan(1000); expect(field.error).toBe(0) }
      }
    }
  })
}

test('layered survives resize, rewind, and remount with identical composition', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => { (window as ProbeWindow).__GLOW_TEST_TIME__ = 7 })
  await page.goto(`${route()}?preset=layered&style=blend`)
  await expect(page.locator('[data-layered="true"]')).toHaveAttribute('data-webgl', 'true')
  await clock(page, 7)
  const phone = await fields(page)
  const image = await page.screenshot()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.locator('canvas')).toHaveAttribute('width', '720')
  await clock(page, 7)
  const desktop = await fields(page)
  await page.reload()
  await expect(page.locator('[data-layered="true"]')).toHaveAttribute('data-webgl', 'true')
  await clock(page, 7)
  expect(await fields(page)).toEqual(desktop)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('canvas')).toHaveAttribute('width', '195')
  await clock(page, 7)
  expect(await fields(page)).toEqual(phone)
  expect(await page.screenshot()).toEqual(image)
  await clock(page, 12)
  await clock(page, 7)
  expect(await fields(page)).toEqual(phone)
  expect(await page.screenshot()).toEqual(image)
})

test('hidden controls select layered, retain it across styles, and release the overlay', async ({ page }) => {
  await page.goto(`${route()}?preset=layered`)
  await expect(page.locator('[data-layered]')).toHaveCount(1)
  await page.getByRole('button', { name: `Open ${site()} controls` }).click()
  const preset = page.getByRole('combobox', { name: route() === '/mist' ? 'Palette' : 'Preset', exact: true })
  await expect(preset).toHaveValue('layered')
  const style = page.getByLabel('Style', { exact: false })
  for (const value of ['vortex', 'blend', 'mist']) {
    await style.selectOption(value)
    await expect(preset).toHaveValue('layered')
    for (const root of await page.locator('.thinking-glow-root').all()) await expect(root).toHaveAttribute('data-style', value)
  }
  await preset.selectOption('gemini')
  await expect(page.locator('.thinking-glow-root')).toHaveCount(1)
  await expect(page.locator('[data-layered]')).toHaveCount(0)
  await preset.selectOption('layered')
  await expect(page.locator('[data-layered="true"]')).toHaveCount(1)
  await page.getByRole('button', { name: `Close ${site()} controls` }).click()
  await expect(page.getByTestId(`${site()}-stage`)).toHaveText('')
  await page.goto(`${route()}?preset=unknown&style=unknown`)
  await expect(page.locator('.thinking-glow-root')).toHaveCount(1)
  await expect(page.locator('.thinking-glow-root')).toHaveAttribute('data-style', 'mist')
  await expect(page.locator('.thinking-glow-root')).toHaveAttribute('data-position', route() === '/mist' ? 'full' : 'top')
})

