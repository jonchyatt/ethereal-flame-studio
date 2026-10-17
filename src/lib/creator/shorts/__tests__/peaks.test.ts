import { energyCurve, selectPeakSegments } from '../peaks';

function curve(total: number, bursts: Array<[number, number]>, pauseAt?: number) {
  return Array.from({ length: total }, (_, t) => {
    if (t === pauseAt) return 0.001;
    return bursts.some(([a, b]) => t >= a && t < b) ? 0.8 : 0.05;
  });
}

describe('selectPeakSegments', () => {
  it('lands on the loud span, under 60 s, with a pending review state', () => {
    const [seg] = selectPeakSegments(curve(300, [[100, 160]]), { hopSec: 1, count: 1, targetSec: 45 });
    expect(seg.endSec - seg.startSec).toBeLessThanOrEqual(59);
    expect(seg.startSec).toBeGreaterThanOrEqual(97);
    expect(seg.endSec).toBeLessThanOrEqual(163);
    expect(seg.score).toBe(1);
    expect(seg.reviewStatus).toBe('pending');
  });

  it('clamps the length to 30..59 s whatever is asked', () => {
    const [long] = selectPeakSegments(curve(300, [[50, 250]]), { hopSec: 1, count: 1, targetSec: 600 });
    const [short] = selectPeakSegments(curve(300, [[50, 250]]), { hopSec: 1, count: 1, targetSec: 5 });
    expect(long.endSec - long.startSec).toBe(59);
    expect(short.endSec - short.startSec).toBe(30);
  });

  it('snaps the start to a nearby pause', () => {
    const [seg] = selectPeakSegments(curve(300, [[100, 160]], 98), { hopSec: 1, count: 1, targetSec: 40, snapSec: 3 });
    expect(seg.startSec).toBe(98);
  });

  it('keeps spans apart and never overlapping', () => {
    const segs = selectPeakSegments(curve(600, [[50, 120], [300, 380]]), { hopSec: 1, count: 3, targetSec: 40, minGapSec: 20 });
    expect(segs.length).toBe(3);
    for (let i = 1; i < segs.length; i++) expect(segs[i].startSec - segs[i - 1].endSec).toBeGreaterThanOrEqual(20);
  });

  it('returns nothing for a track shorter than 30 s', () => {
    expect(selectPeakSegments(curve(20, []), { hopSec: 1 })).toEqual([]);
  });
});

describe('energyCurve', () => {
  it('measures RMS per hop', () => {
    const samples = new Float32Array(200).fill(0.5);
    samples.fill(0, 100);
    expect(energyCurve(samples, 100, 1)).toEqual([0.5, 0]);
  });
});
