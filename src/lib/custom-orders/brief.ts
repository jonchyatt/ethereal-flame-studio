import { z } from 'zod';
import { getStorageAdapter } from '@/lib/storage';
import { LENGTHS, MUSIC, VOICES, VR_SCENES } from './brief-options';
import { createOrder, DETAILS_MAX, KINDS, OrderError, type Order } from './model';

/**
 * Structured brief for a custom hypnosis or VR session. The brief is saved next to the order
 * (private storage, never the repo) and a short plain-text summary goes into the order's
 * `details`, so the existing request queue, status page and operator view keep working
 * unchanged. No payment is taken here.
 */

export const BriefSchema = z
  .object({
    kind: z.enum(['hypnosis', 'vr']),
    goal: z.string().trim().min(1).max(300),
    lengthMinutes: z.union(LENGTHS.map((n) => z.literal(n)) as unknown as [z.ZodLiteral<number>, z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]),
    voice: z.enum(Object.keys(VOICES) as [keyof typeof VOICES, ...(keyof typeof VOICES)[]]),
    music: z.enum(Object.keys(MUSIC) as [keyof typeof MUSIC, ...(keyof typeof MUSIC)[]]),
    vrScene: z.enum(Object.keys(VR_SCENES) as [keyof typeof VR_SCENES, ...(keyof typeof VR_SCENES)[]]).optional(),
    vrSceneNote: z.string().trim().max(100).default(''),
    /** VR only: anything that makes headsets unsafe for this person (motion sickness, seizures). */
    vrComfortFlag: z.boolean().default(false),
    safetyNotes: z.string().trim().max(300).default(''),
    /** Must be true: not to be listened to while driving or operating anything. */
    acknowledgeSafeUse: z.literal(true),
  })
  .superRefine((b, ctx) => {
    if (b.kind === 'vr' && !b.vrScene) ctx.addIssue({ code: 'custom', path: ['vrScene'], message: 'Choose a scene for the VR session.' });
    if (b.kind === 'hypnosis' && b.vrScene) ctx.addIssue({ code: 'custom', path: ['vrScene'], message: 'A scene applies to VR sessions only.' });
  });
export type Brief = z.infer<typeof BriefSchema>;

const briefKey = (id: string) => `custom-order-briefs/${id}.json`;

/** One readable paragraph the operator can quote from. Always fits the order's details limit. */
export function summarizeBrief(b: Brief): string {
  const parts = [
    `${KINDS[b.kind]}, ${b.lengthMinutes} minutes.`,
    `Goal: ${b.goal}`,
    `Voice: ${VOICES[b.voice]}. Music: ${MUSIC[b.music]}.`,
  ];
  if (b.kind === 'vr') {
    parts.push(`Scene: ${VR_SCENES[b.vrScene!]}${b.vrSceneNote ? ` (${b.vrSceneNote})` : ''}.`);
    if (b.vrComfortFlag) parts.push('Comfort flag: motion sickness or seizure sensitivity, keep movement gentle and check before any strobe.');
  }
  if (b.safetyNotes) parts.push(`Safety notes: ${b.safetyNotes}`);
  parts.push('Acknowledged: not for use while driving or operating anything.');
  return parts.join(' ').slice(0, DETAILS_MAX);
}

export { LENGTHS, MUSIC, VOICES, VR_SCENES };

export class BriefError extends Error {
  constructor(public issues: string[]) {
    super(issues.join(' '));
  }
}

/** Validates the brief, creates the order from its summary and stores the brief beside it. */
export async function createOrderFromBrief(input: { brief?: unknown; contact?: unknown; now?: Date }): Promise<{ order: Order; reference: string; brief: Brief }> {
  const parsed = BriefSchema.safeParse(input.brief);
  if (!parsed.success) throw new BriefError(parsed.error.issues.map((i) => i.message));
  const brief = parsed.data;
  const { order, reference } = await createOrder({ kind: brief.kind, details: summarizeBrief(brief), contact: input.contact, now: input.now });
  await getStorageAdapter().put(briefKey(order.id), Buffer.from(JSON.stringify(brief, null, 2)), { contentType: 'application/json' });
  return { order, reference, brief };
}

export async function loadBrief(id: string): Promise<Brief | null> {
  if (!/^ord_[0-9a-f]{16}$/.test(id)) return null;
  const buf = await getStorageAdapter().get(briefKey(id));
  return buf ? BriefSchema.parse(JSON.parse(buf.toString('utf8'))) : null;
}

export { OrderError };
