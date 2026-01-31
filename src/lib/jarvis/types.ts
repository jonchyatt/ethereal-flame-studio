// Orb visual states - determines animation and color
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Re-export from voice types for convenience
export type { VoicePipelineState } from './voice/types';

// Default state colors (cool -> warm progression)
// User can customize these in future settings phase
export const DEFAULT_STATE_COLORS: Record<OrbState, [number, number, number]> = {
  idle: [0.2, 0.4, 1.0],      // Blue
  listening: [0.2, 0.8, 0.9], // Cyan
  thinking: [1.0, 0.7, 0.2],  // Amber
  speaking: [1.0, 0.5, 0.2],  // Warm orange
};

// State transition timing (ms) - can vary with emotional intensity
export interface TransitionConfig {
  duration: number;        // Base transition duration
  minDuration: number;     // Fastest (urgent)
  maxDuration: number;     // Slowest (calm)
}

export const DEFAULT_TRANSITIONS: TransitionConfig = {
  duration: 350,
  minDuration: 200,
  maxDuration: 500,
};

// Main Jarvis state interface
export interface JarvisState {
  // Current orb state
  orbState: OrbState;

  // Audio capture state
  isAudioPermissionGranted: boolean;
  isCapturing: boolean;
  audioLevel: number; // 0-1 normalized amplitude

  // Importance/intensity (affects both visual intensity and transition speed)
  // 0 = calm/routine, 1 = urgent/important
  importance: number;

  // State colors (user-customizable later)
  stateColors: Record<OrbState, [number, number, number]>;

  // Voice pipeline state (extended in 02-03)
  pipelineState: import('./voice/types').VoicePipelineState;
  currentTranscript: string; // Live interim transcript
  finalTranscript: string; // Complete utterance after PTT release
  lastResponse: string; // Last TTS response text
  error: string | null; // Current error message
  showTranscript: boolean; // Whether to display transcript UI
}

// Store actions
export interface JarvisActions {
  setOrbState: (state: OrbState) => void;
  setAudioPermissionGranted: (granted: boolean) => void;
  setIsCapturing: (capturing: boolean) => void;
  setAudioLevel: (level: number) => void;
  setImportance: (importance: number) => void;
  setStateColor: (state: OrbState, color: [number, number, number]) => void;

  // Voice pipeline actions (extended in 02-03)
  setPipelineState: (state: import('./voice/types').VoicePipelineState) => void;
  setCurrentTranscript: (transcript: string) => void;
  setFinalTranscript: (transcript: string) => void;
  setLastResponse: (response: string) => void;
  setError: (error: string | null) => void;
  setShowTranscript: (show: boolean) => void;
  resetPipeline: () => void;
}
