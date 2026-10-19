import { buildRerecordPile, renderRerecordPile, rerecordReason } from '../rerecordPile';
import type { PlaylistSourceProvenance } from '../schema';

const base = {
  sourceType: 'youtube' as const,
  sourceUrl: 'https://www.youtube.com/watch?v=abc',
  attestedBy: 'jonathan',
  attestedAt: '2026-10-19T00:00:00.000Z',
  approvalId: '00000000-0000-4000-8000-000000000001',
};
function prov(n: number, over: Partial<PlaylistSourceProvenance>): PlaylistSourceProvenance {
  return {
    ...base,
    provenanceId: `00000000-0000-4000-8000-00000000010${n}`,
    sourceId: `src-${n}`,
    sourceTitle: `Source ${n}`,
    rightsBasis: 'public-domain',
    rightsEvidence: 'Published 1903',
    ...over,
  };
}

describe('rerecord pile', () => {
  it('keeps clean bases out', () => {
    expect(rerecordReason(prov(1, {}))).toBeNull();
    expect(rerecordReason(prov(1, { rightsBasis: 'cc0' }))).toBeNull();
    expect(rerecordReason(prov(1, { rightsBasis: 'transformative-remix' }))).toBeNull();
  });

  it('pools grant-based and evidence-less sources, once each', () => {
    const pile = buildRerecordPile([
      prov(1, {}),
      prov(2, { rightsBasis: 'licensed', rightsEvidence: 'Licence on file' }),
      prov(3, { rightsBasis: 'permission' }),
      prov(4, { rightsEvidence: '   ' }),
      prov(2, { rightsBasis: 'licensed', provenanceId: '00000000-0000-4000-8000-000000000199' }),
    ]);
    expect(pile.map((e) => [e.sourceId, e.reason])).toEqual([
      ['src-2', 'needs-third-party-grant'],
      ['src-3', 'needs-third-party-grant'],
      ['src-4', 'missing-evidence'],
    ]);
  });

  it('renders provenance for each entry', () => {
    const md = renderRerecordPile(buildRerecordPile([prov(2, { rightsBasis: 'licensed' })]));
    expect(md).toContain('## Source 2');
    expect(md).toContain('provenance 00000000-0000-4000-8000-000000000102');
    expect(renderRerecordPile([])).toContain('Empty.');
  });
});
