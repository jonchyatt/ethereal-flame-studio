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
  grantedAt: z.string().datetime(),
});
export type Grant = z.infer<typeof GrantSchema>;

export const EntitlementRecordSchema = z.object({
  customerId: z.string().min(8),
  grants: z.array(GrantSchema),
  /** Webhook event ids already applied, so retries do nothing. */
  processedEvents: z.array(z.string()).max(200),
});
export type EntitlementRecord = z.infer<typeof EntitlementRecordSchema>;

const key = (customerId: string) => `entitlements/${customerId}.json`;

export async function loadRecord(customerId: string): Promise<EntitlementRecord> {
  const buf = await getStorageAdapter().get(key(customerId));
  if (!buf) return { customerId, grants: [], processedEvents: [] };
  return EntitlementRecordSchema.parse(JSON.parse(buf.toString('utf8')));
}

async function saveRecord(rec: EntitlementRecord): Promise<void> {
  await getStorageAdapter().put(key(rec.customerId), Buffer.from(JSON.stringify(rec, null, 2)), {
    contentType: 'application/json',
  });
}

/** Pure check; fail-closed on anything unknown. */
export function hasAccess(rec: EntitlementRecord, programId: string, now = new Date()): boolean {
  if (!getProgram(programId)) return false;
  return rec.grants.some((g) => {
    if (g.programId !== programId || g.revokedAt) return false;
    if (g.kind === 'one_time') return true;
    return g.expiresAt !== null && new Date(g.expiresAt).getTime() > now.getTime();
  });
}

export interface GrantInput {
  customerId: string;
  programId: string;
  expiresAt?: string | null;
  providerRef?: string | null;
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
  const next: Grant = GrantSchema.parse({
    programId: program.id,
    kind: program.kind,
    expiresAt: program.kind === 'one_time' ? null : (input.expiresAt ?? null),
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
