import { getProgram } from '@/lib/entitlements/catalog';
import { getStorageAdapter } from '@/lib/storage';

/**
 * Advanced hypnosis sessions catalog (backlog item 3).
 *
 * The repo holds the schema only. Session entries are handed over by Jonathan
 * and live in private storage at `hypnosis/catalog.json`; none are invented
 * here, so until that file exists the listing is honestly empty. Every entry
 * must carry its rights basis and provenance (HB-6) or it is dropped. An entry
 * is never "on sale" on its own: sale state comes from the program price.
 */

export const HYPNOSIS_PROGRAM_ID = 'advanced-hypnosis-sessions';
export const CATALOG_KEY = 'hypnosis/catalog.json';

export interface HypnosisSession {
  /** url-safe slug */
  id: string;
  title: string;
  summary: string;
  durationMinutes?: number;
  provenance: {
    scriptAuthor: string;
    voice: string;
    music: string;
    /** Why we may use the words, voice and music, e.g. "own work", "public domain (pre-1929)". */
    rightsBasis: string;
    /** Set only once someone has checked the rights basis for this recording. */
    rightsVerified: boolean;
  };
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Returns a clean session or null when the entry is incomplete. */
export function parseSession(raw: unknown): HypnosisSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  const p = r.provenance;
  if (!text(r.id) || !SLUG.test(r.id) || !text(r.title) || !text(r.summary)) return null;
  if (!p || !text(p.scriptAuthor) || !text(p.voice) || !text(p.music) || !text(p.rightsBasis)) return null;
  const session: HypnosisSession = {
    id: r.id,
    title: r.title.trim(),
    summary: r.summary.trim(),
    provenance: {
      scriptAuthor: p.scriptAuthor.trim(),
      voice: p.voice.trim(),
      music: p.music.trim(),
      rightsBasis: p.rightsBasis.trim(),
      rightsVerified: p.rightsVerified === true,
    },
  };
  if (typeof r.durationMinutes === 'number' && r.durationMinutes > 0 && r.durationMinutes < 600) {
    session.durationMinutes = r.durationMinutes;
  }
  return session;
}

export function parseCatalog(raw: unknown): HypnosisSession[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: HypnosisSession[] = [];
  for (const item of list) {
    const s = parseSession(item);
    if (s && !seen.has(s.id)) { seen.add(s.id); out.push(s); }
  }
  return out;
}

export async function loadCatalog(): Promise<HypnosisSession[]> {
  try {
    const buf = await getStorageAdapter().get(CATALOG_KEY);
    return buf ? parseCatalog(JSON.parse(buf.toString('utf8'))) : [];
  } catch {
    return [];
  }
}

export async function getSession(id: string): Promise<HypnosisSession | null> {
  return (await loadCatalog()).find((s) => s.id === id) ?? null;
}

/** On sale only when the parent program has a price; today it never does. */
export function onSale(): boolean {
  return getProgram(HYPNOSIS_PROGRAM_ID)?.priceCents != null;
}
