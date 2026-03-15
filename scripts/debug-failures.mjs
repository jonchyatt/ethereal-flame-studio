import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';

const browser = await chromium.launch({
  channel: 'chrome',
  headless: false,
  args: ['--window-size=1280,900'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Debug 1: Priority Home — what's actually on the page?
console.log('\n=== Debug: /jarvis/app ===');
await page.goto(`${BASE}/jarvis/app`, { waitUntil: 'networkidle', timeout: 15000 });
const appText = await page.textContent('body');
console.log('Body text (first 500 chars):', appText.slice(0, 500));
console.log('---');

// Take screenshot
await page.screenshot({ path: 'scripts/debug-app.png', fullPage: true });
console.log('Screenshot: scripts/debug-app.png');

// Debug 2: Chat — look at HTML structure
const chatElements = await page.$$eval('button', btns => btns.map(b => ({ text: b.textContent?.trim(), classes: b.className, ariaLabel: b.getAttribute('aria-label') })));
console.log('\nAll buttons on page:', JSON.stringify(chatElements.slice(0, 15), null, 2));

// Check for any drawer/sheet/modal triggers
const drawers = await page.$$eval('[data-state], [role="dialog"], [class*="drawer"], [class*="sheet"], [class*="chat"]', els => els.map(e => ({ tag: e.tagName, classes: e.className, id: e.id, text: e.textContent?.slice(0, 50) })));
console.log('\nDrawer/chat elements:', JSON.stringify(drawers.slice(0, 10), null, 2));

// Debug 3: Academy page
console.log('\n=== Debug: /jarvis/app/academy ===');
await page.goto(`${BASE}/jarvis/app/academy`, { waitUntil: 'networkidle', timeout: 15000 });
const acaText = await page.textContent('body');
console.log('Body text (first 500 chars):', acaText.slice(0, 500));
await page.screenshot({ path: 'scripts/debug-academy.png', fullPage: true });

// Check console errors
page.on('console', msg => {
  if (msg.type() === 'error') console.log('Console error:', msg.text());
});

await browser.close();
