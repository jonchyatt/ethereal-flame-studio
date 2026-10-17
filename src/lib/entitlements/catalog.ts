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
}

export const FREE_TOOLS = ['peptide-tracker', 'self-help'] as const;

export const PROGRAMS: readonly Program[] = [
  {
    id: 'advanced-hypnosis-sessions',
    title: 'Advanced hypnosis sessions',
    kind: 'subscription',
    summary: 'Deeper sessions for people who want to go further than the free collection.',
    priceCents: null,
    testPriceCents: 500,
    provenance: 'Script author, voice and music are recorded for every session before it can go on sale.',
  },
  {
    id: 'yale-inversion-protocol',
    title: 'Yale inversion protocol: guided process',
    kind: 'one_time',
    summary: 'A guided process built from the protocol Jonathan has handed over.',
    priceCents: null,
    testPriceCents: 1000,
    provenance: 'Source: the Yale attachment protocol document and mental-mastery script doctrine in the jarvis repo. Read, never rewritten.',
  },
];

for (const p of PROGRAMS) {
  if ((FREE_TOOLS as readonly string[]).includes(p.id)) {
    throw new Error(`Free tool ${p.id} must never be in the paid catalog`);
  }
}

export function getProgram(id: string): Program | null {
  return PROGRAMS.find((p) => p.id === id) ?? null;
}

export function isFreeTool(id: string): boolean {
  return (FREE_TOOLS as readonly string[]).includes(id);
}
