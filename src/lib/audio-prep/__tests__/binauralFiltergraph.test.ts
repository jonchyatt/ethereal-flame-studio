import { buildBinauralFiltergraph } from '../binauralFiltergraph';
import type { BinauralMixRecipe } from '../binauralFiltergraph';

function makeRecipe(): BinauralMixRecipe {
  return {
    version: 1,
    sources: [
      {
        assetId: 'voice-1',
        sourceUrl: 'https://archive.org/download/example/voice1.mp3',
        rightsBasis: 'public-domain',
        offsetSec: 0,
        levelDb: 0,
        channelRouting: { left: 1, right: 0.2 },
      },
      {
        assetId: 'voice-2',
        sourceUrl: 'https://archive.org/download/example/voice2.mp3',
        rightsBasis: 'public-domain',
        offsetSec: 5,
        levelDb: -2,
        channelRouting: { left: 0.2, right: 1 },
      },
    ],
    musicBed: {
      assetId: 'bed-1',
      sourceUrl: 'https://archive.org/download/example/bed.mp3',
      rightsBasis: 'cc0',
      levelDb: -8,
    },
    mixDescription: 'test mix',
    outputPath: '/tmp/out.wav',
  };
}

describe('buildBinauralFiltergraph', () => {
  test('orders inputs as sources then musicBed', () => {
    const recipe = makeRecipe();
    const result = buildBinauralFiltergraph(recipe, {
      'voice-1': '/a/voice1.mp3',
      'voice-2': '/a/voice2.mp3',
      'bed-1': '/a/bed.mp3',
    });

    expect(result.inputs).toEqual(['/a/voice1.mp3', '/a/voice2.mp3', '/a/bed.mp3']);
  });

  test('routes each source into independent L and R amix sums, not a single panned mono mix', () => {
    const recipe = makeRecipe();
    const result = buildBinauralFiltergraph(recipe, {
      'voice-1': '/a/voice1.mp3',
      'voice-2': '/a/voice2.mp3',
      'bed-1': '/a/bed.mp3',
    });

    // Two independent amix sums (Left, Right) feeding a join — the structural signature
    // of "genuinely different L/R content", not pan=stereo applied to one mono sum.
    expect(result.filterComplex).toContain('[Lsum]');
    expect(result.filterComplex).toContain('[Rsum]');
    expect(result.filterComplex).toContain('join=inputs=2:channel_layout=stereo:map=0.0-FL|1.0-FR');
    expect(result.filterComplex).toContain('normalize=0'); // amix hygiene: no auto-normalization
    expect(result.filterComplex).toContain('volume=0.2'); // per-source channelRouting weight present
    expect(result.filterComplex).toContain('adelay=5000:all=1'); // offsetSec=5 staggers voice-2
    expect(result.outputLabel).toBe('[out]');
  });

  test('throws when assetPaths is missing a referenced source', () => {
    const recipe = makeRecipe();
    expect(() => buildBinauralFiltergraph(recipe, { 'voice-1': '/a/voice1.mp3' })).toThrow(
      /Missing path for asset voice-2/
    );
  });
});
