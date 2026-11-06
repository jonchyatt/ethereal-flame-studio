/**
 * The mark: the five-word name as ONE continuous clockwise ring, every baseline
 * facing inward (so the letters run upside down along the bottom), with "NOW"
 * as the hinge back into "WHAT" (Jon's merch rule, 2026-11-04,
 * jarvis data/waia-health-shop/MERCH-PROPOSAL-2026-11-04-four-concepts-continuous-loop.md).
 *
 * Glyphs are placed one by one at computed angles rather than on an SVG
 * textPath, so the angle of every letter is known exactly. That is what lets the
 * home page turn the ring until "NOW" sits under the reading mark.
 */
export const RING_TEXT = 'WHAT AM I APPRECIATING NOW ';

// Rough advance widths in letter units. Even spacing makes the word gaps look
// like holes; this keeps the ring reading as words. ponytail: hand-tuned for the
// display serif, not measured; measure with getComputedTextLength if the face changes.
const advance = (ch: string) => (ch === ' ' ? 0.62 : ch === 'I' ? 0.62 : ch === 'W' || ch === 'M' ? 1.28 : 1);

const total = [...RING_TEXT].reduce((s, ch) => s + advance(ch), 0);

/** Each glyph with its centre angle in degrees, clockwise from twelve o'clock. W sits at 0. */
export const RING_GLYPHS: { ch: string; deg: number }[] = (() => {
  let run = 0;
  const first = advance(RING_TEXT[0]) / 2;
  return [...RING_TEXT].map((ch) => {
    const mid = run + advance(ch) / 2;
    run += advance(ch);
    return { ch, deg: ((mid - first) / total) * 360 };
  });
})();

/** Clockwise turn that brings the N of "NOW" under the mark at twelve o'clock. */
export const NOW_TURN_DEG = 360 - RING_GLYPHS[RING_TEXT.lastIndexOf('NOW')].deg;
