import type { EditRecipe, AudioPrepConfig } from './types';
import { DEFAULT_CONFIG } from './types';

export class RecipeValidationError extends Error {
  constructor(message: string, public clipId?: string) {
    super(message);
    this.name = 'RecipeValidationError';
  }
}

interface ValidationResult {
  totalDuration: number;
  clipDurations: Record<string, number>;
}

export function validateRecipe(
  recipe: EditRecipe,
  sourceDurations: Record<string, number>,
  config: Pick<AudioPrepConfig, 'maxClipsPerRecipe' | 'maxDurationMinutes'> = DEFAULT_CONFIG
): ValidationResult {
  if (recipe.clips.length > config.maxClipsPerRecipe) {
    throw new RecipeValidationError(`Maximum ${config.maxClipsPerRecipe} clips per recipe`);
  }

  if (recipe.clips.length === 0) {
    throw new RecipeValidationError('Recipe must have at least 1 clip');
  }

  let totalDuration = 0;
  const clipDurations: Record<string, number> = {};

  for (const clip of recipe.clips) {
    const sourceDuration = sourceDurations[clip.sourceAssetId];
    if (sourceDuration === undefined) {
      throw new RecipeValidationError(
        `Source asset ${clip.sourceAssetId} not found`,
        clip.id
      );
    }

    if (clip.startTime < 0) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: startTime must be >= 0`,
        clip.id
      );
    }

    if (clip.startTime >= clip.endTime) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: startTime must be < endTime`,
        clip.id
      );
    }

    if (clip.endTime > sourceDuration) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: endTime (${clip.endTime}) exceeds source duration (${sourceDuration})`,
        clip.id
      );
    }

    const clipDuration = clip.endTime - clip.startTime;

    if (clipDuration < 0.1) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: minimum clip length is 0.1 seconds`,
        clip.id
      );
    }

    if (clip.fadeIn + clip.fadeOut > clipDuration) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: fadeIn + fadeOut (${clip.fadeIn + clip.fadeOut}s) exceeds clip duration (${clipDuration}s)`,
        clip.id
      );
    }

    if (clip.volume < 0 || clip.volume > 2) {
      throw new RecipeValidationError(
        `Clip ${clip.id}: volume must be 0.0-2.0, got ${clip.volume}`,
        clip.id
      );
    }

    clipDurations[clip.id] = clipDuration;
    totalDuration += clipDuration;
  }

  const maxDurationSec = config.maxDurationMinutes * 60;
  if (totalDuration > maxDurationSec) {
    throw new RecipeValidationError(
      `Total output duration (${(totalDuration / 60).toFixed(1)} min) exceeds ${config.maxDurationMinutes} minute limit`
    );
  }

  return { totalDuration, clipDurations };
}
