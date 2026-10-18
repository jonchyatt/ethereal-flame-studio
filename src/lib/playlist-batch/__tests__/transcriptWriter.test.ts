const files = new Map<string, Buffer>();
jest.mock('@/lib/storage', () => ({
  getStorageAdapter: () => ({
    put: async (key: string, data: Buffer) => { files.set(key, Buffer.from(data)); },
    get: async (key: string) => files.get(key) ?? null,
    list: async (prefix: string) => [...files.keys()].filter((k) => k.startsWith(prefix)),
  }),
}));

import { readTranscript, buildPackContents, writePackContents, packContentsPrefix } from '../packContents';
import { toTranscriptLines, writeAssetTranscript, transcriptKey } from '../transcriptWriter';
import type { TranscriptionResult } from '@/lib/services/whisperClient';

const assetId = '55555555-5555-4555-8555-555555555555';
const result = (segments: TranscriptionResult['segments']): TranscriptionResult =>
  ({ text: 'x', language: 'en', durationSeconds: 8, segmentsCount: segments.length, segments });

const good = result([
  { startSec: 4, endSec: 8, text: ' That  molds and makes. ' },
  { startSec: 0, endSec: 4, text: 'Mind is the master power.' },
]);

beforeEach(() => {
  files.clear();
  files.set(`assets/${assetId}/original.mp3`, Buffer.from('fixture-audio'));
});

describe('toTranscriptLines', () => {
  it('sorts, trims and drops empty or backwards rows', () => {
    const lines = toTranscriptLines([
      { startSec: 5, endSec: 6, text: ' b ' },
      { startSec: 1, endSec: 1, text: 'zero length' },
      { startSec: 2, endSec: 3, text: '   ' },
      { startSec: 0, endSec: 1, text: 'a' },
    ]);
    expect(lines).toEqual([{ startSec: 0, endSec: 1, text: 'a' }, { startSec: 5, endSec: 6, text: 'b' }]);
  });
});

describe('writeAssetTranscript', () => {
  it('writes a transcript readTranscript can read, from the stored audio', async () => {
    const calls: Array<[number, string]> = [];
    const out = await writeAssetTranscript(assetId, async (audio, name) => { calls.push([audio.length, name]); return good; });
    expect(out).toEqual({ status: 'written', key: transcriptKey(assetId), lines: 2 });
    expect(calls).toEqual([[13, 'original.mp3']]);
    expect(await readTranscript(assetId)).toEqual([
      { startSec: 0, endSec: 4, text: 'Mind is the master power.' },
      { startSec: 4, endSec: 8, text: 'That molds and makes.' },
    ]);
  });

  it('never overwrites an existing transcript unless forced', async () => {
    files.set(transcriptKey(assetId), Buffer.from('[]'));
    const transcribe = jest.fn(async () => good);
    expect((await writeAssetTranscript(assetId, transcribe)).status).toBe('exists');
    expect(transcribe).not.toHaveBeenCalled();
    expect((await writeAssetTranscript(assetId, transcribe, { force: true })).status).toBe('written');
  });

  it('writes nothing when the service fails, returns no timings, or there is no audio', async () => {
    expect((await writeAssetTranscript(assetId, async () => { throw new Error('down'); }))).toEqual({ status: 'failed', error: 'down' });
    expect((await writeAssetTranscript(assetId, async () => result([]))).status).toBe('no-timings');
    expect(files.has(transcriptKey(assetId))).toBe(false);
    files.clear();
    expect((await writeAssetTranscript(assetId, async () => good)).status).toBe('no-audio');
  });
});

describe('pack contents pick the transcript up later', () => {
  const item = { index: 0, videoId: 'v', title: 'T', url: 'https://example.com', provenance: [], recipes: [], currentRecipeId: null } as never;
  it('rewrites a folder that was awaiting the transcript, once', async () => {
    const packId = 'pack-1';
    const first = await writePackContents(packId, buildPackContents({ item, batchJobId: 'b', packId, transcript: null }));
    expect(first.written).toBe(true);
    const prefix = packContentsPrefix(packId);
    expect(JSON.parse(files.get(`${prefix}contents.json`)!.toString()).captions.status).toBe('awaiting-transcript');

    const lines = toTranscriptLines(good.segments);
    const second = await writePackContents(packId, buildPackContents({ item, batchJobId: 'b', packId, transcript: lines }));
    expect(second.written).toBe(true);
    expect(JSON.parse(files.get(`${prefix}contents.json`)!.toString()).captions.status).toBe('written');
    expect(files.get(`${prefix}captions.srt`)!.toString()).toContain('Mind is the master power.');

    const third = await writePackContents(packId, buildPackContents({ item, batchJobId: 'b', packId, transcript: lines }));
    expect(third.written).toBe(false);
  });
});
