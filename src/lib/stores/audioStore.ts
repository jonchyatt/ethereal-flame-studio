import { create } from 'zustand';
import type { AudioLevels } from '@/types';

interface AudioState extends AudioLevels {
  // Backward compatibility aliases
  mids: number;   // Alias for mid
  treble: number; // Alias for high

  // Playback control state
  isPlaying: boolean;
  audioFile: File | null;
  audioFileName: string | null;
  audioUrl: string | null; // URL source for render (when loaded from URL)
  preparedAssetId: string | null; // Asset ID from audio-prep editor

  // Actions
  setPlaying: (playing: boolean) => void;
  setAudioFile: (file: File | null, fileName: string | null, url?: string | null) => void;
  setPreparedAssetId: (id: string | null) => void;
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

  // Backward compatibility aliases
  mids: 0,
  treble: 0,

  // Playback state
  isPlaying: false,
  audioFile: null,
  audioFileName: null,
  audioUrl: null,
  preparedAssetId: null,

  // Actions
  setPlaying: (playing) => set({ isPlaying: playing }),

  setAudioFile: (file, fileName, url = null) => set({
    audioFile: file,
    audioFileName: fileName,
    audioUrl: url,
    preparedAssetId: null, // Clear prepared asset when new file is loaded
  }),

  setLevels: (levels) => {
    // Support both 'mid' and 'mids' for compatibility
    const mid = levels.mid !== undefined ? levels.mid : levels.mids || 0;
    set({
      amplitude: levels.amplitude,
      bass: levels.bass,
      mid,
      mids: mid,      // Alias for backward compatibility
      high: levels.high,
      treble: levels.high, // Alias for backward compatibility
      currentScale: levels.currentScale,
    });
  },

  setPreparedAssetId: (id) => set({ preparedAssetId: id }),

  setBeat: (isBeat) => set({ isBeat }),
}));
