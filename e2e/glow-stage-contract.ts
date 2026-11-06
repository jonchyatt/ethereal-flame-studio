import { expect, type Page, type BrowserContext } from 'playwright/test';

export async function disableNativePointerCapture(context: BrowserContext) {
  await context.addInitScript(() => {
    Element.prototype.requestPointerLock = () => Promise.reject(new Error('Disabled for isolated automation'));
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Document.prototype.exitPointerLock = () => {};
  });
}

/** The public Mist title/control stay visible; the lab keeps its empty-stage contract. */
export async function expectClosedGlowStage(page: Page, route: string) {
  if (route !== '/mist') {
    await expect(page.getByTestId('glow-stage')).toHaveText('');
    return;
  }
  const stage = page.getByTestId('mist-stage');
  await expect(stage).toHaveText(/^Mist\s*Open mist controls$/);
  await expect(stage.getByRole('heading', { level: 1, name: 'Mist', exact: true })).toBeVisible();
  const toggle = stage.getByRole('button', { name: 'Open mist controls', exact: true });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText('Open mist controls');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#mist-controls')).toHaveCount(0);
  await expect(page.getByLabel('Style', { exact: true })).toHaveCount(0);
}
