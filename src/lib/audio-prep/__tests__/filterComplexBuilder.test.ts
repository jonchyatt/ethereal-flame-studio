import { buildFilterComplex } from '../filterComplexBuilder';
import type { EditRecipe } from '../types';

describe('buildFilterComplex', () => {
  test('builds single-clip trim with volume and fades', () => {
    const recipe: EditRecipe = {
      version: 1,
      assetId: 'asset-1',
      clips: [
        {
          id: 'clip-1',
          sourceAssetId: 'asset-1',
          startTime: 5,
          endTime: 15,
          volume: 0.8,
          fadeIn: 1,
          fadeOut: 0.5,
        },
      ],
      normalize: false,
      outputFormat: 'wav',
      outputSampleRate: 44100,
    };

    const result = buildFilterComplex(recipe, { 'asset-1': '/path/to/audio.wav' });

    expect(result.inputs).toContain('/path/to/audio.wav');
    expect(result.filterComplex).toContain('atrim=');
    expect(result.filterComplex).toContain('volume=0.8');
    expect(result.filterComplex).toContain('afade=t=in');
    expect(result.filterComplex).toContain('afade=t=out');
  });

  test('builds multi-clip join with concat', () => {
    const recipe: EditRecipe = {
      version: 1,
      assetId: 'asset-1',
      clips: [
        { id: 'c1', sourceAssetId: 'asset-1', startTime: 0, endTime: 5, volume: 1, fadeIn: 0, fadeOut: 0 },
        { id: 'c2', sourceAssetId: 'asset-1', startTime: 10, endTime: 20, volume: 1, fadeIn: 0, fadeOut: 0 },
      ],
      normalize: false,
      outputFormat: 'wav',
      outputSampleRate: 44100,
    };

    const result = buildFilterComplex(recipe, { 'asset-1': '/path/to/audio.wav' });

    expect(result.filterComplex).toContain('concat=n=2');
  });
});
