import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { loadRenderablePatrons, moderatePatron } from './moderation';
import { patronsFileSchema } from './schema';
import type { PatronTier } from './schema';

export const PATRON_RENDER_LIST_VERSION = 'efs-patron-wall-v1' as const;

export interface PatronRenderEntry {
  displayName: string;
  message?: string;
  tier: PatronTier;
  /** Opaque consent reference; the consent record itself lives outside the repo. */
  consentRef: string;
}

/** The only shape Unity and the Puppeteer card ever see: moderated, approved, no flags. */
export interface PatronRenderList {
  schemaVersion: typeof PATRON_RENDER_LIST_VERSION;
  patrons: PatronRenderEntry[];
}

export function buildPatronRenderList(raw: unknown): PatronRenderList {
  const { renderable } = loadRenderablePatrons(raw);
  return {
    schemaVersion: PATRON_RENDER_LIST_VERSION,
    patrons: renderable.map((p) => ({
      displayName: p.displayName,
      ...(p.message ? { message: p.message } : {}),
      tier: p.tier,
      consentRef: p.consentRef,
    })),
  };
}

/** Byte-stable serialization; the hash is over these exact bytes so Unity can hash the file it read. */
export function serializePatronRenderList(list: PatronRenderList): string {
  return JSON.stringify(list, null, 2);
}

export function sha256Hex(text: string | Buffer): string {
  return createHash('sha256').update(text).digest('hex');
}

export function hashPatronRenderList(list: PatronRenderList): string {
  return sha256Hex(serializePatronRenderList(list));
}

/** patrons data (display text, consent refs) must be passed by path from outside the repo. */
export function assertOutsideRepo(filePath: string, repoRoot: string = process.cwd()): void {
  const rel = path.relative(path.resolve(repoRoot), path.resolve(filePath));
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new Error('Patron data must live outside the repository; pass its path from outside the repo');
  }
}

/**
 * Freezes the approved snapshot: moderates, writes the render list and returns its hash.
 * The render and manifest use this file only; the mutable patrons.json is never read again.
 * The output must also live outside the repo.
 */
export async function writePatronRenderList(
  patronsJsonPath: string,
  outPath: string,
  repoRoot: string = process.cwd(),
): Promise<{ list: PatronRenderList; hash: string }> {
  assertOutsideRepo(patronsJsonPath, repoRoot);
  assertOutsideRepo(outPath, repoRoot);
  const raw = JSON.parse(await fs.readFile(patronsJsonPath, 'utf8'));
  const list = buildPatronRenderList(raw);
  await fs.writeFile(outPath, serializePatronRenderList(list), 'utf8');
  return { list, hash: hashPatronRenderList(list) };
}

export type SnapshotVerification =
  | { ok: true; list: PatronRenderList; hash: string }
  | { ok: false; reason: string };

/**
 * Checks a frozen snapshot file against the hash approved for the render. Rejects, with a reason,
 * if the bytes changed, the format is wrong, or any frozen text no longer passes moderation.
 */
export async function verifyPatronSnapshotFile(
  filePath: string,
  approvedHash: string,
): Promise<SnapshotVerification> {
  const bytes = await fs.readFile(filePath);
  const hash = sha256Hex(bytes);
  if (hash !== approvedHash.toLowerCase()) {
    return { ok: false, reason: 'patron snapshot changed after approval (hash mismatch)' };
  }
  let list: PatronRenderList;
  try {
    list = JSON.parse(bytes.toString('utf8')) as PatronRenderList;
  } catch {
    return { ok: false, reason: 'patron snapshot is not valid JSON' };
  }
  if (list.schemaVersion !== PATRON_RENDER_LIST_VERSION || !Array.isArray(list.patrons)) {
    return { ok: false, reason: 'unsupported patron snapshot version' };
  }
  const parsed = patronsFileSchema.safeParse(
    list.patrons.map((p) => ({ ...p, since: '1970-01-01', approved: true })),
  );
  if (!parsed.success) return { ok: false, reason: 'patron snapshot entry is invalid' };
  for (const p of parsed.data) {
    const res = moderatePatron(p);
    if (!res.ok) return { ok: false, reason: `patron snapshot entry "${p.displayName}" rejected: ${res.reason}` };
  }
  return { ok: true, list, hash };
}

/** Hash of the render list file's raw bytes (what Unity logs after placing the wall). */
export async function hashPatronRenderListFile(filePath: string): Promise<string> {
  return sha256Hex(await fs.readFile(filePath));
}
