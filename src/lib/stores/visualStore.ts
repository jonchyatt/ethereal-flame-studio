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
  // Visual mode actions
  setMode: (mode: VisualMode) => void;
  // Water actions
  setWaterEnabled: (enabled: boolean) => void;
  setWaterColor: (color: string) => void;
  setWaterReflectivity: (reflectivity: number) => void;
}

// Ethereal Flame mode configuration (plan 01-06)
// Target: 15-20% at rest, expands to 30-40% with audio
export const ETHEREAL_FLAME_CONFIG: VisualModeConfig = {
  key: 'etherealFlame',
  label: 'Ethereal Flame',
  description: 'Organic upward-drifting fire particles with warm colors',
  colorPalette: {
    primary: [1.0, 0.5, 0.0],    // Deep orange
    secondary: [1.0, 0.2, 0.0],  // Red
    accent: [1.0, 0.8, 0.2],     // Yellow
  },
  skyboxPreset: 'DarkWorld1',
  layers: [
    // Layer 1: Dense rainbow core
    {
      id: 'flame-core',
      name: 'Rainbow Core',
      enabled: true,
      particleCount: 70,          // Dense for rainbow center
      baseSize: 2.5,
      spawnRadius: 0.15,
      maxSpeed: 0.03,
      lifetime: 2.0,
      audioReactivity: 2.5,
      frequencyBand: 'mids',
      sizeAtBirth: 0.37,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.5,
      peakLifetime: 0.2,
    },
    // Layer 2: Mid layer
    {
      id: 'flame-embers',
      name: 'Mid Glow',
      enabled: true,
      particleCount: 50,
      baseSize: 3.5,
      spawnRadius: 0.22,
      maxSpeed: 0.025,
      lifetime: 2.3,
      audioReactivity: 2.0,
      frequencyBand: 'treble',
      sizeAtBirth: 0.37,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.5,
      peakLifetime: 0.2,
    },
    // Layer 3: Outer wisps
    {
      id: 'flame-haze',
      name: 'Outer Wisps',
      enabled: true,
      particleCount: 35,
      baseSize: 4.5,
      spawnRadius: 0.3,
      maxSpeed: 0.02,
      lifetime: 2.8,
      audioReactivity: 1.5,
      frequencyBand: 'bass',
      sizeAtBirth: 0.37,
      sizeAtPeak: 1.0,
      sizeAtDeath: 0.4,
      peakLifetime: 0.25,
    },
  ],
};

// Ethereal Mist mode configuration (plan 01-05)
// Target: 15-20% at rest, expands to 30-40% with audio
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
      spawnRadius: 0.45,         // Wide spread to show color
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
      spawnRadius: 0.6,
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
  intensity: 1.0,
  layers: DEFAULT_LAYERS,
  // Initialize skybox with DarkWorld1 (THE ONE)
  skyboxPreset: STAR_NEST_PRESETS[0],
  skyboxRotationSpeed: 0.5, // Default rotation speed from DarkWorld1
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
}));
