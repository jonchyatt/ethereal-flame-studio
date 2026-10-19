/**
 * Scripted TEST-MODE purchase of "Advanced hypnosis sessions" through the real
 * route handlers: checkout route -> Stripe -> signed webhook -> access opens.
 * See docs/GO-LIVE.md.
 *
 *   npx tsx scripts/store/purchase-test.ts
 *       Stripe is stubbed in-process (no key, no network). Proves our side end to end.
 *   STRIPE_TEST_SECRET_KEY=sk_test_... npx tsx scripts/store/purchase-test.ts --real
 *       Real Stripe test mode: prints the Checkout URL; pay it with card 4242 4242 4242 4242,
 *       any future date, any CVC. The script polls Stripe until the session is paid, then
 *       delivers that real session to our webhook as a signed event.
 *
 * Writes docs/receipts/test-purchase-<date>[-real].md. Exits 1 if any check fails.
 * Refuses to run when WAIA_PAYMENTS_LIVE is on: this script never touches live mode.
 * Storage is a fresh temp folder, never production storage.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createHmac, randomBytes } from 'crypto';
import { execSync } from 'child_process';

const REAL = process.argv.includes('--real');
const PROGRAM = 'advanced-hypnosis-sessions';
const ORIGIN = 'http://localhost:3000';

if ((process.env.WAIA_PAYMENTS_LIVE ?? '').trim().toLowerCase() === 'on') {
  console.error('WAIA_PAYMENTS_LIVE is on; this script only runs in test mode.');
  process.exit(2);
}
if (REAL && !/^(sk|rk)_test_/.test(process.env.STRIPE_TEST_SECRET_KEY ?? '')) {
  console.error('--real needs STRIPE_TEST_SECRET_KEY=sk_test_... (a test-mode key).');
  process.exit(2);
}

process.env.STORAGE_BACKEND = 'local';
process.env.STORAGE_LOCAL_PATH = mkdtempSync(path.join(tmpdir(), 'waia-test-purchase-'));
process.env.ENTITLEMENT_COOKIE_SECRET ||= randomBytes(32).toString('hex');
process.env.STRIPE_TEST_WEBHOOK_SECRET ||= `whsec_${randomBytes(16).toString('hex')}`;
if (!REAL) process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_local_stub';
const WHSEC = process.env.STRIPE_TEST_WEBHOOK_SECRET;

// Record every checkout request we send to Stripe; in stub mode, answer it ourselves.
const stripeBodies: Record<string, string>[] = [];
const stubSessions = new Map<string, Record<string, any>>();
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith('https://api.stripe.com/')) return realFetch(input, init);
  if (init?.method === 'POST' && url.endsWith('/v1/checkout/sessions')) {
    stripeBodies.push(Object.fromEntries(new URLSearchParams(String(init.body))));
  }
  if (REAL) return realFetch(input, init);
  const b = stripeBodies[stripeBodies.length - 1];
  const id = `cs_test_stub_${randomBytes(8).toString('hex')}`;
  const s = {
    id, object: 'checkout.session', livemode: false, url: `https://checkout.stripe.com/c/pay/${id}`,
    mode: b['mode'], client_reference_id: b['client_reference_id'], metadata: { programId: b['metadata[programId]'] },
    amount_total: Number(b['line_items[0][price_data][unit_amount]']), currency: b['line_items[0][price_data][currency]'],
    payment_status: 'paid', status: 'complete', customer: 'cus_stub_stripe', subscription: 'sub_test_stub',
  };
  stubSessions.set(id, s);
  return new Response(JSON.stringify(s), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

async function retrievePaidSession(id: string): Promise<Record<string, any>> {
  if (!REAL) return stubSessions.get(id)!;
  const deadline = Date.now() + 15 * 60_000;
  for (;;) {
    const r = await realFetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_TEST_SECRET_KEY}` },
    });
    const s = (await r.json()) as Record<string, any>;
    if (s.livemode) throw new Error('Stripe returned a live-mode session; stopping');
    if (s.payment_status === 'paid') return s;
    if (Date.now() > deadline) throw new Error(`session ${id} not paid within 15 minutes`);
    await new Promise((res) => setTimeout(res, 5000));
  }
}

const sign = (payload: string, secret: string) => {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;
};

async function main() {
  const { NextRequest } = await import('next/server');
  const checkout = await import('../../src/app/api/programs/checkout/route');
  const webhook = await import('../../src/app/api/programs/webhook/route');
  const content = await import('../../src/app/api/programs/[id]/content/route');
  const { getStorageAdapter } = await import('../../src/lib/storage');
  const { getProgram } = await import('../../src/lib/entitlements/catalog');
  const { chargeCents } = await import('../../src/lib/entitlements/stripe');

  const program = getProgram(PROGRAM)!;
  const expectedCents = chargeCents(program);
  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail: string) => { checks.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}: ${detail}`); };

  // A fixture in the temp storage stands in for the program words (never real content).
  await getStorageAdapter().put(`programs/${PROGRAM}.md`, Buffer.from('TEST FIXTURE: access is open. Not program content.'));

  const readContent = (cookie?: string) => content.GET(
    new NextRequest(`${ORIGIN}/api/programs/${PROGRAM}/content`, { headers: cookie ? { cookie } : {} }),
    { params: Promise.resolve({ id: PROGRAM }) },
  );
  const buy = () => checkout.POST(new NextRequest(`${ORIGIN}/api/programs/checkout`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ programId: PROGRAM }),
  }));
  const deliver = (ev: object, secret = WHSEC) => {
    const payload = JSON.stringify(ev);
    return webhook.POST(new NextRequest(`${ORIGIN}/api/programs/webhook`, {
      method: 'POST', headers: { 'stripe-signature': sign(payload, secret) }, body: payload,
    }));
  };

  check('locked before purchase', (await readContent()).status === 402, 'content without a cookie answers 402');

  const res = await buy();
  const json = (await res.json()) as { url?: string };
  const cookieValue = res.cookies.get('waia_customer')?.value ?? '';
  const customerId = cookieValue.split('.')[0];
  check('checkout opens', res.status === 200 && /^https:\/\/checkout\.stripe\.com\//.test(json.url ?? ''), `${res.status}, ${json.url ?? 'no url'}`);
  check('customer cookie set', /^cus_[0-9a-f]{32}$/.test(customerId), `waia_customer=${customerId.slice(0, 12)}... (signed)`);

  const sent = stripeBodies[0] ?? {};
  check('Stripe asked for the right thing',
    sent['mode'] === 'subscription' && sent['line_items[0][price_data][unit_amount]'] === String(expectedCents)
      && sent['line_items[0][price_data][currency]'] === 'usd' && sent['line_items[0][price_data][recurring][interval]'] === 'month'
      && sent['client_reference_id'] === customerId && sent['metadata[programId]'] === PROGRAM,
    `subscription, ${expectedCents} cents USD a month, client_reference_id and programId match`);

  const cookie = `waia_customer=${cookieValue}`;
  check('still locked before payment confirms', (await readContent(cookie)).status === 402, 'cookie alone opens nothing');

  // Hosted Checkout URLs carry the session id (cs_test_...) in their path.
  const sessionId = (json.url ?? '').match(/cs_test_[A-Za-z0-9_]+/)?.[0];
  if (!sessionId) throw new Error(`no test session id in ${json.url}`);
  if (REAL) console.log(`\nPay this test-mode Checkout page with card 4242 4242 4242 4242:\n${json.url}\nWaiting for Stripe to report it paid...\n`);
  const session = await retrievePaidSession(sessionId);
  check('Stripe reports paid', session.payment_status === 'paid' && session.livemode === false, `${session.id}, payment_status=${session.payment_status}, livemode=${session.livemode}`);

  const event = { id: `evt_test_${randomBytes(8).toString('hex')}`, type: 'checkout.session.completed', livemode: false, data: { object: session } };
  check('forged webhook refused', (await deliver(event, 'whsec_wrong')).status === 400, 'wrong signature answers 400');
  const w = await deliver(event);
  const wj = (await w.json()) as { action?: string };
  check('signed webhook grants access', w.status === 200 && wj.action === 'grant', `${w.status}, action=${wj.action}`);

  const after = await readContent(cookie);
  const body = await after.text();
  check('unlocked after purchase', after.status === 200 && body.includes('TEST FIXTURE'), `${after.status}, program content served to the buyer`);

  await deliver(event);
  check('replayed webhook is harmless', (await readContent(cookie)).status === 200, 'same event id twice, access unchanged');

  const liveEv = { ...event, id: `evt_live_${randomBytes(8).toString('hex')}`, livemode: true };
  const lj = (await (await deliver(liveEv)).json()) as { action?: string };
  check('live-mode event ignored in test mode', lj.action === 'ignore', `action=${lj.action}`);

  const savedKey = process.env.STRIPE_TEST_SECRET_KEY;
  process.env.STRIPE_TEST_SECRET_KEY = 'sk_live_not_a_real_key';
  check('a live key is refused in test mode', (await buy()).status === 503, 'checkout answers 503 "Not yet on sale"');
  process.env.STRIPE_TEST_SECRET_KEY = savedKey;

  const passed = checks.every((c) => c.pass);
  const date = new Date().toLocaleDateString('en-CA');
  let commit = 'unknown';
  try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a git checkout */ }
  const receipt = [
    `# Test purchase receipt, ${date}${REAL ? ' (real Stripe test mode)' : ''}`,
    '',
    `Result: **${passed ? 'PASS' : 'FAIL'}** (${checks.filter((c) => c.pass).length}/${checks.length} checks)`,
    '',
    `- Run: \`npx tsx scripts/store/purchase-test.ts${REAL ? ' --real' : ''}\` at ${new Date().toISOString()}, commit ${commit}`,
    `- Stripe: ${REAL ? 'real Stripe API, test mode (paid with a Stripe test card)' : 'stubbed in-process. No call reached Stripe; this proves our checkout, webhook and access code, not Stripe itself. Run with `--real` and a test key for that.'}`,
    `- Payments switch: WAIA_PAYMENTS_LIVE unset (test mode). Storage: a fresh temp folder, not production.`,
    `- Product: ${program.title} (\`${PROGRAM}\`), ${program.kind}, charged ${expectedCents} cents USD a month (${program.priceCents === null ? 'test price: no real price is set yet' : 'the set price'})`,
    `- Checkout session: \`${session.id}\`; webhook event: \`${event.id}\`; customer: \`${customerId.slice(0, 12)}...\``,
    '',
    '| Check | Result | Detail |',
    '|---|---|---|',
    ...checks.map((c) => `| ${c.name} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '/')} |`),
    '',
  ].join('\n');
  mkdirSync('docs/receipts', { recursive: true });
  const out = `docs/receipts/test-purchase-${date}${REAL ? '-real' : ''}.md`;
  writeFileSync(out, receipt);
  console.log(`\n${passed ? 'PASS' : 'FAIL'}: receipt written to ${out}`);
  process.exit(passed ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
