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
const legacyRedirects = {
  '/privacy': '/legal/privacy',
  '/terms': '/legal/terms',
  '/refund-policy': '/legal/refunds',
  '/contact': '/support',
};

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
      assert.equal(await emptyShelf.locator('a').count(), 0, 'empty shelf sentence should not contain links');
      assert.equal((await emptyShelf.textContent())?.trim().endsWith('Home.'), false, 'empty shelf sentence should not trail a dot after Home');
      const shelfButtons = shelf.locator('main > div > a');
      assert.equal(await shelfButtons.count(), 2, 'empty shelf should have Store and Home buttons');
      const { buttons, sentenceBottom } = await shelf.evaluate(() => ({
        buttons: Array.from(document.querySelectorAll('main > div > a')).map((link) => ({
          href: link.getAttribute('href'),
          text: link.textContent?.trim(),
          height: link.getBoundingClientRect().height,
          top: link.getBoundingClientRect().top,
        })),
        sentenceBottom: Array.from(document.querySelectorAll('main > p'))
          .find((paragraph) => paragraph.textContent?.includes('Nothing is listed yet'))
          ?.getBoundingClientRect().bottom,
      }));
      const buttonLayout = buttons;
      assert.notEqual(sentenceBottom, undefined, 'empty shelf sentence should be present');
      assert.ok(buttonLayout[0].top >= sentenceBottom, 'empty shelf buttons should be below the sentence');
      assert.deepEqual(buttonLayout.map(({ href, text }) => ({ href, text })), [
        { href: '/store', text: 'Store' },
        { href: '/', text: 'Home' },
      ], 'empty shelf button labels and destinations should match');
      assert.ok(buttonLayout.every(({ height }) => height === 44), 'empty shelf buttons should be 44px tall');
      assert.equal(buttonLayout[0].top, buttonLayout[1].top, 'empty shelf buttons should share their own line');
      assert.ok(!/\./.test(buttonLayout.map(({ text }) => text).join('')), 'empty shelf buttons should not trail a dot');
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

      for (const [route, location] of Object.entries(legacyRedirects)) {
        const response = await context.request.get(`${base}${route}`, { maxRedirects: 0 });
        assert.equal(response.status(), 307, `${route} should temporarily redirect`);
        assert.equal(new URL(response.headers().location).pathname, location, `${route} should redirect to ${location}`);
        results.push({ viewport: viewport.name, route, status: response.status(), location });
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ viewports, hitAreaRoutes, footerLinks, results }, null, 2));
