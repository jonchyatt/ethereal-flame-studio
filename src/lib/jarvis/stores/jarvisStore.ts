import { create } from 'zustand';
import {
  JarvisState,
  JarvisActions,
  OrbState,
  DEFAULT_STATE_COLORS,
} from '../types';

type JarvisStore = JarvisState & JarvisActions;

export const useJarvisStore = create<JarvisStore>((set) => ({
  // Initial state
  orbState: 'idle',
  isAudioPermissionGranted: false,
  isCapturing: false,
  audioLevel: 0,
  importance: 0,
  stateColors: DEFAULT_STATE_COLORS,

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
}));
