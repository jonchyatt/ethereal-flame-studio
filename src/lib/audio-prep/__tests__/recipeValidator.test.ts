import { validateRecipe, RecipeValidationError } from '../recipeValidator';
import type { EditRecipe } from '../types';

const validRecipe: EditRecipe = {
  version: 1,
  assetId: '00000000-0000-0000-0000-000000000001',
  clips: [
    {
      id: 'clip-1',
      sourceAssetId: '00000000-0000-0000-0000-000000000001',
      startTime: 0,
      endTime: 10,
      volume: 1,
      fadeIn: 0.5,
      fadeOut: 0.5,
    },
  ],
  normalize: false,
  outputFormat: 'wav',
  outputSampleRate: 44100,
};

const sourceDurations: Record<string, number> = {
  '00000000-0000-0000-0000-000000000001': 60,
};

describe('validateRecipe', () => {
  test('accepts valid recipe', () => {
    expect(() => validateRecipe(validRecipe, sourceDurations)).not.toThrow();
  });

  test('rejects endTime > sourceDuration', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], endTime: 100 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(RecipeValidationError);
  });

  test('rejects startTime >= endTime', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], startTime: 10, endTime: 5 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(RecipeValidationError);
  });

  test('rejects fadeIn + fadeOut > clip duration', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], startTime: 0, endTime: 1, fadeIn: 0.8, fadeOut: 0.8 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/fade/i);
  });

  test('rejects clip shorter than 0.1s', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], startTime: 5, endTime: 5.05 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/minimum/i);
  });

  test('rejects volume out of range', () => {
    const recipe = {
      ...validRecipe,
      clips: [{ ...validRecipe.clips[0], volume: 3 }],
    };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/volume/i);
  });

  test('rejects more than 50 clips', () => {
    const clips = Array.from({ length: 51 }, (_, i) => ({
      ...validRecipe.clips[0],
      id: `clip-${i}`,
      startTime: i,
      endTime: i + 0.5,
    }));
    const recipe = { ...validRecipe, clips };
    expect(() => validateRecipe(recipe, sourceDurations)).toThrow(/maximum/i);
  });

  test('calculates total duration', () => {
    const result = validateRecipe(validRecipe, sourceDurations);
    expect(result.totalDuration).toBe(10);
  });
});
