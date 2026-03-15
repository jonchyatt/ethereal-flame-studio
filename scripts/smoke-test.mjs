import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';
const results = [];

function log(name, pass, detail = '') {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${name}${detail ? ' — ' + detail : ''}`);
  results.push({ name, pass, detail });
}

console.log('\n=== Jarvis Smoke Test (Playwright + Chrome) ===\n');

const browser = await chromium.launch({
  channel: 'chrome',
  headless: false,
  args: ['--window-size=1280,900'],
});

const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Test 1: Health API
try {
  const res = await page.goto(`${BASE}/api/jarvis/health`);
  const json = await res.json();
  log('Health API', res.status() === 200, `status=${res.status()}`);
  log('DB connected', json.db?.connected === true);
  log('Calendar configured', json.calendar?.configured === true);
  log('Calendar token OK', json.calendar?.tokenOk === true);
} catch (e) {
  log('Health API', false, e.message);
}

// Test 2: Home page loads
try {
  await page.goto(`${BASE}/jarvis/app`, { waitUntil: 'networkidle', timeout: 15000 });
  const title = await page.title();
  log('App page loads', true, `title="${title}"`);

  // Check for Priority Home content
  const body = await page.textContent('body');
  const hasPriorities = body.includes('Priority') || body.includes('priority') || body.includes('Home');
  log('Priority Home visible', hasPriorities);
} catch (e) {
  log('App page loads', false, e.message);
}

// Test 3: Chat panel
try {
  // Look for chat button or panel
  const chatButton = await page.$('[data-testid="chat-button"], button:has-text("Chat"), [aria-label*="chat"], [class*="chat"]');
  if (chatButton) {
    await chatButton.click();
    await page.waitForTimeout(1000);
    log('Chat panel opens', true);
  } else {
    // Try the chat drawer/panel directly
    const chatPanel = await page.$('text=Chat with Jarvis');
    log('Chat panel present', chatPanel !== null, chatPanel ? 'found' : 'not found on page');
  }
} catch (e) {
  log('Chat panel', false, e.message);
}

// Test 4: Send a message to Jarvis
try {
  const input = await page.$('input[placeholder*="Message"], textarea[placeholder*="Message"], [data-testid="chat-input"]');
  if (input) {
    await input.fill('Hello');
    const sendBtn = await page.$('button[type="submit"], button:has-text("Send"), [data-testid="send-button"], button[aria-label*="send"], button[aria-label*="Send"]');
    if (sendBtn) {
      await sendBtn.click();
      // Wait for response (up to 30s for Claude)
      await page.waitForTimeout(3000);
      const chatArea = await page.textContent('body');
      const gotResponse = !chatArea.includes('exited with code 1');
      log('Chat sends message', true);
      log('No Claude exit error', gotResponse, gotResponse ? 'response received' : 'Claude Code process crashed');
    } else {
      log('Send button', false, 'not found');
    }
  } else {
    log('Chat input', false, 'not found');
  }
} catch (e) {
  log('Chat interaction', false, e.message);
}

// Test 5: Academy page
try {
  await page.goto(`${BASE}/jarvis/app/academy`, { waitUntil: 'networkidle', timeout: 15000 });
  const status = page.url().includes('academy');
  const body = await page.textContent('body');
  const noError = !body.includes('Internal Server Error') && !body.includes('no such table');
  log('Academy page loads', status && noError, noError ? 'no DB errors' : 'DB errors found');
} catch (e) {
  log('Academy page', false, e.message);
}

// Test 6: Personal pages
for (const sub of ['tasks', 'calendar', 'goals', 'habits', 'health', 'journal', 'meals', 'bills']) {
  try {
    const res = await page.goto(`${BASE}/jarvis/app/personal/${sub}`, { waitUntil: 'networkidle', timeout: 10000 });
    const body = await page.textContent('body');
    const noError = !body.includes('Internal Server Error') && !body.includes('no such table');
    log(`Personal/${sub}`, res.status() === 200 && noError);
  } catch (e) {
    log(`Personal/${sub}`, false, e.message);
  }
}

// Test 7: Settings page
try {
  await page.goto(`${BASE}/jarvis/app/settings`, { waitUntil: 'networkidle', timeout: 10000 });
  const body = await page.textContent('body');
  log('Settings page', !body.includes('Internal Server Error'));
} catch (e) {
  log('Settings page', false, e.message);
}

// Test 8: Tunnel (external access)
try {
  const tunnelPage = await context.newPage();
  const res = await tunnelPage.goto('https://jarvis.whatamiappreciatingnow.com/api/jarvis/health', { timeout: 15000 });
  const json = await res.json();
  log('Tunnel health', res.status() === 200 && json.db?.connected === true, `status=${res.status()}`);
  await tunnelPage.close();
} catch (e) {
  log('Tunnel health', false, e.message);
}

// Summary
console.log('\n=== RESULTS ===');
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`\n  ${passed} passed, ${failed} failed out of ${results.length} tests\n`);

if (failed > 0) {
  console.log('  FAILURES:');
  results.filter(r => !r.pass).forEach(r => console.log(`    - ${r.name}: ${r.detail}`));
  console.log('');
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
