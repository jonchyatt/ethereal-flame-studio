import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:3103';
const output = process.argv[3] || 'C:/hal-jobs/FIREWATER/web/orb-hero';
await mkdir(output, { recursive: true });

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const results = {};

try {
  for (const [label, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/?capture=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__heroOrb?.stats()?.frameIntervals.length > 20);
    assert.equal(await page.evaluate(() => window.__heroOrb?.audioState()), 'not-started');
    await page.getByRole('button', { name: 'Listen to the scene', exact: true }).waitFor();
    const hero = await page.locator('.hero-orb').boundingBox();
    const primary = await page.locator('.hero-action .button.primary').boundingBox();
    assert.ok(hero && primary, `${label}: hero and primary action render`);
    assert.ok(primary.y + primary.height <= viewport.height, `${label}: primary action remains in the first screen`);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(100);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `home-${viewport.width}-silent.png`), fullPage: false });

    await page.getByRole('button', { name: 'Listen to the scene', exact: true }).click();
    await page.waitForFunction(() => window.__heroOrb?.audioState() === 'running');
    await page.waitForTimeout(1800);
    const started = await page.evaluate(() => ({
      levels: window.__heroOrb?.levels(),
      stats: window.__heroOrb?.stats(),
    }));
    assert.ok(started.levels.voice > 0 || started.levels.ocean > 0 || started.levels.music > 0, `${label}: live analyser levels respond after Listen`);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(100);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `home-${viewport.width}-playing.png`), fullPage: false });
    const intervals = started.stats.frameIntervals;
    const fps = 1000 / mean(intervals.slice(-120));
    assert.ok(fps >= 30, `${label}: ${fps.toFixed(1)} fps is below 30`);
    if (label === 'phone') assert.equal(started.stats.quality, 'low');
    assert.deepEqual(errors, [], `${label}: browser errors`);
    results[label] = { viewport, fps, quality: started.stats.quality, errors };
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await reduced.emulateMedia({ reducedMotion: 'reduce' });
  await reduced.goto(`${base}/?capture=1`, { waitUntil: 'networkidle' });
  await reduced.locator('.hero-orb-fallback').waitFor();
  assert.equal(await reduced.locator('.hero-orb-canvas').isVisible(), false, 'reduced motion keeps WebGL hidden');
  assert.equal(await reduced.locator('.hero-orb-fallback').isVisible(), true, 'reduced motion exposes the carving fallback');
  results.reducedMotion = { carvingFallback: true, webglHidden: true };
  await reduced.close();
  await writeFile(path.join(output, 'home-orb-smoke-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
