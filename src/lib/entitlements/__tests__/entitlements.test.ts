import { createHmac } from 'crypto';

const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (k: string, d: Buffer) => { files.set(k, Buffer.from(d)); },
    get: async (k: string) => files.get(k) ?? null,
  }),
}));

import { FREE_TOOLS, PROGRAMS, getProgram } from '../catalog';
import { grantAccess, hasAccess, loadRecord, revokeAccess } from '../model';
import { newCustomerId, signCustomerId, verifyCustomerCookie } from '../session';
import { actionForEvent, createCheckoutSession, testSecretKey, verifyWebhook } from '../stripe';

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
