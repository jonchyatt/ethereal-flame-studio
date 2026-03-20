// Type exports for Ethereal Flame Studio

// Template types (plan 02-01)
export type { VisualTemplate, TemplateSettings } from '@/lib/templates/types';

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
  // Layer opacity (0-1, replaces simple on/off toggle)
  layerOpacity?: number;
};

export interface ParticleSystemConfig {
  // Particle system types will be defined in plan 01-03
}

// Visual mode types (plans 01-05, 01-06)
export type VisualMode = 'etherealMist' | 'etherealFlame' | 'solarBreath';

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

// Pre-analysis types (plan 03-01)
/**
 * Audio data for a single frame during offline rendering
 */
export interface FrameAudioData {
  frame: number;        // Frame index (0-based)
  time: number;         // Time in seconds
  amplitude: number;    // Overall volume (0-1)
  bass: number;         // Bass frequencies (0-1)
  mid: number;          // Mid frequencies (0-1)
  high: number;         // High frequencies (0-1)
  isBeat: boolean;      // Beat detected on this frame
}

/**
 * Complete pre-analysis result for an audio file
 */
export interface PreAnalysisResult {
  frames: FrameAudioData[];  // Per-frame audio data
  totalFrames: number;       // Total number of frames
  duration: number;          // Audio duration in seconds
  fps: number;               // Frames per second used for analysis
}

/**
 * Options for pre-analysis
 */
export interface PreAnalyzeOptions {
  fps?: number;                         // Target frame rate (default: 30)
  onProgress?: (percent: number) => void; // Progress callback
  signal?: AbortSignal;                 // Abort signal for cancellation
  useCache?: boolean;                   // Use IndexedDB cache (default: true)
}

// ============================================================================
// Audio Export types (Phase 27 - Audio Bridge)
// ============================================================================

/**
 * 8-band frequency analysis for a single frame (expanded from 3-band FrameAudioData)
 */
export interface ExportedAudioFrame {
  frame: number;
  time: number;
  // 8 frequency bands - amplitude (0-1)
  bands: {
    sub_bass: number;     // 20-60Hz
    bass: number;         // 60-250Hz
    low_mid: number;      // 250-500Hz
    mid: number;          // 500-2kHz
    upper_mid: number;    // 2-4kHz
    presence: number;     // 4-6kHz
    brilliance: number;   // 6-12kHz
    air: number;          // 12-20kHz
  };
  // 8 envelope followers (0-1, exponential decay)
  envelopes: {
    sub_bass: number;
    bass: number;
    low_mid: number;
    mid: number;
    upper_mid: number;
    presence: number;
    brilliance: number;
    air: number;
  };
  // 8 onset flags (boolean per band)
  onsets: {
    sub_bass: boolean;
    bass: boolean;
    low_mid: boolean;
    mid: boolean;
    upper_mid: boolean;
    presence: boolean;
    brilliance: boolean;
    air: boolean;
  };
  // Global spectral descriptors
  spectral_centroid: number;   // 0-1 normalized (weighted mean frequency)
  spectral_flatness: number;   // 0-1 (1=noise, 0=tonal)
  rms_energy: number;          // 0-1 normalized
  zero_crossing_rate: number;  // 0-1 normalized
  // Stereo features
  lr_balance: number;          // -1 (left) to 1 (right), 0 = center
  stereo_width: number;        // 0-1 (0=mono, 1=wide)
  mid_side_energy: number;     // 0-1 (0=all mid, 1=all side)
  // Musical features
  chromagram: number[];        // 12-element array (C,C#,D,...B), each 0-1
  bpm: number;                 // Estimated beats per minute
  beat_phase: number;          // 0-1 cycle position within current beat
  spectral_contrast: number;   // 0-1 (difference between peaks and valleys)
  // Dynamics
  lufs: number;                // -70 to 0 (perceptual loudness, LUFS-ish via RMS windowing)
  crest_factor: number;        // 0-1 normalized (peak/RMS ratio, higher = more dynamic)
}

/**
 * Band definition metadata for self-documenting JSON
 */
export interface AudioBandDefinition {
  name: string;
  key: string;
  min_hz: number;
  max_hz: number;
  description: string;
  typical_use: string;
}

/**
 * Feature description metadata
 */
export interface AudioFeatureDescription {
  name: string;
  key: string;
  range: string;
  description: string;
  typical_use: string;
}

/**
 * Auto-classification hints for preset suggestion
 */
export interface AudioClassificationHints {
  estimated_bpm: number;
  avg_spectral_centroid: number;
  avg_crest_factor: number;
  suggested_preset: string;
  confidence: number;
}

/**
 * Complete audio export result (the JSON file structure)
 */
export interface AudioExportResult {
  metadata: {
    version: string;
    exported_at: string;
    source_file: string;
    duration_seconds: number;
    fps: number;
    total_frames: number;
    sample_rate: number;
    feature_count: number;
  };
  band_definitions: AudioBandDefinition[];
  feature_descriptions: AudioFeatureDescription[];
  classification: AudioClassificationHints;
  frames: ExportedAudioFrame[];
  summary: {
    peak_rms: number;
    avg_rms: number;
    beat_count: number;
    estimated_bpm: number;
    dominant_band: string;
    spectral_centroid_mean: number;
  };
}
