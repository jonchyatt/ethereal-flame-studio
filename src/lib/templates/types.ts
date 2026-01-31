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
  skyboxMaskMode: 'none' | 'luma' | 'chroma';
  skyboxMaskThreshold: number;
  skyboxMaskSoftness: number;
  skyboxMaskColor: string;
  skyboxMaskInvert: boolean;
  skyboxHoleFixEnabled: boolean;
  skyboxHoleFixThreshold: number;
  skyboxHoleFixSoftness: number;
  vrComfortMode: boolean;
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
