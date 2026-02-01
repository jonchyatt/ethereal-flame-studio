/**
 * Render Configuration Types
 *
 * Defines the config file format for local CLI rendering.
 * Exported from web UI, consumed by CLI tool.
 */

import { z } from 'zod';
import { ParticleLayerConfig, VisualMode } from '@/types';

// Output format options (subset for local rendering)
export const OUTPUT_FORMATS = [
  'flat-1080p-landscape',
  'flat-1080p-portrait',
  'flat-4k-landscape',
  'flat-4k-portrait',
  '360-mono-4k',
  '360-mono-8k',
  '360-stereo-8k',
] as const;

export type LocalOutputFormat = typeof OUTPUT_FORMATS[number];

// Zod schema for validation
export const RenderConfigSchema = z.object({
  version: z.literal('1.0'),

  audio: z.object({
    path: z.string().min(1, 'Audio path required'),
  }),

  output: z.object({
    path: z.string().min(1, 'Output path required'),
    format: z.enum(OUTPUT_FORMATS),
    fps: z.union([z.literal(30), z.literal(60)]),
  }),

  visual: z.object({
    mode: z.enum(['flame', 'mist'] as const),
    skyboxPreset: z.string(),
    skyboxRotationSpeed: z.number().min(0).max(2),
    waterEnabled: z.boolean(),
    waterColor: z.string(),
    waterReflectivity: z.number().min(0).max(1),
    layers: z.array(z.object({
      id: z.string(),
      name: z.string(),
      enabled: z.boolean(),
      particleCount: z.number(),
      baseSize: z.number(),
      spawnRadius: z.number(),
      maxSpeed: z.number(),
      lifetime: z.number(),
      audioReactivity: z.number(),
      frequencyBand: z.enum(['bass', 'mids', 'treble', 'all']),
      sizeAtBirth: z.number(),
      sizeAtPeak: z.number(),
      sizeAtDeath: z.number(),
      peakLifetime: z.number(),
      colorStart: z.tuple([z.number(), z.number(), z.number()]).optional(),
      colorEnd: z.tuple([z.number(), z.number(), z.number()]).optional(),
    })),
  }),

  options: z.object({
    quality: z.enum(['fast', 'balanced', 'quality']).default('balanced'),
    startFrame: z.number().optional(),
    endFrame: z.number().optional(),
  }).optional(),
});

export type RenderConfig = z.infer<typeof RenderConfigSchema>;

/**
 * Validate a config object
 */
export function validateConfig(config: unknown): { valid: true; config: RenderConfig } | { valid: false; errors: string[] } {
  const result = RenderConfigSchema.safeParse(config);

  if (result.success) {
    return { valid: true, config: result.data };
  }

  const errors = result.error.issues.map(issue =>
    `${issue.path.join('.')}: ${issue.message}`
  );

  return { valid: false, errors };
}

/**
 * Create a config object from visual store state
 */
export function createConfigFromState(
  audioPath: string,
  outputPath: string,
  format: LocalOutputFormat,
  fps: 30 | 60,
  visualState: {
    currentMode: VisualMode;
    skyboxPreset: { key: string };
    skyboxRotationSpeed: number;
    waterEnabled: boolean;
    waterColor: string;
    waterReflectivity: number;
    layers: ParticleLayerConfig[];
  }
): RenderConfig {
  return {
    version: '1.0',
    audio: { path: audioPath },
    output: { path: outputPath, format, fps },
    visual: {
      mode: visualState.currentMode === 'etherealFlame' ? 'flame' : 'mist',
      skyboxPreset: visualState.skyboxPreset.key,
      skyboxRotationSpeed: visualState.skyboxRotationSpeed,
      waterEnabled: visualState.waterEnabled,
      waterColor: visualState.waterColor,
      waterReflectivity: visualState.waterReflectivity,
      layers: visualState.layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        enabled: layer.enabled,
        particleCount: layer.particleCount,
        baseSize: layer.baseSize,
        spawnRadius: layer.spawnRadius,
        maxSpeed: layer.maxSpeed,
        lifetime: layer.lifetime,
        audioReactivity: layer.audioReactivity,
        frequencyBand: layer.frequencyBand,
        sizeAtBirth: layer.sizeAtBirth,
        sizeAtPeak: layer.sizeAtPeak,
        sizeAtDeath: layer.sizeAtDeath,
        peakLifetime: layer.peakLifetime,
        colorStart: layer.colorStart,
        colorEnd: layer.colorEnd,
      })),
    },
  };
}

/**
 * Get resolution from format string
 */
export function getResolution(format: LocalOutputFormat): { width: number; height: number } {
  const resolutions: Record<LocalOutputFormat, { width: number; height: number }> = {
    'flat-1080p-landscape': { width: 1920, height: 1080 },
    'flat-1080p-portrait': { width: 1080, height: 1920 },
    'flat-4k-landscape': { width: 3840, height: 2160 },
    'flat-4k-portrait': { width: 2160, height: 3840 },
    '360-mono-4k': { width: 4096, height: 2048 },
    '360-mono-8k': { width: 8192, height: 4096 },
    '360-stereo-8k': { width: 8192, height: 8192 },
  };
  return resolutions[format];
}
