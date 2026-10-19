import { createHmac, timingSafeEqual } from 'crypto';
import type { Program } from './catalog';

/**
 * Payment adapter. Test mode unless WAIA_PAYMENTS_LIVE=on (docs/GO-LIVE.md):
 * that one env var is the switch between test and live, and flipping it moves
 * money (red 1), so it is Jonathan's click. Each mode reads only its own keys
 * and refuses the other mode's keys, sessions and webhook events. No SDK: two
 * REST calls and a signature check.
 */

export class PaymentsNotConfigured extends Error {}

/** The one test/live switch. Anything but "on" (including unset) is test mode. */
export function paymentsLive(flag: string | undefined = process.env.WAIA_PAYMENTS_LIVE): boolean {
  return (flag ?? '').trim().toLowerCase() === 'on';
}

export function testSecretKey(): string {
  const k = process.env.STRIPE_TEST_SECRET_KEY;
  if (!k) throw new PaymentsNotConfigured('STRIPE_TEST_SECRET_KEY is not set; checkout is off');
  if (!k.startsWith('sk_test_') && !k.startsWith('rk_test_')) {
    throw new PaymentsNotConfigured('Only Stripe test-mode keys are accepted; live mode is not enabled');
  }
  return k;
}

function liveSecretKey(): string {
  const k = process.env.STRIPE_LIVE_SECRET_KEY;
  if (!k) throw new PaymentsNotConfigured('STRIPE_LIVE_SECRET_KEY is not set; live checkout is off');
  if (!k.startsWith('sk_live_') && !k.startsWith('rk_live_')) {
    throw new PaymentsNotConfigured('WAIA_PAYMENTS_LIVE=on needs a live-mode key in STRIPE_LIVE_SECRET_KEY');
  }
  return k;
}

/** The key for the current mode. Test mode never reads STRIPE_LIVE_SECRET_KEY. */
export function secretKey(): string {
  return paymentsLive() ? liveSecretKey() : testSecretKey();
}

/** What checkout charges: the set price; in test mode an unpriced program falls back to its test price. Live never sells unpriced. */
export function chargeCents(program: Program): number {
  if (program.priceCents !== null) return program.priceCents;
  if (paymentsLive()) throw new PaymentsNotConfigured(`${program.id} has no price set; not on sale`);
  return program.testPriceCents;
}

function refuseWrongMode(livemode: boolean | undefined): void {
  const live = paymentsLive();
  if (Boolean(livemode) !== live) {
    throw new Error(`Stripe returned a ${livemode ? 'live-mode' : 'test-mode'} session while ${live ? 'live' : 'test'} mode is set; refusing`);
  }
}

export interface CheckoutArgs {
  program: Program;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  args: CheckoutArgs,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; url: string }> {
  const key = secretKey();
  const { program } = args;
  const cents = chargeCents(program);
  const body = new URLSearchParams({
    mode: program.kind === 'subscription' ? 'subscription' : 'payment',
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    client_reference_id: args.customerId,
    'metadata[programId]': program.id,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(cents),
    'line_items[0][price_data][product_data][name]': program.title,
  });
  if (program.kind === 'subscription') {
    body.set('line_items[0][price_data][recurring][interval]', 'month');
    body.set('subscription_data[metadata][programId]', program.id);
    body.set('subscription_data[metadata][customerId]', args.customerId);
  }
  const res = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as { id?: string; url?: string; livemode?: boolean; error?: { message?: string } };
  if (!res.ok || !json.id || !json.url) throw new Error(`Stripe checkout failed: ${json.error?.message ?? res.status}`);
  refuseWrongMode(json.livemode);
  return { id: json.id, url: json.url };
}

/** Verifies a Stripe-Signature header (v1, HMAC-SHA256 over `${t}.${payload}`). */
export function verifyWebhook(
  payload: string,
  header: string | null,
  secret: string | undefined = paymentsLive() ? process.env.STRIPE_LIVE_WEBHOOK_SECRET : process.env.STRIPE_TEST_WEBHOOK_SECRET,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => { const [k, ...v] = p.split('='); return [k, v.join('=')]; }),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > toleranceSec) return false;
  const want = Buffer.from(createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex'));
  return header.split(',').filter((p) => p.startsWith('v1=')).some((p) => {
    const got = Buffer.from(p.slice(3));
    return got.length === want.length && timingSafeEqual(got, want);
  });
}

/** Opens Stripe's hosted billing portal (cancel, update card, invoices) for a customer in the current mode. */
export async function createPortalSession(
  providerCustomerId: string,
  returnUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string }> {
  const key = secretKey();
  const res = await fetchImpl('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ customer: providerCustomerId, return_url: returnUrl }),
  });
  const json = (await res.json()) as { url?: string; livemode?: boolean; error?: { message?: string } };
  if (!res.ok || !json.url) throw new Error(`Stripe portal failed: ${json.error?.message ?? res.status}`);
  refuseWrongMode(json.livemode);
  return { url: json.url };
}

export interface StripeEvent {
  id: string;
  type: string;
  livemode?: boolean;
  data: { object: Record<string, any> };
}

export type EntitlementAction =
  | { op: 'grant'; customerId: string; programId: string; expiresAt: string | null; providerRef: string | null; providerCustomerId?: string | null; neverShorten?: boolean }
  | { op: 'past_due'; customerId: string; programId: string }
  | { op: 'cancel_flag'; customerId: string; programId: string; cancel: boolean }
  | { op: 'revoke'; customerId: string; programId: string }
  | { op: 'ignore'; reason: string };

/** Pure mapping from a Stripe event to what the entitlement store should do. */
export function actionForEvent(ev: StripeEvent): EntitlementAction {
  if (Boolean(ev.livemode) !== paymentsLive()) return { op: 'ignore', reason: `${ev.livemode ? 'live' : 'test'}-mode event refused` };
  const o = ev.data.object;
  switch (ev.type) {
    case 'checkout.session.completed': {
      if (o.payment_status && o.payment_status !== 'paid') return { op: 'ignore', reason: 'not paid' };
      const programId = o.metadata?.programId;
      const customerId = o.client_reference_id;
      if (!programId || !customerId) return { op: 'ignore', reason: 'missing metadata' };
      // Subscriptions get their period end from invoice.paid; until then a short grace window.
      const expiresAt = o.mode === 'subscription' ? new Date(Date.now() + 3 * 86400_000).toISOString() : null;
      return { op: 'grant', customerId, programId, expiresAt, providerRef: o.subscription ?? o.payment_intent ?? o.id ?? null, providerCustomerId: typeof o.customer === 'string' ? o.customer : null, neverShorten: true };
    }
    case 'invoice.paid': {
      const m = o.subscription_details?.metadata ?? o.lines?.data?.[0]?.metadata ?? {};
      const end = o.lines?.data?.[0]?.period?.end;
      if (!m.programId || !m.customerId || !end) return { op: 'ignore', reason: 'missing metadata' };
      return { op: 'grant', customerId: m.customerId, programId: m.programId, expiresAt: new Date(end * 1000).toISOString(), providerRef: o.subscription ?? null, providerCustomerId: typeof o.customer === 'string' ? o.customer : null };
    }
    case 'invoice.payment_failed': {
      const m = o.subscription_details?.metadata ?? o.lines?.data?.[0]?.metadata ?? {};
      if (!m.programId || !m.customerId) return { op: 'ignore', reason: 'missing metadata' };
      return { op: 'past_due', customerId: m.customerId, programId: m.programId };
    }
    case 'customer.subscription.updated': {
      const m = o.metadata ?? {};
      if (!m.programId || !m.customerId) return { op: 'ignore', reason: 'missing metadata' };
      if (o.status === 'canceled' || o.status === 'unpaid' || o.status === 'incomplete_expired') {
        return { op: 'revoke', customerId: m.customerId, programId: m.programId };
      }
      return { op: 'cancel_flag', customerId: m.customerId, programId: m.programId, cancel: o.cancel_at_period_end === true };
    }
    case 'customer.subscription.deleted': {
      const m = o.metadata ?? {};
      if (!m.programId || !m.customerId) return { op: 'ignore', reason: 'missing metadata' };
      return { op: 'revoke', customerId: m.customerId, programId: m.programId };
    }
    default:
      return { op: 'ignore', reason: `unhandled ${ev.type}` };
  }
}
