import { assertWholeName, captionsForCut, captionsFromText, toAss, toSrt } from '../captions';
import { platformCaptions } from '../cut';

describe('captions', () => {
  const lines = [
    { startSec: 0, endSec: 10, text: 'before' },
    { startSec: 38, endSec: 44, text: 'Now, what am I appreciating?' },
    { startSec: 44, endSec: 90, text: 'long line' },
  ];

  it('clips transcript lines to the cut and shifts them to start at zero', () => {
    expect(captionsForCut(lines, 40, 70)).toEqual([
      { startSec: 0, endSec: 4, text: 'Now, what am I appreciating?' },
      { startSec: 4, endSec: 30, text: 'long line' },
    ]);
  });

  it('spreads untimed lyric text across the cut', () => {
    const out = captionsFromText('One line. Another line here.', 30);
    expect(out).toHaveLength(2);
    expect(out[0].startSec).toBe(0);
    expect(out[1].endSec).toBeCloseTo(30, 2);
  });

  it('writes SRT times', () => {
    expect(toSrt([{ startSec: 1.5, endSec: 3661, text: 'x' }])).toContain('00:00:01,500 --> 01:01:01,000');
  });

  it('uses upright lettering in the caption-safe zone with gold Now', () => {
    const ass = toAss([{ startSec: 0, endSec: 2, text: 'What Am I Appreciating Now' }]);
    expect(ass).toMatch(/Style: Default,Iowan Old Style,\d+,.*,-1,0,0,0,100,100,1,0,/); // bold, italic 0, angle 0
    expect(ass).not.toMatch(/\\fr[xyz]|\\i1/);
    expect(ass).toContain('{\\c&H77BDE6&}Now');
    // 9:16 caption-safe zone ends at 84% of the height, so the bottom margin is 16% = 307 px
    expect(ass).toMatch(/,2,86,86,307,1/);
  });

  it('never accepts a shortened name in generated text', () => {
    expect(() => assertWholeName('Watch WAIA tonight')).toThrow(/WAIA/);
    expect(() => assertWholeName('What Am I Appreciating')).toThrow(/Now/);
    expect(assertWholeName('What Am I Appreciating Now')).toBeTruthy();
  });

  it('writes all three platform captions with the whole name', () => {
    const c = platformCaptions('A line from the narration');
    for (const text of Object.values(c)) expect(text).toContain('What Am I Appreciating Now');
    expect(Object.keys(c).sort()).toEqual(['instagram-reels', 'tiktok', 'youtube-shorts']);
  });
});
