import { create } from 'zustand';
import { ParticleLayerConfig, StarNestPreset, VisualMode, VisualModeConfig } from '@/types';
import { TemplateSettings } from '@/lib/templates/types';
import { STAR_NEST_PRESETS } from '@/components/canvas/StarNestSkybox';

interface VisualState {
  intensity: number;
  layers: ParticleLayerConfig[];
  // Skybox state (plan 01-04)
  skyboxPreset: StarNestPreset;
  skyboxRotationSpeed: number;
  skyboxAudioReactiveEnabled: boolean;
  skyboxAudioReactivity: number;
  skyboxDriftSpeed: number;
  skyboxMode: 'shader' | 'video';
  skyboxVideoUrl: string | null;
  skyboxVideoFileName: string | null;
  skyboxVideoYaw: number;
  skyboxVideoPitch: number;
  skyboxMaskMode: 'none' | 'luma' | 'chroma';
  skyboxMaskThreshold: number;
  skyboxMaskSoftness: number;
  skyboxMaskColor: string;
  skyboxMaskPreview: boolean;
  skyboxMaskPreviewSplit: boolean;
  skyboxMaskPreviewMode: 'tint' | 'matte';
  skyboxMaskPreviewColor: string;
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
  skyboxPatchPickTarget: 'none' | 'patchA' | 'patchB' | 'patchC' | 'patchD';
  skyboxPatchPickMulti: boolean;
  skyboxPatchPickCursorX: number;
  skyboxPatchPickCursorY: number;
  skyboxPoleLogoEnabled: boolean;
  skyboxPoleLogoUrl: string | null;
  skyboxPoleLogoSize: number;
  skyboxPoleLogoOpacity: number;
  skyboxPoleLogoAutoScale: boolean;
  vrComfortMode: boolean;
  vrDebugOverlayEnabled: boolean;
  // Orb placement
  orbAnchorMode: 'viewer' | 'world';
  orbDistance: number;
  orbHeight: number;
  orbSideOffset: number;
  orbWorldX: number;
  orbWorldY: number;
  orbWorldZ: number;
  // Camera options (non-VR)
  cameraLookAtOrb: boolean;
  cameraOrbitEnabled: boolean;
  cameraOrbitRenderOnly: boolean;
  cameraOrbitSpeed: number;
  cameraOrbitRadius: number;
  cameraOrbitHeight: number;
  // Visual mode state (plan 01-05)
  currentMode: VisualMode;
  modeConfigs: Record<VisualMode, VisualModeConfig>;
  // Water state
  waterEnabled: boolean;
  waterColor: string;
  waterReflectivity: number;
  setIntensity: (intensity: number) => void;
  updateLayer: (id: string, updates: Partial<ParticleLayerConfig>) => void;
  toggleLayer: (id: string) => void;
  // Skybox actions
  setSkyboxPreset: (preset: StarNestPreset) => void;
  setSkyboxRotationSpeed: (speed: number) => void;
  setSkyboxAudioReactiveEnabled: (enabled: boolean) => void;
  setSkyboxAudioReactivity: (value: number) => void;
  setSkyboxDriftSpeed: (value: number) => void;
  setSkyboxMode: (mode: 'shader' | 'video') => void;
  setSkyboxVideo: (url: string | null, fileName?: string | null) => void;
  setSkyboxVideoYaw: (value: number) => void;
  setSkyboxVideoPitch: (value: number) => void;
  setSkyboxMaskMode: (mode: 'none' | 'luma' | 'chroma') => void;
  setSkyboxMaskThreshold: (value: number) => void;
  setSkyboxMaskSoftness: (value: number) => void;
  setSkyboxMaskColor: (value: string) => void;
  setSkyboxMaskPreview: (enabled: boolean) => void;
  setSkyboxMaskPreviewSplit: (enabled: boolean) => void;
  setSkyboxMaskPreviewMode: (value: 'tint' | 'matte') => void;
  setSkyboxMaskPreviewColor: (value: string) => void;
  setSkyboxMaskInvert: (enabled: boolean) => void;
  setSkyboxRectMaskEnabled: (enabled: boolean) => void;
  setSkyboxRectMaskU: (value: number) => void;
  setSkyboxRectMaskV: (value: number) => void;
  setSkyboxRectMaskWidth: (value: number) => void;
  setSkyboxRectMaskHeight: (value: number) => void;
  setSkyboxRectMaskSoftness: (value: number) => void;
  setSkyboxRectMaskInvert: (enabled: boolean) => void;
  setSkyboxSeamBlendEnabled: (enabled: boolean) => void;
  setSkyboxSeamBlendWidth: (value: number) => void;
  setSkyboxHoleFixEnabled: (enabled: boolean) => void;
  setSkyboxHoleFixThreshold: (value: number) => void;
  setSkyboxHoleFixSoftness: (value: number) => void;
  setSkyboxPoleFadeEnabled: (enabled: boolean) => void;
  setSkyboxPoleFadeStart: (value: number) => void;
  setSkyboxPoleFadeSoftness: (value: number) => void;
  setSkyboxPatchEnabled: (enabled: boolean) => void;
  setSkyboxPatchU: (value: number) => void;
  setSkyboxPatchV: (value: number) => void;
  setSkyboxPatchRadius: (value: number) => void;
  setSkyboxPatchSoftness: (value: number) => void;
  setSkyboxPatch2Enabled: (enabled: boolean) => void;
  setSkyboxPatch2U: (value: number) => void;
  setSkyboxPatch2V: (value: number) => void;
  setSkyboxPatch2Radius: (value: number) => void;
  setSkyboxPatch2Softness: (value: number) => void;
  setSkyboxPatch3Enabled: (enabled: boolean) => void;
  setSkyboxPatch3U: (value: number) => void;
  setSkyboxPatch3V: (value: number) => void;
  setSkyboxPatch3Radius: (value: number) => void;
  setSkyboxPatch3Softness: (value: number) => void;
  setSkyboxPatch4Enabled: (enabled: boolean) => void;
  setSkyboxPatch4U: (value: number) => void;
  setSkyboxPatch4V: (value: number) => void;
  setSkyboxPatch4Radius: (value: number) => void;
  setSkyboxPatch4Softness: (value: number) => void;
  setSkyboxPatchPickTarget: (value: 'none' | 'patchA' | 'patchB' | 'patchC' | 'patchD') => void;
  setSkyboxPatchPickMulti: (value: boolean) => void;
  setSkyboxPatchPickCursor: (x: number, y: number) => void;
  setSkyboxPoleLogoEnabled: (enabled: boolean) => void;
  setSkyboxPoleLogoUrl: (value: string | null) => void;
  setSkyboxPoleLogoSize: (value: number) => void;
  setSkyboxPoleLogoOpacity: (value: number) => void;
  setSkyboxPoleLogoAutoScale: (value: boolean) => void;
  setVrComfortMode: (enabled: boolean) => void;
  setVrDebugOverlayEnabled: (enabled: boolean) => void;
  // Orb placement actions
  setOrbAnchorMode: (mode: 'viewer' | 'world') => void;
  setOrbDistance: (value: number) => void;
  setOrbHeight: (value: number) => void;
  setOrbSideOffset: (value: number) => void;
  setOrbWorldX: (value: number) => void;
  setOrbWorldY: (value: number) => void;
  setOrbWorldZ: (value: number) => void;
  setCameraLookAtOrb: (enabled: boolean) => void;
  setCameraOrbitEnabled: (enabled: boolean) => void;
  setCameraOrbitRenderOnly: (enabled: boolean) => void;
  setCameraOrbitSpeed: (value: number) => void;
  setCameraOrbitRadius: (value: number) => void;
  setCameraOrbitHeight: (value: number) => void;
  // Visual mode actions
  setMode: (mode: VisualMode) => void;
  // Water actions
  setWaterEnabled: (enabled: boolean) => void;
  setWaterColor: (color: string) => void;
  setWaterReflectivity: (reflectivity: number) => void;
  // Template integration (plan 02-01)
  applyTemplateSettings: (settings: TemplateSettings) => void;
}

// Ethereal Flame mode configuration
// WARM FIRE COLORS like reset-biology breathing rainbow orb
// Settings matched to DEFAULT_LAYERS which produce organic undulating effect
export const ETHEREAL_FLAME_CONFIG: VisualModeConfig = {
  key: 'etherealFlame',
  label: 'Ethereal Flame',
  description: 'Fiery orb with warm center and orange edges',
  colorPalette: {
    primary: [1.0, 1.0, 0.9],      // White/yellow center (hot core)
    secondary: [1.0, 0.43, 0.47],  // #ff6d77 coral/salmon
    accent: [1.0, 0.27, 0.0],      // #ff4400 orange-red
  },
  skyboxPreset: 'DarkWorld1',
  layers: [
    // Layer 1: Inner Glow - matched to DEFAULT_LAYERS for organic look
    {
      id: 'inner-glow',           // ID without 'flame' to use else branch
      name: 'Inner Glow',
      enabled: true,
      particleCount: 35,          // Matched to DEFAULT_LAYERS
      baseSize: 5.5,              // Matched to DEFAULT_LAYERS
      spawnRadius: 0.35,          // KEY: Large radius for organic effect
      maxSpeed: 0.03,
      lifetime: 3,
      audioReactivity: 2.5,
      frequencyBand: 'mids',
      sizeAtBirth: 0.2,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.3,
      peakLifetime: 0.25,
      colorStart: [0.8, 0.9, 1.0],
      colorEnd: [0.6, 0.8, 1.0],
    },
    // Layer 2: Outer Halo - matched to DEFAULT_LAYERS for organic look
    {
      id: 'outer-halo',           // ID without 'flame' to use else branch
      name: 'Outer Halo',
      enabled: true,
      particleCount: 25,          // Matched to DEFAULT_LAYERS
      baseSize: 7.0,              // Matched to DEFAULT_LAYERS
      spawnRadius: 0.5,           // KEY: Large radius for organic effect
      maxSpeed: 0.02,
      lifetime: 4,
      audioReactivity: 2.0,
      frequencyBand: 'treble',
      sizeAtBirth: 0.15,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.25,
      peakLifetime: 0.3,
      colorStart: [0.4, 0.6, 0.9],
      colorEnd: [0.3, 0.5, 0.8],
    },
  ],
};

// Ethereal Mist mode configuration (plan 01-05)
// Target: 15-20% at rest, expands to 30-40% with audio
// COMPACT - reduced spawn radii by 50%
export const ETHEREAL_MIST_CONFIG: VisualModeConfig = {
  key: 'etherealMist',
  label: 'Ethereal Mist',
  description: 'Soft cloud-like particles floating gently with pastel colors',
  colorPalette: {
    primary: [0.8, 0.2, 0.9],    // Vibrant magenta
    secondary: [0.3, 0.6, 1.0],  // Cyan-blue
    accent: [1.0, 0.4, 0.8],     // Pink
  },
  skyboxPreset: 'DarkWorld1',
  layers: [
    {
      id: 'mist-core',
      name: 'Mist Core',
      enabled: true,
      particleCount: 25,         // Reduced from 60 - fewer, larger particles
      baseSize: 7.0,             // Increased from 5.0
      spawnRadius: 0.15,         // REDUCED: 0.45 → 0.15 (third)
      maxSpeed: 0.015,
      lifetime: 4.0,
      audioReactivity: 2.5,      // Moderate
      frequencyBand: 'mids',
      sizeAtBirth: 0.25,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.3,
      peakLifetime: 0.5,
      colorStart: [0.8, 0.2, 0.9],   // Magenta
      colorEnd: [0.3, 0.6, 1.0],     // Cyan
    },
    {
      id: 'ambient-haze',
      name: 'Ambient Haze',
      enabled: true,
      particleCount: 20,         // Reduced from 40
      baseSize: 8.0,             // Increased from 6.5
      spawnRadius: 0.2,          // REDUCED: 0.6 → 0.2 (third)
      maxSpeed: 0.01,
      lifetime: 5.0,
      audioReactivity: 2.0,
      frequencyBand: 'treble',
      sizeAtBirth: 0.2,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.25,
      peakLifetime: 0.55,
      colorStart: [0.3, 0.6, 1.0],   // Cyan
      colorEnd: [1.0, 0.4, 0.8],     // Pink
    },
  ],
};

// Default dual-layer configuration (VIS-05)
// Target: 15-20% at rest, expands to 30-40% with audio
// Reduced counts, larger sizes for organic texture-based rendering
const DEFAULT_LAYERS: ParticleLayerConfig[] = [
  {
    id: 'inner-glow',
    name: 'Inner Glow',
    enabled: true,
    particleCount: 35,           // Reduced from 100
    baseSize: 5.5,               // Increased from 3.5
    spawnRadius: 0.35,
    maxSpeed: 0.03,
    lifetime: 3,
    audioReactivity: 2.5,
    frequencyBand: 'mids',
    sizeAtBirth: 0.2,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.3,
    peakLifetime: 0.25,
    colorStart: [0.8, 0.9, 1.0],
    colorEnd: [0.6, 0.8, 1.0],
  },
  {
    id: 'outer-halo',
    name: 'Outer Halo',
    enabled: true,
    particleCount: 25,           // Reduced from 70
    baseSize: 7.0,               // Increased from 5.0
    spawnRadius: 0.5,
    maxSpeed: 0.02,
    lifetime: 4,
    audioReactivity: 2.0,
    frequencyBand: 'treble',
    sizeAtBirth: 0.15,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.25,
    peakLifetime: 0.3,
    colorStart: [0.4, 0.6, 0.9],
    colorEnd: [0.3, 0.5, 0.8],
  },
];

export const useVisualStore = create<VisualState>((set) => ({
  intensity: 1.7,
  layers: DEFAULT_LAYERS,
  // Initialize skybox with DarkWorld1 (THE ONE)
  skyboxPreset: STAR_NEST_PRESETS[0],
  skyboxRotationSpeed: 0.0, // Default rotation speed (off)
  skyboxAudioReactiveEnabled: true,
  skyboxAudioReactivity: 1.0,
  skyboxDriftSpeed: 1.0,
  skyboxMode: 'shader',
  skyboxVideoUrl: null,
  skyboxVideoFileName: null,
  skyboxVideoYaw: 0,
  skyboxVideoPitch: 0,
  skyboxMaskMode: 'none',
  skyboxMaskThreshold: 0.65,
  skyboxMaskSoftness: 0.08,
  skyboxMaskColor: '#87ceeb',
  skyboxMaskPreview: false,
  skyboxMaskPreviewSplit: false,
  skyboxMaskPreviewMode: 'tint',
  skyboxMaskPreviewColor: '#ff00ff',
  skyboxMaskInvert: false,
  skyboxRectMaskEnabled: false,
  skyboxRectMaskU: 0.5,
  skyboxRectMaskV: 0.5,
  skyboxRectMaskWidth: 0.3,
  skyboxRectMaskHeight: 0.3,
  skyboxRectMaskSoftness: 0.03,
  skyboxRectMaskInvert: false,
  skyboxSeamBlendEnabled: false,
  skyboxSeamBlendWidth: 0.04,
  skyboxHoleFixEnabled: true,
  skyboxHoleFixThreshold: 0.02,
  skyboxHoleFixSoftness: 0.05,
  skyboxPoleFadeEnabled: true,
  skyboxPoleFadeStart: 0.08,
  skyboxPoleFadeSoftness: 0.06,
  skyboxPatchEnabled: false,
  skyboxPatchU: 0.5,
  skyboxPatchV: 0.5,
  skyboxPatchRadius: 0.08,
  skyboxPatchSoftness: 0.04,
  skyboxPatch2Enabled: false,
  skyboxPatch2U: 0.5,
  skyboxPatch2V: 0.5,
  skyboxPatch2Radius: 0.08,
  skyboxPatch2Softness: 0.04,
  skyboxPatch3Enabled: false,
  skyboxPatch3U: 0.5,
  skyboxPatch3V: 0.5,
  skyboxPatch3Radius: 0.08,
  skyboxPatch3Softness: 0.04,
  skyboxPatch4Enabled: false,
  skyboxPatch4U: 0.5,
  skyboxPatch4V: 0.5,
  skyboxPatch4Radius: 0.08,
  skyboxPatch4Softness: 0.04,
  skyboxPatchPickTarget: 'none',
  skyboxPatchPickMulti: false,
  skyboxPatchPickCursorX: -1,
  skyboxPatchPickCursorY: -1,
  skyboxPoleLogoEnabled: false,
  skyboxPoleLogoUrl: null,
  skyboxPoleLogoSize: 22,
  skyboxPoleLogoOpacity: 0.95,
  skyboxPoleLogoAutoScale: true,
  vrComfortMode: false,
  vrDebugOverlayEnabled: false,
  orbAnchorMode: 'viewer',
  orbDistance: 6,
  orbHeight: 0,
  orbSideOffset: 0,
  orbWorldX: 0,
  orbWorldY: 0,
  orbWorldZ: 0,
  cameraLookAtOrb: false,
  cameraOrbitEnabled: false,
  cameraOrbitRenderOnly: false,
  cameraOrbitSpeed: 0.4,
  cameraOrbitRadius: 8,
  cameraOrbitHeight: 0,
  // Visual mode state
  currentMode: 'etherealFlame',
  modeConfigs: {
    etherealMist: ETHEREAL_MIST_CONFIG,
    etherealFlame: ETHEREAL_FLAME_CONFIG,
  },
  // Water state defaults
  waterEnabled: false,
  waterColor: '#0a1828',     // Dark blue
  waterReflectivity: 0.4,

  setIntensity: (intensity) => set({ intensity }),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, ...updates } : layer
      ),
    })),

  toggleLayer: (id) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, enabled: !layer.enabled } : layer
      ),
    })),

  setSkyboxPreset: (preset) => set({ skyboxPreset: preset }),
  setSkyboxRotationSpeed: (speed) => set({ skyboxRotationSpeed: speed }),
  setSkyboxAudioReactiveEnabled: (enabled) => set({ skyboxAudioReactiveEnabled: enabled }),
  setSkyboxAudioReactivity: (value) => set({ skyboxAudioReactivity: value }),
  setSkyboxDriftSpeed: (value) => set({ skyboxDriftSpeed: value }),
  setSkyboxMode: (mode) => set({ skyboxMode: mode }),
  setSkyboxVideo: (url, fileName = null) => set({ skyboxVideoUrl: url, skyboxVideoFileName: fileName }),
  setSkyboxVideoYaw: (value) => set({ skyboxVideoYaw: value }),
  setSkyboxVideoPitch: (value) => set({ skyboxVideoPitch: value }),
  setSkyboxMaskMode: (mode) => set({ skyboxMaskMode: mode }),
  setSkyboxMaskThreshold: (value) => set({ skyboxMaskThreshold: value }),
  setSkyboxMaskSoftness: (value) => set({ skyboxMaskSoftness: value }),
  setSkyboxMaskColor: (value) => set({ skyboxMaskColor: value }),
  setSkyboxMaskPreview: (enabled) => set({ skyboxMaskPreview: enabled }),
  setSkyboxMaskPreviewSplit: (enabled) => set({ skyboxMaskPreviewSplit: enabled }),
  setSkyboxMaskPreviewMode: (value) => set({ skyboxMaskPreviewMode: value }),
  setSkyboxMaskPreviewColor: (value) => set({ skyboxMaskPreviewColor: value }),
  setSkyboxMaskInvert: (enabled) => set({ skyboxMaskInvert: enabled }),
  setSkyboxRectMaskEnabled: (enabled) => set({ skyboxRectMaskEnabled: enabled }),
  setSkyboxRectMaskU: (value) => set({ skyboxRectMaskU: value }),
  setSkyboxRectMaskV: (value) => set({ skyboxRectMaskV: value }),
  setSkyboxRectMaskWidth: (value) => set({ skyboxRectMaskWidth: value }),
  setSkyboxRectMaskHeight: (value) => set({ skyboxRectMaskHeight: value }),
  setSkyboxRectMaskSoftness: (value) => set({ skyboxRectMaskSoftness: value }),
  setSkyboxRectMaskInvert: (enabled) => set({ skyboxRectMaskInvert: enabled }),
  setSkyboxSeamBlendEnabled: (enabled) => set({ skyboxSeamBlendEnabled: enabled }),
  setSkyboxSeamBlendWidth: (value) => set({ skyboxSeamBlendWidth: value }),
  setSkyboxHoleFixEnabled: (enabled) => set({ skyboxHoleFixEnabled: enabled }),
  setSkyboxHoleFixThreshold: (value) => set({ skyboxHoleFixThreshold: value }),
  setSkyboxHoleFixSoftness: (value) => set({ skyboxHoleFixSoftness: value }),
  setSkyboxPoleFadeEnabled: (enabled) => set({ skyboxPoleFadeEnabled: enabled }),
  setSkyboxPoleFadeStart: (value) => set({ skyboxPoleFadeStart: value }),
  setSkyboxPoleFadeSoftness: (value) => set({ skyboxPoleFadeSoftness: value }),
  setSkyboxPatchEnabled: (enabled) => set({ skyboxPatchEnabled: enabled }),
  setSkyboxPatchU: (value) => set({ skyboxPatchU: value }),
  setSkyboxPatchV: (value) => set({ skyboxPatchV: value }),
  setSkyboxPatchRadius: (value) => set({ skyboxPatchRadius: value }),
  setSkyboxPatchSoftness: (value) => set({ skyboxPatchSoftness: value }),
  setSkyboxPatch2Enabled: (enabled) => set({ skyboxPatch2Enabled: enabled }),
  setSkyboxPatch2U: (value) => set({ skyboxPatch2U: value }),
  setSkyboxPatch2V: (value) => set({ skyboxPatch2V: value }),
  setSkyboxPatch2Radius: (value) => set({ skyboxPatch2Radius: value }),
  setSkyboxPatch2Softness: (value) => set({ skyboxPatch2Softness: value }),
  setSkyboxPatch3Enabled: (enabled) => set({ skyboxPatch3Enabled: enabled }),
  setSkyboxPatch3U: (value) => set({ skyboxPatch3U: value }),
  setSkyboxPatch3V: (value) => set({ skyboxPatch3V: value }),
  setSkyboxPatch3Radius: (value) => set({ skyboxPatch3Radius: value }),
  setSkyboxPatch3Softness: (value) => set({ skyboxPatch3Softness: value }),
  setSkyboxPatch4Enabled: (enabled) => set({ skyboxPatch4Enabled: enabled }),
  setSkyboxPatch4U: (value) => set({ skyboxPatch4U: value }),
  setSkyboxPatch4V: (value) => set({ skyboxPatch4V: value }),
  setSkyboxPatch4Radius: (value) => set({ skyboxPatch4Radius: value }),
  setSkyboxPatch4Softness: (value) => set({ skyboxPatch4Softness: value }),
  setSkyboxPatchPickTarget: (value) => set({ skyboxPatchPickTarget: value }),
  setSkyboxPatchPickMulti: (value) => set({ skyboxPatchPickMulti: value }),
  setSkyboxPatchPickCursor: (x, y) => set({ skyboxPatchPickCursorX: x, skyboxPatchPickCursorY: y }),
  setSkyboxPoleLogoEnabled: (enabled) => set({ skyboxPoleLogoEnabled: enabled }),
  setSkyboxPoleLogoUrl: (value) => set({ skyboxPoleLogoUrl: value }),
  setSkyboxPoleLogoSize: (value) => set({ skyboxPoleLogoSize: value }),
  setSkyboxPoleLogoOpacity: (value) => set({ skyboxPoleLogoOpacity: value }),
  setSkyboxPoleLogoAutoScale: (value) => set({ skyboxPoleLogoAutoScale: value }),
  setVrComfortMode: (enabled) => set({ vrComfortMode: enabled }),
  setVrDebugOverlayEnabled: (enabled) => set({ vrDebugOverlayEnabled: enabled }),
  setOrbAnchorMode: (mode) => set({ orbAnchorMode: mode }),
  setOrbDistance: (value) => set({ orbDistance: value }),
  setOrbHeight: (value) => set({ orbHeight: value }),
  setOrbSideOffset: (value) => set({ orbSideOffset: value }),
  setOrbWorldX: (value) => set({ orbWorldX: value }),
  setOrbWorldY: (value) => set({ orbWorldY: value }),
  setOrbWorldZ: (value) => set({ orbWorldZ: value }),
  setCameraLookAtOrb: (enabled) => set({ cameraLookAtOrb: enabled }),
  setCameraOrbitEnabled: (enabled) => set({ cameraOrbitEnabled: enabled }),
  setCameraOrbitRenderOnly: (enabled) => set({ cameraOrbitRenderOnly: enabled }),
  setCameraOrbitSpeed: (value) => set({ cameraOrbitSpeed: value }),
  setCameraOrbitRadius: (value) => set({ cameraOrbitRadius: value }),
  setCameraOrbitHeight: (value) => set({ cameraOrbitHeight: value }),

  setMode: (mode) =>
    set((state) => {
      const config = state.modeConfigs[mode];
      return {
        currentMode: mode,
        layers: config.layers,
        skyboxPreset:
          STAR_NEST_PRESETS.find((p) => p.key === config.skyboxPreset) ||
          state.skyboxPreset,
      };
    }),

  // Water setters
  setWaterEnabled: (enabled) => set({ waterEnabled: enabled }),
  setWaterColor: (color) => set({ waterColor: color }),
  setWaterReflectivity: (reflectivity) => set({ waterReflectivity: reflectivity }),

  // Template integration (plan 02-01)
  applyTemplateSettings: (settings) => set((state) => ({
    intensity: settings.intensity ?? state.intensity,
    layers: settings.layers ?? state.layers,
    skyboxPreset: settings.skyboxPreset ?? state.skyboxPreset,
    skyboxRotationSpeed: settings.skyboxRotationSpeed ?? state.skyboxRotationSpeed,
    skyboxAudioReactiveEnabled: settings.skyboxAudioReactiveEnabled ?? state.skyboxAudioReactiveEnabled,
    skyboxAudioReactivity: settings.skyboxAudioReactivity ?? state.skyboxAudioReactivity,
    skyboxDriftSpeed: settings.skyboxDriftSpeed ?? state.skyboxDriftSpeed,
    skyboxMode: settings.skyboxMode ?? state.skyboxMode,
    skyboxVideoUrl: settings.skyboxVideoUrl ?? state.skyboxVideoUrl,
    skyboxVideoYaw: settings.skyboxVideoYaw ?? state.skyboxVideoYaw,
    skyboxVideoPitch: settings.skyboxVideoPitch ?? state.skyboxVideoPitch,
    skyboxMaskMode: settings.skyboxMaskMode ?? state.skyboxMaskMode,
    skyboxMaskThreshold: settings.skyboxMaskThreshold ?? state.skyboxMaskThreshold,
    skyboxMaskSoftness: settings.skyboxMaskSoftness ?? state.skyboxMaskSoftness,
    skyboxMaskColor: settings.skyboxMaskColor ?? state.skyboxMaskColor,
    skyboxMaskPreviewMode: settings.skyboxMaskPreviewMode ?? state.skyboxMaskPreviewMode,
    skyboxMaskInvert: settings.skyboxMaskInvert ?? state.skyboxMaskInvert,
    skyboxRectMaskEnabled: settings.skyboxRectMaskEnabled ?? state.skyboxRectMaskEnabled,
    skyboxRectMaskU: settings.skyboxRectMaskU ?? state.skyboxRectMaskU,
    skyboxRectMaskV: settings.skyboxRectMaskV ?? state.skyboxRectMaskV,
    skyboxRectMaskWidth: settings.skyboxRectMaskWidth ?? state.skyboxRectMaskWidth,
    skyboxRectMaskHeight: settings.skyboxRectMaskHeight ?? state.skyboxRectMaskHeight,
    skyboxRectMaskSoftness: settings.skyboxRectMaskSoftness ?? state.skyboxRectMaskSoftness,
    skyboxRectMaskInvert: settings.skyboxRectMaskInvert ?? state.skyboxRectMaskInvert,
    skyboxSeamBlendEnabled: settings.skyboxSeamBlendEnabled ?? state.skyboxSeamBlendEnabled,
    skyboxSeamBlendWidth: settings.skyboxSeamBlendWidth ?? state.skyboxSeamBlendWidth,
    skyboxHoleFixEnabled: settings.skyboxHoleFixEnabled ?? state.skyboxHoleFixEnabled,
    skyboxHoleFixThreshold: settings.skyboxHoleFixThreshold ?? state.skyboxHoleFixThreshold,
    skyboxHoleFixSoftness: settings.skyboxHoleFixSoftness ?? state.skyboxHoleFixSoftness,
    skyboxPoleFadeEnabled: settings.skyboxPoleFadeEnabled ?? state.skyboxPoleFadeEnabled,
    skyboxPoleFadeStart: settings.skyboxPoleFadeStart ?? state.skyboxPoleFadeStart,
    skyboxPoleFadeSoftness: settings.skyboxPoleFadeSoftness ?? state.skyboxPoleFadeSoftness,
    skyboxPatchEnabled: settings.skyboxPatchEnabled ?? state.skyboxPatchEnabled,
    skyboxPatchU: settings.skyboxPatchU ?? state.skyboxPatchU,
    skyboxPatchV: settings.skyboxPatchV ?? state.skyboxPatchV,
    skyboxPatchRadius: settings.skyboxPatchRadius ?? state.skyboxPatchRadius,
    skyboxPatchSoftness: settings.skyboxPatchSoftness ?? state.skyboxPatchSoftness,
    skyboxPatch2Enabled: settings.skyboxPatch2Enabled ?? state.skyboxPatch2Enabled,
    skyboxPatch2U: settings.skyboxPatch2U ?? state.skyboxPatch2U,
    skyboxPatch2V: settings.skyboxPatch2V ?? state.skyboxPatch2V,
    skyboxPatch2Radius: settings.skyboxPatch2Radius ?? state.skyboxPatch2Radius,
    skyboxPatch2Softness: settings.skyboxPatch2Softness ?? state.skyboxPatch2Softness,
    skyboxPatch3Enabled: settings.skyboxPatch3Enabled ?? state.skyboxPatch3Enabled,
    skyboxPatch3U: settings.skyboxPatch3U ?? state.skyboxPatch3U,
    skyboxPatch3V: settings.skyboxPatch3V ?? state.skyboxPatch3V,
    skyboxPatch3Radius: settings.skyboxPatch3Radius ?? state.skyboxPatch3Radius,
    skyboxPatch3Softness: settings.skyboxPatch3Softness ?? state.skyboxPatch3Softness,
    skyboxPatch4Enabled: settings.skyboxPatch4Enabled ?? state.skyboxPatch4Enabled,
    skyboxPatch4U: settings.skyboxPatch4U ?? state.skyboxPatch4U,
    skyboxPatch4V: settings.skyboxPatch4V ?? state.skyboxPatch4V,
    skyboxPatch4Radius: settings.skyboxPatch4Radius ?? state.skyboxPatch4Radius,
    skyboxPatch4Softness: settings.skyboxPatch4Softness ?? state.skyboxPatch4Softness,
    skyboxPoleLogoEnabled: settings.skyboxPoleLogoEnabled ?? state.skyboxPoleLogoEnabled,
    skyboxPoleLogoUrl: settings.skyboxPoleLogoUrl ?? state.skyboxPoleLogoUrl,
    skyboxPoleLogoSize: settings.skyboxPoleLogoSize ?? state.skyboxPoleLogoSize,
    skyboxPoleLogoOpacity: settings.skyboxPoleLogoOpacity ?? state.skyboxPoleLogoOpacity,
    skyboxPoleLogoAutoScale: settings.skyboxPoleLogoAutoScale ?? state.skyboxPoleLogoAutoScale,
    vrComfortMode: settings.vrComfortMode ?? state.vrComfortMode,
    vrDebugOverlayEnabled: settings.vrDebugOverlayEnabled ?? state.vrDebugOverlayEnabled,
    orbAnchorMode: settings.orbAnchorMode ?? state.orbAnchorMode,
    orbDistance: settings.orbDistance ?? state.orbDistance,
    orbHeight: settings.orbHeight ?? state.orbHeight,
    orbSideOffset: settings.orbSideOffset ?? state.orbSideOffset,
    orbWorldX: settings.orbWorldX ?? state.orbWorldX,
    orbWorldY: settings.orbWorldY ?? state.orbWorldY,
    orbWorldZ: settings.orbWorldZ ?? state.orbWorldZ,
    cameraLookAtOrb: settings.cameraLookAtOrb ?? state.cameraLookAtOrb,
    cameraOrbitEnabled: settings.cameraOrbitEnabled ?? state.cameraOrbitEnabled,
    cameraOrbitRenderOnly: settings.cameraOrbitRenderOnly ?? state.cameraOrbitRenderOnly,
    cameraOrbitSpeed: settings.cameraOrbitSpeed ?? state.cameraOrbitSpeed,
    cameraOrbitRadius: settings.cameraOrbitRadius ?? state.cameraOrbitRadius,
    cameraOrbitHeight: settings.cameraOrbitHeight ?? state.cameraOrbitHeight,
    currentMode: settings.currentMode ?? state.currentMode,
    waterEnabled: settings.waterEnabled ?? state.waterEnabled,
    waterColor: settings.waterColor ?? state.waterColor,
    waterReflectivity: settings.waterReflectivity ?? state.waterReflectivity,
  })),
}));

/**
 * Selector to extract serializable visual state for template saving
 * Excludes functions and non-serializable data
 */
export const selectSerializableState = (state: VisualState): TemplateSettings => {
  const safeVideoUrl =
    state.skyboxVideoUrl && state.skyboxVideoUrl.startsWith('blob:')
      ? null
      : state.skyboxVideoUrl;
  const safeLogoUrl =
    state.skyboxPoleLogoUrl && state.skyboxPoleLogoUrl.startsWith('blob:')
      ? null
      : state.skyboxPoleLogoUrl;

  return {
    intensity: state.intensity,
    layers: state.layers,
    skyboxPreset: state.skyboxPreset,
    skyboxRotationSpeed: state.skyboxRotationSpeed,
    skyboxAudioReactiveEnabled: state.skyboxAudioReactiveEnabled,
    skyboxAudioReactivity: state.skyboxAudioReactivity,
    skyboxDriftSpeed: state.skyboxDriftSpeed,
    skyboxMode: state.skyboxMode,
    skyboxVideoUrl: safeVideoUrl,
    skyboxVideoYaw: state.skyboxVideoYaw,
    skyboxVideoPitch: state.skyboxVideoPitch,
    skyboxMaskMode: state.skyboxMaskMode,
    skyboxMaskThreshold: state.skyboxMaskThreshold,
    skyboxMaskSoftness: state.skyboxMaskSoftness,
    skyboxMaskColor: state.skyboxMaskColor,
    skyboxMaskPreviewMode: state.skyboxMaskPreviewMode,
    skyboxMaskInvert: state.skyboxMaskInvert,
    skyboxRectMaskEnabled: state.skyboxRectMaskEnabled,
    skyboxRectMaskU: state.skyboxRectMaskU,
    skyboxRectMaskV: state.skyboxRectMaskV,
    skyboxRectMaskWidth: state.skyboxRectMaskWidth,
    skyboxRectMaskHeight: state.skyboxRectMaskHeight,
    skyboxRectMaskSoftness: state.skyboxRectMaskSoftness,
    skyboxRectMaskInvert: state.skyboxRectMaskInvert,
    skyboxSeamBlendEnabled: state.skyboxSeamBlendEnabled,
    skyboxSeamBlendWidth: state.skyboxSeamBlendWidth,
    skyboxHoleFixEnabled: state.skyboxHoleFixEnabled,
    skyboxHoleFixThreshold: state.skyboxHoleFixThreshold,
    skyboxHoleFixSoftness: state.skyboxHoleFixSoftness,
    skyboxPoleFadeEnabled: state.skyboxPoleFadeEnabled,
    skyboxPoleFadeStart: state.skyboxPoleFadeStart,
    skyboxPoleFadeSoftness: state.skyboxPoleFadeSoftness,
    skyboxPatchEnabled: state.skyboxPatchEnabled,
    skyboxPatchU: state.skyboxPatchU,
    skyboxPatchV: state.skyboxPatchV,
    skyboxPatchRadius: state.skyboxPatchRadius,
    skyboxPatchSoftness: state.skyboxPatchSoftness,
    skyboxPatch2Enabled: state.skyboxPatch2Enabled,
    skyboxPatch2U: state.skyboxPatch2U,
    skyboxPatch2V: state.skyboxPatch2V,
    skyboxPatch2Radius: state.skyboxPatch2Radius,
    skyboxPatch2Softness: state.skyboxPatch2Softness,
    skyboxPatch3Enabled: state.skyboxPatch3Enabled,
    skyboxPatch3U: state.skyboxPatch3U,
    skyboxPatch3V: state.skyboxPatch3V,
    skyboxPatch3Radius: state.skyboxPatch3Radius,
    skyboxPatch3Softness: state.skyboxPatch3Softness,
    skyboxPatch4Enabled: state.skyboxPatch4Enabled,
    skyboxPatch4U: state.skyboxPatch4U,
    skyboxPatch4V: state.skyboxPatch4V,
    skyboxPatch4Radius: state.skyboxPatch4Radius,
    skyboxPatch4Softness: state.skyboxPatch4Softness,
    skyboxPoleLogoEnabled: state.skyboxPoleLogoEnabled,
    skyboxPoleLogoUrl: safeLogoUrl,
    skyboxPoleLogoSize: state.skyboxPoleLogoSize,
    skyboxPoleLogoOpacity: state.skyboxPoleLogoOpacity,
    skyboxPoleLogoAutoScale: state.skyboxPoleLogoAutoScale,
    vrComfortMode: state.vrComfortMode,
    vrDebugOverlayEnabled: state.vrDebugOverlayEnabled,
    orbAnchorMode: state.orbAnchorMode,
    orbDistance: state.orbDistance,
    orbHeight: state.orbHeight,
    orbSideOffset: state.orbSideOffset,
    orbWorldX: state.orbWorldX,
    orbWorldY: state.orbWorldY,
    orbWorldZ: state.orbWorldZ,
    cameraLookAtOrb: state.cameraLookAtOrb,
    cameraOrbitEnabled: state.cameraOrbitEnabled,
    cameraOrbitRenderOnly: state.cameraOrbitRenderOnly,
    cameraOrbitSpeed: state.cameraOrbitSpeed,
    cameraOrbitRadius: state.cameraOrbitRadius,
    cameraOrbitHeight: state.cameraOrbitHeight,
    currentMode: state.currentMode,
    waterEnabled: state.waterEnabled,
    waterColor: state.waterColor,
    waterReflectivity: state.waterReflectivity,
  };
};
