import { createHmac } from 'crypto';

const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
  }),
}));

import { FREE_TOOLS, PROGRAMS, getProgram } from '../catalog';
import { GRACE_DAYS, grantAccess, hasAccess, loadRecord, markPastDue, revokeAccess, setCancelAtPeriodEnd, summarizeAccess } from '../model';
import { newCustomerId, signCustomerId, verifyCustomerCookie } from '../session';
import { PaymentsNotConfigured, actionForEvent, chargeCents, createCheckoutSession, createPortalSession, paymentsLive, secretKey, testSecretKey, verifyWebhook } from '../stripe';

const cus = 'cus_' + 'a'.repeat(32);
beforeEach(() => { files.clear(); process.env.ENTITLEMENT_COOKIE_SECRET = 'x'.repeat(32); });

describe('catalog', () => {
  it('never contains a free tool', () => {
    for (const f of FREE_TOOLS) expect(getProgram(f)).toBeNull();
    expect(PROGRAMS.every((p) => p.priceCents === null)).toBe(true);
  });
});

describe('access', () => {
  it('denies by default and for unknown programs', async () => {
    expect(hasAccess(await loadRecord(cus), 'yale-inversion-protocol')).toBe(false);
    await expect(grantAccess({ customerId: cus, programId: 'peptide-tracker' })).rejects.toThrow();
  });
  it('one-time purchase never expires; revoke closes it', async () => {
    await grantAccess({ customerId: cus, programId: 'yale-inversion-protocol' });
    const far = new Date('2099-01-01');
    expect(hasAccess(await loadRecord(cus), 'yale-inversion-protocol', far)).toBe(true);
    await revokeAccess(cus, 'yale-inversion-protocol');
    expect(hasAccess(await loadRecord(cus), 'yale-inversion-protocol')).toBe(false);
  });
  it('subscription lapses at period end and a renewal extends it', async () => {
    const id = 'advanced-hypnosis-sessions';
    await grantAccess({ customerId: cus, programId: id, expiresAt: '2026-11-01T00:00:00.000Z' });
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-10-20'))).toBe(true);
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-11-02'))).toBe(false);
    await grantAccess({ customerId: cus, programId: id, expiresAt: '2026-12-01T00:00:00.000Z' });
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-11-02'))).toBe(true);
  });
  it('a subscription grant without an end date does not open', async () => {
    await grantAccess({ customerId: cus, programId: 'advanced-hypnosis-sessions' });
    expect(hasAccess(await loadRecord(cus), 'advanced-hypnosis-sessions')).toBe(false);
  });
  it('is idempotent per event id', async () => {
    const a = { customerId: cus, programId: 'yale-inversion-protocol', eventId: 'evt_1' };
    await grantAccess(a);
    await revokeAccess(cus, 'yale-inversion-protocol');
    await grantAccess(a); // replay must not reopen
    expect(hasAccess(await loadRecord(cus), 'yale-inversion-protocol')).toBe(false);
  });
});

describe('customer cookie', () => {
  it('round-trips and rejects forgeries', () => {
    const id = newCustomerId();
    expect(verifyCustomerCookie(signCustomerId(id))).toBe(id);
    expect(verifyCustomerCookie(signCustomerId(id).replace(/.$/, 'x'))).toBeNull();
    expect(verifyCustomerCookie(`${cus}.forged`)).toBeNull();
    expect(verifyCustomerCookie(undefined)).toBeNull();
  });
  it('fails closed without a secret', () => {
    delete process.env.ENTITLEMENT_COOKIE_SECRET;
    expect(() => signCustomerId(cus)).toThrow();
  });
});

describe('stripe adapter', () => {
  it('refuses live keys and missing keys', () => {
    delete process.env.STRIPE_TEST_SECRET_KEY;
    expect(() => testSecretKey()).toThrow(/not set/);
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_live_abc';
    expect(() => testSecretKey()).toThrow(/test-mode/);
  });
  it('builds a test checkout and refuses a live session back', async () => {
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_abc';
    const calls: any[] = [];
    const mk = (livemode: boolean) => (async (url: string, init: any) => {
      calls.push({ url, body: init.body.toString() });
      return { ok: true, json: async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/x', livemode }) };
    }) as unknown as typeof fetch;
    const program = getProgram('advanced-hypnosis-sessions')!;
    const args = { program, customerId: cus, successUrl: 'https://s', cancelUrl: 'https://c' };
    await expect(createCheckoutSession(args, mk(false))).resolves.toEqual({ id: 'cs_1', url: 'https://checkout.stripe.com/x' });
    expect(calls[0].body).toContain('mode=subscription');
    expect(calls[0].body).toContain(`client_reference_id=${cus}`);
    await expect(createCheckoutSession(args, mk(true))).rejects.toThrow(/live-mode/);
  });
  describe('the one live switch (WAIA_PAYMENTS_LIVE)', () => {
    const keys = ['WAIA_PAYMENTS_LIVE', 'STRIPE_TEST_SECRET_KEY', 'STRIPE_LIVE_SECRET_KEY', 'STRIPE_LIVE_WEBHOOK_SECRET', 'STRIPE_TEST_WEBHOOK_SECRET'];
    const saved: Record<string, string | undefined> = {};
    beforeEach(() => { for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; } });
    afterEach(() => { for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });
    const ok = (livemode: boolean, calls: string[] = []) => (async (_u: string, init: any) => {
      calls.push(init.body.toString());
      return { ok: true, json: async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/x', livemode }) };
    }) as unknown as typeof fetch;
    const unpriced = getProgram('advanced-hypnosis-sessions')!;
    const priced = { ...unpriced, priceCents: 1500 };
    const args = (program = priced) => ({ program, customerId: cus, successUrl: 'https://s', cancelUrl: 'https://c' });

    it('is off unless exactly "on"', () => {
      for (const v of [undefined, '', 'true', '1', 'yes', 'off']) expect(paymentsLive(v)).toBe(false);
      expect(paymentsLive(' ON ')).toBe(true);
    });
    it('off: never reads the live key, charges the set price or the test price', async () => {
      process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_abc';
      expect(() => secretKey()).toThrow(/STRIPE_TEST_SECRET_KEY/);
      process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_abc';
      expect(secretKey()).toBe('sk_test_abc');
      expect(chargeCents(unpriced)).toBe(unpriced.testPriceCents);
      const calls: string[] = [];
      await createCheckoutSession(args(priced), ok(false, calls));
      expect(calls[0]).toContain('unit_amount%5D=1500');
    });
    it('on: needs a live key, refuses test keys, unpriced programs and test-mode sessions', async () => {
      process.env.WAIA_PAYMENTS_LIVE = 'on';
      process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_abc';
      expect(() => secretKey()).toThrow(/STRIPE_LIVE_SECRET_KEY is not set/);
      process.env.STRIPE_LIVE_SECRET_KEY = 'sk_test_abc';
      expect(() => secretKey()).toThrow(/live-mode key/);
      process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_abc';
      expect(secretKey()).toBe('sk_live_abc');
      expect(() => chargeCents(unpriced)).toThrow(PaymentsNotConfigured);
      await expect(createCheckoutSession(args(priced), ok(true))).resolves.toMatchObject({ id: 'cs_1' });
      await expect(createCheckoutSession(args(priced), ok(false))).rejects.toThrow(/test-mode session while live/);
    });
    it('on: webhooks use the live secret and test-mode events are ignored', () => {
      const payload = '{}', t = Math.floor(Date.now() / 1000);
      const sig = (s: string) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${payload}`).digest('hex')}`;
      process.env.STRIPE_TEST_WEBHOOK_SECRET = 'whsec_t';
      process.env.STRIPE_LIVE_WEBHOOK_SECRET = 'whsec_l';
      expect(verifyWebhook(payload, sig('whsec_t'))).toBe(true);
      expect(verifyWebhook(payload, sig('whsec_l'))).toBe(false);
      process.env.WAIA_PAYMENTS_LIVE = 'on';
      expect(verifyWebhook(payload, sig('whsec_l'))).toBe(true);
      expect(verifyWebhook(payload, sig('whsec_t'))).toBe(false);
      const ev = (livemode: boolean) => ({ id: 'e', type: 'checkout.session.completed', livemode, data: { object: { payment_status: 'paid', mode: 'payment', client_reference_id: cus, metadata: { programId: 'yale-inversion-protocol' } } } });
      expect(actionForEvent(ev(false)).op).toBe('ignore');
      expect(actionForEvent(ev(true)).op).toBe('grant');
    });
  });
  it('verifies webhook signatures', () => {
    const secret = 'whsec_test', payload = '{"id":"evt_1"}', t = 1_800_000_000;
    const v1 = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    expect(verifyWebhook(payload, `t=${t},v1=${v1}`, secret, 300, t)).toBe(true);
    expect(verifyWebhook(payload + ' ', `t=${t},v1=${v1}`, secret, 300, t)).toBe(false);
    expect(verifyWebhook(payload, `t=${t},v1=${v1}`, secret, 300, t + 1000)).toBe(false);
    expect(verifyWebhook(payload, null, secret, 300, t)).toBe(false);
    expect(verifyWebhook(payload, `t=${t},v1=${v1}`, undefined, 300, t)).toBe(false);
  });
  it('maps events to actions and ignores live-mode and unpaid', () => {
    const done = (o: object, extra = {}) => ({ id: 'e', type: 'checkout.session.completed', data: { object: o }, ...extra });
    expect(actionForEvent(done({ payment_status: 'paid', mode: 'payment', client_reference_id: cus, metadata: { programId: 'yale-inversion-protocol' }, payment_intent: 'pi_1' })))
      .toMatchObject({ op: 'grant', customerId: cus, expiresAt: null });
    expect(actionForEvent(done({ payment_status: 'unpaid', client_reference_id: cus, metadata: { programId: 'x' } })).op).toBe('ignore');
    expect(actionForEvent(done({ payment_status: 'paid', client_reference_id: cus, metadata: { programId: 'x' } }, { livemode: true })).op).toBe('ignore');
    expect(actionForEvent({ id: 'e', type: 'customer.subscription.deleted', data: { object: { metadata: { programId: 'advanced-hypnosis-sessions', customerId: cus } } } }))
      .toEqual({ op: 'revoke', customerId: cus, programId: 'advanced-hypnosis-sessions' });
    const inv = actionForEvent({ id: 'e', type: 'invoice.paid', data: { object: { subscription: 'sub_1', lines: { data: [{ period: { end: 1_900_000_000 }, metadata: { programId: 'advanced-hypnosis-sessions', customerId: cus } }] } } } });
    expect(inv).toMatchObject({ op: 'grant', expiresAt: new Date(1_900_000_000_000).toISOString() });
  });
});

describe('subscription lifecycle', () => {
  const id = 'advanced-hypnosis-sessions';
  const end = '2026-11-01T00:00:00.000Z';
  const day = 86400_000;
  const status = async (now: string) => summarizeAccess(await loadRecord(cus), new Date(now))[0].status;

  it('renewal extends access and cancellation runs to period end then closes', async () => {
    await grantAccess({ customerId: cus, programId: id, expiresAt: end });
    expect(await status('2026-10-20')).toBe('active');
    await setCancelAtPeriodEnd(cus, id, true);
    expect(await status('2026-10-20')).toBe('cancelling');
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-10-31'))).toBe(true);
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-11-02'))).toBe(false);
    expect(await status('2026-11-02')).toBe('lapsed');
    await setCancelAtPeriodEnd(cus, id, false);
    expect(await status('2026-10-20')).toBe('active');
  });

  it('failed payment keeps access for the grace window, then fails closed', async () => {
    await grantAccess({ customerId: cus, programId: id, expiresAt: end });
    const failedAt = new Date('2026-11-01T01:00:00.000Z');
    await markPastDue(cus, id, { now: failedAt });
    const rec = await loadRecord(cus);
    expect(hasAccess(rec, id, new Date(failedAt.getTime() + (GRACE_DAYS - 1) * day))).toBe(true);
    expect(summarizeAccess(rec, new Date(failedAt.getTime() + day))[0].status).toBe('grace');
    expect(hasAccess(rec, id, new Date(failedAt.getTime() + (GRACE_DAYS + 1) * day))).toBe(false);
  });

  it('a second failure does not stretch the grace window; a paid invoice ends it', async () => {
    await grantAccess({ customerId: cus, programId: id, expiresAt: end });
    await markPastDue(cus, id, { now: new Date('2026-11-01T01:00:00.000Z') });
    await markPastDue(cus, id, { now: new Date('2026-11-05T00:00:00.000Z') });
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-11-10'))).toBe(false);
    await grantAccess({ customerId: cus, programId: id, expiresAt: '2026-12-01T00:00:00.000Z' });
    const g = (await loadRecord(cus)).grants[0];
    expect(g.pastDueAt).toBeNull();
    expect(await status('2026-11-10')).toBe('active');
  });

  it('past-due marking is idempotent per event and never opens a revoked or missing grant', async () => {
    await markPastDue(cus, id); // no grant: nothing opens
    expect(hasAccess(await loadRecord(cus), id)).toBe(false);
    await grantAccess({ customerId: cus, programId: id, expiresAt: end });
    await revokeAccess(cus, id);
    await markPastDue(cus, id, { now: new Date('2026-10-30') });
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-10-31'))).toBe(false);
    expect(await status('2026-10-31')).toBe('revoked');
  });

  it('checkout window does not undo a later period end that arrived first', async () => {
    await grantAccess({ customerId: cus, programId: id, expiresAt: '2026-12-01T00:00:00.000Z' });
    await grantAccess({ customerId: cus, programId: id, expiresAt: '2026-10-20T00:00:00.000Z', neverShorten: true, providerCustomerId: 'cus_stripe1' });
    const rec = await loadRecord(cus);
    expect(rec.grants[0].expiresAt).toBe('2026-12-01T00:00:00.000Z');
    expect(rec.providerCustomerId).toBe('cus_stripe1');
  });

  it('old stored records without lifecycle fields still load', async () => {
    files.set(`entitlements/${cus}.json`, Buffer.from(JSON.stringify({
      customerId: cus, processedEvents: [],
      grants: [{ programId: id, kind: 'subscription', expiresAt: end, revokedAt: null, providerRef: null, grantedAt: '2026-10-01T00:00:00.000Z' }],
    })));
    expect(hasAccess(await loadRecord(cus), id, new Date('2026-10-20'))).toBe(true);
  });

  it('maps lifecycle events to actions', () => {
    const meta = { programId: id, customerId: cus };
    const ev = (type: string, object: object, extra = {}) => ({ id: 'e', type, data: { object }, ...extra });
    expect(actionForEvent(ev('invoice.payment_failed', { subscription_details: { metadata: meta } })))
      .toEqual({ op: 'past_due', customerId: cus, programId: id });
    expect(actionForEvent(ev('customer.subscription.updated', { status: 'active', cancel_at_period_end: true, metadata: meta })))
      .toEqual({ op: 'cancel_flag', customerId: cus, programId: id, cancel: true });
    expect(actionForEvent(ev('customer.subscription.updated', { status: 'active', cancel_at_period_end: false, metadata: meta })))
      .toMatchObject({ op: 'cancel_flag', cancel: false });
    expect(actionForEvent(ev('customer.subscription.updated', { status: 'unpaid', metadata: meta })).op).toBe('revoke');
    expect(actionForEvent(ev('customer.subscription.updated', { status: 'active' })).op).toBe('ignore');
    expect(actionForEvent(ev('invoice.payment_failed', { subscription_details: { metadata: meta } }, { livemode: true })).op).toBe('ignore');
    expect(actionForEvent(ev('invoice.paid', { customer: 'cus_s', subscription: 's', lines: { data: [{ period: { end: 1_900_000_000 }, metadata: meta }] } })))
      .toMatchObject({ op: 'grant', providerCustomerId: 'cus_s' });
  });

  it('portal session is test-only', async () => {
    delete process.env.STRIPE_TEST_SECRET_KEY;
    await expect(createPortalSession('cus_s', 'https://r')).rejects.toThrow(/not set/);
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_abc';
    const mk = (livemode: boolean) => (async () => ({ ok: true, json: async () => ({ url: 'https://billing.stripe.com/p', livemode }) })) as unknown as typeof fetch;
    await expect(createPortalSession('cus_s', 'https://r', mk(false))).resolves.toEqual({ url: 'https://billing.stripe.com/p' });
    await expect(createPortalSession('cus_s', 'https://r', mk(true))).rejects.toThrow(/live-mode/);
  });
});
