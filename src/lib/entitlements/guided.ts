import { z } from 'zod';
import { getStorageAdapter } from '@/lib/storage';
import { getProgram } from './catalog';

/**
 * Guided process: the shape of a step-by-step session, not its words.
 * The steps themselves are handed over by Jonathan and live in private storage
 * (`programs/<id>.session.json`), never in this public repo and never written
 * here. This file only says what a valid session looks like and loads it.
 */

export const StepSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(160),
  /** The words to read or hear for this step, exactly as handed over. */
  body: z.string().max(8000).default(''),
  kind: z.enum(['read', 'prompt', 'silence']).default('read'),
  /** Suggested time on this step. Absent = no timer, the person moves on when ready. */
  seconds: z.number().int().min(1).max(3600).optional(),
  /** For `prompt`: a label for an optional private note. Notes stay in the browser and are never sent. */
  noteLabel: z.string().max(160).optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const GuidedSessionSchema = z.object({
  title: z.string().min(1).max(160),
  /** Shown before step one, e.g. who it is not for. Handed over, not invented. */
  preface: z.string().max(8000).default(''),
  /** Shown after the last step. */
  closing: z.string().max(8000).default(''),
  steps: z.array(StepSchema).min(1).max(60),
}).refine((s) => new Set(s.steps.map((x) => x.id)).size === s.steps.length, { message: 'Step ids must be unique' });
export type GuidedSession = z.infer<typeof GuidedSessionSchema>;

/** Null when the program is not guided, nothing is handed over yet, or the file is malformed (fail closed). */
export async function loadGuidedSession(programId: string): Promise<GuidedSession | null> {
  if (!getProgram(programId)?.guided) return null;
  const buf = await getStorageAdapter().get(`programs/${programId}.session.json`);
  if (!buf) return null;
  try {
    return GuidedSessionSchema.parse(JSON.parse(buf.toString('utf8')));
  } catch {
    return null;
  }
}
