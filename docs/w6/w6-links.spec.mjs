import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3104';
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'phone', width: 390, height: 844 },
];
const footerLinks = ['/legal/terms', '/legal/privacy', '/legal/refunds', '/support'];
const hitAreaRoutes = ['/store', '/programs', '/support', '/store/bundles', '/store/shelf', '/listen'];
const legacyRedirects = {
  '/privacy': '/legal/privacy',
  '/terms': '/legal/terms',
  '/refund-policy': '/legal/refunds',
  '/contact': '/support',
};
const retiredPublicCopy = [
  'Further protocols',
  'Guided process. Placeholder.',
  'The protocol content is handed over by Jonathan',
  'Read, never rewritten',
  "Jonathan's mental-mastery script doctrine",
  'Jonathan decides the real ones',
  "on Jonathan's own list",
];
const publicCopyRoutes = [
  '/',
  '/about',
  '/legal/privacy',
  '/legal/refunds',
  '/programs/yale-inversion-protocol',
  '/programs/yale-inversion-protocol/preview/a',
  '/programs/yale-inversion-protocol/preview/b',
  '/programs/yale-inversion-protocol/preview/c',
  '/programs/yale-inversion-protocol/preview/d',
  '/patrons',
  '/patrons/join',
];

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

async function assertPublicCopy(page, route) {
  const text = await page.locator('body').innerText();
  for (const retired of retiredPublicCopy) {
    assert.ok(!text.includes(retired), `${route} should not show retired copy: ${retired}`);
  }
  assert.ok(!text.includes('jonchyatt@gmail.com'), `${route} should not show Jon's personal email`);
}

async function assertFooterHasNoSeparators(page, route, viewport) {
  if (viewport.name !== 'phone') return;
  const footers = await page.locator('footer').evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
  for (const text of footers) {
    assert.ok(!text.includes('\u00b7') && !text.includes('\u00c2\u00b7'), `${route} footer should not put a dot at either end of a wrapped line`);
  }
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      const store = await context.newPage();
      const storeResponse = await store.goto(`${base}/store`, { waitUntil: 'networkidle' });
      assert.equal(storeResponse?.status(), 200, '/store should return 200');
      assert.equal(await store.locator('a[href="/store/shelf"]').count(), 0, '/store should not link to /store/shelf while empty');
      assert.equal(await store.locator('#shelf').count(), 0, '/store should hide its empty health shelf');
      assert.equal(await store.locator('.proposed-price:visible').count(), 0, '/store should hide proposed tier prices');
      assert.doesNotMatch(await store.locator('body').innerText(), /\$(?:5|10|20|35)\b/, '/store should not visibly show a tier price');
      await assertPublicCopy(store, '/store');
      await assertFooterHasNoSeparators(store, '/store', viewport);
      const details = store.locator('#intake-details');
      const contact = store.locator('#intake-contact');
      assert.equal(Math.round((await details.boundingBox()).width), Math.round((await contact.boundingBox()).width), '/store contact input should match the full width of the details field');
      await details.fill(`W8 local end-to-end request (${viewport.name})`);
      await contact.fill('w8@example.test');
      const [intakeResponse] = await Promise.all([
        store.waitForResponse((response) => response.url().endsWith('/api/custom-orders') && response.request().method() === 'POST'),
        store.locator('#intake-form button[type="submit"]').click(),
      ]);
      assert.equal(intakeResponse.status(), 201, '/store custom-work form should reach the live intake endpoint locally');
      const intakeEcho = store.locator('#intake-echo');
      await intakeEcho.waitFor({ state: 'visible' });
      assert.match(await intakeEcho.innerText(), /Keep this reference to check on your request: ord_[0-9a-f]+\.[0-9a-f]+/, '/store should give the visitor the promised reference');
      assert.match((await intakeEcho.locator('a').getAttribute('href')) ?? '', /^\/store\/custom-order#ref=ord_[0-9a-f]+\.[0-9a-f]+$/, '/store should link the reference to its status page');
      const storeLinks = await assertHitAreas(store, '/store', viewport);
      await store.screenshot({ path: screenshotName('/store', viewport), fullPage: true });
      results.push({ viewport: viewport.name, route: '/store', status: storeResponse.status(), shelfLink: false, healthShelf: 'hidden', proposedPrices: 'hidden', intake: '201 with reference', hitAreas: storeLinks });
      await store.close();

      for (const route of ['/programs', '/support']) {
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route} should return 200`);
        assert.equal(await page.locator('a[href="/programs/manage"]').count(), 0, `${route} should hide Manage my access without a purchase`);
        await assertPublicCopy(page, route);
        await assertFooterHasNoSeparators(page, route, viewport);
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
      await assertPublicCopy(shelf, '/store/shelf');
      const shelfHeading = shelf.getByRole('heading', { name: 'The shelf', exact: true });
      assert.equal(await shelfHeading.count(), 1, 'The shelf should be the page heading');
      const shelfBreadcrumb = shelf.locator('nav[aria-label="Site navigation"] [aria-current="page"]');
      assert.equal(await shelfBreadcrumb.textContent(), 'The shelf', 'shelf breadcrumb should name the current page');
      const shelfFooter = await shelf.locator('footer a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      assert.deepEqual(shelfFooter, footerLinks, '/store/shelf should have the home footer links');
      const shelfLinks = await assertHitAreas(shelf, '/store/shelf', viewport);
      const emptyShelf = shelf.locator('main > p').filter({ hasText: 'Nothing is listed yet' });
      assert.equal(await emptyShelf.locator('a').count(), 0, 'empty shelf sentence should not contain links');
      assert.equal(await emptyShelf.textContent(), 'The shelf is being stocked. Nothing is listed yet.', 'empty shelf sentence should end at Nothing is listed yet.');
      const shelfButtons = shelf.locator('main > div > a');
      assert.equal(await shelfButtons.count(), 2, 'empty shelf should have Store and Home buttons');
      const { buttons, disclosureBottom, sentenceBottom, sentenceTop } = await shelf.evaluate(() => ({
        buttons: Array.from(document.querySelectorAll('main > div > a')).map((link) => ({
          href: link.getAttribute('href'),
          text: link.textContent?.trim(),
          height: link.getBoundingClientRect().height,
          top: link.getBoundingClientRect().top,
        })),
        sentenceBottom: Array.from(document.querySelectorAll('main > p'))
          .find((paragraph) => paragraph.textContent?.includes('Nothing is listed yet'))
          ?.getBoundingClientRect().bottom,
        sentenceTop: Array.from(document.querySelectorAll('main > p'))
          .find((paragraph) => paragraph.textContent?.includes('Nothing is listed yet'))
          ?.getBoundingClientRect().top,
        disclosureBottom: document.querySelector('#disclosure')?.getBoundingClientRect().bottom,
      }));
      const buttonLayout = buttons;
      assert.notEqual(sentenceBottom, undefined, 'empty shelf sentence should be present');
      assert.notEqual(disclosureBottom, undefined, 'empty shelf should show its disclosure');
      assert.ok(sentenceTop - disclosureBottom >= 16, 'empty shelf should separate disclosure and stocking copy');
      assert.ok(buttonLayout[0].top >= sentenceBottom, 'empty shelf buttons should be below the sentence');
      assert.ok(buttonLayout[0].top - sentenceBottom >= 16, 'empty shelf should separate stocking copy and buttons');
      assert.deepEqual(buttonLayout.map(({ href, text }) => ({ href, text })), [
        { href: '/store', text: 'Store' },
        { href: '/', text: 'Home' },
      ], 'empty shelf button labels and destinations should match');
      assert.ok(buttonLayout.every(({ height }) => height === 44), 'empty shelf buttons should be 44px tall');
      assert.equal(buttonLayout[0].top, buttonLayout[1].top, 'empty shelf buttons should share their own line');
      assert.ok(!/\./.test(buttonLayout.map(({ text }) => text).join('')), 'empty shelf buttons should not trail a dot');
      await shelf.screenshot({ path: screenshotName('/store/shelf', viewport), fullPage: true });
      results.push({ viewport: viewport.name, route: '/store/shelf', status: shelfResponse.status(), emptyLinks: ['/store', '/'], footer: shelfFooter, hitAreas: shelfLinks });
      await shelf.close();

      const legal = await context.newPage();
      const legalResponse = await legal.goto(`${base}/legal/terms`, { waitUntil: 'networkidle' });
      assert.equal(legalResponse?.status(), 200, '/legal/terms should return 200');
      await assertPublicCopy(legal, '/legal/terms');
      await assertFooterHasNoSeparators(legal, '/legal/terms', viewport);
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
        await assertPublicCopy(page, route);
        await assertFooterHasNoSeparators(page, route, viewport);
        const hrefs = await page.locator('footer a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
        assert.deepEqual(hrefs, footerLinks, `${route} should have the home footer links`);
        const links = await assertHitAreas(page, route, viewport);
        if (route === '/listen' && viewport.name === 'phone') {
          const listenLinks = await page.locator('main > p').filter({ hasText: 'Back to home' }).locator('a').evaluateAll((anchors) => anchors.map((anchor) => ({
            href: anchor.getAttribute('href'),
            text: anchor.textContent?.trim(),
            height: anchor.getBoundingClientRect().height,
          })));
          assert.deepEqual(listenLinks.map(({ href, text }) => ({ href, text })), [
            { href: '/', text: 'Back to home' },
            { href: '/programs/advanced-hypnosis-sessions', text: 'The video version' },
          ], '/listen should retain both bottom links');
          assert.ok(listenLinks.every(({ height }) => height >= 44), '/listen bottom links should each have a 44px hit area on phone');
        }
        await page.screenshot({ path: screenshotName(route, viewport), fullPage: true });
        results.push({ viewport: viewport.name, route, status: response.status(), footer: hrefs, hitAreas: links });
        await page.close();
      }

      for (const route of publicCopyRoutes) {
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route} should return 200`);
        await assertPublicCopy(page, route);
        await assertFooterHasNoSeparators(page, route, viewport);
        results.push({ viewport: viewport.name, route, status: response.status(), publicCopy: 'clean' });
        await page.close();
      }

      for (const [route, location] of Object.entries(legacyRedirects)) {
        const response = await context.request.get(`${base}${route}`, { maxRedirects: 0 });
        assert.equal(response.status(), 307, `${route} should temporarily redirect`);
        assert.equal(new URL(response.headers().location, base).pathname, location, `${route} should redirect to ${location}`);
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
