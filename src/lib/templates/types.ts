import { ParticleLayerConfig, StarNestPreset, VisualMode } from '@/types';

/**
 * Serializable subset of visual state (no functions)
 * Used for template persistence - must be JSON-compatible
 */
export interface TemplateSettings {
  intensity: number;
  layers: ParticleLayerConfig[];
  skyboxPreset: StarNestPreset;
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
  orbAnchorMode: 'viewer' | 'world';
  orbDistance: number;
  orbHeight: number;
  orbSideOffset: number;
  orbWorldX: number;
  orbWorldY: number;
  orbWorldZ: number;
  cameraLookAtOrb: boolean;
  cameraOrbitEnabled: boolean;
  cameraOrbitRenderOnly: boolean;
  cameraOrbitSpeed: number;
  cameraOrbitRadius: number;
  cameraOrbitHeight: number;
  currentMode: VisualMode;
  waterEnabled: boolean;
  waterColor: string;
  waterReflectivity: number;
}

/**
 * Visual Template - saved configuration with metadata
 */
export interface VisualTemplate {
  id: string;                    // UUID via crypto.randomUUID()
  name: string;                  // User-defined name
  description?: string;          // Optional description
  createdAt: number;             // Unix timestamp (Date.now())
  updatedAt: number;             // Unix timestamp
  thumbnail?: string;            // Base64 data URL (JPEG, ~10-30KB)
  isBuiltIn: boolean;            // true for curated presets, false for user-created
  settings: TemplateSettings;
}
