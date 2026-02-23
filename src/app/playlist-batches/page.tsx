'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type RecentBatch = {
  id: string;
  status: string;
  progress: number;
  stage: string | null;
  createdAt: string;
  playlistTitle: string;
  itemCount: number;
  target: string | null;
  outputFormat: string | null;
  summary: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
    skipped: number;
  } | null;
  error: string | null;
};

type BatchStatusResponse = {
  success: true;
  data: {
    batch: {
      id: string;
      status: string;
      progress: number;
      stage: string | null;
      error: string | null;
      createdAt: string;
      updatedAt: string;
      metadata: {
        playlistTitle: string;
        playlistUrl: string;
        target: string;
        targetAgentId?: string | null;
        outputFormat: string;
        fps: number;
      };
      result: {
        status: string;
        currentIndex: number | null;
        summary: {
          total: number;
          pending: number;
          active: number;
          completed: number;
          failed: number;
          skipped: number;
        };
        items: Array<{
          index: number;
          title: string;
          videoId: string;
          status: string;
          ingestJobId?: string;
          ingestStatus?: string;
          assetId?: string;
          renderJobId?: string;
          renderStatus?: string;
          outputVideoKey?: string;
          error?: string;
        }>;
      };
    };
  };
};

const OUTPUT_FORMATS = [
  'flat-1080p-landscape',
  'flat-1080p-portrait',
  'flat-4k-landscape',
  '360-mono-4k',
  '360-mono-6k',
  '360-mono-8k',
  '360-stereo-8k',
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function PlaylistBatchesPage() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [rightsAttested, setRightsAttested] = useState(false);
  const [outputFormat, setOutputFormat] = useState('flat-1080p-landscape');
  const [fps, setFps] = useState<30 | 60>(30);
  const [target, setTarget] = useState<'cloud' | 'home' | 'local-agent'>('cloud');
  const [targetAgentId, setTargetAgentId] = useState('');
  const [maxItems, setMaxItems] = useState(10);
  const [continueOnError, setContinueOnError] = useState(true);
  const [visualMode, setVisualMode] = useState<'flame' | 'mist'>('flame');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<BatchStatusResponse['data']['batch'] | null>(null);
  const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([]);

  const hasActiveBatch = useMemo(
    () => !!batchData && !['complete', 'failed', 'cancelled'].includes(batchData.status),
    [batchData],
  );

  const loadRecentBatches = async () => {
    try {
      const res = await fetch('/api/playlist-batches');
      const json = await res.json();
      if (json.success) {
        setRecentBatches(json.data.batches as RecentBatch[]);
      }
    } catch {
      // Ignore list refresh errors
    }
  };

  const loadBatch = async (id: string) => {
    try {
      const res = await fetch(`/api/playlist-batches/${id}`);
      const json = await res.json();
      if (json.success) {
        setBatchData(json.data.batch);
        setCurrentBatchId(id);
      } else {
        setSubmitError(json.error?.message || 'Failed to load batch');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to load batch');
    }
  };

  useEffect(() => {
    loadRecentBatches();
  }, []);

  useEffect(() => {
    if (!currentBatchId) return;
    loadBatch(currentBatchId);

    const interval = setInterval(() => {
      loadBatch(currentBatchId);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentBatchId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadRecentBatches();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/playlist-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistUrl,
          rightsAttested,
          outputFormat,
          fps,
          target,
          targetAgentId: target === 'local-agent' && targetAgentId.trim() ? targetAgentId.trim() : undefined,
          maxItems,
          continueOnError,
          renderSettings: {
            visualMode,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create playlist batch');
      }

      setCurrentBatchId(json.data.batchId);
      await loadRecentBatches();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create playlist batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!currentBatchId) return;
    try {
      await fetch(`/api/playlist-batches/${currentBatchId}`, { method: 'DELETE' });
      await loadBatch(currentBatchId);
      await loadRecentBatches();
    } catch {
      // Ignore cancel errors in MVP UI
    }
  };

  const handleRetry = async (scope: 'failed' | 'incomplete') => {
    if (!currentBatchId) return;
    setSubmitError(null);
    try {
      const res = await fetch(`/api/playlist-batches/${currentBatchId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || `Retry ${scope} failed`);
      }
      setCurrentBatchId(json.data.batchId);
      await loadRecentBatches();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : `Retry ${scope} failed`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-zinc-950 to-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Playlist Batch Render (MVP)</h1>
            <p className="text-xs text-white/50">Sequential YouTube playlist ingest + render using JobStore worker</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/" className="text-white/70 hover:text-white">Preview</Link>
            <Link href="/batch" className="text-white/70 hover:text-white">Legacy Batch</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold mb-4">Create Playlist Batch</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">YouTube Playlist URL</label>
              <input
                type="url"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Target</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as 'cloud' | 'home' | 'local-agent')}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                >
                  <option value="cloud">Cloud</option>
                  <option value="home">Home Server</option>
                  <option value="local-agent">Local Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">FPS</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value) as 30 | 60)}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                >
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>
            </div>

            {target === 'local-agent' && (
              <div>
                <label className="block text-xs text-white/60 mb-1">Target Agent ID (optional)</label>
                <input
                  type="text"
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(e.target.value)}
                  placeholder="my-laptop (blank = any connected agent)"
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
                />
                <p className="mt-1 text-[11px] text-white/50">
                  Run `npx tsx scripts/local-render-agent.ts --server ... --agent-id ... --token ...` on the viewer machine.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                >
                  {OUTPUT_FORMATS.map((format) => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">Max Items</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxItems}
                  onChange={(e) => setMaxItems(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Visual Mode</label>
              <select
                value={visualMode}
                onChange={(e) => setVisualMode(e.target.value as 'flame' | 'mist')}
                className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
              >
                <option value="flame">Flame</option>
                <option value="mist">Mist</option>
              </select>
            </div>

            <label className="flex items-start gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={rightsAttested}
                onChange={(e) => setRightsAttested(e.target.checked)}
                className="mt-0.5"
              />
              <span>I attest I have the rights to use the audio from this playlist.</span>
            </label>

            <label className="flex items-start gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                checked={continueOnError}
                onChange={(e) => setContinueOnError(e.target.checked)}
                className="mt-0.5"
              />
              <span>Continue batch when an item fails (recommended for MVP).</span>
            </label>

            {submitError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !rightsAttested}
              className={`w-full rounded-lg py-2.5 text-sm font-medium transition ${
                submitting || !rightsAttested
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400'
              }`}
            >
              {submitting ? 'Creating batch...' : 'Start Sequential Playlist Batch'}
            </button>

            <p className="text-xs text-white/50">
              MVP note: this runs sequentially in the worker and waits for each render to complete before dispatching the next.
            </p>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Current Batch</h2>
              <div className="flex gap-2">
                {currentBatchId && (
                  <button
                    onClick={() => loadBatch(currentBatchId)}
                    className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/5"
                  >
                    Refresh
                  </button>
                )}
                {hasActiveBatch && (
                  <button
                    onClick={handleCancel}
                    className="text-xs px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    Cancel Batch
                  </button>
                )}
                {batchData && !hasActiveBatch && batchData.result.summary.failed > 0 && (
                  <button
                    onClick={() => handleRetry('failed')}
                    className="text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
                  >
                    Retry Failed
                  </button>
                )}
                {batchData && !hasActiveBatch && (batchData.result.summary.pending > 0 || batchData.result.summary.active > 0) && (
                  <button
                    onClick={() => handleRetry('incomplete')}
                    className="text-xs px-2 py-1 rounded border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10"
                  >
                    Resume Incomplete
                  </button>
                )}
              </div>
            </div>

            {!batchData ? (
              <p className="text-sm text-white/50">Select a recent batch or create a new one.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div className="rounded-lg bg-black/30 p-3">
                    <div className="text-white/50 text-xs">Playlist</div>
                    <div className="font-medium">{batchData.metadata.playlistTitle}</div>
                    <a href={batchData.metadata.playlistUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200 break-all">
                      {batchData.metadata.playlistUrl}
                    </a>
                  </div>
                  <div className="rounded-lg bg-black/30 p-3">
                    <div className="text-white/50 text-xs">Status</div>
                    <div className="font-medium capitalize">{batchData.status}</div>
                    <div className="text-xs text-white/60">{batchData.stage || 'Queued'}</div>
                    <div className="text-xs text-white/50 mt-1">
                      {batchData.metadata.target}
                      {batchData.metadata.targetAgentId ? ` (${batchData.metadata.targetAgentId})` : ''}
                    </div>
                    {batchData.error && <div className="text-xs text-red-300 mt-1">{batchData.error}</div>}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>{batchData.stage || 'Waiting'}</span>
                    <span>{batchData.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all" style={{ width: `${batchData.progress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                  <div className="rounded bg-black/30 p-2"><div className="text-white/50">Total</div><div>{batchData.result.summary.total}</div></div>
                  <div className="rounded bg-black/30 p-2"><div className="text-white/50">Pending</div><div>{batchData.result.summary.pending}</div></div>
                  <div className="rounded bg-black/30 p-2"><div className="text-white/50">Active</div><div>{batchData.result.summary.active}</div></div>
                  <div className="rounded bg-black/30 p-2"><div className="text-white/50">Done</div><div>{batchData.result.summary.completed}</div></div>
                  <div className="rounded bg-black/30 p-2"><div className="text-white/50">Failed</div><div>{batchData.result.summary.failed}</div></div>
                  <div className="rounded bg-black/30 p-2"><div className="text-white/50">Skipped</div><div>{batchData.result.summary.skipped}</div></div>
                </div>

                <div className="overflow-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[760px] text-xs">
                    <thead className="bg-white/5 text-white/60">
                      <tr>
                        <th className="text-left px-3 py-2">#</th>
                        <th className="text-left px-3 py-2">Title</th>
                        <th className="text-left px-3 py-2">Item Status</th>
                        <th className="text-left px-3 py-2">Ingest</th>
                        <th className="text-left px-3 py-2">Render</th>
                        <th className="text-left px-3 py-2">Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchData.result.items.map((item) => (
                        <tr key={`${item.index}-${item.videoId}`} className="border-t border-white/5 align-top">
                          <td className="px-3 py-2">{item.index + 1}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-white/90">{item.title}</div>
                            <div className="text-white/40">{item.videoId}</div>
                            {item.error && <div className="text-red-300 mt-1">{item.error}</div>}
                          </td>
                          <td className="px-3 py-2 capitalize">{item.status}</td>
                          <td className="px-3 py-2">
                            <div className="capitalize">{item.ingestStatus || '-'}</div>
                            {item.ingestJobId && <div className="text-white/40">{item.ingestJobId.slice(0, 8)}</div>}
                          </td>
                          <td className="px-3 py-2">
                            <div className="capitalize">{item.renderStatus || '-'}</div>
                            {item.renderJobId && <div className="text-white/40">{item.renderJobId.slice(0, 8)}</div>}
                          </td>
                          <td className="px-3 py-2 break-all text-white/60">{item.outputVideoKey || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold mb-3">Recent Playlist Batches</h2>
            {recentBatches.length === 0 ? (
              <p className="text-sm text-white/50">No playlist batches yet.</p>
            ) : (
              <div className="space-y-2">
                {recentBatches.map((batch) => (
                  <button
                    key={batch.id}
                    onClick={() => setCurrentBatchId(batch.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                      currentBatchId === batch.id
                        ? 'border-cyan-400/40 bg-cyan-400/10'
                        : 'border-white/10 bg-black/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{batch.playlistTitle}</div>
                        <div className="text-xs text-white/50">
                          {batch.itemCount} items · {batch.outputFormat || 'unknown format'} · {batch.target || 'target?'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs capitalize">{batch.status}</div>
                        <div className="text-xs text-white/50">{batch.progress}%</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-white/40">
                      {formatDate(batch.createdAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
