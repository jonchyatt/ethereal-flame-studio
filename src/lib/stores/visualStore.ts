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
  skyboxMaskMode: 'none' | 'luma' | 'chroma';
  skyboxMaskThreshold: number;
  skyboxMaskSoftness: number;
  skyboxMaskColor: string;
  skyboxMaskPreview: boolean;
  vrComfortMode: boolean;
  // Orb placement
  orbAnchorMode: 'viewer' | 'world';
  orbDistance: number;
  orbHeight: number;
  orbSideOffset: number;
  orbWorldX: number;
  orbWorldY: number;
  orbWorldZ: number;
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
  setSkyboxMaskMode: (mode: 'none' | 'luma' | 'chroma') => void;
  setSkyboxMaskThreshold: (value: number) => void;
  setSkyboxMaskSoftness: (value: number) => void;
  setSkyboxMaskColor: (value: string) => void;
  setSkyboxMaskPreview: (enabled: boolean) => void;
  setVrComfortMode: (enabled: boolean) => void;
  // Orb placement actions
  setOrbAnchorMode: (mode: 'viewer' | 'world') => void;
  setOrbDistance: (value: number) => void;
  setOrbHeight: (value: number) => void;
  setOrbSideOffset: (value: number) => void;
  setOrbWorldX: (value: number) => void;
  setOrbWorldY: (value: number) => void;
  setOrbWorldZ: (value: number) => void;
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
  skyboxRotationSpeed: 0.5, // Default rotation speed from DarkWorld1
  skyboxAudioReactiveEnabled: true,
  skyboxAudioReactivity: 1.0,
  skyboxDriftSpeed: 1.0,
  skyboxMode: 'shader',
  skyboxVideoUrl: null,
  skyboxVideoFileName: null,
  skyboxMaskMode: 'none',
  skyboxMaskThreshold: 0.65,
  skyboxMaskSoftness: 0.08,
  skyboxMaskColor: '#87ceeb',
  skyboxMaskPreview: false,
  vrComfortMode: false,
  orbAnchorMode: 'viewer',
  orbDistance: 6,
  orbHeight: 0,
  orbSideOffset: 0,
  orbWorldX: 0,
  orbWorldY: 0,
  orbWorldZ: 0,
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
  setSkyboxMaskMode: (mode) => set({ skyboxMaskMode: mode }),
  setSkyboxMaskThreshold: (value) => set({ skyboxMaskThreshold: value }),
  setSkyboxMaskSoftness: (value) => set({ skyboxMaskSoftness: value }),
  setSkyboxMaskColor: (value) => set({ skyboxMaskColor: value }),
  setSkyboxMaskPreview: (enabled) => set({ skyboxMaskPreview: enabled }),
  setVrComfortMode: (enabled) => set({ vrComfortMode: enabled }),
  setOrbAnchorMode: (mode) => set({ orbAnchorMode: mode }),
  setOrbDistance: (value) => set({ orbDistance: value }),
  setOrbHeight: (value) => set({ orbHeight: value }),
  setOrbSideOffset: (value) => set({ orbSideOffset: value }),
  setOrbWorldX: (value) => set({ orbWorldX: value }),
  setOrbWorldY: (value) => set({ orbWorldY: value }),
  setOrbWorldZ: (value) => set({ orbWorldZ: value }),

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
  applyTemplateSettings: (settings) => set({
    intensity: settings.intensity,
    layers: settings.layers,
    skyboxPreset: settings.skyboxPreset,
    skyboxRotationSpeed: settings.skyboxRotationSpeed,
    currentMode: settings.currentMode,
    waterEnabled: settings.waterEnabled,
    waterColor: settings.waterColor,
    waterReflectivity: settings.waterReflectivity,
  }),
}));

/**
 * Selector to extract serializable visual state for template saving
 * Excludes functions and non-serializable data
 */
export const selectSerializableState = (state: VisualState): TemplateSettings => ({
  intensity: state.intensity,
  layers: state.layers,
  skyboxPreset: state.skyboxPreset,
  skyboxRotationSpeed: state.skyboxRotationSpeed,
  currentMode: state.currentMode,
  waterEnabled: state.waterEnabled,
  waterColor: state.waterColor,
  waterReflectivity: state.waterReflectivity,
});
