/**
 * Paid programs on whatamiappreciatingnow.com (commerce rulings 2026-10-17).
 *
 * Only paid things live here. The free Reset Biology tools (peptide tracker,
 * self-help) are never paywalled on this site, so FREE_TOOLS is the guard list
 * and the catalog refuses to hold any of them.
 *
 * Prices are config, not law: `priceCents: null` means "not yet on sale" and
 * checkout refuses. `testPriceCents` is used only against test-mode keys.
 * Program words are never stored in the repo: they live in private storage at
 * `programs/<id>.md` (see content.ts) and are handed over by Jonathan.
 */

import { priceFor } from '../prices/config';

export type ProgramKind = 'subscription' | 'one_time';

export interface Program {
  id: string;
  title: string;
  kind: ProgramKind;
  summary: string;
  priceCents: number | null;
  testPriceCents: number;
  /** Where the words, voice and music come from; shown before anything can sell. */
  provenance: string;
  /** Has a step-by-step session in private storage (`programs/<id>.session.json`) played at /programs/<id>/session. */
  guided?: boolean;
}

export const FREE_TOOLS = ['peptide-tracker', 'self-help'] as const;
const BELIEF_LOCK_IN_PROGRAM_ID = 'yale-inversion-protocol';
const BELIEF_LOCK_IN_SLUG = 'belief-lock-in';

export const PROGRAMS: readonly Program[] = [
  {
    id: 'advanced-hypnosis-sessions',
    title: 'Advanced hypnosis sessions',
    kind: 'subscription',
    summary: 'Deeper sessions for people who want to go further than the free collection.',
    priceCents: priceFor('program:advanced-hypnosis-sessions'),
    testPriceCents: 500,
    provenance: 'Script author, voice and music are recorded for every session before it can go on sale.',
  },
  {
    id: 'yale-inversion-protocol',
    title: 'Belief Lock-In',
    kind: 'one_time',
    summary: 'A guided process for locking in a belief you choose.',
    priceCents: priceFor('program:yale-inversion-protocol'),
    testPriceCents: 1000,
    guided: true,
    provenance: 'A guided process for exploring a belief you choose.',
  },
];

for (const p of PROGRAMS) {
  if ((FREE_TOOLS as readonly string[]).includes(p.id)) {
    throw new Error(`Free tool ${p.id} must never be in the paid catalog`);
  }
}

export function getProgram(id: string): Program | null {
  const programId = id === BELIEF_LOCK_IN_SLUG ? BELIEF_LOCK_IN_PROGRAM_ID : id;
  return PROGRAMS.find((p) => p.id === programId) ?? null;
}

/** Visitor-facing path segment; program ids remain stable for purchases and entitlements. */
export function programSlug(programId: string): string {
  return programId === BELIEF_LOCK_IN_PROGRAM_ID ? BELIEF_LOCK_IN_SLUG : programId;
}

export function isFreeTool(id: string): boolean {
  return (FREE_TOOLS as readonly string[]).includes(id);
}
