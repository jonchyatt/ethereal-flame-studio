import { create } from 'zustand';
import {
  JarvisState,
  JarvisActions,
  OrbState,
  DEFAULT_STATE_COLORS,
} from '../types';
import type { VoicePipelineState } from '../voice/types';
import type { BriefingSection, BriefingData, NudgeState } from '../executive/types';

type JarvisStore = JarvisState & JarvisActions;

// Initial voice pipeline state for reset
const INITIAL_PIPELINE_STATE = {
  pipelineState: 'idle' as VoicePipelineState,
  currentTranscript: '',
  finalTranscript: '',
  lastResponse: '',
  error: null as string | null,
  showTranscript: false,
};

export const useJarvisStore = create<JarvisStore>((set) => ({
  // Initial state
  orbState: 'idle',
  isAudioPermissionGranted: false,
  isCapturing: false,
  audioLevel: 0,
  importance: 0,
  stateColors: DEFAULT_STATE_COLORS,

  // Voice pipeline state
  ...INITIAL_PIPELINE_STATE,

  // Briefing state
  isBriefingActive: false,
  currentBriefingSection: null as BriefingSection | null,
  briefingData: null as BriefingData | null,

  // Nudge state
  activeNudge: null as NudgeState | null,

  // Actions
  setOrbState: (orbState: OrbState) => set({ orbState }),
  setAudioPermissionGranted: (granted: boolean) =>
    set({ isAudioPermissionGranted: granted }),
  setIsCapturing: (capturing: boolean) => set({ isCapturing: capturing }),
  setAudioLevel: (level: number) =>
    set({ audioLevel: Math.max(0, Math.min(1, level)) }),
  setImportance: (importance: number) =>
    set({ importance: Math.max(0, Math.min(1, importance)) }),
  setStateColor: (state: OrbState, color: [number, number, number]) =>
    set((s) => ({
      stateColors: { ...s.stateColors, [state]: color },
    })),

  // Voice pipeline actions
  setPipelineState: (pipelineState: VoicePipelineState) =>
    set({ pipelineState }),
  setCurrentTranscript: (currentTranscript: string) =>
    set({ currentTranscript }),
  setFinalTranscript: (finalTranscript: string) => set({ finalTranscript }),
  setLastResponse: (lastResponse: string) => set({ lastResponse }),
  setError: (error: string | null) => set({ error }),
  setShowTranscript: (showTranscript: boolean) => set({ showTranscript }),
  resetPipeline: () => set(INITIAL_PIPELINE_STATE),

  // Briefing actions
  setIsBriefingActive: (isBriefingActive: boolean) => set({ isBriefingActive }),
  setCurrentBriefingSection: (currentBriefingSection: BriefingSection | null) =>
    set({ currentBriefingSection }),
  setBriefingData: (briefingData: BriefingData | null) => set({ briefingData }),

  // Nudge actions
  setActiveNudge: (activeNudge: NudgeState | null) => set({ activeNudge }),
  acknowledgeNudge: () => set({ activeNudge: null }),
}));
