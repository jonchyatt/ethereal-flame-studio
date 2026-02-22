import { create } from 'zustand';
import type { AssetMetadata, Clip } from '@/lib/audio-prep/types';

interface AudioPrepState {
  // Assets
  assets: Record<string, AssetMetadata>;
  activeAssetId: string | null;

  // Edit state
  clips: Clip[];
  selectedClipId: string | null;
  normalize: boolean;
  defaultFadeIn: number;
  defaultFadeOut: number;

  // Job tracking
  previewJobId: string | null;
  saveJobId: string | null;
  preparedAssetId: string | null;
  hasUnsavedChanges: boolean;

  // Actions - Assets
  setAssets: (assets: AssetMetadata[]) => void;
  addAsset: (asset: AssetMetadata) => void;
  setActiveAsset: (assetId: string | null) => void;
  removeAsset: (assetId: string) => void;

  // Actions - Clips
  setClips: (clips: Clip[]) => void;
  addClip: (clip: Clip) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  removeClip: (clipId: string) => void;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  selectClip: (clipId: string | null) => void;
  splitClipAtTime: (clipId: string, time: number) => void;

  // Actions - Settings
  setNormalize: (normalize: boolean) => void;
  setDefaultFadeIn: (fadeIn: number) => void;
  setDefaultFadeOut: (fadeOut: number) => void;

  // Actions - Jobs
  setPreviewJobId: (jobId: string | null) => void;
  setSaveJobId: (jobId: string | null) => void;
  setPreparedAssetId: (assetId: string | null) => void;
  markUnsaved: () => void;
  markSaved: () => void;

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  assets: {} as Record<string, AssetMetadata>,
  activeAssetId: null as string | null,
  clips: [] as Clip[],
  selectedClipId: null as string | null,
  normalize: false,
  defaultFadeIn: 0,
  defaultFadeOut: 0,
  previewJobId: null as string | null,
  saveJobId: null as string | null,
  preparedAssetId: null as string | null,
  hasUnsavedChanges: false,
};

export const useAudioPrepStore = create<AudioPrepState>((set, get) => ({
  ...initialState,

  // Assets
  setAssets: (assets) => {
    const map: Record<string, AssetMetadata> = {};
    for (const a of assets) map[a.assetId] = a;
    set({ assets: map });
  },
  addAsset: (asset) => set((s) => ({
    assets: { ...s.assets, [asset.assetId]: asset },
  })),
  setActiveAsset: (assetId) => set({ activeAssetId: assetId }),
  removeAsset: (assetId) => set((s) => {
    const { [assetId]: _, ...rest } = s.assets;
    return {
      assets: rest,
      activeAssetId: s.activeAssetId === assetId ? null : s.activeAssetId,
    };
  }),

  // Clips
  setClips: (clips) => set({ clips, hasUnsavedChanges: true }),
  addClip: (clip) => set((s) => ({
    clips: [...s.clips, clip],
    hasUnsavedChanges: true,
  })),
  updateClip: (clipId, updates) => set((s) => ({
    clips: s.clips.map((c) => c.id === clipId ? { ...c, ...updates } : c),
    hasUnsavedChanges: true,
  })),
  removeClip: (clipId) => set((s) => ({
    clips: s.clips.filter((c) => c.id !== clipId),
    selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
    hasUnsavedChanges: true,
  })),
  reorderClips: (fromIndex, toIndex) => set((s) => {
    const clips = [...s.clips];
    const [moved] = clips.splice(fromIndex, 1);
    clips.splice(toIndex, 0, moved);
    return { clips, hasUnsavedChanges: true };
  }),
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  splitClipAtTime: (clipId, time) => set((s) => {
    const idx = s.clips.findIndex((c) => c.id === clipId);
    if (idx === -1) return s;
    const clip = s.clips[idx];
    if (time <= clip.startTime || time >= clip.endTime) return s;

    const left: Clip = {
      ...clip,
      id: `${clip.id}-L`,
      endTime: time,
      fadeOut: 0,
    };
    const right: Clip = {
      ...clip,
      id: `${clip.id}-R`,
      startTime: time,
      fadeIn: 0,
    };

    const clips = [...s.clips];
    clips.splice(idx, 1, left, right);
    return { clips, hasUnsavedChanges: true };
  }),

  // Settings
  setNormalize: (normalize) => set({ normalize, hasUnsavedChanges: true }),
  setDefaultFadeIn: (fadeIn) => set({ defaultFadeIn: fadeIn }),
  setDefaultFadeOut: (fadeOut) => set({ defaultFadeOut: fadeOut }),

  // Jobs
  setPreviewJobId: (jobId) => set({ previewJobId: jobId }),
  setSaveJobId: (jobId) => set({ saveJobId: jobId }),
  setPreparedAssetId: (assetId) => set({ preparedAssetId: assetId }),
  markUnsaved: () => set({ hasUnsavedChanges: true }),
  markSaved: () => set({ hasUnsavedChanges: false }),

  // Reset
  reset: () => set(initialState),
}));
