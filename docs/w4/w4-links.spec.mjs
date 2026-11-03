import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3104';
const deadEndRoutes = ['/store/shelf', '/store/bundles', '/patrons', '/patrons/join', '/patrons/remove'];
const proofRoutes = [...deadEndRoutes, '/legal/refunds', '/programs/manage', '/listen'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'phone', width: 390, height: 844 },
];

await mkdir('docs/w4', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    try {
      for (const route of proofRoutes) {
        const page = await context.newPage();
        const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, `${route} should return 200`);
        const hrefs = await page.locator('a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
        if (deadEndRoutes.includes(route)) {
          assert.ok(hrefs.includes('/'), `${route} should link to /`);
          assert.ok(hrefs.includes('/store'), `${route} should link to /store`);
        }
        if (route === '/listen') {
          assert.match(await page.locator('body').innerText(), /Do not listen while driving, operating machinery, or anywhere you need to stay alert\./);
        }
        await page.screenshot({ path: `docs/w4/${route.slice(1).replaceAll('/', '-')}-${viewport.name}.png`, fullPage: true });
        results.push({ viewport: viewport.name, route, status: response.status(), home: hrefs.includes('/'), store: hrefs.includes('/store') });
        await page.close();
      }

      const refunds = await context.newPage();
      await refunds.goto(`${base}/legal/refunds`, { waitUntil: 'networkidle' });
      const manageHref = await refunds.getByRole('link', { name: 'Manage my access' }).getAttribute('href');
      assert.equal(manageHref, '/programs/manage');
      const manageResponse = await refunds.goto(`${base}${manageHref}`, { waitUntil: 'networkidle' });
      assert.equal(manageResponse?.status(), 200, 'refunds manage link should resolve');
      const supportHref = await refunds.getByRole('link', { name: 'Support' }).getAttribute('href');
      assert.equal(supportHref, '/support');
      const supportResponse = await refunds.goto(`${base}${supportHref}`, { waitUntil: 'networkidle' });
      assert.equal(supportResponse?.status(), 200, 'manage support link should resolve');
      await refunds.close();
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ viewports, proofRoutes, results }, null, 2));
