import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3104';
const notFoundRoutes = ['/not-a-real-page', '/cart'];
const redirects = [
  ['/privacy', '/legal/privacy'],
  ['/terms', '/legal/terms'],
  ['/refund-policy', '/legal/refunds'],
  ['/contact', '/support'],
];
const headerRoutes = ['/support', '/about', '/legal/terms', '/legal/privacy', '/legal/refunds', '/programs'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'phone', width: 390, height: 844 },
];

await mkdir('docs/w5', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];

function screenshotName(route, viewport) {
  const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
  return `docs/w5/${slug}-${viewport.name}.png`;
}

async function assertSiteNav(page, route) {
  const nav = page.locator('nav[aria-label="Site navigation"]');
  assert.equal(await nav.count(), 1, `${route} should have one site navigation`);
  const hrefs = await nav.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  assert.ok(hrefs.includes('/'), `${route} should link to /`);
  assert.ok(hrefs.includes('/store'), `${route} should link to /store`);
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      for (const route of notFoundRoutes) {
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 404, `${route} should return 404`);
        await assertSiteNav(page, route);
        await page.screenshot({ path: screenshotName(route, viewport), fullPage: true });
        results.push({ viewport: viewport.name, route, status: response.status(), kind: 'not-found' });
        await page.close();
      }

      for (const [route, expected] of redirects) {
        const raw = await context.request.get(`${base}${route}`, { maxRedirects: 0 });
        assert.equal(raw.status(), 308, `${route} should permanently redirect`);
        assert.equal(new URL(raw.headers().location ?? '', base).pathname, expected, `${route} should redirect to ${expected}`);
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route} destination should return 200`);
        assert.ok(page.url().endsWith(expected), `${route} should land on ${expected}`);
        await assertSiteNav(page, route);
        await page.screenshot({ path: screenshotName(route, viewport), fullPage: true });
        results.push({ viewport: viewport.name, route, status: response.status(), landed: expected, kind: 'redirect' });
        await page.close();
      }

      const home = await context.newPage();
      const homeResponse = await home.goto(`${base}/`, { waitUntil: 'networkidle' });
      assert.equal(homeResponse?.status(), 200, '/ should return 200');
      const homeFooterHrefs = await home.locator('footer a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      for (const href of ['/legal/terms', '/legal/privacy', '/legal/refunds', '/support']) {
        assert.ok(homeFooterHrefs.includes(href), `home footer should link to ${href}`);
      }
      await home.screenshot({ path: screenshotName('/', viewport), fullPage: true });
      results.push({ viewport: viewport.name, route: '/', status: homeResponse.status(), footer: homeFooterHrefs });
      await home.close();

      const store = await context.newPage();
      const storeResponse = await store.goto(`${base}/store`, { waitUntil: 'networkidle' });
      assert.equal(storeResponse?.status(), 200, '/store should return 200');
      const storeText = await store.locator('body').innerText();
      assert.doesNotMatch(storeText, /render-brand-mockups|BRAND-MARK\.md/i, '/store should not expose the build note');
      assert.ok(await store.locator('a[href^="https://resetbiology.com/"]').count() > 0, '/store should link Reset Biology');
      await store.screenshot({ path: screenshotName('/store', viewport), fullPage: true });
      results.push({ viewport: viewport.name, route: '/store', status: storeResponse.status(), buildNote: false });
      await store.close();

      for (const route of headerRoutes) {
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route} should return 200`);
        await assertSiteNav(page, route);
        await page.screenshot({ path: screenshotName(route, viewport), fullPage: true });
        results.push({ viewport: viewport.name, route, status: response.status(), home: true, store: true });
        await page.close();
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ viewports, notFoundRoutes, redirects, headerRoutes, results }, null, 2));
