'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type LiveVariant = {
  variantId: string;
  renderJobId: string;
  outputFormat: string;
  platformTargets: string[];
  styleLabel: string;
  status: 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled' | 'missing';
  progress: number;
  stage: string | null;
  outputVideoKey?: string;
  error?: string;
};

type LiveSummary = {
  packId: string;
  syncedAt: string;
  overallStatus: 'queued' | 'partial' | 'complete' | 'failed';
  progressPct: number;
  render: Record<string, number> & { total: number; complete: number; processing: number; failed: number };
  recut: Record<string, number> & { total: number; complete: number; processing: number; failed: number };
  publish: Record<string, number> & { total: number; complete: number; processing: number; failed: number; scheduled: number };
  variants: LiveVariant[];
};

type DashboardRow = {
  pack: {
    packId: string;
    createdAt: string;
    updatedAt: string;
    status: 'queued' | 'partial' | 'complete' | 'failed';
    bundleId?: string | null;
    bundleLabel?: string | null;
    source: { audioName: string };
    exportPackIds: string[];
    variants: Array<{ variantId: string; outputFormat: string; fps: 30 | 60 }>;
    recutExecutions?: Array<{ recutId: string; jobId: string; status: string; platform: string; outputVideoKey?: string | null }>;
    publishTasks?: Array<{ publishId: string; publishJobId: string; status: string; platform: string; mode: string; providerStatus?: string | null }>;
  };
  live: LiveSummary;
};

type DashboardResponse = {
  rows: DashboardRow[];
  summary: {
    total: number;
    byStatus: Record<string, number>;
    renderTotal: number;
    renderComplete: number;
    recutTotal: number;
    recutComplete: number;
    publishTotal: number;
    publishComplete: number;
    publishScheduled: number;
  };
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function statusTone(status: string): string {
  switch (status) {
    case 'complete':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    case 'failed':
      return 'text-red-300 border-red-500/30 bg-red-500/10';
    case 'processing':
    case 'partial':
      return 'text-blue-300 border-blue-500/30 bg-blue-500/10';
    case 'queued':
    case 'scheduled':
      return 'text-amber-200 border-amber-400/30 bg-amber-400/10';
    default:
      return 'text-zinc-300 border-zinc-700 bg-zinc-800/50';
  }
}

export default function CreatorDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const [recutMode, setRecutMode] = useState<'top' | 'all'>('top');
  const [recutMaxPerPlan, setRecutMaxPerPlan] = useState(1);
  const [publishMode, setPublishMode] = useState<'draft' | 'schedule'>('draft');
  const [publishSourceSelection, setPublishSourceSelection] = useState<'render' | 'recut' | 'prefer-recut'>('prefer-recut');
  const [scheduleAtLocal, setScheduleAtLocal] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading((prev) => (data ? prev : true));
    setError(null);
    try {
      const res = await fetch('/api/creator/dashboard?limit=100');
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || `Failed to load dashboard (${res.status})`);
      }
      setData(json.data as DashboardResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    loadDashboard().catch(() => {});
  }, [loadDashboard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadDashboard().catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadDashboard]);

  const runAction = useCallback(async (packId: string, action: 'sync' | 'recut' | 'publish') => {
    setBusyPackId(packId);
    setActionMessage(null);
    try {
      if (action === 'sync') {
        const res = await fetch(`/api/creator/render-packs/${encodeURIComponent(packId)}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'immediate' }),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.error?.message || `Sync failed (${res.status})`);
        }
        setActionMessage(`Synced pack ${packId}`);
      } else if (action === 'recut') {
        const res = await fetch(`/api/creator/render-packs/${encodeURIComponent(packId)}/recut`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: recutMode,
            maxPerPlan: recutMaxPerPlan,
            queueSyncJob: true,
          }),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.error?.message || `Recut queue failed (${res.status})`);
        }
        setActionMessage(`Queued ${json.data?.queuedCount || 0} recut job(s) for pack ${packId}`);
      } else {
        const scheduledFor = publishMode === 'schedule' && scheduleAtLocal
          ? new Date(scheduleAtLocal).toISOString()
          : null;
        const res = await fetch(`/api/creator/render-packs/${encodeURIComponent(packId)}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: publishMode,
            scheduledFor,
            sourceSelection: publishSourceSelection,
            queueSyncJob: true,
          }),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.error?.message || `Publish queue failed (${res.status})`);
        }
        setActionMessage(`Queued ${json.data?.queuedCount || 0} publish job(s) for pack ${packId}`);
      }
      await loadDashboard();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyPackId(null);
    }
  }, [loadDashboard, publishMode, publishSourceSelection, recutMaxPerPlan, recutMode, scheduleAtLocal]);

  const aggregateProgress = useMemo(() => {
    if (!data) return 0;
    const total = data.rows.length || 1;
    return Math.round(data.rows.reduce((sum, row) => sum + row.live.progressPct, 0) / total);
  }, [data]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Creator Batch Dashboard</h1>
            <p className="text-sm text-zinc-400">
              Live rollup of render, recut, and publish jobs per creator pack with one-click recut/publish queue actions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a href="/creator" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Creator Home</a>
            <a href="/creator/library" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Library</a>
            <a href="/creator/thumbnail-planner" className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Thumbnail Planner</a>
            <button onClick={() => loadDashboard()} className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800">Refresh</button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="text-xs text-zinc-500">Creator Packs</div>
                <div className="text-xl font-semibold">{data?.summary.total ?? 0}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="text-xs text-zinc-500">Render Complete</div>
                <div className="text-xl font-semibold">{data?.summary.renderComplete ?? 0}/{data?.summary.renderTotal ?? 0}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="text-xs text-zinc-500">Recuts Complete</div>
                <div className="text-xl font-semibold">{data?.summary.recutComplete ?? 0}/{data?.summary.recutTotal ?? 0}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="text-xs text-zinc-500">Publish Ready / Scheduled</div>
                <div className="text-xl font-semibold">{data?.summary.publishComplete ?? 0}+{data?.summary.publishScheduled ?? 0}</div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Average Pack Progress</span>
                <span>{aggregateProgress}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${aggregateProgress}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                {Object.entries(data?.summary.byStatus || {}).map(([status, count]) => (
                  <span key={status} className={`px-2 py-1 rounded-full border ${statusTone(status)}`}>
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>

            {loading && !data ? (
              <div className="text-sm text-zinc-400">Loading creator dashboard...</div>
            ) : error ? (
              <div className="text-sm text-red-300">{error}</div>
            ) : !data || data.rows.length === 0 ? (
              <div className="text-sm text-zinc-500">No creator packs yet.</div>
            ) : (
              <div className="space-y-3">
                {data.rows.map((row) => (
                  <div key={row.pack.packId} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-semibold">{row.pack.source.audioName}</h2>
                          <span className={`px-2 py-1 rounded-full border text-xs ${statusTone(row.live.overallStatus)}`}>
                            {row.live.overallStatus}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {row.pack.bundleLabel || row.pack.bundleId || 'Custom Bundle'}  |  Pack {row.pack.packId}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          Created {formatDate(row.pack.createdAt)}  |  Updated {formatDate(row.pack.updatedAt)}  |  Synced {formatDate(row.live.syncedAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() => runAction(row.pack.packId, 'sync')}
                          disabled={busyPackId === row.pack.packId}
                          className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          Sync
                        </button>
                        <button
                          onClick={() => runAction(row.pack.packId, 'recut')}
                          disabled={busyPackId === row.pack.packId}
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                        >
                          Queue Recuts
                        </button>
                        <button
                          onClick={() => runAction(row.pack.packId, 'publish')}
                          disabled={busyPackId === row.pack.packId}
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                        >
                          Queue Publish
                        </button>
                        <a
                          href={`/creator/library`}
                          className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                        >
                          Library
                        </a>
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>Pack Progress</span>
                        <span>{row.live.progressPct}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${row.live.progressPct}%` }} />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 text-xs">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                        <div className="text-zinc-400 mb-1">Render Jobs</div>
                        <div className="text-zinc-200">
                          {row.live.render.complete}/{row.live.render.total} complete
                          {row.live.render.processing ? `  |  ${row.live.render.processing} active` : ''}
                          {row.live.render.failed ? `  |  ${row.live.render.failed} failed` : ''}
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                        <div className="text-zinc-400 mb-1">Recut Jobs</div>
                        <div className="text-zinc-200">
                          {row.live.recut.complete}/{row.live.recut.total} complete
                          {row.live.recut.processing ? `  |  ${row.live.recut.processing} active` : ''}
                          {row.live.recut.failed ? `  |  ${row.live.recut.failed} failed` : ''}
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                        <div className="text-zinc-400 mb-1">Publish Jobs</div>
                        <div className="text-zinc-200">
                          {row.live.publish.complete}/{row.live.publish.total} complete
                          {row.live.publish.scheduled ? `  |  ${row.live.publish.scheduled} scheduled` : ''}
                          {row.live.publish.processing ? `  |  ${row.live.publish.processing} active` : ''}
                          {row.live.publish.failed ? `  |  ${row.live.publish.failed} failed` : ''}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-zinc-400 mb-2">Variant Status Rollup</div>
                      <div className="space-y-2">
                        {row.live.variants.map((variant) => (
                          <div key={variant.renderJobId} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div>
                                <div className="text-sm text-zinc-100">{variant.styleLabel}  |  {variant.outputFormat}</div>
                                <div className="text-[11px] text-zinc-500 mt-1">
                                  {variant.platformTargets.join(', ')}  |  {variant.stage || variant.status}
                                  {variant.error ? `  |  ${variant.error}` : ''}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full border text-[11px] ${statusTone(variant.status)}`}>{variant.status}</span>
                                <span className="text-xs text-zinc-400">{variant.progress}%</span>
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${variant.status === 'failed' ? 'bg-red-500' : variant.status === 'complete' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.max(0, Math.min(100, variant.progress))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(row.pack.recutExecutions?.length || 0) > 0 && (
                      <div>
                        <div className="text-xs text-zinc-400 mb-2">Recut Executions ({row.pack.recutExecutions?.length || 0})</div>
                        <div className="flex flex-wrap gap-2">
                          {(row.pack.recutExecutions || []).slice(0, 12).map((recut) => (
                            <span key={recut.recutId} className={`px-2 py-1 rounded-full border text-[11px] ${statusTone(recut.status)}`}>
                              {recut.platform}  |  {recut.status}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(row.pack.publishTasks?.length || 0) > 0 && (
                      <div>
                        <div className="text-xs text-zinc-400 mb-2">Publish Tasks ({row.pack.publishTasks?.length || 0})</div>
                        <div className="space-y-2">
                          {(row.pack.publishTasks || []).slice(0, 8).map((task) => (
                            <div key={task.publishId} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div className="text-xs text-zinc-300">
                                {task.platform}  |  {task.mode}  |  {task.providerStatus || task.status}
                              </div>
                              <span className={`px-2 py-1 rounded-full border text-[11px] ${statusTone(task.status)}`}>{task.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Automation Controls</h2>
              <p className="text-xs text-zinc-500 mt-1">
                These settings apply to the "Queue Recuts" and "Queue Publish" actions from each pack row.
              </p>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <span className="text-sm text-zinc-200">Auto refresh (5s)</span>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
            </label>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 space-y-3">
              <div className="text-sm font-medium text-zinc-200">Recut Queue</div>
              <label className="block">
                <div className="text-xs text-zinc-500 mb-1">Mode</div>
                <select
                  value={recutMode}
                  onChange={(e) => setRecutMode(e.target.value as 'top' | 'all')}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="top">Top segment(s) per plan</option>
                  <option value="all">All suggested segments</option>
                </select>
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500 mb-1">Max Segments Per Plan ({recutMaxPerPlan})</div>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={recutMaxPerPlan}
                  onChange={(e) => setRecutMaxPerPlan(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 space-y-3">
              <div className="text-sm font-medium text-zinc-200">Publish Queue</div>
              <label className="block">
                <div className="text-xs text-zinc-500 mb-1">Publish Mode</div>
                <select
                  value={publishMode}
                  onChange={(e) => setPublishMode(e.target.value as 'draft' | 'schedule')}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="schedule">Schedule</option>
                </select>
              </label>
              <label className="block">
                <div className="text-xs text-zinc-500 mb-1">Source Selection</div>
                <select
                  value={publishSourceSelection}
                  onChange={(e) => setPublishSourceSelection(e.target.value as 'render' | 'recut' | 'prefer-recut')}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="prefer-recut">Prefer completed recuts</option>
                  <option value="render">Render outputs only</option>
                  <option value="recut">Recuts only</option>
                </select>
              </label>
              {publishMode === 'schedule' && (
                <label className="block">
                  <div className="text-xs text-zinc-500 mb-1">Schedule Time (local)</div>
                  <input
                    type="datetime-local"
                    value={scheduleAtLocal}
                    onChange={(e) => setScheduleAtLocal(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                  />
                </label>
              )}
            </div>

            {actionMessage && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300">
                {actionMessage}
              </div>
            )}

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
              Publish connectors currently generate provider-specific draft manifests by default (and preserve schedule metadata). 
              Add provider credentials/env setup to enable API mode later.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

