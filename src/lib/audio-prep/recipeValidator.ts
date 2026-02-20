import type { EditRecipe } from './types';

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
  sourceDurations: Record<string, number>
): ValidationResult {
  if (recipe.clips.length > 50) {
    throw new RecipeValidationError('Maximum 50 clips per recipe');
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

  if (totalDuration > 30 * 60) {
    throw new RecipeValidationError(
      `Total output duration (${(totalDuration / 60).toFixed(1)} min) exceeds 30 minute limit`
    );
  }

  return { totalDuration, clipDurations };
}
