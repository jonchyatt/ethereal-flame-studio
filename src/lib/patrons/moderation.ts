import { patronsFileSchema, type Patron } from './schema';

/**
 * Starter blocklist of whole words / phrases, matched after normalizing case,
 * accents, leetspeak and repeated letters. Extend as needed; it is a safety
 * net behind the approved flag, not a replacement for human curation.
 */
export const BLOCKLIST: readonly string[] = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'cock', 'pussy', 'slut', 'whore',
  'nigger', 'nigga', 'faggot', 'retard', 'kike', 'spic', 'chink', 'tranny',
  'nazi', 'hitler', 'kill yourself', 'kys', 'rape',
];

const URL_PATTERNS: readonly RegExp[] = [
  /https?:\/\//i,
  /\bwww\./i,
  /[a-z0-9-]+\.(com|net|org|io|co|me|ly|gg|tv|xyz|app|dev|info|biz|link|site|online|shop|store|ru|cn|tk)\b/i,
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,
  /\b(t\.me|bit\.ly|discord\.gg)\b/i,
];

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i',
};

function normalize(text: string): string {
  const folded = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[01345 7@$!]/g, (c) => LEET[c] ?? ' ');
  return folded
    .replace(/[^a-z]+/g, ' ')
    .replace(/(.)\1+/g, '$1')
    .trim()
    // Rejoin spaced-out single letters ("f u c k" -> "fuck").
    .replace(/\b(?:[a-z] )+[a-z]\b/g, (m) => m.replace(/ /g, ''));
}

const NORMALIZED_BLOCKLIST = BLOCKLIST.map(normalize);

export function containsUrl(text: string): boolean {
  return URL_PATTERNS.some((p) => p.test(text));
}

export function containsBlockedTerm(text: string): boolean {
  const norm = normalize(text);
  const padded = ` ${norm} `;
  return NORMALIZED_BLOCKLIST.some((term) => padded.includes(` ${term} `));
}

export type ModerationResult = { ok: true } | { ok: false; reason: string };

/** Checks one patron's visible text and approval flag. Length caps live in the schema. */
export function moderatePatron(patron: Patron): ModerationResult {
  if (!patron.approved) return { ok: false, reason: 'not approved' };
  for (const [field, value] of [
    ['displayName', patron.displayName],
    ['message', patron.message],
  ] as const) {
    if (!value) continue;
    if (containsUrl(value)) return { ok: false, reason: `${field} contains a URL` };
    if (containsBlockedTerm(value)) return { ok: false, reason: `${field} contains a blocked term` };
  }
  return { ok: true };
}

export interface PatronRejection {
  index: number;
  displayName: string;
  reason: string;
}

export interface LoadedPatrons {
  renderable: Patron[];
  rejected: PatronRejection[];
}

/**
 * Parses raw patrons.json content and returns only what may render.
 * Throws if the file itself is not valid; individually rejected entries are reported.
 */
export function loadRenderablePatrons(raw: unknown): LoadedPatrons {
  const patrons = patronsFileSchema.parse(raw);
  const renderable: Patron[] = [];
  const rejected: PatronRejection[] = [];
  patrons.forEach((p, index) => {
    const res = moderatePatron(p);
    if (res.ok) renderable.push(p);
    else rejected.push({ index, displayName: p.displayName, reason: res.reason });
  });
  return { renderable, rejected };
}
