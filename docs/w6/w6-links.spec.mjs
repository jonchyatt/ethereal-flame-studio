import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3104';
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'phone', width: 390, height: 844 },
];
const footerLinks = ['/legal/terms', '/legal/privacy', '/legal/refunds', '/support'];
const hitAreaRoutes = ['/store', '/programs', '/support', '/store/bundles', '/listen'];

await mkdir('docs/w6', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];

function screenshotName(route, viewport) {
  const slug = route.slice(1).replaceAll('/', '-') || 'home';
  return `docs/w6/${slug}-${viewport.name}.png`;
}

async function assertHitAreas(page, route, viewport) {
  const links = await page.locator('nav a, footer a').evaluateAll((anchors) => anchors.map((anchor) => ({
    href: anchor.getAttribute('href'),
    text: anchor.textContent?.trim(),
    height: anchor.getBoundingClientRect().height,
  })));
  assert.ok(links.length > 0, `${route} should expose nav/footer links`);
  if (viewport.name === 'phone') {
    for (const link of links) {
      assert.ok(link.height >= 44, `${route} ${link.href} (${link.text}) should have a 44px hit area, got ${link.height}`);
    }
  }
  return links;
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      const store = await context.newPage();
      const storeResponse = await store.goto(`${base}/store`, { waitUntil: 'networkidle' });
      assert.equal(storeResponse?.status(), 200, '/store should return 200');
      assert.equal(await store.locator('a[href="/store/shelf"]').count(), 0, '/store should not link to /store/shelf while empty');
      const storeLinks = await assertHitAreas(store, '/store', viewport);
      await store.screenshot({ path: screenshotName('/store', viewport), fullPage: true });
      results.push({ viewport: viewport.name, route: '/store', status: storeResponse.status(), shelfLink: false, hitAreas: storeLinks });
      await store.close();

      for (const route of ['/programs', '/support']) {
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route} should return 200`);
        assert.equal(await page.locator('a[href="/programs/manage"]').count(), 0, `${route} should hide Manage my access without a purchase`);
        const links = await assertHitAreas(page, route, viewport);
        await page.screenshot({ path: screenshotName(route, viewport), fullPage: true });
        results.push({ viewport: viewport.name, route, status: response.status(), manageLink: false, hitAreas: links });
        await page.close();
      }

      const manage = await context.request.get(`${base}/programs/manage`);
      assert.equal(manage.status(), 200, '/programs/manage should stay reachable');

      const shelf = await context.newPage();
      const shelfResponse = await shelf.goto(`${base}/store/shelf`, { waitUntil: 'networkidle' });
      assert.equal(shelfResponse?.status(), 200, '/store/shelf should return 200');
      const emptyShelf = shelf.locator('main > p').filter({ hasText: 'Nothing is listed yet' });
      assert.equal(await emptyShelf.locator('a[href="/store"]').count(), 1, 'empty shelf should link to Store');
      assert.equal(await emptyShelf.locator('a[href="/"]').count(), 1, 'empty shelf should link to Home');
      await shelf.screenshot({ path: screenshotName('/store/shelf', viewport), fullPage: true });
      results.push({ viewport: viewport.name, route: '/store/shelf', status: shelfResponse.status(), emptyLinks: ['/store', '/'] });
      await shelf.close();

      const legal = await context.newPage();
      const legalResponse = await legal.goto(`${base}/legal/terms`, { waitUntil: 'networkidle' });
      assert.equal(legalResponse?.status(), 200, '/legal/terms should return 200');
      const breadcrumb = legal.locator('a').filter({ hasText: 'Programs' });
      assert.equal(await breadcrumb.count(), 1, 'legal terms should have one Programs breadcrumb');
      assert.equal(await breadcrumb.getAttribute('href'), '/', 'legal terms breadcrumb should point to Home');
      await legal.screenshot({ path: screenshotName('/legal/terms', viewport), fullPage: true });
      results.push({ viewport: viewport.name, route: '/legal/terms', status: legalResponse.status(), breadcrumb: '/' });
      await legal.close();

      for (const route of ['/store/bundles', '/listen']) {
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route} should return 200`);
        const hrefs = await page.locator('footer a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
        assert.deepEqual(hrefs, footerLinks, `${route} should have the home footer links`);
        const links = await assertHitAreas(page, route, viewport);
        await page.screenshot({ path: screenshotName(route, viewport), fullPage: true });
        results.push({ viewport: viewport.name, route, status: response.status(), footer: hrefs, hitAreas: links });
        await page.close();
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ viewports, hitAreaRoutes, footerLinks, results }, null, 2));
