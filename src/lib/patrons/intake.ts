import { randomBytes } from 'crypto';
import { z } from 'zod';
import type { StorageAdapter } from '@/lib/storage';
import { consentRefSchema, DISPLAY_NAME_MAX, MESSAGE_MAX, PATRON_TIERS, patronsFileSchema, type Patron } from './schema';
import { containsBlockedTerm, containsUrl, moderatePatron } from './moderation';
import { tierInfo } from './tiers';

/**
 * Public patron intake. Everything is stored through the storage adapter
 * (private bucket / local storage), never in this public repo:
 *   patrons/consent/<ref>.json  the exact text shown and the consent given
 *   patrons/intake/<ref>.json   the submission and its curation status
 * No emails, billing identities or contact details are collected. The opaque
 * consentRef is the patron's own code for later removal requests.
 */

import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from './consent';

export const submissionSchema = z.object({
  displayName: z.string().trim().min(1, 'Please add a name or alias').max(DISPLAY_NAME_MAX, `Keep the name to ${DISPLAY_NAME_MAX} characters`),
  message: z.string().trim().max(MESSAGE_MAX, `Keep the message to ${MESSAGE_MAX} characters`).optional(),
  tier: z.enum(PATRON_TIERS),
  consent: z.literal(true, 'Consent to public display is required'),
  adult: z.literal(true, 'Please confirm you are an adult'),
}).strict();

export type IntakeStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface IntakeRecord {
  consentRef: string;
  displayName: string;
  message?: string;
  tier: Patron['tier'];
  submittedAt: string;
  status: IntakeStatus;
  decidedAt?: string;
  removalRequestedAt?: string;
  removalNote?: string;
}

const intakeKey = (ref: string) => `patrons/intake/${ref}.json`;
const consentKey = (ref: string) => `patrons/consent/${ref}.json`;

export function newConsentRef(): string {
  return `consent_${randomBytes(12).toString('hex')}`;
}

export type SubmitResult =
  | { ok: true; consentRef: string }
  | { ok: false; status: 400 | 422; errors: string[] };

/** Moderation as the patron sees it: said plainly at the form, not silently clipped. */
export function checkText(displayName: string, message?: string): string[] {
  const errors: string[] = [];
  for (const [label, value] of [['name', displayName], ['message', message]] as const) {
    if (!value) continue;
    if (containsUrl(value)) errors.push(`The ${label} cannot contain links, emails or web addresses`);
    else if (containsBlockedTerm(value)) errors.push(`The ${label} contains a word we cannot display`);
  }
  return errors;
}

export async function submitIntake(storage: StorageAdapter, input: unknown, now = new Date()): Promise<SubmitResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, errors: parsed.error.issues.map((i) => i.message) };
  }
  const { displayName, tier, consent: _c, adult: _a } = parsed.data;
  const message = parsed.data.message || undefined;
  if (message && !tierInfo(tier).allowsMessage) {
    return { ok: false, status: 422, errors: ['A message is part of the Ethereal tier'] };
  }
  const errors = checkText(displayName, message);
  if (errors.length) return { ok: false, status: 422, errors };

  const consentRef = newConsentRef();
  const submittedAt = now.toISOString();
  const record: IntakeRecord = { consentRef, displayName, ...(message ? { message } : {}), tier, submittedAt, status: 'pending' };
  // Consent first: an intake record must never exist without its consent record.
  await storage.put(
    consentKey(consentRef),
    Buffer.from(JSON.stringify({
      consentRef,
      textVersion: CONSENT_TEXT_VERSION,
      consentText: CONSENT_TEXT,
      shown: { displayName, message: message ?? null, tier },
      adultConfirmed: true,
      grantedAt: submittedAt,
    }, null, 2)),
    { contentType: 'application/json' },
  );
  await storage.put(intakeKey(consentRef), Buffer.from(JSON.stringify(record, null, 2)), { contentType: 'application/json' });
  return { ok: true, consentRef };
}

async function readRecord(storage: StorageAdapter, ref: string): Promise<IntakeRecord | null> {
  if (!consentRefSchema.safeParse(ref).success) return null;
  const buf = await storage.get(intakeKey(ref));
  return buf ? (JSON.parse(buf.toString('utf8')) as IntakeRecord) : null;
}

async function writeRecord(storage: StorageAdapter, rec: IntakeRecord): Promise<void> {
  await storage.put(intakeKey(rec.consentRef), Buffer.from(JSON.stringify(rec, null, 2)), { contentType: 'application/json' });
}

export async function listIntake(storage: StorageAdapter): Promise<IntakeRecord[]> {
  const keys = await storage.list('patrons/intake/');
  const out: IntakeRecord[] = [];
  for (const key of keys) {
    const ref = key.replace(/^.*\//, '').replace(/\.json$/, '');
    const rec = await readRecord(storage, ref);
    if (rec) out.push(rec);
  }
  return out.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

/** Patron asks to be removed using their own consentRef. Always answers the same, so refs cannot be probed. */
export async function requestRemoval(storage: StorageAdapter, consentRef: unknown, note?: unknown, now = new Date()): Promise<void> {
  if (typeof consentRef !== 'string') return;
  const rec = await readRecord(storage, consentRef.trim());
  if (!rec || rec.removalRequestedAt) return;
  rec.removalRequestedAt = now.toISOString();
  if (typeof note === 'string' && note.trim()) rec.removalNote = note.trim().slice(0, 300);
  await writeRecord(storage, rec);
}

/** Jonathan's curation decision. Re-checks moderation before approving. */
export async function decideIntake(
  storage: StorageAdapter,
  consentRef: string,
  decision: 'approve' | 'reject' | 'withdraw',
  now = new Date(),
): Promise<{ ok: true; record: IntakeRecord } | { ok: false; status: 404 | 422; message: string }> {
  const rec = await readRecord(storage, consentRef);
  if (!rec) return { ok: false, status: 404, message: 'No such submission' };
  if (decision === 'approve') {
    if (rec.removalRequestedAt) return { ok: false, status: 422, message: 'Removal was requested; it cannot be approved' };
    const res = moderatePatron({ displayName: rec.displayName, message: rec.message, tier: rec.tier, since: rec.submittedAt.slice(0, 10), approved: true, consentRef: rec.consentRef });
    if (!res.ok) return { ok: false, status: 422, message: res.reason };
    rec.status = 'approved';
  } else {
    rec.status = decision === 'reject' ? 'rejected' : 'withdrawn';
  }
  rec.decidedAt = now.toISOString();
  await writeRecord(storage, rec);
  return { ok: true, record: rec };
}

/**
 * patrons.json content for the render step: only approved entries with no
 * pending removal request. Written to a path outside the repo by the operator.
 */
export function buildPatronsFile(records: IntakeRecord[]): Patron[] {
  const entries = records
    .filter((r) => r.status === 'approved' && !r.removalRequestedAt)
    .map((r) => ({
      displayName: r.displayName,
      ...(r.message ? { message: r.message } : {}),
      tier: r.tier,
      since: r.submittedAt.slice(0, 10),
      approved: true,
      consentRef: r.consentRef,
    }));
  return patronsFileSchema.parse(entries);
}
