import { create } from 'zustand';
import type { AudioLevels } from '@/types';

interface AudioState extends AudioLevels {
  // Playback control state
  isPlaying: boolean;
  audioFile: File | null;
  audioFileName: string | null;

  // Actions
  setPlaying: (playing: boolean) => void;
  setAudioFile: (file: File | null, fileName: string | null) => void;
  setLevels: (levels: Omit<AudioLevels, 'mid'> & { mid?: number; mids?: number }) => void;
  setBeat: (isBeat: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  // Audio levels (from AudioAnalyzer)
  amplitude: 0,
  bass: 0,
  mid: 0,
  high: 0,
  isBeat: false,
  currentScale: 1.0,

  // Playback state
  isPlaying: false,
  audioFile: null,
  audioFileName: null,

  // Actions
  setPlaying: (playing) => set({ isPlaying: playing }),

  setAudioFile: (file, fileName) => set({
    audioFile: file,
    audioFileName: fileName,
  }),

  setLevels: (levels) => {
    // Support both 'mid' and 'mids' for compatibility
    const mid = levels.mid !== undefined ? levels.mid : levels.mids || 0;
    set({
      amplitude: levels.amplitude,
      bass: levels.bass,
      mid,
      high: levels.high,
      currentScale: levels.currentScale,
    });
  },

  setBeat: (isBeat) => set({ isBeat }),
}));
