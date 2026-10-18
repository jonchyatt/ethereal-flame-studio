import { PROGRAMS } from '../catalog';
import { getSalesPage, LOOP_STAGES, SALES_PAGES, VARIANT_IDS } from '../salespages';

const text = (p: (typeof SALES_PAGES)[number]) =>
  [p.displayName, p.headline, p.ctaNote, ...p.loopSection.body, ...p.sections.flatMap((s) => [s.heading, ...s.body])].join('\n');

describe('sales page previews', () => {
  it('has exactly three variants for every paid program', () => {
    for (const prog of PROGRAMS) {
      expect(SALES_PAGES.filter((p) => p.programId === prog.id).map((p) => p.variant).sort()).toEqual([...VARIANT_IDS]);
    }
    expect(SALES_PAGES.every((p) => PROGRAMS.some((g) => g.id === p.programId))).toBe(true);
  });

  it('leads every page with the loop in order, ending on Now', () => {
    for (const p of SALES_PAGES) {
      const loop = p.loopSection.body.join(' ').toLowerCase();
      let at = -1;
      for (const stage of ['desire', 'passion', 'achievement', 'peace', 'contrast', 'new desire']) {
        const i = loop.indexOf(stage, at + 1);
        expect(i).toBeGreaterThan(at);
        at = i;
      }
      expect(p.loopSection.body[p.loopSection.body.length - 1]).toMatch(/^Now /);
      expect(LOOP_STAGES).toHaveLength(6);
    }
  });

  it('never shows a price, a buy promise, a WAIA abbreviation or a health claim', () => {
    for (const p of SALES_PAGES) {
      const t = text(p);
      expect(t).not.toMatch(/[$£€]\s?\d|\d\s?(usd|dollars)/i);
      expect(t).not.toMatch(/\bWAIA\b/);
      expect(t).not.toMatch(/\b(cures|heals|guarantees?|guaranteed)\b/i);
      expect(p.ctaNote).toMatch(/not yet on sale/i);
    }
  });

  it('makes no Yale claim in public copy', () => {
    for (const p of SALES_PAGES.filter((x) => x.programId === 'yale-inversion-protocol')) {
      expect(p.displayName).not.toMatch(/yale/i);
      expect(text(p)).not.toMatch(/yale/i);
    }
  });

  it('carries stop-any-time language on every page of both programs', () => {
    for (const p of SALES_PAGES) expect(text(p)).toMatch(/stop (at )?any ?time/i);
  });

  it('refuses unknown programs and variants', () => {
    expect(getSalesPage('peptide-tracker', 'a')).toBeNull();
    expect(getSalesPage('advanced-hypnosis-sessions', 'd')).toBeNull();
    expect(getSalesPage('advanced-hypnosis-sessions', 'a')).not.toBeNull();
  });
});
