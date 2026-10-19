import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getStorageAdapter } from '@/lib/storage';

/**
 * Custom session orders: a request queue, an operator view and a quote status.
 * One JSON record per order in the storage adapter (R2 in production), never in
 * the repo. No payment is taken anywhere in this flow; a quote is a number and
 * a note. Taking money for an accepted quote is red 1 and stays Jonathan's click.
 */

export const KINDS = { hypnosis: 'Custom hypnosis session', vr: 'Custom VR session' } as const;
export type OrderKind = keyof typeof KINDS;

export const STATUSES = ['received', 'in_review', 'quoted', 'accepted', 'declined', 'closed'] as const;
export type OrderStatus = (typeof STATUSES)[number];

/** Who may move an order from one status to another. Anything not listed is refused. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['in_review', 'declined', 'closed'],
  in_review: ['quoted', 'declined', 'closed'],
  quoted: ['accepted', 'declined', 'closed', 'in_review'],
  accepted: ['closed'],
  declined: ['closed'],
  closed: [],
};

export const DETAILS_MAX = 1000;
export const CONTACT_MAX = 200;

export const QuoteSchema = z.object({
  amountCents: z.number().int().min(0).max(10_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/).default('USD'),
  note: z.string().max(1000).default(''),
  quotedAt: z.string().datetime(),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const OrderSchema = z.object({
  id: z.string().regex(/^ord_[0-9a-f]{16}$/),
  /** sha256 of the secret half of the customer's reference. */
  tokenHash: z.string().length(64),
  kind: z.enum(['hypnosis', 'vr']),
  details: z.string().min(1).max(DETAILS_MAX),
  /** Optional, however the person wants to be reached. Private storage only; never shown publicly. */
  contact: z.string().max(CONTACT_MAX).default(''),
  status: z.enum(STATUSES),
  quote: QuoteSchema.nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  history: z.array(z.object({ at: z.string().datetime(), status: z.enum(STATUSES), by: z.string() })).max(100),
});
export type Order = z.infer<typeof OrderSchema>;

const key = (id: string) => `custom-orders/${id}.json`;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export class OrderError extends Error {
  constructor(public code: 'INVALID' | 'NOT_FOUND' | 'BAD_TRANSITION' | 'QUOTE_REQUIRED', message: string) {
    super(message);
  }
}

async function save(o: Order): Promise<void> {
  await getStorageAdapter().put(key(o.id), Buffer.from(JSON.stringify(o, null, 2)), { contentType: 'application/json' });
}

export async function loadOrder(id: string): Promise<Order | null> {
  if (!/^ord_[0-9a-f]{16}$/.test(id)) return null;
  const buf = await getStorageAdapter().get(key(id));
  return buf ? OrderSchema.parse(JSON.parse(buf.toString('utf8'))) : null;
}

export interface CreateInput { kind?: unknown; details?: unknown; contact?: unknown; now?: Date }

/** Validates, stores, and returns the order plus the reference to give the customer once. */
export async function createOrder(input: CreateInput): Promise<{ order: Order; reference: string }> {
  const kind = typeof input.kind === 'string' && input.kind in KINDS ? (input.kind as OrderKind) : null;
  const details = typeof input.details === 'string' ? input.details.trim().slice(0, DETAILS_MAX) : '';
  const contact = typeof input.contact === 'string' ? input.contact.trim().slice(0, CONTACT_MAX) : '';
  if (!kind) throw new OrderError('INVALID', 'Choose a hypnosis or VR session.');
  if (!details) throw new OrderError('INVALID', 'Describe what you would like, in a few words.');
  const at = (input.now ?? new Date()).toISOString();
  const id = `ord_${randomBytes(8).toString('hex')}`;
  const token = randomBytes(16).toString('hex');
  const order = OrderSchema.parse({
    id, tokenHash: sha(token), kind, details, contact, status: 'received', quote: null,
    createdAt: at, updatedAt: at, history: [{ at, status: 'received', by: 'customer' }],
  });
  await save(order);
  return { order, reference: `${id}.${token}` };
}

/** Returns the order only if the reference's secret half matches. Constant-time. */
export async function openWithReference(reference: string | null | undefined): Promise<Order | null> {
  if (!reference) return null;
  const i = reference.indexOf('.');
  if (i < 1) return null;
  const order = await loadOrder(reference.slice(0, i));
  if (!order) return null;
  const given = Buffer.from(sha(reference.slice(i + 1)));
  const want = Buffer.from(order.tokenHash);
  return given.length === want.length && timingSafeEqual(given, want) ? order : null;
}

export async function listOrders(): Promise<Order[]> {
  const keys = await getStorageAdapter().list('custom-orders/');
  const out: Order[] = [];
  for (const k of keys) {
    const id = k.replace(/^custom-orders\//, '').replace(/\.json$/, '');
    const o = await loadOrder(id).catch(() => null);
    if (o) out.push(o);
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface UpdateInput {
  status?: OrderStatus;
  quote?: { amountCents: number; currency?: string; note?: string };
  by: string;
  now?: Date;
}

/** Operator or customer step. `quoted` needs a quote; a quote only attaches while in review or quoted. */
export async function updateOrder(id: string, input: UpdateInput): Promise<Order> {
  const order = await loadOrder(id);
  if (!order) throw new OrderError('NOT_FOUND', 'No such order.');
  const at = (input.now ?? new Date()).toISOString();
  if (input.quote) {
    if (order.status !== 'in_review' && order.status !== 'quoted') {
      throw new OrderError('BAD_TRANSITION', 'A quote can be set only while the order is in review.');
    }
    const parsed = QuoteSchema.safeParse({ ...input.quote, quotedAt: at });
    if (!parsed.success) throw new OrderError('INVALID', 'The quote is not valid.');
    order.quote = parsed.data;
  }
  if (input.status && input.status !== order.status) {
    if (!TRANSITIONS[order.status].includes(input.status)) {
      throw new OrderError('BAD_TRANSITION', `Cannot go from ${order.status} to ${input.status}.`);
    }
    if (input.status === 'quoted' && !order.quote) throw new OrderError('QUOTE_REQUIRED', 'Set a quote first.');
    order.status = input.status;
    order.history = [...order.history, { at, status: input.status, by: input.by }].slice(-100);
  }
  order.updatedAt = at;
  await save(order);
  return order;
}

/** What the customer sees: no contact, no token hash, no history of who. */
export function publicView(o: Order) {
  return {
    id: o.id,
    kind: KINDS[o.kind],
    details: o.details,
    status: o.status,
    quote: o.status === 'received' || o.status === 'in_review' ? null : o.quote,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}
