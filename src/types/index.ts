// Type exports for Ethereal Flame Studio

/**
 * Audio levels from FFT analysis (plan 01-02)
 */
export type AudioLevels = {
  amplitude: number;  // Overall volume (0-1)
  bass: number;       // Bass frequencies 0-250Hz (0-1)
  mid: number;        // Mid frequencies 250Hz-4kHz (0-1)
  high: number;       // High frequencies 4kHz+ (0-1)
  isBeat: boolean;    // Beat detected on current frame
  currentScale: number; // Animated scale value (1.0-1.8)
};

export interface AudioData {
  // Legacy interface - use AudioLevels instead
}

export type FrequencyBand = 'bass' | 'mids' | 'treble' | 'all';

export type ParticleLayerConfig = {
  id: string;
  name: string;
  enabled: boolean;
  particleCount: number;
  baseSize: number;
  spawnRadius: number;
  maxSpeed: number;
  lifetime: number;
  audioReactivity: number;
  frequencyBand: FrequencyBand;
  // Size over lifetime curve (THE MAGIC)
  sizeAtBirth: number;    // 0.37 default (37%)
  sizeAtPeak: number;     // 1.0 default (100%)
  sizeAtDeath: number;    // 0.5 default (50%)
  peakLifetime: number;   // 0.2 default (peak at 20% life)
  // Colors
  colorStart?: [number, number, number];
  colorEnd?: [number, number, number];
};

export interface ParticleSystemConfig {
  // Particle system types will be defined in plan 01-03
}

// Visual mode types (plans 01-05, 01-06)
export type VisualMode = 'etherealMist' | 'etherealFlame';

export type VisualModeConfig = {
  key: VisualMode;
  label: string;
  description: string;
  layers: ParticleLayerConfig[];
  colorPalette: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
  };
  skyboxPreset: string;
};

// Star Nest Skybox preset configuration
export type StarNestPreset = {
  key: string;
  label: string;
  iterations: number;
  volsteps: number;
  formuparam: number;
  stepSize: number;
  tile: number;
  brightness: number;
  darkmatter: number;
  distfading: number;
  saturation: number;
  color: [number, number, number];
  center: [number, number, number, number];
  scroll: [number, number, number, number];
  rotation: [number, number, number, number];
  // HSV extensions (optional)
  hueShift?: number;
  hueSpeed?: number;
  postSaturation?: number;
};
