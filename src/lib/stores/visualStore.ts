import { create } from 'zustand';
import { ParticleLayerConfig, StarNestPreset, VisualMode, VisualModeConfig } from '@/types';
import { STAR_NEST_PRESETS } from '@/components/canvas/StarNestSkybox';

interface VisualState {
  intensity: number;
  layers: ParticleLayerConfig[];
  // Skybox state (plan 01-04)
  skyboxPreset: StarNestPreset;
  skyboxRotationSpeed: number;
  // Visual mode state (plan 01-05)
  currentMode: VisualMode;
  modeConfigs: Record<VisualMode, VisualModeConfig>;
  setIntensity: (intensity: number) => void;
  updateLayer: (id: string, updates: Partial<ParticleLayerConfig>) => void;
  toggleLayer: (id: string) => void;
  // Skybox actions
  setSkyboxPreset: (preset: StarNestPreset) => void;
  setSkyboxRotationSpeed: (speed: number) => void;
  // Visual mode actions
  setMode: (mode: VisualMode) => void;
}

// Ethereal Mist mode configuration (plan 01-05)
export const ETHEREAL_MIST_CONFIG: VisualModeConfig = {
  key: 'etherealMist',
  label: 'Ethereal Mist',
  description: 'Soft cloud-like particles floating gently with pastel colors',
  colorPalette: {
    primary: [0.6, 0.9, 1.0],    // Soft cyan
    secondary: [0.8, 0.7, 1.0],  // Lavender
    accent: [1.0, 0.95, 0.9],    // Warm white
  },
  skyboxPreset: 'DarkWorld1',
  layers: [
    {
      id: 'mist-core',
      name: 'Mist Core',
      enabled: true,
      particleCount: 2000,
      baseSize: 35,
      spawnRadius: 1.2,
      maxSpeed: 0.008,  // Very slow drift
      lifetime: 5,      // Long lifetime for persistent clouds
      audioReactivity: 0.25,  // Subtle audio response
      frequencyBand: 'bass',
      // Gentle size curve - peak at 50% lifetime for centered bloom
      sizeAtBirth: 0.37,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.5,
      peakLifetime: 0.5,  // Peak at midpoint for soft, centered clouds
      // Soft cyan start color
      colorStart: [0.6, 0.9, 1.0],
      colorEnd: [0.8, 0.7, 1.0],
    },
    {
      id: 'ambient-haze',
      name: 'Ambient Haze',
      enabled: true,
      particleCount: 1500,
      baseSize: 50,
      spawnRadius: 2.0,
      maxSpeed: 0.004,  // Even slower drift for background
      lifetime: 6,      // Extra long for ambient feel
      audioReactivity: 0.2,  // Very subtle
      frequencyBand: 'mids',
      // Gentle size curve
      sizeAtBirth: 0.37,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.5,
      peakLifetime: 0.6,  // Later peak for softer fade
      // Lavender tint
      colorStart: [0.8, 0.7, 1.0],
      colorEnd: [1.0, 0.95, 0.9],
    },
  ],
};

// Default dual-layer configuration (VIS-05)
const DEFAULT_LAYERS: ParticleLayerConfig[] = [
  {
    id: 'inner-glow',
    name: 'Inner Glow',
    enabled: true,
    particleCount: 1500,
    baseSize: 20,
    spawnRadius: 0.5,
    maxSpeed: 0.3,
    lifetime: 8,
    audioReactivity: 0.8,
    frequencyBand: 'bass',
    // Size over lifetime curve (THE MAGIC)
    sizeAtBirth: 0.37,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.5,
    peakLifetime: 0.2,
    // Bright white-blue core
    colorStart: [0.8, 0.9, 1.0],
    colorEnd: [0.6, 0.8, 1.0],
  },
  {
    id: 'outer-halo',
    name: 'Outer Halo',
    enabled: true,
    particleCount: 1000,
    baseSize: 40,
    spawnRadius: 1.5,
    maxSpeed: 0.15,
    lifetime: 12,
    audioReactivity: 0.5,
    frequencyBand: 'mids',
    // Size over lifetime curve
    sizeAtBirth: 0.37,
    sizeAtPeak: 1.0,
    sizeAtDeath: 0.5,
    peakLifetime: 0.2,
    // Soft diffuse glow
    colorStart: [0.4, 0.6, 0.9],
    colorEnd: [0.3, 0.5, 0.8],
  },
];

export const useVisualStore = create<VisualState>((set) => ({
  intensity: 1.0,
  layers: DEFAULT_LAYERS,
  // Initialize skybox with DarkWorld1 (THE ONE)
  skyboxPreset: STAR_NEST_PRESETS[0],
  skyboxRotationSpeed: 0.5, // Default rotation speed from DarkWorld1
  // Visual mode state
  currentMode: 'etherealMist',
  modeConfigs: {
    etherealMist: ETHEREAL_MIST_CONFIG,
    etherealFlame: {
      // Placeholder for plan 01-06
      key: 'etherealFlame',
      label: 'Ethereal Flame',
      description: 'Warm upward-drifting particles (coming in plan 01-06)',
      colorPalette: {
        primary: [1.0, 0.6, 0.3],
        secondary: [1.0, 0.8, 0.4],
        accent: [1.0, 0.4, 0.2],
      },
      skyboxPreset: 'DarkWorld1',
      layers: DEFAULT_LAYERS,
    },
  },

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
}));
