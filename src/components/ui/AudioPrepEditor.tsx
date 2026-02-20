'use client';

/**
 * AudioPrepEditor - Non-destructive audio editing UI
 *
 * Features:
 * - Import: YouTube URL, file upload, URL paste
 * - WaveSurfer waveform with RegionsPlugin for clip regions
 * - Clip list with drag reorder, per-clip volume/split/delete
 * - Preview (low-quality MP3) and Save (full-quality WAV)
 * - Keyboard shortcuts: Space (play/pause), S (split), Delete (remove), Ctrl+Z (undo)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Play, Pause, Scissors, Trash2, GripVertical, Volume2, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAudioPrepStore } from '@/lib/stores/audioPrepStore';
import { useAudioStore } from '@/lib/stores/audioStore';
import { useStorageUpload } from '@/lib/hooks/useStorageUpload';
import type { Clip, AssetMetadata } from '@/lib/audio-prep/types';

// Lazy-loaded WaveSurfer (client-side only)
let WaveSurfer: typeof import('wavesurfer.js').default | null = null;
let RegionsPlugin: typeof import('wavesurfer.js/dist/plugins/regions').default | null = null;

interface AudioPrepEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioPrepEditor({ isOpen, onClose }: AudioPrepEditorProps) {
  // Store state
  const {
    assets, activeAssetId, clips, selectedClipId, normalize,
    defaultFadeIn, defaultFadeOut, previewJobId, saveJobId,
    hasUnsavedChanges,
    setActiveAsset, addAsset, addClip, updateClip, removeClip,
    reorderClips, selectClip, splitClipAtTime, setClips,
    setNormalize, setDefaultFadeIn, setDefaultFadeOut,
    setPreviewJobId, setSaveJobId, setPreparedAssetId, markSaved,
  } = useAudioPrepStore();

  const setGlobalPreparedAssetId = useAudioStore((s) => s.setPreparedAssetId);

  // Storage upload hook for progress-tracked file uploads
  const {
    upload: storageUpload,
    progress: uploadProgress,
    status: uploadStatus,
    error: uploadError,
    reset: resetUpload,
  } = useStorageUpload();

  // Local state
  const [importMode, setImportMode] = useState<'file' | 'youtube' | 'url' | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestProgress, setIngestProgress] = useState(0);
  const [rightsAttested, setRightsAttested] = useState(false);
  const [isWaveSurferReady, setIsWaveSurferReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Refs
  const waveformRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<any>(null);
  const regionsRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const previewBlobUrlRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeAsset = activeAssetId ? assets[activeAssetId] : null;

  // Load WaveSurfer dynamically
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      if (!WaveSurfer) {
        const ws = await import('wavesurfer.js');
        WaveSurfer = ws.default;
      }
      if (!RegionsPlugin) {
        const rp = await import('wavesurfer.js/dist/plugins/regions');
        RegionsPlugin = rp.default;
      }
    })();
  }, [isOpen]);

  // Initialize WaveSurfer when active asset changes
  useEffect(() => {
    if (!waveformRef.current || !activeAsset || !WaveSurfer || !RegionsPlugin) return;

    // Destroy previous instance
    if (wsRef.current) {
      wsRef.current.destroy();
      wsRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4a9eff',
      progressColor: '#1e3a5f',
      cursorColor: '#ffffff',
      barWidth: 2,
      barGap: 1,
      height: 128,
      // Use peaks from asset if available
      ...(activeAsset as any).peaks ? {
        peaks: [(activeAsset as any).peaks['50'] || (activeAsset as any).peaks['100'] || []],
        duration: activeAsset.audio.duration,
      } : {},
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    wsRef.current = ws;
    regionsRef.current = regions;

    // Load actual audio from server
    ws.load(`/api/audio/assets/${activeAsset.assetId}/stream`).catch(() => {
      // If streaming fails, use peaks-only mode
    });

    ws.on('ready', () => setIsWaveSurferReady(true));
    ws.on('timeupdate', (time: number) => setCurrentTime(time));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    // Sync existing clips as regions
    for (const clip of clips) {
      if (clip.sourceAssetId === activeAssetId) {
        regions.addRegion({
          id: clip.id,
          start: clip.startTime,
          end: clip.endTime,
          color: 'rgba(74, 158, 255, 0.2)',
          drag: true,
          resize: true,
        });
      }
    }

    // Region changes update clips
    regions.on('region-updated', (region: any) => {
      updateClip(region.id, { startTime: region.start, endTime: region.end });
    });

    regions.on('region-clicked', (region: any) => {
      selectClip(region.id);
    });

    setIsWaveSurferReady(false);

    return () => {
      ws.destroy();
      wsRef.current = null;
      regionsRef.current = null;
    };
  }, [activeAssetId, activeAsset]);

  // Sync regions when clips change (handles split/remove/reorder)
  useEffect(() => {
    const regions = regionsRef.current;
    if (!regions || !activeAssetId) return;

    // Get current region IDs
    const existingRegions = regions.getRegions();
    const existingIds = new Set(existingRegions.map((r: any) => r.id));
    const clipIds = new Set(clips.filter(c => c.sourceAssetId === activeAssetId).map(c => c.id));

    // Remove regions that no longer have a clip
    for (const region of existingRegions) {
      if (!clipIds.has(region.id)) {
        region.remove();
      }
    }

    // Add/update regions for current clips
    for (const clip of clips) {
      if (clip.sourceAssetId !== activeAssetId) continue;
      if (existingIds.has(clip.id)) {
        // Update existing region bounds
        const region = existingRegions.find((r: any) => r.id === clip.id);
        if (region && (region.start !== clip.startTime || region.end !== clip.endTime)) {
          region.setOptions({ start: clip.startTime, end: clip.endTime });
        }
      } else {
        // Add new region
        regions.addRegion({
          id: clip.id,
          start: clip.startTime,
          end: clip.endTime,
          color: 'rgba(74, 158, 255, 0.2)',
          drag: true,
          resize: true,
        });
      }
    }
  }, [clips, activeAssetId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          wsRef.current?.playPause();
          break;
        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey && selectedClipId && currentTime > 0) {
            splitClipAtTime(selectedClipId, currentTime);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedClipId) {
            removeClip(selectedClipId);
            regionsRef.current?.getRegions().find((r: any) => r.id === selectedClipId)?.remove();
          }
          break;
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            // Undo not implemented for MVP
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedClipId, currentTime, splitClipAtTime, removeClip]);

  // --- Ingest ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsIngesting(true);
    setIngestError(null);
    setIngestProgress(0);
    resetUpload();

    try {
      // Step 1: Upload file to storage with progress tracking
      const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.bin';
      const assetId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const storageKey = `assets/${assetId}/original${ext}`;

      await storageUpload(file, storageKey);

      // Step 2: Tell the ingest endpoint where the file is in storage
      const res = await fetch('/api/audio/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: file.type.startsWith('video/') ? 'video_file' : 'audio_file',
          storageKey,
          originalFilename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });
      const data = await res.json();

      // Fallback: if the ingest endpoint doesn't support storageKey yet,
      // retry with FormData for backward compatibility
      if (!data.success && data.error?.message?.includes('storageKey')) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.type.startsWith('video/') ? 'video_file' : 'audio_file');
        const fallbackRes = await fetch('/api/audio/ingest', { method: 'POST', body: formData });
        const fallbackData = await fallbackRes.json();
        if (!fallbackData.success) throw new Error(fallbackData.error?.message || 'Ingest failed');
        await pollIngestJob(fallbackData.data.jobId);
        return;
      }

      if (!data.success) throw new Error(data.error?.message || 'Ingest failed');
      await pollIngestJob(data.data.jobId);
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleUrlIngest = async (type: 'youtube' | 'url') => {
    if (!urlInput.trim()) return;
    if (type === 'youtube' && !rightsAttested) {
      setIngestError('You must attest to having rights to use this audio');
      return;
    }

    setIsIngesting(true);
    setIngestError(null);
    setIngestProgress(0);

    try {
      const body = type === 'youtube'
        ? { type: 'youtube', url: urlInput.trim(), rightsAttested }
        : { type: 'url', url: urlInput.trim() };

      const res = await fetch('/api/audio/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Ingest failed');

      await pollIngestJob(data.data.jobId);
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Ingest failed');
    } finally {
      setIsIngesting(false);
    }
  };

  const pollIngestJob = async (jobId: string) => {
    return new Promise<void>((resolve, reject) => {
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/audio/ingest/${jobId}`);
          const data = await res.json();
          if (!data.success) { clearInterval(poll); reject(new Error('Job not found')); return; }

          setIngestProgress(data.data.progress);

          if (data.data.status === 'complete') {
            clearInterval(poll);
            // Load the new asset
            const assetRes = await fetch(`/api/audio/assets/${data.data.result.assetId}`);
            const assetData = await assetRes.json();
            if (assetData.success) {
              addAsset(assetData.data);
              setActiveAsset(assetData.data.assetId);
              // Create initial full-length clip
              addClip({
                id: `clip-${Date.now()}`,
                sourceAssetId: assetData.data.assetId,
                startTime: 0,
                endTime: assetData.data.audio.duration,
                volume: 1,
                fadeIn: defaultFadeIn,
                fadeOut: defaultFadeOut,
              });
            }
            setUrlInput('');
            resolve();
          } else if (data.data.status === 'failed') {
            clearInterval(poll);
            reject(new Error(data.data.error || 'Ingest failed'));
          } else if (data.data.status === 'cancelled') {
            clearInterval(poll);
            reject(new Error('Ingest cancelled'));
          }
        } catch {
          clearInterval(poll);
          reject(new Error('Polling failed'));
        }
      }, 1000);
      pollIntervalRef.current = poll;
    });
  };

  // --- Preview Audio Helper ---
  const loadPreviewAudio = useCallback(async (jobId: string) => {
    const audioRes = await fetch(`/api/audio/edit/preview/${jobId}/audio`);
    if (!audioRes.ok) return;
    const blob = await audioRes.blob();
    // Revoke previous blob URL to prevent memory leak
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    previewBlobUrlRef.current = url;
    if (previewAudioRef.current) {
      previewAudioRef.current.src = url;
      previewAudioRef.current.play().catch(() => {});
    }
  }, []);

  // --- Preview ---
  const handlePreview = async () => {
    if (!activeAssetId || clips.length === 0) return;

    setPreviewStatus('rendering');
    setPreviewProgress(0);
    setPreviewError(null);

    try {
      const recipe = {
        version: 1 as const,
        assetId: activeAssetId,
        clips,
        normalize,
        outputFormat: 'wav' as const,
        outputSampleRate: 44100,
      };

      const res = await fetch('/api/audio/edit/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Preview failed');

      const jobId = data.data.jobId;
      setPreviewJobId(jobId);

      if (data.data.cached) {
        // Cached - job already complete, just play it
        setPreviewStatus('done');
        try {
          await loadPreviewAudio(jobId);
        } catch { /* best-effort */ }
        return;
      }

      await pollEditJob(jobId, 'preview');
    } catch (err) {
      setPreviewStatus('error');
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    }
  };

  // --- Save ---
  const handleSave = async () => {
    if (!activeAssetId || clips.length === 0) return;

    setSaveStatus('rendering');
    setSaveProgress(0);
    setSaveError(null);

    try {
      const recipe = {
        version: 1 as const,
        assetId: activeAssetId,
        clips,
        normalize,
        outputFormat: 'wav' as const,
        outputSampleRate: 44100,
      };

      const res = await fetch('/api/audio/edit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Save failed');

      setSaveJobId(data.data.jobId);
      await pollEditJob(data.data.jobId, 'save');
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const pollEditJob = async (jobId: string, type: 'preview' | 'save') => {
    return new Promise<void>((resolve, reject) => {
      const setStatus = type === 'preview' ? setPreviewStatus : setSaveStatus;
      const setProgress = type === 'preview' ? setPreviewProgress : setSaveProgress;

      const poll = setInterval(async () => {
        try {
          const endpoint = type === 'preview' ? 'preview' : 'save';
          const res = await fetch(`/api/audio/edit/${endpoint}/${jobId}`);
          const data = await res.json();
          if (!data.success) { clearInterval(poll); reject(new Error('Job not found')); return; }

          setProgress(data.data.progress);

          if (data.data.status === 'complete') {
            clearInterval(poll);
            setStatus('done');

            if (type === 'preview') {
              try {
                await loadPreviewAudio(jobId);
              } catch { /* preview playback is best-effort */ }
            }

            if (type === 'save' && activeAssetId) {
              setPreparedAssetId(activeAssetId);
              setGlobalPreparedAssetId(activeAssetId);
              markSaved();
            }
            resolve();
          } else if (data.data.status === 'failed') {
            clearInterval(poll);
            setStatus('error');
            reject(new Error(data.data.error || `${type} failed`));
          }
        } catch {
          clearInterval(poll);
          setStatus('error');
          reject(new Error('Polling failed'));
        }
      }, 1000);
    });
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
      reorderClips(fromIndex, toIndex);
    }
    setDragOverIndex(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
    };
  }, []);

  // Format time as MM:SS.ms
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toFixed(1).padStart(4, '0')}`;
  };

  // Total duration of clips
  const totalDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Audio Prep Editor</h2>
            {hasUnsavedChanges && (
              <span className="text-xs px-2 py-0.5 bg-yellow-600/30 text-yellow-400 rounded">Unsaved</span>
            )}
            {totalDuration > 0 && (
              <span className="text-xs text-white/50">Total: {formatTime(totalDuration)}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Import Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isIngesting}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
              <button
                onClick={() => setImportMode(importMode === 'youtube' ? null : 'youtube')}
                disabled={isIngesting}
                className={`px-3 py-1.5 ${importMode === 'youtube' ? 'bg-red-700' : 'bg-red-600 hover:bg-red-700'} disabled:bg-gray-600 text-white text-sm rounded`}
              >
                YouTube
              </button>
              <button
                onClick={() => setImportMode(importMode === 'url' ? null : 'url')}
                disabled={isIngesting}
                className={`px-3 py-1.5 ${importMode === 'url' ? 'bg-orange-700' : 'bg-orange-600 hover:bg-orange-700'} disabled:bg-gray-600 text-white text-sm rounded`}
              >
                URL
              </button>
            </div>

            {/* URL/YouTube input */}
            {importMode && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlIngest(importMode as 'youtube' | 'url')}
                  placeholder={importMode === 'youtube' ? 'YouTube URL...' : 'Audio URL...'}
                  className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40 focus:outline-none focus:border-blue-500"
                />
                {importMode === 'youtube' && (
                  <label className="flex items-center gap-1.5 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={rightsAttested}
                      onChange={(e) => setRightsAttested(e.target.checked)}
                      className="rounded"
                    />
                    I have rights
                  </label>
                )}
                <button
                  onClick={() => handleUrlIngest(importMode as 'youtube' | 'url')}
                  disabled={!urlInput.trim() || isIngesting || (importMode === 'youtube' && !rightsAttested)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded"
                >
                  {isIngesting ? 'Ingesting...' : 'Import'}
                </button>
              </div>
            )}

            {/* Upload progress (storage upload step) */}
            {uploadStatus === 'uploading' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/50">{uploadProgress}% uploaded</span>
                </div>
              </div>
            )}
            {uploadStatus === 'requesting-url' && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-xs text-white/50">Preparing upload...</span>
              </div>
            )}
            {uploadStatus === 'complete' && isIngesting && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">Upload complete - processing...</span>
              </div>
            )}
            {uploadError && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" /> Upload: {uploadError}
              </div>
            )}

            {/* Ingest progress (processing step) */}
            {isIngesting && uploadStatus === 'complete' && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all" style={{ width: `${ingestProgress}%` }} />
                </div>
                <span className="text-xs text-white/50">Processing {ingestProgress}%</span>
              </div>
            )}
            {/* Legacy ingest progress (for URL/YouTube imports that don't use storage upload) */}
            {isIngesting && uploadStatus === 'idle' && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${ingestProgress}%` }} />
                </div>
                <span className="text-xs text-white/50">{ingestProgress}%</span>
              </div>
            )}
            {ingestError && (
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" /> {ingestError}
              </div>
            )}
          </div>

          {/* Asset Info */}
          {activeAsset && (
            <div className="text-xs text-white/50 flex gap-4">
              <span>Source: {activeAsset.provenance.sourceType}</span>
              <span>Duration: {formatTime(activeAsset.audio.duration)}</span>
              <span>Format: {activeAsset.audio.codec} / {activeAsset.audio.sampleRate}Hz</span>
              {activeAsset.originalFilename && <span>File: {activeAsset.originalFilename}</span>}
            </div>
          )}

          {/* Waveform */}
          <div className="bg-black/40 rounded-lg p-2 min-h-[140px] flex items-center justify-center">
            {activeAsset ? (
              <div className="w-full">
                <div ref={waveformRef} className="w-full" />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => wsRef.current?.playPause()}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                  </button>
                  <span className="text-xs text-white/60 font-mono">{formatTime(currentTime)}</span>
                </div>
              </div>
            ) : (
              <span className="text-white/30 text-sm">Import audio to begin editing</span>
            )}
          </div>

          {/* Clip List */}
          {clips.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-white/50 font-medium uppercase tracking-wide mb-2">
                Clips ({clips.length})
              </div>
              {clips.map((clip, index) => (
                <div
                  key={clip.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => selectClip(clip.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-all
                    ${selectedClipId === clip.id ? 'bg-blue-600/30 border border-blue-500/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'}
                    ${dragOverIndex === index ? 'border-t-2 border-t-blue-400' : ''}
                  `}
                >
                  <GripVertical className="w-3.5 h-3.5 text-white/30 cursor-grab" />
                  <span className="text-xs text-white/40 w-5">{index + 1}</span>
                  <span className="text-sm text-white flex-1 truncate">
                    {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                    <span className="text-white/40 ml-2">({formatTime(clip.endTime - clip.startTime)})</span>
                  </span>

                  {/* Volume slider */}
                  <div className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-white/40" />
                    <input
                      type="range"
                      min="0" max="2" step="0.05"
                      value={clip.volume}
                      onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) })}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 h-1 accent-blue-500"
                    />
                    <span className="text-xs text-white/40 w-8">{Math.round(clip.volume * 100)}%</span>
                  </div>

                  {/* Split at playhead */}
                  <button
                    onClick={(e) => { e.stopPropagation(); splitClipAtTime(clip.id, currentTime); }}
                    title="Split at playhead (S)"
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Scissors className="w-3.5 h-3.5 text-white/40" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeClip(clip.id);
                      regionsRef.current?.getRegions().find((r: any) => r.id === clip.id)?.remove();
                    }}
                    title="Delete (Del)"
                    className="p-1 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Global Controls */}
          {clips.length > 0 && (
            <div className="flex items-center gap-6 py-2">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                  className="rounded"
                />
                Normalize audio
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Fade In:</span>
                <input
                  type="number" min="0" max="10" step="0.1"
                  value={defaultFadeIn}
                  onChange={(e) => setDefaultFadeIn(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                />
                <span className="text-xs text-white/30">s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Fade Out:</span>
                <input
                  type="number" min="0" max="10" step="0.1"
                  value={defaultFadeOut}
                  onChange={(e) => setDefaultFadeOut(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                />
                <span className="text-xs text-white/30">s</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space</kbd> Play/Pause
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">S</kbd> Split
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded ml-2">Del</kbd> Remove
          </div>
          <div className="flex items-center gap-3">
            {/* Preview */}
            <button
              onClick={handlePreview}
              disabled={clips.length === 0 || previewStatus === 'rendering'}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded flex items-center gap-2"
            >
              {previewStatus === 'rendering' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Preview {previewProgress}%</>
              ) : previewStatus === 'done' ? (
                <><Check className="w-4 h-4" /> Preview Ready</>
              ) : (
                <><Play className="w-4 h-4" /> Preview</>
              )}
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={clips.length === 0 || saveStatus === 'rendering'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded flex items-center gap-2"
            >
              {saveStatus === 'rendering' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving {saveProgress}%</>
              ) : saveStatus === 'done' ? (
                <><Check className="w-4 h-4" /> Saved as Render Audio</>
              ) : (
                'Save as Render Audio'
              )}
            </button>
          </div>
        </div>

        {/* Error displays */}
        {previewError && (
          <div className="px-4 pb-2 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Preview: {previewError}
          </div>
        )}
        {saveError && (
          <div className="px-4 pb-2 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Save: {saveError}
          </div>
        )}

        {/* Hidden preview audio element */}
        <audio ref={previewAudioRef} className="hidden" />
      </div>
    </div>,
    document.body
  );
}
