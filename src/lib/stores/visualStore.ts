import { create } from 'zustand';
import { ParticleLayerConfig, StarNestPreset } from '@/types';
import { STAR_NEST_PRESETS } from '@/components/canvas/StarNestSkybox';

interface VisualState {
  intensity: number;
  layers: ParticleLayerConfig[];
  // Skybox state (plan 01-04)
  skyboxPreset: StarNestPreset;
  skyboxRotationSpeed: number;
  setIntensity: (intensity: number) => void;
  updateLayer: (id: string, updates: Partial<ParticleLayerConfig>) => void;
  toggleLayer: (id: string) => void;
  // Skybox actions
  setSkyboxPreset: (preset: StarNestPreset) => void;
  setSkyboxRotationSpeed: (speed: number) => void;
}

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
}));
