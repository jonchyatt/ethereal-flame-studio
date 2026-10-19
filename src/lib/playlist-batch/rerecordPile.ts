import type { PlaylistRightsBasis, PlaylistSourceProvenance } from './schema';

/**
 * Re-record pile (HB-6). No releases are ever signed, so a source whose rights basis is
 * worrying or depends on someone else's grant never goes into a mix. It goes onto this one
 * list instead, with its provenance, and Jonathan re-records the words in his own voice.
 * See docs/WAIA-RIGHTS.md.
 */

/** Bases that rest on a third party's grant, which we do not seek or sign. */
const GRANT_BASES: ReadonlySet<PlaylistRightsBasis> = new Set(['licensed', 'permission']);

/** Bases that are clean without any grant. */
const CLEAN_BASES: ReadonlySet<PlaylistRightsBasis> = new Set(['public-domain', 'cc0', 'transformative-remix']);

export type RerecordReason = 'needs-third-party-grant' | 'missing-evidence' | 'unrecognised-basis';

export interface RerecordPileEntry {
  provenanceId: string;
  sourceUrl: string;
  sourceId: string;
  sourceTitle: string;
  sourceChannel?: string;
  rightsBasis: string;
  rightsEvidence: string;
  reason: RerecordReason;
  attestedBy: string;
  attestedAt: string;
}

export function rerecordReason(
  p: Pick<PlaylistSourceProvenance, 'rightsBasis' | 'rightsEvidence'>,
): RerecordReason | null {
  if (GRANT_BASES.has(p.rightsBasis)) return 'needs-third-party-grant';
  if (!CLEAN_BASES.has(p.rightsBasis)) return 'unrecognised-basis';
  if (!p.rightsEvidence || !p.rightsEvidence.trim()) return 'missing-evidence';
  return null;
}

/** One list, de-duplicated by source, in a stable order. */
export function buildRerecordPile(provenance: readonly PlaylistSourceProvenance[]): RerecordPileEntry[] {
  const bySource = new Map<string, RerecordPileEntry>();
  for (const p of provenance) {
    const reason = rerecordReason(p);
    if (!reason) continue;
    const key = `${p.sourceType}:${p.sourceId}`;
    if (bySource.has(key)) continue;
    bySource.set(key, {
      provenanceId: p.provenanceId,
      sourceUrl: p.sourceUrl,
      sourceId: p.sourceId,
      sourceTitle: p.sourceTitle,
      sourceChannel: p.sourceChannel,
      rightsBasis: p.rightsBasis,
      rightsEvidence: p.rightsEvidence,
      reason,
      attestedBy: p.attestedBy,
      attestedAt: p.attestedAt,
    });
  }
  return [...bySource.values()].sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle) || a.sourceId.localeCompare(b.sourceId));
}

const REASON_TEXT: Record<RerecordReason, string> = {
  'needs-third-party-grant': 'Rests on someone else\'s licence or permission, which we do not sign',
  'missing-evidence': 'No rights evidence on record',
  'unrecognised-basis': 'Rights basis is not one we accept',
};

export function renderRerecordPile(entries: readonly RerecordPileEntry[]): string {
  const lines = ['# Re-record pile', '', 'Words Jonathan re-records in his own voice. Nothing here goes into a mix as is.', ''];
  if (entries.length === 0) return [...lines, 'Empty.', ''].join('\n');
  for (const e of entries) {
    lines.push(
      `## ${e.sourceTitle}`,
      `- Source: ${e.sourceUrl} (id ${e.sourceId}${e.sourceChannel ? `, ${e.sourceChannel}` : ''})`,
      `- Why: ${REASON_TEXT[e.reason]}`,
      `- Rights basis on record: ${e.rightsBasis}`,
      `- Evidence on record: ${e.rightsEvidence.trim() || '(none)'}`,
      `- Recorded by ${e.attestedBy} at ${e.attestedAt} (provenance ${e.provenanceId})`,
      '',
    );
  }
  return lines.join('\n');
}
