'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type LibraryVariant = {
  variantId: string;
  outputFormat: string;
  fps: 30 | 60;
  renderJobId: string;
  platformTargets: string[];
  safeZonePresetId?: string | null;
};

type LibraryItem = {
  itemId: string;
  sourceAudioName: string;
  variants: LibraryVariant[];
  thumbnailPlans: Array<{
    platform: string;
    safeZonePresetId: string;
    selectedTimestampSec?: number | null;
  }>;
  recutPlans: Array<{
    platform: string;
    durationCapSec: number;
  }>;
};

type ThumbnailSafeZoneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

type ThumbnailPlan = {
  platform: string;
  aspectRatio: string;
  safeZonePresetId: string;
  safeZones: ThumbnailSafeZoneRect[];
  candidates: Array<{
    timestampSec: number;
    score: number;
    reason: string;
  }>;
  selectedTimestampSec?: number | null;
  videoSignedUrl?: string | null;
};

const SAFE_ZONE_OPTIONS = [
  { id: 'safe-16x9', label: 'YouTube 16:9' },
  { id: 'safe-9x16', label: 'Shorts / Reels / TikTok 9:16' },
  { id: 'safe-1x1', label: 'Square 1:1' },
] as const;

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseAspectRatio(aspect: string): string {
  const parts = aspect.split(':').map((x) => Number(x.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return `${parts[0]} / ${parts[1]}`;
  }
  return '16 / 9';
}

export default function ThumbnailPlannerPage() {
  const searchParams = useSearchParams();
  const preselectedItemId = searchParams.get('itemId') || '';
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [safeZonePresetId, setSafeZonePresetId] = useState<'safe-16x9' | 'safe-9x16' | 'safe-1x1'>('safe-16x9');
  const [candidateCount, setCandidateCount] = useState(6);
  const [plan, setPlan] = useState<ThumbnailPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [currentScrubSec, setCurrentScrubSec] = useState(0);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);

  const loadLibraryItems = useCallback(async () => {
    setLoadingItems(true);
    setItemsError(null);
    try {
      const res = await fetch('/api/creator/content-library?limit=300');
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to load content library (${res.status})`);
      }
      const nextItems = (data.data?.items || []) as LibraryItem[];
      setItems(nextItems);
      setSelectedItemId((prev) => {
        if (prev && nextItems.some((item) => item.itemId === prev)) return prev;
        if (preselectedItemId && nextItems.some((item) => item.itemId === preselectedItemId)) return preselectedItemId;
        return nextItems[0]?.itemId || '';
      });
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : 'Failed to load content library');
    } finally {
      setLoadingItems(false);
    }
  }, [preselectedItemId]);

  useEffect(() => {
    loadLibraryItems().catch(() => {});
  }, [loadLibraryItems]);

  const selectedItem = useMemo(() => items.find((item) => item.itemId === selectedItemId) || null, [items, selectedItemId]);
  const availableVariants = selectedItem?.variants || [];
  const selectedVariant = availableVariants.find((variant) => variant.variantId === selectedVariantId)
    || (selectedVariantId ? availableVariants.find((variant) => variant.renderJobId === selectedVariantId) : undefined)
    || availableVariants[0]
    || null;

  useEffect(() => {
    if (!selectedItem) {
      setSelectedVariantId('');
      return;
    }
    setSelectedVariantId((prev) => {
      if (prev && selectedItem.variants.some((variant) => variant.variantId === prev || variant.renderJobId === prev)) {
        return prev;
      }
      return selectedItem.variants[0]?.variantId || selectedItem.variants[0]?.renderJobId || '';
    });
  }, [selectedItem?.itemId]);

  useEffect(() => {
    if (!selectedVariant) return;
    setPlatform(selectedVariant.platformTargets[0] || 'youtube');
    if (selectedVariant.safeZonePresetId === 'safe-9x16' || selectedVariant.safeZonePresetId === 'safe-1x1' || selectedVariant.safeZonePresetId === 'safe-16x9') {
      setSafeZonePresetId(selectedVariant.safeZonePresetId);
    } else if (selectedVariant.outputFormat.includes('portrait')) {
      setSafeZonePresetId('safe-9x16');
    } else if (selectedVariant.outputFormat.includes('square')) {
      setSafeZonePresetId('safe-1x1');
    } else {
      setSafeZonePresetId('safe-16x9');
    }
  }, [selectedVariant?.variantId, selectedVariant?.renderJobId]);

  const generatePlan = useCallback(async () => {
    if (!selectedVariant) {
      setPlanError('Select a variant first');
      return;
    }
    setPlanLoading(true);
    setPlanError(null);
    setCaptureMessage(null);
    try {
      const res = await fetch('/api/creator/thumbnail-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          safeZonePresetId,
          candidateCount,
          renderJobId: selectedVariant.renderJobId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to generate thumbnail plan (${res.status})`);
      }
      const nextPlan = data.data.plan as ThumbnailPlan;
      setPlan(nextPlan);
      const startTime = nextPlan.selectedTimestampSec ?? nextPlan.candidates[0]?.timestampSec ?? 0;
      setCurrentScrubSec(startTime);
      setVideoDurationSec(null);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to generate thumbnail plan');
    } finally {
      setPlanLoading(false);
    }
  }, [selectedVariant, platform, safeZonePresetId, candidateCount]);

  useEffect(() => {
    if (!selectedItem || !selectedVariant) {
      setPlan(null);
      return;
    }
    generatePlan().catch(() => {});
  }, [selectedItem?.itemId, selectedVariant?.variantId, selectedVariant?.renderJobId, platform, safeZonePresetId]);

  const maxScrub = useMemo(() => {
    if (videoDurationSec && Number.isFinite(videoDurationSec) && videoDurationSec > 0) return videoDurationSec;
    const candidateMax = Math.max(0, ...(plan?.candidates || []).map((c) => c.timestampSec));
    return Math.max(60, candidateMax);
  }, [videoDurationSec, plan]);

  const seekTo = useCallback((seconds: number) => {
    const next = Math.max(0, Math.min(seconds, maxScrub));
    setCurrentScrubSec(next);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = next;
      } catch {
        // Ignore seek errors when metadata is not loaded yet.
      }
    }
  }, [maxScrub]);

  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      setCaptureMessage('No video loaded yet');
      return;
    }
    if (video.readyState < 2) {
      setCaptureMessage('Video frame not ready yet');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `thumbnail_${selectedItem?.sourceAudioName?.replace(/\.[^.]+$/, '') || 'capture'}_${Math.round(currentScrubSec)}s.png`;
      link.click();
      setCaptureMessage('Frame captured to PNG download');
    } catch (err) {
      setCaptureMessage(err instanceof Error ? err.message : 'Failed to capture frame (CORS restrictions may block remote videos)');
    }
  }, [currentScrubSec, selectedItem?.sourceAudioName]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Thumbnail / Cover Planner</h1>
            <p className="text-sm text-zinc-400">
              Auto-picked frame candidates plus a manual scrubber with text-safe overlays for YouTube, Shorts, Reels, TikTok, and square feeds.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <a href="/creator" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Creator Home</a>
            <a href="/creator/dashboard" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Dashboard</a>
            <a href="/creator/library" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Creator Library</a>
            <button onClick={() => loadLibraryItems()} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Refresh Library</button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
            {loadingItems ? (
              <div className="text-sm text-zinc-400">Loading content library...</div>
            ) : itemsError ? (
              <div className="text-sm text-red-300">{itemsError}</div>
            ) : (
              <>
                <label className="block">
                  <div className="text-xs text-zinc-500 mb-1">Content Item</div>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm"
                  >
                    {items.map((item) => (
                      <option key={item.itemId} value={item.itemId}>
                        {item.sourceAudioName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs text-zinc-500 mb-1">Render Variant</div>
                  <select
                    value={selectedVariant?.variantId || selectedVariant?.renderJobId || ''}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm"
                  >
                    {availableVariants.map((variant) => (
                      <option key={`${variant.variantId}:${variant.renderJobId}`} value={variant.variantId || variant.renderJobId}>
                        {variant.outputFormat}  |  {variant.fps} FPS  |  {variant.renderJobId.slice(0, 16)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <div className="text-xs text-zinc-500 mb-1">Platform</div>
                    <input
                      type="text"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <div className="text-xs text-zinc-500 mb-1">Safe Zone Preset</div>
                    <select
                      value={safeZonePresetId}
                      onChange={(e) => setSafeZonePresetId(e.target.value as 'safe-16x9' | 'safe-9x16' | 'safe-1x1')}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm"
                    >
                      {SAFE_ZONE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <div className="text-xs text-zinc-500 mb-1">Candidate Count ({candidateCount})</div>
                  <input
                    type="range"
                    min={4}
                    max={12}
                    step={1}
                    value={candidateCount}
                    onChange={(e) => setCandidateCount(Number(e.target.value))}
                    className="w-full"
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generatePlan()}
                    disabled={!selectedVariant || planLoading}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      !selectedVariant || planLoading
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {planLoading ? 'Generating...' : 'Generate / Refresh Plan'}
                  </button>
                  <button
                    onClick={captureCurrentFrame}
                    disabled={!plan?.videoSignedUrl}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      !plan?.videoSignedUrl
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    Capture Current Frame
                  </button>
                </div>

                {selectedVariant && (
                  <div className="text-[11px] text-zinc-500">
                    Variant: {selectedVariant.outputFormat}  |  Platforms: {selectedVariant.platformTargets.join(', ') || 'none'}  |  Job: {selectedVariant.renderJobId}
                  </div>
                )}

                {planError && <div className="text-sm text-red-300">{planError}</div>}
                {captureMessage && <div className="text-xs text-zinc-300">{captureMessage}</div>}
              </>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
            {plan ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zinc-200">
                      {plan.platform}  |  {plan.aspectRatio}  |  {plan.safeZonePresetId}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Auto-selected timestamp: {plan.selectedTimestampSec != null ? `${formatTime(plan.selectedTimestampSec)} (${plan.selectedTimestampSec.toFixed(2)}s)` : 'none'}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Current scrub: {formatTime(currentScrubSec)} ({currentScrubSec.toFixed(2)}s)
                  </div>
                </div>

                <div
                  className="relative w-full rounded-xl overflow-hidden border border-zinc-800 bg-black"
                  style={{ aspectRatio: parseAspectRatio(plan.aspectRatio) }}
                >
                  {plan.videoSignedUrl ? (
                    <video
                      ref={videoRef}
                      src={plan.videoSignedUrl}
                      controls
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                      onLoadedMetadata={(e) => {
                        const duration = e.currentTarget.duration;
                        if (Number.isFinite(duration) && duration > 0) {
                          setVideoDurationSec(duration);
                          const target = Math.min(currentScrubSec, duration);
                          e.currentTarget.currentTime = target;
                        }
                      }}
                      onTimeUpdate={(e) => {
                        setCurrentScrubSec(e.currentTarget.currentTime || 0);
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500 p-6 text-center">
                      No video preview available yet (render may still be running or the result key is not attached).
                    </div>
                  )}

                  <div className="absolute inset-0 pointer-events-none">
                    {plan.safeZones.map((zone, idx) => (
                      <div
                        key={`${zone.label}:${idx}`}
                        className="absolute border border-emerald-400/70 bg-emerald-400/5"
                        style={{
                          left: `${zone.x * 100}%`,
                          top: `${zone.y * 100}%`,
                          width: `${zone.width * 100}%`,
                          height: `${zone.height * 100}%`,
                        }}
                      >
                        <div className="absolute -top-5 left-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">
                          {zone.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Manual Scrubber</span>
                    <span>0s - {maxScrub.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxScrub}
                    step={0.01}
                    value={Math.min(currentScrubSec, maxScrub)}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => seekTo(Math.max(0, currentScrubSec - 1))} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-xs hover:bg-zinc-800">-1s</button>
                    <button onClick={() => seekTo(Math.max(0, currentScrubSec - 0.1))} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-xs hover:bg-zinc-800">-0.1s</button>
                    <button onClick={() => seekTo(currentScrubSec + 0.1)} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-xs hover:bg-zinc-800">+0.1s</button>
                    <button onClick={() => seekTo(currentScrubSec + 1)} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-xs hover:bg-zinc-800">+1s</button>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="text-sm font-medium text-zinc-200 mb-2">Auto-Picked Frame Candidates</div>
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {plan.candidates.map((candidate, idx) => (
                      <button
                        key={`${candidate.timestampSec}:${idx}`}
                        onClick={() => seekTo(candidate.timestampSec)}
                        className={`w-full text-left rounded-lg border p-2 transition-colors ${
                          Math.abs(currentScrubSec - candidate.timestampSec) < 0.051
                            ? 'border-blue-500/40 bg-blue-500/10'
                            : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-zinc-100">{formatTime(candidate.timestampSec)} ({candidate.timestampSec.toFixed(2)}s)</span>
                          <span className="text-xs text-zinc-400">score {candidate.score.toFixed(3)}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1">{candidate.reason}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-zinc-400">Select a library item + variant to generate a thumbnail plan.</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
