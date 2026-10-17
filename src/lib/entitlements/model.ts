import { z } from 'zod';
import { getStorageAdapter } from '@/lib/storage';
import { getProgram } from './catalog';

/**
 * Entitlements: who may open which program. One JSON record per opaque
 * customer id in the storage adapter (R2 in production). The record holds no
 * name, email or card data; the payment provider keeps those.
 */

export const GrantSchema = z.object({
  programId: z.string().min(1),
  kind: z.enum(['subscription', 'one_time']),
  /** Subscription: end of the paid period (ISO). One-time: null, never expires. */
  expiresAt: z.string().datetime().nullable(),
  /** Set when a subscription is cancelled or a payment is refunded. */
  revokedAt: z.string().datetime().nullable().default(null),
  providerRef: z.string().nullable().default(null),
  /** Subscription: the customer asked to stop; access runs to `expiresAt` and no further. */
  cancelAtPeriodEnd: z.boolean().default(false),
  /** Subscription: a renewal payment failed; access may continue until `graceUntil`. */
  pastDueAt: z.string().datetime().nullable().default(null),
  graceUntil: z.string().datetime().nullable().default(null),
  grantedAt: z.string().datetime(),
});
export type Grant = z.infer<typeof GrantSchema>;

export const EntitlementRecordSchema = z.object({
  customerId: z.string().min(8),
  /** Payment provider's customer id (opaque), kept only to open the self-service portal. */
  providerCustomerId: z.string().nullable().default(null),
  grants: z.array(GrantSchema),
  /** Webhook event ids already applied, so retries do nothing. */
  processedEvents: z.array(z.string()).max(200),
});
export type EntitlementRecord = z.infer<typeof EntitlementRecordSchema>;

const key = (customerId: string) => `entitlements/${customerId}.json`;

export async function loadRecord(customerId: string): Promise<EntitlementRecord> {
  const buf = await getStorageAdapter().get(key(customerId));
  if (!buf) return { customerId, providerCustomerId: null, grants: [], processedEvents: [] };
  return EntitlementRecordSchema.parse(JSON.parse(buf.toString('utf8')));
}

async function saveRecord(rec: EntitlementRecord): Promise<void> {
  await getStorageAdapter().put(key(rec.customerId), Buffer.from(JSON.stringify(rec, null, 2)), {
    contentType: 'application/json',
  });
}

/** Days a failed renewal keeps access open while the provider retries the card. */
export const GRACE_DAYS = 7;

/** Last instant a subscription grant opens: the paid period, or the grace window if later. */
function accessEnd(g: Grant): number | null {
  if (g.expiresAt === null) return null;
  const paid = new Date(g.expiresAt).getTime();
  const grace = g.pastDueAt && g.graceUntil ? new Date(g.graceUntil).getTime() : 0;
  return Math.max(paid, grace);
}

function grantOpen(g: Grant, now: Date): boolean {
  if (g.revokedAt) return false;
  if (g.kind === 'one_time') return true;
  const end = accessEnd(g);
  return end !== null && end > now.getTime();
}

/** Pure check; fail-closed on anything unknown. */
export function hasAccess(rec: EntitlementRecord, programId: string, now = new Date()): boolean {
  if (!getProgram(programId)) return false;
  return rec.grants.some((g) => g.programId === programId && grantOpen(g, now));
}

export type AccessStatus = 'active' | 'cancelling' | 'grace' | 'lapsed' | 'revoked';

export interface AccessSummary {
  programId: string;
  kind: Grant['kind'];
  status: AccessStatus;
  /** ISO end of access for a subscription (paid period, or grace end); null for one-time. */
  endsAt: string | null;
}

/** What "manage my access" shows. Same rules as hasAccess, so the page cannot disagree with the gate. */
export function summarizeAccess(rec: EntitlementRecord, now = new Date()): AccessSummary[] {
  return rec.grants.filter((g) => getProgram(g.programId)).map((g) => {
    const end = accessEnd(g);
    let status: AccessStatus;
    if (g.revokedAt) status = 'revoked';
    else if (!grantOpen(g, now)) status = 'lapsed';
    else if (g.kind === 'subscription' && g.pastDueAt && g.expiresAt && new Date(g.expiresAt).getTime() <= now.getTime()) status = 'grace';
    else if (g.cancelAtPeriodEnd) status = 'cancelling';
    else status = 'active';
    return { programId: g.programId, kind: g.kind, status, endsAt: end === null ? null : new Date(end).toISOString() };
  });
}

export interface GrantInput {
  customerId: string;
  programId: string;
  expiresAt?: string | null;
  providerRef?: string | null;
  providerCustomerId?: string | null;
  /** Never move an open subscription's end earlier (checkout's short window must not undo invoice.paid). */
  neverShorten?: boolean;
  eventId?: string;
  now?: Date;
}

/** Idempotent per eventId. Subscription renewals extend `expiresAt`. */
export async function grantAccess(input: GrantInput): Promise<EntitlementRecord> {
  const program = getProgram(input.programId);
  if (!program) throw new Error(`Unknown program ${input.programId}`);
  const rec = await loadRecord(input.customerId);
  if (input.eventId && rec.processedEvents.includes(input.eventId)) return rec;
  const now = (input.now ?? new Date()).toISOString();
  let expiresAt = program.kind === 'one_time' ? null : (input.expiresAt ?? null);
  const prior = rec.grants.find((g) => g.programId === program.id);
  if (input.neverShorten && expiresAt && prior && !prior.revokedAt && prior.expiresAt && prior.expiresAt > expiresAt) {
    expiresAt = prior.expiresAt;
  }
  if (input.providerCustomerId) rec.providerCustomerId = input.providerCustomerId;
  const next: Grant = GrantSchema.parse({
    programId: program.id,
    kind: program.kind,
    expiresAt,
    revokedAt: null,
    providerRef: input.providerRef ?? null,
    grantedAt: now,
  });
  rec.grants = [...rec.grants.filter((g) => g.programId !== program.id), next];
  if (input.eventId) rec.processedEvents = [...rec.processedEvents, input.eventId].slice(-200);
  await saveRecord(rec);
  return rec;
}

export async function revokeAccess(
  customerId: string,
  programId: string,
  opts: { eventId?: string; now?: Date } = {},
): Promise<EntitlementRecord> {
  const rec = await loadRecord(customerId);
  if (opts.eventId && rec.processedEvents.includes(opts.eventId)) return rec;
  const at = (opts.now ?? new Date()).toISOString();
  rec.grants = rec.grants.map((g) => (g.programId === programId ? { ...g, revokedAt: at } : g));
  if (opts.eventId) rec.processedEvents = [...rec.processedEvents, opts.eventId].slice(-200);
  await saveRecord(rec);
  return rec;
}

/** Renewal payment failed: keep access open for GRACE_DAYS from the first failure, then fail closed. */
export async function markPastDue(
  customerId: string,
  programId: string,
  opts: { eventId?: string; now?: Date } = {},
): Promise<EntitlementRecord> {
  const rec = await loadRecord(customerId);
  if (opts.eventId && rec.processedEvents.includes(opts.eventId)) return rec;
  const now = opts.now ?? new Date();
  rec.grants = rec.grants.map((g) => {
    if (g.programId !== programId || g.kind !== 'subscription' || g.revokedAt || g.pastDueAt) return g;
    return { ...g, pastDueAt: now.toISOString(), graceUntil: new Date(now.getTime() + GRACE_DAYS * 86400_000).toISOString() };
  });
  if (opts.eventId) rec.processedEvents = [...rec.processedEvents, opts.eventId].slice(-200);
  await saveRecord(rec);
  return rec;
}

/** Customer asked to cancel (or undid it) in the portal. Access still runs to the paid period end. */
export async function setCancelAtPeriodEnd(
  customerId: string,
  programId: string,
  cancel: boolean,
  opts: { eventId?: string } = {},
): Promise<EntitlementRecord> {
  const rec = await loadRecord(customerId);
  if (opts.eventId && rec.processedEvents.includes(opts.eventId)) return rec;
  rec.grants = rec.grants.map((g) => (g.programId === programId && g.kind === 'subscription' ? { ...g, cancelAtPeriodEnd: cancel } : g));
  if (opts.eventId) rec.processedEvents = [...rec.processedEvents, opts.eventId].slice(-200);
  await saveRecord(rec);
  return rec;
}
