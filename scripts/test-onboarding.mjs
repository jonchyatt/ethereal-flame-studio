import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';
const results = [];
const SCREENSHOTS = 'scripts/screenshots';

function log(name, pass, detail = '') {
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${name}${detail ? ' — ' + detail : ''}`);
  results.push({ name, pass, detail });
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${SCREENSHOTS}/${name}.png`, fullPage: true });
}

console.log('\n=== Jarvis Full Onboarding + Tour Test (Chrome) ===\n');

const browser = await chromium.launch({
  channel: 'chrome',
  headless: false,
  args: ['--window-size=430,932'],  // Mobile-ish viewport like the phone screenshots
});

const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  permissions: ['microphone'],  // For voice features
});
const page = await context.newPage();

// Collect console errors
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

// Clear localStorage to force fresh onboarding
await page.goto(`${BASE}/jarvis/app?reset=true`, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2000);

// ============================================================
// STEP 1: Welcome Screen
// ============================================================
console.log('\n--- Step 1: Welcome ---');
await page.goto(`${BASE}/jarvis/app`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(1500);  // animation settle

const welcomeText = await page.textContent('body');
const hasWelcome = welcomeText.includes('Welcome to Jarvis');
log('Step 1: Welcome screen visible', hasWelcome);
await screenshot(page, '01-welcome');

// Click "Get Started"
const getStartedBtn = await page.$('button:has-text("Get Started")');
log('Step 1: "Get Started" button exists', getStartedBtn !== null);

if (getStartedBtn) {
  await getStartedBtn.click();
  await page.waitForTimeout(1000);
}

// ============================================================
// STEP 2: Choose Your Domains
// ============================================================
console.log('\n--- Step 2: Choose Domains ---');
await page.waitForTimeout(500);
const step2Text = await page.textContent('body');
const hasDomains = step2Text.includes('Choose your domains');
log('Step 2: Domain selection visible', hasDomains);
await screenshot(page, '02-domains');

// Try clicking some domain cards (they're buttons with domain names)
const domainNames = ['Ethereal Flame', 'CritFailVLogs', 'Reset Biology'];
for (const domain of domainNames) {
  try {
    const card = await page.$(`button:has-text("${domain}")`);
    if (card) {
      await card.click();
      await page.waitForTimeout(300);
      log(`Step 2: Toggle domain "${domain}"`, true);
    } else {
      log(`Step 2: Domain card "${domain}"`, false, 'not found');
    }
  } catch (e) {
    log(`Step 2: Domain "${domain}"`, false, e.message);
  }
}
await screenshot(page, '02-domains-selected');

// Click Continue
const continueBtn2 = await page.$('button:has-text("Continue")');
log('Step 2: Continue button exists', continueBtn2 !== null);
if (continueBtn2) {
  await continueBtn2.click();
  await page.waitForTimeout(1000);
}

// ============================================================
// STEP 3: Connect Your Data
// ============================================================
console.log('\n--- Step 3: Connect Data ---');
const step3Text = await page.textContent('body');
const hasConnect = step3Text.includes('Connect your data');
log('Step 3: Data connection visible', hasConnect);
await screenshot(page, '03-connect-data');

// Check for connected indicators
const hasNotionConnected = step3Text.includes('already connected') || step3Text.includes('Notion');
log('Step 3: Shows connected sources', hasNotionConnected);

// Click Continue
const continueBtn3 = await page.$('button:has-text("Continue")');
log('Step 3: Continue button exists', continueBtn3 !== null);
if (continueBtn3) {
  await continueBtn3.click();
  await page.waitForTimeout(1000);
}

// ============================================================
// STEP 4: Customize Home Screen
// ============================================================
console.log('\n--- Step 4: Customize Home ---');
const step4Text = await page.textContent('body');
const hasCustomize = step4Text.includes('Customize') || step4Text.includes('widget');
log('Step 4: Widget customization visible', hasCustomize);
await screenshot(page, '04-customize-home');

// Try clicking widget cards
const widgetButtons = await page.$$('button');
let widgetClicks = 0;
for (const btn of widgetButtons) {
  const text = await btn.textContent();
  if (text && !text.includes('Continue') && !text.includes('Back') && !text.includes('Get Started')) {
    // Might be a widget card
    try {
      await btn.click();
      widgetClicks++;
      await page.waitForTimeout(200);
      if (widgetClicks >= 2) break;  // Just test a couple
    } catch { /* element might have moved */ }
  }
}
log('Step 4: Widget cards clickable', widgetClicks > 0, `clicked ${widgetClicks}`);
await screenshot(page, '04-widgets-selected');

// Click Continue
const continueBtn4 = await page.$('button:has-text("Continue")');
log('Step 4: Continue button exists', continueBtn4 !== null);
if (continueBtn4) {
  await continueBtn4.click();
  await page.waitForTimeout(1000);
}

// ============================================================
// STEP 5: Notification Schedule
// ============================================================
console.log('\n--- Step 5: Schedule ---');
const step5Text = await page.textContent('body');
const hasSchedule = step5Text.includes('reach out') || step5Text.includes('schedule') || step5Text.includes('work');
log('Step 5: Schedule screen visible', hasSchedule);
await screenshot(page, '05-schedule');

// Try toggling day buttons (Su, M, T, W, Th, F, S)
const dayButtons = ['Su', 'S'];  // Toggle Sunday and Saturday
for (const day of dayButtons) {
  try {
    // Day buttons are small, look for exact text match
    const dayBtn = await page.$(`button:has-text("${day}")`);
    if (dayBtn) {
      await dayBtn.click();
      await page.waitForTimeout(200);
      log(`Step 5: Toggle day "${day}"`, true);
    }
  } catch (e) {
    log(`Step 5: Day button "${day}"`, false, e.message);
  }
}

// Check timeline visualization
const hasTimeline = step5Text.includes('day at a glance') || step5Text.includes('Focus') || step5Text.includes('Active');
log('Step 5: Timeline visible', hasTimeline);
await screenshot(page, '05-schedule-modified');

// Click Continue
const continueBtn5 = await page.$('button:has-text("Continue")');
log('Step 5: Continue button exists', continueBtn5 !== null);
if (continueBtn5) {
  await continueBtn5.click();
  await page.waitForTimeout(1000);
}

// ============================================================
// STEP 6: Preview & Tour Choice
// ============================================================
console.log('\n--- Step 6: Preview & Tour ---');
const step6Text = await page.textContent('body');
const hasPreview = step6Text.includes('day with Jarvis') || step6Text.includes('EXAMPLE BRIEFING') || step6Text.includes('Guided Tour');
log('Step 6: Preview screen visible', hasPreview);
await screenshot(page, '06-preview');

// Check for both action buttons
const tourBtn = await page.$('button:has-text("Start the Guided Tour")');
const skipLink = await page.$('button:has-text("Skip tour")');
log('Step 6: "Start the Guided Tour" button exists', tourBtn !== null);
log('Step 6: "Skip tour" option exists', skipLink !== null);

// ============================================================
// TEST PATH A: Start the Guided Tour
// ============================================================
console.log('\n--- Tour Flow ---');
if (tourBtn) {
  await tourBtn.click();
  console.log('  Clicked "Start the Guided Tour"...');
  await page.waitForTimeout(5000);  // Wait for shell mount + chat to open
  await screenshot(page, '07-tour-started');

  const tourPageText = await page.textContent('body');

  // Check if we got to the app (onboarding complete)
  const onApp = page.url().includes('/jarvis/app') && !page.url().includes('onboarding');
  log('Tour: Navigated to app', onApp, `url=${page.url()}`);

  // Check for chat panel
  const hasChatOpen = tourPageText.includes('Chat with Jarvis') || tourPageText.includes('Message Jarvis');
  log('Tour: Chat panel opened', hasChatOpen);

  // Check for Claude Code error
  const hasClaudeError = tourPageText.includes('exited with code 1') || tourPageText.includes('Claude Code process');
  log('Tour: No Claude exit error', !hasClaudeError, hasClaudeError ? 'CLAUDE CODE CRASHED' : 'OK');

  // Check for tour message
  const hasTourMsg = tourPageText.includes('guided tour') || tourPageText.includes('Start my guided');
  log('Tour: Tour message sent', hasTourMsg);

  // Wait for response from Jarvis
  console.log('  Waiting for Jarvis response (up to 30s)...');
  let gotResponse = false;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(3000);
    const currentText = await page.textContent('body');
    // Look for tutorial instruction content
    if (currentText.includes('Welcome') || currentText.includes('lesson') || currentText.includes('tap') || currentText.includes('click') || currentText.includes('navigate')) {
      gotResponse = true;
      break;
    }
    // Or any response that's not an error
    const chatMessages = await page.$$('[class*="message"], [data-role="assistant"]');
    if (chatMessages.length > 1) {
      gotResponse = true;
      break;
    }
  }
  log('Tour: Jarvis responded', gotResponse);
  await screenshot(page, '08-tour-response');

  // Check for spotlight overlay (tutorial element highlighting)
  const spotlight = await page.$('[class*="spotlight"], [data-spotlight], [class*="Spotlight"]');
  log('Tour: Spotlight overlay active', spotlight !== null);

  // Check for narration/TTS (audio element)
  const audio = await page.$('audio');
  log('Tour: Audio element present (TTS)', audio !== null);

  // Try interacting with tutorial steps
  console.log('\n  Attempting tutorial step interactions...');
  await page.waitForTimeout(2000);
  await screenshot(page, '09-tour-tutorial-state');

  // Check for tutorial step content
  const tutorialText = await page.textContent('body');
  const hasInstruction = tutorialText.includes('Tap') || tutorialText.includes('Click') || tutorialText.includes('Open') || tutorialText.includes('Navigate');
  log('Tour: Tutorial instruction visible', hasInstruction);

} else {
  log('Tour: Could not start (button missing)', false);
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n=== RESULTS ===');
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`\n  ${passed} passed, ${failed} failed out of ${results.length} tests\n`);

if (failed > 0) {
  console.log('  FAILURES:');
  results.filter(r => !r.pass).forEach(r => console.log(`    - ${r.name}: ${r.detail}`));
  console.log('');
}

if (consoleErrors.length > 0) {
  console.log(`  Console errors (${consoleErrors.length}):`);
  consoleErrors.slice(0, 10).forEach(e => console.log(`    - ${e.slice(0, 120)}`));
  console.log('');
}

console.log(`  Screenshots saved to ${SCREENSHOTS}/\n`);

await browser.close();
process.exit(failed > 0 ? 1 : 0);
