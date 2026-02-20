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
    intensity: z.number().optional(),
    skyboxPreset: z.string(),
    skyboxRotationSpeed: z.number().min(0).max(2),
    skyboxAudioReactiveEnabled: z.boolean().optional(),
    skyboxAudioReactivity: z.number().optional(),
    skyboxDriftSpeed: z.number().optional(),
    skyboxMode: z.enum(['shader', 'video'] as const).optional(),
    skyboxVideoUrl: z.string().nullable().optional(),
    skyboxVideoYaw: z.number().optional(),
    skyboxVideoPitch: z.number().optional(),
    skyboxMaskMode: z.enum(['none', 'luma', 'chroma'] as const).optional(),
    skyboxMaskThreshold: z.number().optional(),
    skyboxMaskSoftness: z.number().optional(),
    skyboxMaskColor: z.string().optional(),
    skyboxMaskPreviewMode: z.enum(['tint', 'matte'] as const).optional(),
    skyboxMaskInvert: z.boolean().optional(),
    skyboxRectMaskEnabled: z.boolean().optional(),
    skyboxRectMaskU: z.number().optional(),
    skyboxRectMaskV: z.number().optional(),
    skyboxRectMaskWidth: z.number().optional(),
    skyboxRectMaskHeight: z.number().optional(),
    skyboxRectMaskSoftness: z.number().optional(),
    skyboxRectMaskInvert: z.boolean().optional(),
    skyboxSeamBlendEnabled: z.boolean().optional(),
    skyboxSeamBlendWidth: z.number().optional(),
    skyboxHoleFixEnabled: z.boolean().optional(),
    skyboxHoleFixThreshold: z.number().optional(),
    skyboxHoleFixSoftness: z.number().optional(),
    skyboxPoleFadeEnabled: z.boolean().optional(),
    skyboxPoleFadeStart: z.number().optional(),
    skyboxPoleFadeSoftness: z.number().optional(),
    skyboxPatchEnabled: z.boolean().optional(),
    skyboxPatchU: z.number().optional(),
    skyboxPatchV: z.number().optional(),
    skyboxPatchRadius: z.number().optional(),
    skyboxPatchSoftness: z.number().optional(),
    skyboxPatch2Enabled: z.boolean().optional(),
    skyboxPatch2U: z.number().optional(),
    skyboxPatch2V: z.number().optional(),
    skyboxPatch2Radius: z.number().optional(),
    skyboxPatch2Softness: z.number().optional(),
    skyboxPatch3Enabled: z.boolean().optional(),
    skyboxPatch3U: z.number().optional(),
    skyboxPatch3V: z.number().optional(),
    skyboxPatch3Radius: z.number().optional(),
    skyboxPatch3Softness: z.number().optional(),
    skyboxPatch4Enabled: z.boolean().optional(),
    skyboxPatch4U: z.number().optional(),
    skyboxPatch4V: z.number().optional(),
    skyboxPatch4Radius: z.number().optional(),
    skyboxPatch4Softness: z.number().optional(),
    skyboxPoleLogoEnabled: z.boolean().optional(),
    skyboxPoleLogoUrl: z.string().nullable().optional(),
    skyboxPoleLogoSize: z.number().optional(),
    skyboxPoleLogoOpacity: z.number().optional(),
    skyboxPoleLogoAutoScale: z.boolean().optional(),
    vrComfortMode: z.boolean().optional(),
    vrDebugOverlayEnabled: z.boolean().optional(),
    waterEnabled: z.boolean(),
    waterColor: z.string(),
    waterReflectivity: z.number().min(0).max(1),
    // Camera orbit
    cameraOrbitEnabled: z.boolean().optional(),
    cameraOrbitRenderOnly: z.boolean().optional(),
    cameraOrbitSpeed: z.number().optional(),
    cameraOrbitRadius: z.number().optional(),
    cameraOrbitHeight: z.number().optional(),
    cameraLookAtOrb: z.boolean().optional(),
    // Orb placement
    orbAnchorMode: z.enum(['viewer', 'world']).optional(),
    orbDistance: z.number().optional(),
    orbHeight: z.number().optional(),
    orbSideOffset: z.number().optional(),
    orbWorldX: z.number().optional(),
    orbWorldY: z.number().optional(),
    orbWorldZ: z.number().optional(),
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
      // Accept legacy aliases while normalizing to canonical store values.
      frequencyBand: z
        .enum(['bass', 'mids', 'treble', 'mid', 'high', 'all'])
        .transform((band) => (band === 'mid' ? 'mids' : band === 'high' ? 'treble' : band)),
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

export interface RenderConfigVisualState {
  currentMode: VisualMode;
  intensity: number;
  skyboxPreset: { key: string };
  skyboxRotationSpeed: number;
  skyboxAudioReactiveEnabled: boolean;
  skyboxAudioReactivity: number;
  skyboxDriftSpeed: number;
  skyboxMode: 'shader' | 'video';
  skyboxVideoUrl: string | null;
  skyboxVideoYaw: number;
  skyboxVideoPitch: number;
  skyboxMaskMode: 'none' | 'luma' | 'chroma';
  skyboxMaskThreshold: number;
  skyboxMaskSoftness: number;
  skyboxMaskColor: string;
  skyboxMaskPreviewMode: 'tint' | 'matte';
  skyboxMaskInvert: boolean;
  skyboxRectMaskEnabled: boolean;
  skyboxRectMaskU: number;
  skyboxRectMaskV: number;
  skyboxRectMaskWidth: number;
  skyboxRectMaskHeight: number;
  skyboxRectMaskSoftness: number;
  skyboxRectMaskInvert: boolean;
  skyboxSeamBlendEnabled: boolean;
  skyboxSeamBlendWidth: number;
  skyboxHoleFixEnabled: boolean;
  skyboxHoleFixThreshold: number;
  skyboxHoleFixSoftness: number;
  skyboxPoleFadeEnabled: boolean;
  skyboxPoleFadeStart: number;
  skyboxPoleFadeSoftness: number;
  skyboxPatchEnabled: boolean;
  skyboxPatchU: number;
  skyboxPatchV: number;
  skyboxPatchRadius: number;
  skyboxPatchSoftness: number;
  skyboxPatch2Enabled: boolean;
  skyboxPatch2U: number;
  skyboxPatch2V: number;
  skyboxPatch2Radius: number;
  skyboxPatch2Softness: number;
  skyboxPatch3Enabled: boolean;
  skyboxPatch3U: number;
  skyboxPatch3V: number;
  skyboxPatch3Radius: number;
  skyboxPatch3Softness: number;
  skyboxPatch4Enabled: boolean;
  skyboxPatch4U: number;
  skyboxPatch4V: number;
  skyboxPatch4Radius: number;
  skyboxPatch4Softness: number;
  skyboxPoleLogoEnabled: boolean;
  skyboxPoleLogoUrl: string | null;
  skyboxPoleLogoSize: number;
  skyboxPoleLogoOpacity: number;
  skyboxPoleLogoAutoScale: boolean;
  vrComfortMode: boolean;
  vrDebugOverlayEnabled: boolean;
  waterEnabled: boolean;
  waterColor: string;
  waterReflectivity: number;
  cameraOrbitEnabled: boolean;
  cameraOrbitRenderOnly: boolean;
  cameraOrbitSpeed: number;
  cameraOrbitRadius: number;
  cameraOrbitHeight: number;
  cameraLookAtOrb: boolean;
  orbAnchorMode: 'viewer' | 'world';
  orbDistance: number;
  orbHeight: number;
  orbSideOffset: number;
  orbWorldX: number;
  orbWorldY: number;
  orbWorldZ: number;
  layers: ParticleLayerConfig[];
}

export function buildVisualConfigFromState(visualState: RenderConfigVisualState): RenderConfig['visual'] {
  const config: RenderConfig['visual'] = {
    mode: visualState.currentMode === 'etherealFlame' ? 'flame' : 'mist',
    intensity: visualState.intensity,
    skyboxPreset: visualState.skyboxPreset.key,
    skyboxRotationSpeed: visualState.skyboxRotationSpeed,
    skyboxAudioReactiveEnabled: visualState.skyboxAudioReactiveEnabled,
    skyboxAudioReactivity: visualState.skyboxAudioReactivity,
    skyboxDriftSpeed: visualState.skyboxDriftSpeed,
    skyboxMode: visualState.skyboxMode,
    skyboxVideoUrl: visualState.skyboxVideoUrl,
    skyboxVideoYaw: visualState.skyboxVideoYaw,
    skyboxVideoPitch: visualState.skyboxVideoPitch,
    skyboxMaskMode: visualState.skyboxMaskMode,
    skyboxMaskThreshold: visualState.skyboxMaskThreshold,
    skyboxMaskSoftness: visualState.skyboxMaskSoftness,
    skyboxMaskColor: visualState.skyboxMaskColor,
    skyboxMaskPreviewMode: visualState.skyboxMaskPreviewMode,
    skyboxMaskInvert: visualState.skyboxMaskInvert,
    skyboxRectMaskEnabled: visualState.skyboxRectMaskEnabled,
    skyboxRectMaskU: visualState.skyboxRectMaskU,
    skyboxRectMaskV: visualState.skyboxRectMaskV,
    skyboxRectMaskWidth: visualState.skyboxRectMaskWidth,
    skyboxRectMaskHeight: visualState.skyboxRectMaskHeight,
    skyboxRectMaskSoftness: visualState.skyboxRectMaskSoftness,
    skyboxRectMaskInvert: visualState.skyboxRectMaskInvert,
    skyboxSeamBlendEnabled: visualState.skyboxSeamBlendEnabled,
    skyboxSeamBlendWidth: visualState.skyboxSeamBlendWidth,
    skyboxHoleFixEnabled: visualState.skyboxHoleFixEnabled,
    skyboxHoleFixThreshold: visualState.skyboxHoleFixThreshold,
    skyboxHoleFixSoftness: visualState.skyboxHoleFixSoftness,
    skyboxPoleFadeEnabled: visualState.skyboxPoleFadeEnabled,
    skyboxPoleFadeStart: visualState.skyboxPoleFadeStart,
    skyboxPoleFadeSoftness: visualState.skyboxPoleFadeSoftness,
    skyboxPatchEnabled: visualState.skyboxPatchEnabled,
    skyboxPatchU: visualState.skyboxPatchU,
    skyboxPatchV: visualState.skyboxPatchV,
    skyboxPatchRadius: visualState.skyboxPatchRadius,
    skyboxPatchSoftness: visualState.skyboxPatchSoftness,
    skyboxPatch2Enabled: visualState.skyboxPatch2Enabled,
    skyboxPatch2U: visualState.skyboxPatch2U,
    skyboxPatch2V: visualState.skyboxPatch2V,
    skyboxPatch2Radius: visualState.skyboxPatch2Radius,
    skyboxPatch2Softness: visualState.skyboxPatch2Softness,
    skyboxPatch3Enabled: visualState.skyboxPatch3Enabled,
    skyboxPatch3U: visualState.skyboxPatch3U,
    skyboxPatch3V: visualState.skyboxPatch3V,
    skyboxPatch3Radius: visualState.skyboxPatch3Radius,
    skyboxPatch3Softness: visualState.skyboxPatch3Softness,
    skyboxPatch4Enabled: visualState.skyboxPatch4Enabled,
    skyboxPatch4U: visualState.skyboxPatch4U,
    skyboxPatch4V: visualState.skyboxPatch4V,
    skyboxPatch4Radius: visualState.skyboxPatch4Radius,
    skyboxPatch4Softness: visualState.skyboxPatch4Softness,
    skyboxPoleLogoEnabled: visualState.skyboxPoleLogoEnabled,
    skyboxPoleLogoUrl: visualState.skyboxPoleLogoUrl,
    skyboxPoleLogoSize: visualState.skyboxPoleLogoSize,
    skyboxPoleLogoOpacity: visualState.skyboxPoleLogoOpacity,
    skyboxPoleLogoAutoScale: visualState.skyboxPoleLogoAutoScale,
    vrComfortMode: visualState.vrComfortMode,
    vrDebugOverlayEnabled: visualState.vrDebugOverlayEnabled,
    waterEnabled: visualState.waterEnabled,
    waterColor: visualState.waterColor,
    waterReflectivity: visualState.waterReflectivity,
    cameraOrbitEnabled: visualState.cameraOrbitEnabled,
    cameraOrbitRenderOnly: visualState.cameraOrbitRenderOnly,
    cameraOrbitSpeed: visualState.cameraOrbitSpeed,
    cameraOrbitRadius: visualState.cameraOrbitRadius,
    cameraOrbitHeight: visualState.cameraOrbitHeight,
    cameraLookAtOrb: visualState.cameraLookAtOrb,
    orbAnchorMode: visualState.orbAnchorMode,
    orbDistance: visualState.orbDistance,
    orbHeight: visualState.orbHeight,
    orbSideOffset: visualState.orbSideOffset,
    orbWorldX: visualState.orbWorldX,
    orbWorldY: visualState.orbWorldY,
    orbWorldZ: visualState.orbWorldZ,
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
  };

  return config;
}

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
  visualState: RenderConfigVisualState
): RenderConfig {
  return {
    version: '1.0',
    audio: { path: audioPath },
    output: { path: outputPath, format, fps },
    visual: buildVisualConfigFromState(visualState),
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
