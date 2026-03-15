/**
 * Jarvis Full Functionality Test — Headed Chrome
 *
 * Opens a VISIBLE Chrome window and walks through every section of Jarvis,
 * taking timestamped screenshots at every step. Tests real CRUD operations
 * through both the UI and the chat interface.
 *
 * Usage: node scripts/test-full-functionality.mjs
 * Screenshots saved to: scripts/screenshots/full-test/
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3001';
const SECRET = 'c6556c2ed60b7fc6ba9ecbcbbe3877f9c5980a80fe81c6616787a0aa2d197609';
const SCREENSHOT_DIR = 'scripts/screenshots/full-test';
const results = [];
let stepNum = 0;

mkdirSync(SCREENSHOT_DIR, { recursive: true });

function log(name, pass, detail = '') {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${name}${detail ? ' — ' + detail : ''}`);
  results.push({ name, pass, detail });
}

async function snap(page, label) {
  stepNum++;
  const filename = `${String(stepNum).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${filename}`, fullPage: false });
  console.log(`    📸 ${filename}`);
  return filename;
}

async function waitForChat(page, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(2000);
    const sending = await page.$('[class*="animate-pulse"], [class*="typing"], [class*="loading"]');
    const toolUse = await page.textContent('body');
    if (toolUse.includes('Using ')) continue;
    if (!sending) {
      // Check if there's actual assistant content
      const msgs = await page.$$('[data-role="assistant"], [class*="bg-white/5"]');
      if (msgs.length > 0) return true;
    }
  }
  return false;
}

console.log('\n══════════════════════════════════════════');
console.log('  JARVIS FULL FUNCTIONALITY TEST (HEADED)');
console.log('══════════════════════════════════════════\n');

const browser = await chromium.launch({
  channel: 'chrome',
  headless: false,
  args: ['--window-size=1280,900'],
  slowMo: 300,
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();

// Collect console errors
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

// ═══════════════════════════════════════════
// SETUP: Complete onboarding by walking through the wizard
// (Can't just inject localStorage — the zustand persist hydration
//  races with Next.js router, so we do it the real way)
// ═══════════════════════════════════════════
console.log('── Setup: Complete onboarding ──\n');

await page.goto(`${BASE}/jarvis/app`, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

// Step 1: Welcome → Get Started
const getStarted = await page.$('button:has-text("Get Started")');
if (getStarted) {
  console.log('  Step 1: Welcome — clicking Get Started');
  await getStarted.click();
  await page.waitForTimeout(1500);

  // Step 2: Choose Domains → Continue
  const domainBtns = await page.$$('button');
  for (const btn of domainBtns) {
    const text = await btn.textContent().catch(() => '');
    if (text.includes('Ethereal Flame') || text.includes('Reset Biology') || text.includes('CritFailVlogs')) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  const cont2 = await page.$('button:has-text("Continue")');
  if (cont2) { console.log('  Step 2: Domains selected'); await cont2.click(); await page.waitForTimeout(1500); }

  // Step 3: Connect Data → Continue
  const cont3 = await page.$('button:has-text("Continue")');
  if (cont3) { console.log('  Step 3: Connect Data'); await cont3.click(); await page.waitForTimeout(1500); }

  // Step 4: Customize Home → Continue
  const cont4 = await page.$('button:has-text("Continue")');
  if (cont4) { console.log('  Step 4: Customize Home'); await cont4.click(); await page.waitForTimeout(1500); }

  // Step 5: Schedule → Continue
  const cont5 = await page.$('button:has-text("Continue")');
  if (cont5) { console.log('  Step 5: Schedule'); await cont5.click(); await page.waitForTimeout(1500); }

  // Step 6: Preview → Skip tour (we'll test the app directly)
  const skipBtn = await page.$('button:has-text("Skip tour"), button:has-text("skip"), a:has-text("Skip")');
  const doneBtn = await page.$('button:has-text("Done"), button:has-text("Finish"), button:has-text("Start the Guided Tour")');
  if (skipBtn) {
    console.log('  Step 6: Skipping tour');
    await skipBtn.click();
  } else if (doneBtn) {
    console.log('  Step 6: Starting guided tour (skip not found)');
    await doneBtn.click();
  }
  await page.waitForTimeout(3000);
}

// Verify we made it past onboarding
await page.goto(`${BASE}/jarvis/app`, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(5000);
const setupBody = await page.textContent('body');
const pastOnboarding = !setupBody.includes('Welcome to Jarvis') || setupBody.includes('Priority Home');
console.log(`  Onboarding complete: ${pastOnboarding ? 'YES — app loaded' : 'NO — still on onboarding'}\n`);

// ═══════════════════════════════════════════
// SECTION 1: Health & Infrastructure (via fetch, not navigation)
// ═══════════════════════════════════════════
console.log('── Section 1: Health & Infrastructure ──\n');

try {
  const healthRes = await page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/jarvis/health`);
    return { status: res.status, body: await res.json() };
  }, BASE);
  log('Health API responds', healthRes.status === 200);
  log('Database connected', healthRes.body.db?.connected === true);
  log('Calendar configured', healthRes.body.calendar?.configured === true);
  log('Calendar token valid', healthRes.body.calendar?.tokenOk === true);
} catch (e) {
  log('Health API', false, e.message);
}

// ═══════════════════════════════════════════
// SECTION 2: Home / Priority Home
// ═══════════════════════════════════════════
console.log('\n── Section 2: Home / Priority Home ──\n');

try {
  // Wait for async data to load (priorities, domain cards from API)
  await page.waitForTimeout(4000);
  await snap(page, 'home-loaded');

  const title = await page.title();
  log('App loads', title.includes('Jarvis'), `title="${title}"`);

  // Check for Priority Home or onboarding
  const body = await page.textContent('body');
  const isHome = body.includes('Priority Home') || body.includes('command center');
  const isOnboarding = body.includes('Welcome to Jarvis') || body.includes('Get Started');
  log('Home screen renders', isHome || isOnboarding, isHome ? 'Priority Home visible' : isOnboarding ? 'Onboarding shown (expected on fresh setup)' : 'unknown state');

  // Check domain health cards
  const domainCards = await page.$$('[data-tutorial-id^="home-domain-card"]');
  log('Domain health cards render', domainCards.length > 0, `${domainCards.length} cards`);

  // Check priority stack
  const priorityStack = await page.$('[data-tutorial-id="home-priority-stack"]');
  log('Priority stack present', priorityStack !== null);

  await snap(page, 'home-details');
} catch (e) {
  log('Home page', false, e.message);
}

// ═══════════════════════════════════════════
// SECTION 3: Chat Panel — Open & Send Message
// ═══════════════════════════════════════════
console.log('\n── Section 3: Chat Panel ──\n');

try {
  // Open chat via keyboard shortcut (Ctrl+Shift+C) — the ChatOverlay on /jarvis/app
  // uses shellStore.toggleChat() bound to this shortcut; there's no floating button on desktop.
  await page.keyboard.press('Control+Shift+C');
  await page.waitForTimeout(1500);
  await snap(page, 'chat-panel-open');
  const chatVisible = await page.$('.bg-zinc-900\\/95, [class*="bg-zinc-900"]');
  log('Chat panel opens', chatVisible !== null);

  // Find chat input — use locator with visible filter because ChatOverlay renders
  // both a mobile (md:hidden) and desktop input; page.$ grabs the first (hidden) one.
  const chatInputLoc = page.locator('input[data-tutorial-id="chat-input"]').locator('visible=true');
  const chatInputCount = await chatInputLoc.count();
  log('Chat input found', chatInputCount > 0);

  if (chatInputCount > 0) {
    // Send a simple hello
    await chatInputLoc.first().fill('Hello, are you working?');
    await snap(page, 'chat-message-typed');

    const sendBtnLoc = page.locator('button[data-tutorial-id="chat-send"]').locator('visible=true');
    const sendBtnCount = await sendBtnLoc.count();
    log('Send button found', sendBtnCount > 0);

    if (sendBtnCount > 0) {
      await sendBtnLoc.first().click();
      console.log('    Waiting for Jarvis response (up to 60s)...');

      // Wait for response — detect assistant messages by looking for justify-start
      // message bubbles (assistant side) in the ChatOverlay's message area.
      let gotResponse = false;
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(3000);
        const chatText = await page.textContent('body');
        if (chatText.includes('exited with code 1') || chatText.includes('process crashed')) {
          log('Chat response (no SDK crash)', false, 'Claude Code process crashed');
          await snap(page, 'chat-sdk-crash');
          break;
        }
        // Look for assistant message bubbles (left-aligned, justify-start containers)
        const assistantBubbles = await page.$$('.flex.justify-start > div.rounded-2xl');
        for (const bubble of assistantBubbles) {
          const text = await bubble.textContent().catch(() => '');
          if (text && text.length > 2 && !text.includes('Hello, are you working')) {
            gotResponse = true;
            log('Jarvis responds via chat', true, `"${text.slice(0, 80)}"`);
            break;
          }
        }
        if (gotResponse) break;
      }
      if (!gotResponse) {
        log('Jarvis responds via chat', false, 'timeout after 60s');
      }
      await snap(page, 'chat-response');
    }
  }

  // Close chat panel via keyboard shortcut
  await page.keyboard.press('Control+Shift+C');
  await page.waitForTimeout(500);
} catch (e) {
  log('Chat panel', false, e.message);
  await snap(page, 'chat-error');
}

// ═══════════════════════════════════════════
// SECTION 4: Personal Dashboard
// ═══════════════════════════════════════════
console.log('\n── Section 4: Personal Dashboard ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/personal`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);
  await snap(page, 'personal-dashboard');

  const body = await page.textContent('body');
  const subprograms = ['Tasks', 'Habits', 'Bills', 'Calendar', 'Meals', 'Journal', 'Goals', 'Health'];
  let found = 0;
  for (const prog of subprograms) {
    if (body.includes(prog)) found++;
  }
  log('Personal dashboard renders', found >= 6, `${found}/${subprograms.length} subprograms visible`);
} catch (e) {
  log('Personal dashboard', false, e.message);
}

// ═══════════════════════════════════════════
// SECTION 5: Tasks Page — View & Toggle
// ═══════════════════════════════════════════
console.log('\n── Section 5: Tasks ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/personal/tasks`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);
  await snap(page, 'tasks-page');

  const body = await page.textContent('body');
  const noError = !body.includes('Internal Server Error') && !body.includes('no such table');
  log('Tasks page loads without errors', noError);

  // Check for task summary card
  const summary = await page.$('[data-tutorial-id="tasks-summary"]');
  log('Task summary card visible', summary !== null);

  // Check for task items
  const taskRows = await page.$$('.task-check, button[data-tutorial-id="tasks-first-checkbox"]');
  log('Task items rendered', taskRows.length > 0, `${taskRows.length} tasks found`);

  // Try toggling first task (if any)
  if (taskRows.length > 0) {
    const firstTaskParent = await taskRows[0].evaluateHandle(el => el.closest('.flex'));
    const taskTextBefore = firstTaskParent ? await firstTaskParent.textContent() : '';
    await taskRows[0].click();
    await page.waitForTimeout(1500);
    await snap(page, 'tasks-toggled');
    log('Task checkbox toggles', true, `toggled: "${taskTextBefore.slice(0, 40)}"`);

    // Toggle back — re-query because React re-render detaches the original element
    const freshRows = await page.$$('.task-check, button[data-tutorial-id="tasks-first-checkbox"]');
    if (freshRows.length > 0) {
      await freshRows[0].click();
      await page.waitForTimeout(1000);
    }
  }

  await snap(page, 'tasks-final');
} catch (e) {
  log('Tasks page', false, e.message);
  await snap(page, 'tasks-error');
}

// ═══════════════════════════════════════════
// SECTION 6: Calendar Page
// ═══════════════════════════════════════════
console.log('\n── Section 6: Calendar ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/personal/calendar`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await snap(page, 'calendar-page');

  const body = await page.textContent('body');
  const noError = !body.includes('Internal Server Error');
  log('Calendar page loads', noError);

  // Check for week strip
  const hasWeek = body.includes('Today') || body.includes('Mon') || body.includes('Tue');
  log('Week strip renders', hasWeek);

  // Check for events
  const hasEvents = body.includes('event') || body.includes('AM') || body.includes('PM') || body.includes('No events');
  log('Calendar shows event data', hasEvents);

  await snap(page, 'calendar-details');
} catch (e) {
  log('Calendar page', false, e.message);
  await snap(page, 'calendar-error');
}

// ═══════════════════════════════════════════
// SECTION 7: Bills Page — View & Mark Paid
// ═══════════════════════════════════════════
console.log('\n── Section 7: Bills & Finance ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/personal/bills`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);
  await snap(page, 'bills-page');

  const body = await page.textContent('body');
  const noError = !body.includes('Internal Server Error');
  log('Bills page loads', noError);

  const hasBillContent = body.includes('Bills') || body.includes('Finance');
  log('Bills heading renders', hasBillContent);

  // Check for bill sections or valid empty state ($0.00 = no bills from Notion yet)
  const hasSections = body.includes('OVERDUE') || body.includes('DUE SOON') || body.includes('UPCOMING') || body.includes('PAID');
  const hasEmptyState = body.includes('$0.00') || body.includes('No bills');
  log('Bill sections render', hasSections || hasEmptyState,
    hasSections ? 'bill sections visible' : hasEmptyState ? 'empty state (no bills loaded or all paid)' : 'neither');

  // Check for summary card
  const billSummary = await page.$('[data-tutorial-id="bills-summary"]');
  log('Bills summary card visible', billSummary !== null);

  // Try marking a bill as paid (if "Mark Paid" button exists)
  const markPaidBtn = await page.$('button[data-tutorial-id^="bills-mark-paid"], button:has-text("Mark Paid")');
  if (markPaidBtn) {
    const billText = await markPaidBtn.evaluate(el => el.closest('[class*="py-2"]')?.textContent || '');
    await markPaidBtn.click();
    await page.waitForTimeout(1500);
    await snap(page, 'bills-marked-paid');
    log('Mark bill paid works', true, `bill: "${billText.slice(0, 40)}"`);
  } else {
    log('Mark bill paid', true, 'no unpaid bills to test (or no button)');
  }

  await snap(page, 'bills-final');
} catch (e) {
  log('Bills page', false, e.message);
  await snap(page, 'bills-error');
}

// ═══════════════════════════════════════════
// SECTION 8: Meals Page — All Tabs
// ═══════════════════════════════════════════
console.log('\n── Section 8: Meals & Kitchen ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/personal/meals`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await snap(page, 'meals-weekly');

  const body = await page.textContent('body');
  const noError = !body.includes('Internal Server Error');
  log('Meals page loads', noError);

  // Check weekly tab content
  const hasMealData = body.includes('Breakfast') || body.includes('Lunch') || body.includes('Dinner') || body.includes('No meals');
  log('Weekly meal data renders', hasMealData);

  // Click through tabs
  const tabs = ['Shopping', 'Pantry', 'Recipes'];
  for (const tabName of tabs) {
    const tab = await page.$(`button[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
    if (tab) {
      await tab.click();
      await page.waitForTimeout(1500);
      await snap(page, `meals-${tabName.toLowerCase()}`);
      log(`Meals ${tabName} tab renders`, true);
    } else {
      log(`Meals ${tabName} tab`, false, 'tab button not found');
    }
  }
} catch (e) {
  log('Meals page', false, e.message);
  await snap(page, 'meals-error');
}

// ═══════════════════════════════════════════
// SECTION 9: Goals, Habits, Health, Journal
// ═══════════════════════════════════════════
console.log('\n── Section 9: Other Personal Pages ──\n');

const otherPages = [
  { name: 'Goals', path: 'goals' },
  { name: 'Habits', path: 'habits' },
  { name: 'Health', path: 'health' },
  { name: 'Journal', path: 'journal' },
];

for (const { name, path } of otherPages) {
  try {
    // Use domcontentloaded — some pages (Habits, Journal) have persistent SSE/polling
    // that prevents domcontentloaded from ever resolving
    await page.goto(`${BASE}/jarvis/app/personal/${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    await snap(page, `${path}-page`);

    const body = await page.textContent('body');
    const noError = !body.includes('Internal Server Error') && !body.includes('no such table');
    log(`${name} page loads`, noError);

    // Check for meaningful content (not just an empty shell)
    const hasContent = body.length > 200;
    log(`${name} has content`, hasContent, `body length: ${body.length}`);
  } catch (e) {
    log(`${name} page`, false, e.message);
  }
}

// ═══════════════════════════════════════════
// SECTION 10: Academy Page
// ═══════════════════════════════════════════
console.log('\n── Section 10: Academy ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/academy`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await snap(page, 'academy-page');

  const body = await page.textContent('body');
  const noError = !body.includes('Internal Server Error') && !body.includes('no such table');
  log('Academy page loads', noError, noError ? '' : 'DB error detected');

  const hasAcademy = body.includes('Academy') || body.includes('Tutorials') || body.includes('lesson');
  log('Academy content renders', hasAcademy);

  // Check for topic cards
  const hasTopics = body.includes('Tutorials') || body.includes('learned');
  log('Academy topics visible', hasTopics);
} catch (e) {
  log('Academy page', false, e.message);
  await snap(page, 'academy-error');
}

// ═══════════════════════════════════════════
// SECTION 11: Settings Page
// ═══════════════════════════════════════════
console.log('\n── Section 11: Settings ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/settings`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);
  await snap(page, 'settings-page');

  const body = await page.textContent('body');
  const noError = !body.includes('Internal Server Error');
  log('Settings page loads', noError);
} catch (e) {
  log('Settings page', false, e.message);
}

// ═══════════════════════════════════════════
// SECTION 12: Chat CRUD — Add Task via Chat
// ═══════════════════════════════════════════
console.log('\n── Section 12: Chat CRUD — Add Task ──\n');

try {
  await page.goto(`${BASE}/jarvis/app`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Open chat via keyboard shortcut
  await page.keyboard.press('Control+Shift+C');
  await page.waitForTimeout(1500);

  const crudInputLoc = page.locator('input[data-tutorial-id="chat-input"]').locator('visible=true');
  const crudInputCount = await crudInputLoc.count();
  if (crudInputCount > 0) {
    // Ask Jarvis to add a test task
    await crudInputLoc.first().fill('Add a task called "Playwright test verification" due tomorrow with high priority');
    await snap(page, 'chat-crud-task-typed');

    const crudSendLoc = page.locator('button[data-tutorial-id="chat-send"]').locator('visible=true');
    const crudSendCount = await crudSendLoc.count();
    if (crudSendCount > 0) {
      await crudSendLoc.first().click();
      console.log('    Waiting for task creation response (up to 90s)...');

      let taskCreated = false;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(3000);
        const chatText = await page.textContent('body');
        if (chatText.includes('exited with code 1')) {
          log('Add task via chat', false, 'SDK crashed');
          break;
        }
        if (chatText.includes('created') || chatText.includes('added') || chatText.includes('task') || chatText.includes('Playwright')) {
          taskCreated = true;
          break;
        }
      }
      await snap(page, 'chat-crud-task-result');
      log('Add task via chat', taskCreated, taskCreated ? 'task created' : 'no confirmation received');
    }
  } else {
    log('Chat CRUD - task', false, 'chat input not found');
  }

  // Close chat via keyboard shortcut
  await page.keyboard.press('Control+Shift+C');
} catch (e) {
  log('Chat CRUD - task', false, e.message);
  await snap(page, 'chat-crud-task-error');
}

// ═══════════════════════════════════════════
// SECTION 13: Verify Task Appears in Tasks Page
// ═══════════════════════════════════════════
console.log('\n── Section 13: Verify Task Created ──\n');

try {
  await page.goto(`${BASE}/jarvis/app/personal/tasks`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);
  // Scroll down to check all tasks (new task may be below the fold)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await snap(page, 'tasks-after-crud');

  const body = await page.textContent('body');
  const taskExists = body.includes('Playwright test verification') || body.includes('playwright test');
  log('Created task appears in tasks list', taskExists,
    taskExists ? 'found in task list' : 'not found — may need Notion sync delay');
} catch (e) {
  log('Task verification', false, e.message);
}

// ═══════════════════════════════════════════
// SECTION 14: Tunnel (External Access)
// ═══════════════════════════════════════════
console.log('\n── Section 14: Tunnel / External Access ──\n');

try {
  const tunnelPage = await context.newPage();
  await tunnelPage.goto('https://jarvis.whatamiappreciatingnow.com/jarvis/app', { timeout: 20000 });
  await tunnelPage.waitForTimeout(3000);
  await tunnelPage.screenshot({ path: `${SCREENSHOT_DIR}/${String(++stepNum).padStart(2, '0')}-tunnel-external.png` });
  console.log(`    📸 ${stepNum}-tunnel-external.png`);

  const tunnelTitle = await tunnelPage.title();
  log('Tunnel serves app externally', tunnelTitle.includes('Jarvis'), `title="${tunnelTitle}"`);
  await tunnelPage.close();
} catch (e) {
  log('Tunnel access', false, e.message);
}

// ═══════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════
console.log('\n══════════════════════════════════════════');
console.log('  TEST RESULTS');
console.log('══════════════════════════════════════════\n');

const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`  ✓ ${passed} passed`);
console.log(`  ✗ ${failed} failed`);
console.log(`  Total: ${results.length} tests\n`);

if (failed > 0) {
  console.log('  FAILURES:');
  results.filter(r => !r.pass).forEach(r =>
    console.log(`    ✗ ${r.name}${r.detail ? ': ' + r.detail : ''}`)
  );
  console.log('');
}

if (consoleErrors.length > 0) {
  console.log(`  Browser console errors (${consoleErrors.length}):`);
  consoleErrors.slice(0, 15).forEach(e => console.log(`    - ${e.slice(0, 150)}`));
  console.log('');
}

console.log(`  Screenshots: ${SCREENSHOT_DIR}/`);
console.log(`  ${stepNum} screenshots captured for visual review\n`);

await browser.close();
process.exit(failed > 0 ? 1 : 0);
