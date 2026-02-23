'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CreatorRenderVariant = {
  variantId: string;
  outputFormat: string;
  fps: 30 | 60;
  styleVariant: {
    id: string;
    label: string;
    visualMode?: 'flame' | 'mist';
    orbAudioPreset?: 'meditation' | 'speech' | 'phonk' | 'cinematic';
    description?: string;
  };
  platformTargets: string[];
  durationCapSec?: number | null;
  safeZonePresetId?: string | null;
  renderJobId: string;
  renderTarget?: 'cloud' | 'home' | 'local-agent';
  targetAgentId?: string | null;
};

type RecutPlan = {
  sourceVariantId?: string | null;
  platform: string;
  aspectRatio: string;
  durationCapSec: number;
  segments: Array<{
    startSec: number;
    endSec: number;
    score: number;
    reason: string;
    reviewStatus?: 'pending' | 'accepted' | 'rejected';
    reviewedAt?: string | null;
    reviewNotes?: string | null;
  }>;
};

type ThumbnailPlan = {
  platform: string;
  aspectRatio: string;
  safeZonePresetId: string;
  safeZones?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  }>;
  candidates: Array<{
    timestampSec: number;
    score: number;
    reason: string;
  }>;
  selectedTimestampSec?: number | null;
  videoSignedUrl?: string | null;
};

type ContentLibraryItem = {
  itemId: string;
  createdAt: string;
  updatedAt: string;
  packId: string;
  sourceAudioName: string;
  sourceAssetId?: string | null;
  tags: {
    moods: string[];
    topics: string[];
    keywords: string[];
    bpm?: number | null;
  };
  variants: CreatorRenderVariant[];
  recutPlans: RecutPlan[];
  thumbnailPlans: ThumbnailPlan[];
  notes?: string | null;
};

type CreatorPublishDraft = {
  channelPresetId: string;
  platform: string;
  titleVariants: string[];
  description: string;
  hashtags: string[];
  ctas: string[];
  keywordPacks: string[];
};

type CreatorRenderPack = {
  packId: string;
  createdAt: string;
  updatedAt: string;
  status: 'queued' | 'partial' | 'complete' | 'failed';
  bundleId?: string | null;
  bundleLabel?: string | null;
  exportPackIds: string[];
  variants: CreatorRenderVariant[];
  publishDrafts: CreatorPublishDraft[];
  contentLibraryItemId?: string | null;
  target: 'cloud' | 'home' | 'local-agent';
  targetAgentId?: string | null;
};

type EditableItemFields = {
  moods: string;
  topics: string;
  keywords: string;
  bpm: string;
  notes: string;
};

function joinTags(values: string[] | undefined): string {
  return (values || []).join(', ');
}

function parseTags(raw: string): string[] {
  return Array.from(new Set(raw.split(',').map((x) => x.trim()).filter(Boolean))).slice(0, 20);
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function parseAspectRatio(aspect: string): string {
  const parts = aspect.split(':').map((x) => Number(x.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return `${parts[0]} / ${parts[1]}`;
  }
  return '16 / 9';
}

export default function CreatorLibraryPage() {
  const recutPreviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [packs, setPacks] = useState<CreatorRenderPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [editFields, setEditFields] = useState<EditableItemFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [recutPreview, setRecutPreview] = useState<{
    planIndex: number;
    segmentIndex: number;
    renderJobId: string;
    videoSignedUrl: string | null;
    aspectRatio: string;
    safeZonePresetId: 'safe-16x9' | 'safe-9x16' | 'safe-1x1';
    safeZones: Array<{ x: number; y: number; width: number; height: number; label: string }>;
    startSec: number;
    endSec: number;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [recutPreviewTimeSec, setRecutPreviewTimeSec] = useState(0);
  const [recutQueueMessage, setRecutQueueMessage] = useState<string | null>(null);
  const [recutQueueing, setRecutQueueing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, packsRes] = await Promise.all([
        fetch('/api/creator/content-library?limit=300'),
        fetch('/api/creator/render-packs?limit=300'),
      ]);
      const [itemsJson, packsJson] = await Promise.all([itemsRes.json(), packsRes.json()]);
      if (!itemsRes.ok || itemsJson.success === false) {
        throw new Error(itemsJson.error?.message || `Failed to load content library (${itemsRes.status})`);
      }
      if (!packsRes.ok || packsJson.success === false) {
        throw new Error(packsJson.error?.message || `Failed to load render packs (${packsRes.status})`);
      }
      const nextItems = (itemsJson.data?.items || []) as ContentLibraryItem[];
      const nextPacks = (packsJson.data?.packs || []) as CreatorRenderPack[];
      setItems(nextItems);
      setPacks(nextPacks);
      setSelectedItemId((prev) => (prev && nextItems.some((item) => item.itemId === prev) ? prev : (nextItems[0]?.itemId || '')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load creator library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {});
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [
        item.sourceAudioName,
        item.tags.moods.join(' '),
        item.tags.topics.join(' '),
        item.tags.keywords.join(' '),
        item.notes || '',
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, filter]);

  useEffect(() => {
    if (!filteredItems.length) return;
    if (!selectedItemId || !filteredItems.some((item) => item.itemId === selectedItemId)) {
      setSelectedItemId(filteredItems[0].itemId);
    }
  }, [filteredItems, selectedItemId]);

  const selectedItem = filteredItems.find((item) => item.itemId === selectedItemId) || null;
  const selectedPack = packs.find((pack) => pack.packId === selectedItem?.packId) || null;

  const findSourceVariantForPlan = useCallback((plan: RecutPlan) => {
    if (!selectedItem) return null;
    if (plan.sourceVariantId) {
      const exact = selectedItem.variants.find((v) => v.variantId === plan.sourceVariantId);
      if (exact) return exact;
    }
    const platformMatch = selectedItem.variants.find((v) => v.platformTargets.includes(plan.platform));
    if (platformMatch) return platformMatch;
    return selectedItem.variants[0] || null;
  }, [selectedItem]);

  const inferSafeZonePresetFromAspect = useCallback((aspectRatio: string): 'safe-16x9' | 'safe-9x16' | 'safe-1x1' => {
    const normalized = aspectRatio.replace(/\s+/g, '');
    if (normalized === '9:16') return 'safe-9x16';
    if (normalized === '1:1') return 'safe-1x1';
    return 'safe-16x9';
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setEditFields(null);
      setRecutPreview(null);
      return;
    }
    setEditFields({
      moods: joinTags(selectedItem.tags.moods),
      topics: joinTags(selectedItem.tags.topics),
      keywords: joinTags(selectedItem.tags.keywords),
      bpm: selectedItem.tags.bpm ? String(selectedItem.tags.bpm) : '',
      notes: selectedItem.notes || '',
    });
    setSaveMessage(null);
    setRecutQueueMessage(null);
  }, [selectedItem?.itemId]);

  const updateRecutSegmentReview = useCallback(async (
    planIndex: number,
    segmentIndex: number,
    reviewStatus: 'pending' | 'accepted' | 'rejected',
  ) => {
    if (!selectedItem) return;
    setRecutQueueMessage(null);
    try {
      const response = await fetch('/api/creator/content-library/recut-review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.itemId,
          planIndex,
          segmentIndex,
          reviewStatus,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to update recut review (${response.status})`);
      }
      const updatedItem = data.data?.item as ContentLibraryItem;
      setItems((prev) => prev.map((item) => (item.itemId === updatedItem.itemId ? updatedItem : item)));
    } catch (err) {
      setRecutQueueMessage(err instanceof Error ? err.message : 'Failed to update recut review');
    }
  }, [selectedItem]);

  const openRecutPreview = useCallback(async (plan: RecutPlan, planIndex: number, segmentIndex: number) => {
    if (!selectedItem) return;
    const segment = plan.segments[segmentIndex];
    if (!segment) return;
    const sourceVariant = findSourceVariantForPlan(plan);
    if (!sourceVariant) {
      setRecutQueueMessage('No source render variant found for this recut plan');
      return;
    }

    const safeZonePresetId = inferSafeZonePresetFromAspect(plan.aspectRatio);
    setRecutPreview({
      planIndex,
      segmentIndex,
      renderJobId: sourceVariant.renderJobId,
      videoSignedUrl: null,
      aspectRatio: plan.aspectRatio,
      safeZonePresetId,
      safeZones: [],
      startSec: segment.startSec,
      endSec: segment.endSec,
      loading: true,
      error: null,
    });

    try {
      const response = await fetch('/api/creator/thumbnail-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: plan.platform,
          safeZonePresetId,
          renderJobId: sourceVariant.renderJobId,
          durationSec: Math.max(10, Math.ceil(segment.endSec + 2)),
          candidateCount: 4,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to load recut preview (${response.status})`);
      }

      const previewPlan = (data.data?.plan || null) as ThumbnailPlan | null;
      const videoSignedUrl = previewPlan?.videoSignedUrl || null;
      setRecutPreview((prev) => prev ? {
        ...prev,
        loading: false,
        videoSignedUrl,
        aspectRatio: previewPlan?.aspectRatio || prev.aspectRatio,
        safeZonePresetId: (previewPlan?.safeZonePresetId as typeof prev.safeZonePresetId) || prev.safeZonePresetId,
        safeZones: Array.isArray(previewPlan?.safeZones) ? previewPlan.safeZones : prev.safeZones,
        error: videoSignedUrl ? null : 'Render video preview not available yet',
      } : prev);
      setRecutPreviewTimeSec(segment.startSec);

      if (videoSignedUrl) {
        setTimeout(() => {
          if (recutPreviewVideoRef.current) {
            recutPreviewVideoRef.current.currentTime = segment.startSec;
          }
        }, 50);
      }
    } catch (err) {
      setRecutPreview((prev) => prev ? {
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load recut preview',
      } : prev);
    }
  }, [findSourceVariantForPlan, inferSafeZonePresetFromAspect, selectedItem]);

  const seekRecutPreview = useCallback((seconds: number) => {
    if (!recutPreview) return;
    const next = Math.max(0, Math.min(seconds, recutPreview.endSec + 5));
    setRecutPreviewTimeSec(next);
    if (recutPreviewVideoRef.current) {
      try {
        recutPreviewVideoRef.current.currentTime = next;
      } catch {
        // Ignore seek errors while metadata is loading.
      }
    }
  }, [recutPreview]);

  const queueAcceptedRecuts = useCallback(async () => {
    if (!selectedPack) return;
    setRecutQueueing(true);
    setRecutQueueMessage(null);
    try {
      const response = await fetch(`/api/creator/render-packs/${encodeURIComponent(selectedPack.packId)}/recut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'all',
          maxPerPlan: 6,
          reviewFilter: 'accepted-only',
          queueSyncJob: true,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to queue accepted recuts (${response.status})`);
      }
      setRecutQueueMessage(`Queued ${data.data?.queuedCount || 0} accepted recut job(s); skipped ${data.data?.skippedCount || 0}.`);
    } catch (err) {
      setRecutQueueMessage(err instanceof Error ? err.message : 'Failed to queue recuts');
    } finally {
      setRecutQueueing(false);
    }
  }, [selectedPack]);

  const saveSelectedItem = useCallback(async () => {
    if (!selectedItem || !editFields) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const bpmValue = editFields.bpm.trim() ? Number(editFields.bpm) : null;
      if (bpmValue !== null && (!Number.isFinite(bpmValue) || bpmValue < 1 || bpmValue > 300)) {
        throw new Error('BPM must be between 1 and 300');
      }

      const response = await fetch('/api/creator/content-library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.itemId,
          tags: {
            moods: parseTags(editFields.moods),
            topics: parseTags(editFields.topics),
            keywords: parseTags(editFields.keywords),
            bpm: bpmValue,
          },
          notes: editFields.notes.trim() ? editFields.notes : null,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error?.message || `Failed to save (${response.status})`);
      }
      setItems((prev) => prev.map((item) => (item.itemId === selectedItem.itemId ? (data.data.item as ContentLibraryItem) : item)));
      setSaveMessage('Saved');
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selectedItem, editFields]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pack of packs) counts[pack.status] = (counts[pack.status] || 0) + 1;
    return counts;
  }, [packs]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Creator Content Library</h1>
            <p className="text-sm text-zinc-400">
              Tag source clips, review auto recut segment suggestions, and use generated publish metadata drafts.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <a href="/creator" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Creator Home</a>
            <a href="/creator/dashboard" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Dashboard</a>
            <a href="/creator/thumbnail-planner" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Thumbnail Planner</a>
            <button onClick={() => loadData()} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Refresh</button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-2">
                <div className="text-zinc-500">Library Items</div>
                <div className="text-lg font-semibold">{items.length}</div>
              </div>
              <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 p-2">
                <div className="text-zinc-500">Render Packs</div>
                <div className="text-lg font-semibold">{packs.length}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} className="px-2 py-1 rounded-full border border-zinc-800 bg-zinc-950/70">
                  {status}: {count}
                </span>
              ))}
            </div>

            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by audio name, mood, topic, keyword..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm placeholder:text-zinc-600"
            />

            {loading ? (
              <div className="text-sm text-zinc-400 py-6">Loading creator library...</div>
            ) : error ? (
              <div className="text-sm text-red-300 py-6">{error}</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-sm text-zinc-500 py-6">No content library items yet.</div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
                {filteredItems.map((item) => {
                  const isSelected = item.itemId === selectedItemId;
                  return (
                    <button
                      key={item.itemId}
                      onClick={() => setSelectedItemId(item.itemId)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? 'border-blue-500/40 bg-blue-500/10'
                          : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="text-sm font-medium truncate">{item.sourceAudioName}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {item.variants.length} variants  |  {item.recutPlans.length} recut plans  |  {item.thumbnailPlans.length} thumbnail plans
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500 truncate">
                        {(item.tags.moods.length || item.tags.topics.length || item.tags.keywords.length)
                          ? `moods:${item.tags.moods.join('/')}  |  topics:${item.tags.topics.join('/')}  |  keywords:${item.tags.keywords.join('/')}`
                          : 'No tags yet'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            {!selectedItem ? (
              <div className="text-zinc-400 text-sm">Select a content item to inspect variants, recuts, and metadata drafts.</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedItem.sourceAudioName}</h2>
                    <div className="text-xs text-zinc-500 mt-1">
                      Updated {formatDate(selectedItem.updatedAt)}  |  Item {selectedItem.itemId}
                    </div>
                    {selectedPack && (
                      <div className="text-xs text-zinc-400 mt-1">
                        Pack: {selectedPack.bundleLabel || selectedPack.bundleId || 'custom'}  |  Target: {selectedPack.target}
                        {selectedPack.targetAgentId ? ` (${selectedPack.targetAgentId})` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <a
                      href={`/creator/thumbnail-planner?itemId=${encodeURIComponent(selectedItem.itemId)}`}
                      className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900"
                    >
                      Open Thumbnail Planner
                    </a>
                    <button
                      onClick={() => {
                        setEditFields({
                          moods: joinTags(selectedItem.tags.moods),
                          topics: joinTags(selectedItem.tags.topics),
                          keywords: joinTags(selectedItem.tags.keywords),
                          bpm: selectedItem.tags.bpm ? String(selectedItem.tags.bpm) : '',
                          notes: selectedItem.notes || '',
                        });
                        setSaveMessage(null);
                      }}
                      className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-900"
                    >
                      Reset Edits
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-200">Tags & Reuse Metadata</h3>
                    <div className="space-y-2">
                      <label className="block">
                        <div className="text-[11px] text-zinc-500 mb-1">Moods</div>
                        <input
                          type="text"
                          value={editFields?.moods || ''}
                          onChange={(e) => setEditFields((prev) => prev ? { ...prev, moods: e.target.value } : prev)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <div className="text-[11px] text-zinc-500 mb-1">Topics</div>
                        <input
                          type="text"
                          value={editFields?.topics || ''}
                          onChange={(e) => setEditFields((prev) => prev ? { ...prev, topics: e.target.value } : prev)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <div className="text-[11px] text-zinc-500 mb-1">Keywords</div>
                        <input
                          type="text"
                          value={editFields?.keywords || ''}
                          onChange={(e) => setEditFields((prev) => prev ? { ...prev, keywords: e.target.value } : prev)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <div className="text-[11px] text-zinc-500 mb-1">BPM</div>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={editFields?.bpm || ''}
                          onChange={(e) => setEditFields((prev) => prev ? { ...prev, bpm: e.target.value } : prev)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <div className="text-[11px] text-zinc-500 mb-1">Notes</div>
                        <textarea
                          rows={4}
                          value={editFields?.notes || ''}
                          onChange={(e) => setEditFields((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveSelectedItem}
                          disabled={saving || !editFields}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            saving ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {saving ? 'Saving...' : 'Save Tags'}
                        </button>
                        {saveMessage && <span className={`text-xs ${saveMessage === 'Saved' ? 'text-green-300' : 'text-amber-300'}`}>{saveMessage}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-200">Auto Recut Plans (review + execution queue)</h3>
                      <button
                        onClick={queueAcceptedRecuts}
                        disabled={!selectedPack || recutQueueing || selectedItem.recutPlans.length === 0}
                        className={`px-3 py-2 rounded-lg text-xs ${
                          !selectedPack || recutQueueing || selectedItem.recutPlans.length === 0
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {recutQueueing ? 'Queueing...' : 'Queue Accepted Recuts'}
                      </button>
                    </div>
                    {recutQueueMessage && (
                      <div className={`text-xs ${/queued/i.test(recutQueueMessage) ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {recutQueueMessage}
                      </div>
                    )}
                    {selectedItem.recutPlans.length === 0 ? (
                      <div className="text-sm text-zinc-500">
                        No recut plans were generated for this item (usually means no duration-capped variants were queued).
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedItem.recutPlans.map((plan, idx) => (
                          <div key={`${plan.platform}:${idx}`} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                            <div className="text-xs text-zinc-300">
                              {plan.platform} � {plan.aspectRatio} � cap {plan.durationCapSec}s
                            </div>
                            <div className="mt-2 space-y-2">
                              {plan.segments.slice(0, 6).map((segment, segmentIdx) => (
                                <div key={segmentIdx} className="rounded border border-zinc-800 bg-zinc-950/50 p-2">
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                    <div className="text-[11px] text-zinc-300">
                                      {formatTime(segment.startSec)} - {formatTime(segment.endSec)}
                                      <span className="text-zinc-500"> � {segment.reason}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-zinc-500">score {segment.score.toFixed(2)}</span>
                                      <span
                                        className={`px-2 py-0.5 rounded border ${
                                          (segment.reviewStatus || 'pending') === 'accepted'
                                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                            : (segment.reviewStatus || 'pending') === 'rejected'
                                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                                              : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                                        }`}
                                      >
                                        {segment.reviewStatus || 'pending'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                    <button
                                      onClick={() => openRecutPreview(plan, idx, segmentIdx)}
                                      className="px-2 py-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                                    >
                                      Preview
                                    </button>
                                    <button
                                      onClick={() => updateRecutSegmentReview(idx, segmentIdx, 'accepted')}
                                      className="px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => updateRecutSegmentReview(idx, segmentIdx, 'rejected')}
                                      className="px-2 py-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => updateRecutSegmentReview(idx, segmentIdx, 'pending')}
                                      className="px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                                    >
                                      Clear Review
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {plan.segments.length > 6 && (
                                <div className="text-[11px] text-zinc-500">+ {plan.segments.length - 6} more suggestions</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-500">
                      Review segment suggestions here, then queue only accepted cuts. Recut execution jobs trim/crop/resize the shorts with FFmpeg.
                    </p>

                    {recutPreview && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="text-xs text-zinc-300">
                            Segment preview � plan {recutPreview.planIndex + 1}, segment {recutPreview.segmentIndex + 1}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {formatTime(recutPreview.startSec)} - {formatTime(recutPreview.endSec)} � {recutPreview.safeZonePresetId}
                          </div>
                        </div>
                        <div
                          className="relative w-full rounded-lg overflow-hidden border border-zinc-800 bg-black"
                          style={{ aspectRatio: parseAspectRatio(recutPreview.aspectRatio) }}
                        >
                          {recutPreview.loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">Loading preview...</div>
                          ) : recutPreview.videoSignedUrl ? (
                            <video
                              ref={recutPreviewVideoRef}
                              src={recutPreview.videoSignedUrl}
                              controls
                              crossOrigin="anonymous"
                              className="absolute inset-0 w-full h-full object-contain bg-black"
                              onLoadedMetadata={(e) => {
                                const next = Math.max(0, recutPreview.startSec);
                                e.currentTarget.currentTime = next;
                                setRecutPreviewTimeSec(next);
                              }}
                              onTimeUpdate={(e) => {
                                const t = e.currentTarget.currentTime || 0;
                                setRecutPreviewTimeSec(t);
                                if (t >= recutPreview.endSec + 0.05) {
                                  e.currentTarget.currentTime = recutPreview.startSec;
                                }
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500 p-6 text-center">
                              {recutPreview.error || 'Preview video unavailable'}
                            </div>
                          )}

                          <div className="absolute inset-0 pointer-events-none">
                            {(recutPreview.safeZones || []).map((zone, zoneIdx) => (
                              <div
                                key={`${zone.label}:${zoneIdx}`}
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
                            <span>Segment Scrubber</span>
                            <span>{recutPreviewTimeSec.toFixed(2)}s</span>
                          </div>
                          <input
                            type="range"
                            min={Math.max(0, recutPreview.startSec)}
                            max={Math.max(recutPreview.startSec + 0.01, recutPreview.endSec)}
                            step={0.01}
                            value={Math.min(Math.max(recutPreviewTimeSec, recutPreview.startSec), recutPreview.endSec)}
                            onChange={(e) => seekRecutPreview(Number(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <button onClick={() => seekRecutPreview(recutPreview.startSec)} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">Jump Start</button>
                            <button onClick={() => seekRecutPreview(Math.max(recutPreview.startSec, recutPreviewTimeSec - 0.5))} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">-0.5s</button>
                            <button onClick={() => seekRecutPreview(Math.min(recutPreview.endSec, recutPreviewTimeSec + 0.5))} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">+0.5s</button>
                            <button onClick={() => seekRecutPreview(recutPreview.endSec)} className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">Jump End</button>
                          </div>
                          {recutPreview.error && <div className="text-xs text-amber-300">{recutPreview.error}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <h3 className="text-sm font-semibold text-zinc-200 mb-3">Queued Variants</h3>
                  <div className="space-y-2">
                    {selectedItem.variants.map((variant) => (
                      <div key={`${variant.variantId}:${variant.renderJobId}`} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                          <div>
                            <div className="text-sm text-zinc-100">
                              {variant.styleVariant.label}  |  {variant.outputFormat}  |  {variant.fps} FPS
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1">
                              Platforms: {variant.platformTargets.join(', ') || 'none'}  |  Duration cap: {variant.durationCapSec ?? 'none'}  |  Safe zone: {variant.safeZonePresetId || 'none'}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1">
                              Render target: {variant.renderTarget || selectedPack?.target || 'cloud'}
                              {variant.targetAgentId ? ` (${variant.targetAgentId})` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <code className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">{variant.renderJobId}</code>
                            <a
                              href={`/api/render/${encodeURIComponent(variant.renderJobId)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300"
                            >
                              Job JSON
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <h3 className="text-sm font-semibold text-zinc-200 mb-3">Publish Metadata Drafts</h3>
                  {!selectedPack || selectedPack.publishDrafts.length === 0 ? (
                    <div className="text-sm text-zinc-500">No publish drafts attached to this creator pack yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPack.publishDrafts.map((draft, idx) => (
                        <div key={`${draft.channelPresetId}:${idx}`} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 space-y-2">
                          <div className="text-xs text-zinc-300">
                            {draft.platform}  |  preset `{draft.channelPresetId}`
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Title Variants</div>
                            <ul className="space-y-1 text-sm text-zinc-200">
                              {draft.titleVariants.map((title, titleIdx) => (
                                <li key={titleIdx} className="rounded bg-zinc-950/70 border border-zinc-800 px-2 py-1">{title}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[11px] text-zinc-500 mb-1">Description</div>
                            <pre className="whitespace-pre-wrap text-xs text-zinc-300 bg-zinc-950/70 border border-zinc-800 rounded p-2">
                              {draft.description}
                            </pre>
                          </div>
                          <div className="grid gap-2 md:grid-cols-3 text-xs">
                            <div className="rounded border border-zinc-800 bg-zinc-950/70 p-2">
                              <div className="text-zinc-500 mb-1">Hashtags</div>
                              <div className="text-zinc-300">{draft.hashtags.join(' ')}</div>
                            </div>
                            <div className="rounded border border-zinc-800 bg-zinc-950/70 p-2">
                              <div className="text-zinc-500 mb-1">CTAs</div>
                              <div className="text-zinc-300">{draft.ctas.join(' | ')}</div>
                            </div>
                            <div className="rounded border border-zinc-800 bg-zinc-950/70 p-2">
                              <div className="text-zinc-500 mb-1">Keywords</div>
                              <div className="text-zinc-300">{draft.keywordPacks.join(', ')}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
