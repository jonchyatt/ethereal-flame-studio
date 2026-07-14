'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Summary = {
  total: number;
  pending: number;
  pendingReview: number;
  approved: number;
  active: number;
  blocked: number;
  rejected: number;
  completed: number;
  failed: number;
  skipped: number;
};

type RenderIntent = {
  intentId: string;
  engine: 'puppeteer' | 'unity';
  outputFormat: string;
  status: string;
  blockedReason?: string;
  outputVideoKey?: string;
};

type AuditEvent = {
  eventId: string;
  action: string;
  actor: string;
  timestamp: string;
  reason?: string;
};

type BatchItem = {
  index: number;
  title: string;
  videoId: string;
  url: string;
  status: string;
  reviewGeneration: number;
  ingestStatus?: string;
  assetId?: string;
  renderIntents: RenderIntent[];
  auditTrail: AuditEvent[];
  error?: string;
};

type Batch = {
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
    target: 'cloud' | 'home' | 'local-agent';
    targetAgentId?: string | null;
    outputFormat: string;
    fps: 30 | 60;
    expectedPublishChannelId: string;
  };
  result: {
    status: string;
    summary: Summary;
    items: BatchItem[];
  };
};

type RecentBatch = {
  id: string;
  status: string;
  progress: number;
  createdAt: string;
  playlistTitle: string;
  itemCount: number;
  target: string | null;
  outputFormat: string | null;
  summary: Summary | null;
};

const PRODUCTION_RING = ['SOURCE', 'REMIX', 'CURATE', 'ASSIGN', 'RENDER', 'PACKAGE', 'PUBLISH', 'LEARN'];
const BRAND_RING = ['DESIRE', 'FULFILL', 'APPRECIATE', 'ALLOW', 'NEXT DESIRE'];
const FLAT_OUTPUTS = ['flat-1080p-landscape', 'flat-1080p-portrait', 'flat-4k-landscape'];
const OUTPUT_FORMATS = [...FLAT_OUTPUTS, '360-mono-4k', '360-mono-6k', '360-mono-8k', '360-stereo-8k'];
const PHASE_TWO_RECIPE_ID = 'data/waia-mixer-spike/recipe.json@v1';
const PHASE_TWO_RECIPE_HASH = '70c0a2914da7bfd1643c61b780d2230593952a7e4a317fbbc889ea27d6db2f19';
const PHASE_TWO_SOURCES = [
  {
    assetId: 'voice-as-a-man-thinketh',
    label: 'James Allen · As a Man Thinketh · LibriVox',
    evidence: 'Public-domain recording receipt verified through the Archive.org metadata API.',
  },
  {
    assetId: 'voice-science-of-getting-rich',
    label: 'Wallace Wattles · The Science of Getting Rich · LibriVox',
    evidence: 'Public-domain recording receipt verified through the Archive.org metadata API.',
  },
  {
    assetId: 'bed-calm-pill-1',
    label: 'Alaeddin Hallak · Calm Pill 1 — Still Habitat',
    evidence: 'CC0 music-bed receipt verified through the Archive.org metadata API.',
  },
];

function authHeaders(secret: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${secret}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function Ring({ items, active, label }: { items: string[]; active?: string; label: string }) {
  return (
    <ol aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item, index) => (
        <li
          key={item}
          className={`rounded-full border px-3 py-2 text-center text-[11px] tracking-[0.16em] ${
            item === active
              ? 'border-[#cf9d4f] bg-[#cf9d4f]/15 text-[#f5d99c] shadow-[0_0_24px_rgba(207,157,79,0.18)]'
              : 'border-white/10 bg-white/[0.035] text-[#e6e2d3]/55'
          }`}
        >
          <span className="mr-1 text-[#cf9d4f]/70">{index + 1}</span>{item}
        </li>
      ))}
    </ol>
  );
}

function ReviewCard({
  batch,
  item,
  secret,
  onReviewed,
  announce,
}: {
  batch: Batch;
  item: BatchItem;
  secret: string;
  onReviewed: () => Promise<void>;
  announce: (message: string) => void;
}) {
  const [confirmedSourceIds, setConfirmedSourceIds] = useState<string[]>([]);
  const [mixRecipeId, setMixRecipeId] = useState('');
  const [mixRecipeFingerprint, setMixRecipeFingerprint] = useState('');
  const [experimentId, setExperimentId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const requestIdentity = useRef<{ action: string; key: string } | null>(null);
  const canApprove = item.status === 'pending-review'
    && mixRecipeId.trim()
    && /^[a-f0-9]{64}$/i.test(mixRecipeFingerprint)
    && experimentId.trim()
    && confirmedSourceIds.length === PHASE_TWO_SOURCES.length;

  const idempotencyKeyFor = (action: string) => {
    if (requestIdentity.current?.action === action) return requestIdentity.current.key;
    const key = globalThis.crypto?.randomUUID?.() || `waia-${Date.now()}-${Math.random()}`;
    requestIdentity.current = { action, key };
    return key;
  };

  const review = async (action: 'approve' | 'reject' | 'requeue') => {
    setBusy(true);
    announce(`${action} in progress for ${item.title}`);
    try {
      const common = {
        action,
        idempotencyKey: idempotencyKeyFor(action),
        expectedGeneration: item.reviewGeneration,
      };
      const body = action === 'approve'
        ? {
            ...common,
            sourceRights: confirmedSourceIds.map((assetId) => ({ assetId, confirmed: true })),
            mixRecipeId: mixRecipeId.trim(),
            mixRecipeFingerprint: mixRecipeFingerprint.trim(),
            brandPackVersion: 'waian-circle-v1',
            experimentId: experimentId.trim(),
            outputs: [
              {
                outputFormat: FLAT_OUTPUTS.includes(batch.metadata.outputFormat)
                  ? batch.metadata.outputFormat
                  : 'flat-1080p-landscape',
                fps: batch.metadata.fps,
                engine: 'puppeteer',
                target: batch.metadata.target,
                targetAgentId: batch.metadata.targetAgentId || undefined,
              },
              {
                outputFormat: '360-mono-4k',
                fps: batch.metadata.fps,
                engine: 'unity',
                target: 'home',
              },
            ],
          }
        : { ...common, reason: reason.trim() };
      const response = await fetch(
        `/api/playlist-batches/${batch.id}/items/${item.index}/review`,
        { method: 'POST', headers: authHeaders(secret, true), body: JSON.stringify(body) },
      );
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message || `${action} failed`);
      requestIdentity.current = null;
      await onReviewed();
      announce(`${item.title} ${action} recorded`);
    } catch (error) {
      announce(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const loadPhaseTwoProof = () => {
    setMixRecipeId(PHASE_TWO_RECIPE_ID);
    setMixRecipeFingerprint(PHASE_TWO_RECIPE_HASH);
    setConfirmedSourceIds([]);
    announce('Phase 2 proof recipe loaded. Confirm it belongs to this source before approval.');
  };

  const toggleSource = (assetId: string) => {
    setConfirmedSourceIds((current) => current.includes(assetId)
      ? current.filter((candidate) => candidate !== assetId)
      : [...current, assetId]);
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-[#101522]/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.18em] text-[#cf9d4f]">SOURCE {item.index + 1}</p>
          <h3 className="mt-1 font-serif text-xl text-[#eee9da]">{item.title}</h3>
          <a className="mt-1 block text-xs text-[#9eaddd] underline-offset-4 hover:underline" href={item.url} target="_blank" rel="noreferrer">
            Open source recording
          </a>
        </div>
        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs uppercase tracking-wider text-[#e6e2d3]/70">
          {item.status}
        </span>
      </div>

      {item.assetId && (
        <audio className="mt-4 w-full" controls preload="none" src={`/api/audio/assets/${item.assetId}/stream?variant=original`}>
          Your browser does not support audio playback.
        </audio>
      )}

      {item.status === 'pending-review' && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <fieldset className="space-y-3 rounded-xl border border-white/8 bg-black/15 p-4">
            <legend className="px-1 font-serif text-lg text-[#eee9da]">Exact source receipts</legend>
            <p className="text-xs leading-5 text-[#e6e2d3]/55">These rows come from the stored mix recipe. Approval requires every row exactly once; the browser cannot replace the server manifest.</p>
            {PHASE_TWO_SOURCES.map((source) => (
              <label key={source.assetId} className="flex min-h-12 items-start gap-3 rounded-lg border border-white/8 p-3 text-sm">
                <input type="checkbox" checked={confirmedSourceIds.includes(source.assetId)} onChange={() => toggleSource(source.assetId)} className="mt-1 h-4 w-4" />
                <span><strong className="block font-medium text-[#eee9da]">{source.label}</strong><span className="mt-1 block text-xs leading-5 text-[#e6e2d3]/50">{source.evidence}</span></span>
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-white/8 bg-black/15 p-4">
            <legend className="px-1 font-serif text-lg text-[#eee9da]">Immutable mix recipe</legend>
            <label className="block text-xs text-[#e6e2d3]/65" htmlFor={`recipe-${item.index}`}>Mix recipe ID</label>
            <input id={`recipe-${item.index}`} value={mixRecipeId} onChange={(event) => setMixRecipeId(event.target.value)} className="min-h-10 w-full rounded-lg border border-white/15 bg-[#090c15] px-3 text-sm" placeholder="Recipe artifact and version" />
            <label className="block text-xs text-[#e6e2d3]/65" htmlFor={`hash-${item.index}`}>SHA-256 fingerprint</label>
            <input id={`hash-${item.index}`} value={mixRecipeFingerprint} onChange={(event) => setMixRecipeFingerprint(event.target.value)} className="min-h-10 w-full rounded-lg border border-white/15 bg-[#090c15] px-3 font-mono text-xs" placeholder="64 hexadecimal characters" />
            <label className="block text-xs text-[#e6e2d3]/65" htmlFor={`experiment-${item.index}`}>Experiment ID</label>
            <input id={`experiment-${item.index}`} value={experimentId} onChange={(event) => setExperimentId(event.target.value)} className="min-h-10 w-full rounded-lg border border-white/15 bg-[#090c15] px-3 text-sm" placeholder="What are we learning from this release?" />
            <button type="button" onClick={loadPhaseTwoProof} className="min-h-10 rounded-lg border border-[#4a5a94]/70 px-3 text-xs text-[#b9c5ec] hover:bg-[#4a5a94]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cf9d4f]">
              Load proven Phase 2 recipe
            </button>
          </fieldset>

          <div className="rounded-xl border border-[#cf9d4f]/25 bg-[#cf9d4f]/5 p-4 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.15em] text-[#cf9d4f]">Approval fan-out</p>
            <p className="mt-2 text-sm text-[#e6e2d3]/70">One approval creates two explicit intents: a Puppeteer flat render now, plus a blocked Unity 360° render for Phase 4. It does not publish.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" disabled={busy || !canApprove} onClick={() => review('approve')} className="min-h-11 rounded-full bg-[#cf9d4f] px-5 text-sm font-semibold text-[#171109] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e7bd]">
                Approve recipe + outputs
              </button>
              <input aria-label={`Rejection reason for ${item.title}`} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-11 min-w-64 flex-1 rounded-full border border-white/15 bg-[#090c15] px-4 text-sm" placeholder="Reason required to reject" />
              <button type="button" disabled={busy || !reason.trim()} onClick={() => review('reject')} className="min-h-11 rounded-full border border-white/20 px-5 text-sm text-[#e6e2d3] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cf9d4f]">
                Reject source
              </button>
            </div>
          </div>
        </div>
      )}

      {['rejected', 'approved', 'rendering', 'failed', 'qa-failed'].includes(item.status) && (
        <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-white/8 bg-black/15 p-3">
          <input aria-label={`Requeue reason for ${item.title}`} value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-11 min-w-64 flex-1 rounded-full border border-white/15 bg-[#090c15] px-4 text-sm" placeholder="Why should this return to curation?" />
          <button type="button" disabled={busy || !reason.trim()} onClick={() => review('requeue')} className="min-h-11 rounded-full border border-[#cf9d4f]/50 px-5 text-sm text-[#f0d494] disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cf9d4f]">
            Requeue safely
          </button>
        </div>
      )}

      {item.renderIntents.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {item.renderIntents.map((intent) => (
            <div key={intent.intentId} className="rounded-xl border border-white/8 bg-black/20 p-3 text-xs">
              <div className="flex justify-between gap-2"><span className="uppercase tracking-wider text-[#cf9d4f]">{intent.engine}</span><span>{intent.status}</span></div>
              <p className="mt-1 text-[#e6e2d3]/65">{intent.outputFormat}</p>
              {intent.blockedReason && <p className="mt-2 text-[#9eaddd]">{intent.blockedReason}</p>}
              {intent.outputVideoKey && <p className="mt-2 break-all text-[#e6e2d3]/45">{intent.outputVideoKey}</p>}
            </div>
          ))}
        </div>
      )}

      {item.auditTrail.length > 0 && (
        <details className="mt-4 text-xs text-[#e6e2d3]/60">
          <summary className="min-h-10 cursor-pointer py-2 text-[#b9c5ec]">Audit trail ({item.auditTrail.length})</summary>
          <ol className="space-y-2 border-l border-white/10 pl-4">
            {item.auditTrail.map((event) => <li key={event.eventId}>{event.action} by {event.actor} · {formatDate(event.timestamp)}{event.reason ? ` · ${event.reason}` : ''}</li>)}
          </ol>
        </details>
      )}
      {item.error && <p className="mt-3 text-sm text-red-300">{item.error}</p>}
    </article>
  );
}

export default function PlaylistBatchesPage() {
  const [secret, setSecret] = useState('');
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
  const [message, setMessage] = useState('Studio locked. Enter the operator key to begin.');
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [recent, setRecent] = useState<RecentBatch[]>([]);

  const loadRecent = useCallback(async () => {
    if (!secret) return;
    const response = await fetch('/api/playlist-batches', { headers: authHeaders(secret) });
    const json = await response.json();
    if (!json.success) throw new Error(json.error?.message || 'Unable to open studio');
    setRecent(json.data.batches);
    setMessage('Operator studio unlocked.');
  }, [secret]);

  const loadBatch = useCallback(async (id: string) => {
    if (!secret) return;
    const response = await fetch(`/api/playlist-batches/${id}`, { headers: authHeaders(secret) });
    const json = await response.json();
    if (!json.success) throw new Error(json.error?.message || 'Unable to load batch');
    setBatch(json.data.batch);
    setCurrentBatchId(id);
  }, [secret]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    try { await loadRecent(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to unlock'); }
  };

  useEffect(() => {
    if (!secret || !currentBatchId) return;
    const poll = () => loadBatch(currentBatchId).catch((error) => setMessage(error.message));
    poll();
    const interval = window.setInterval(poll, 5000);
    return () => window.clearInterval(interval);
  }, [currentBatchId, loadBatch, secret]);

  useEffect(() => {
    if (!secret) return;
    const interval = window.setInterval(() => loadRecent().catch(() => {}), 15000);
    return () => window.clearInterval(interval);
  }, [loadRecent, secret]);

  const createBatch = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('Creating SOURCE intake…');
    try {
      const response = await fetch('/api/playlist-batches', {
        method: 'POST',
        headers: authHeaders(secret, true),
        body: JSON.stringify({
          playlistUrl, rightsAttested, outputFormat, fps, target, maxItems, continueOnError,
          targetAgentId: target === 'local-agent' && targetAgentId.trim() ? targetAgentId.trim() : undefined,
          renderSettings: { visualMode },
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message || 'Batch creation failed');
      setCurrentBatchId(json.data.batchId);
      await loadRecent();
      setMessage('Source intake created. The worker will stop every item at CURATE.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Batch creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const retry = async (scope: 'failed' | 'incomplete') => {
    if (!currentBatchId) return;
    const response = await fetch(`/api/playlist-batches/${currentBatchId}/retry`, {
      method: 'POST', headers: authHeaders(secret, true), body: JSON.stringify({ scope }),
    });
    const json = await response.json();
    if (!json.success) return setMessage(json.error?.message || 'Retry failed');
    setCurrentBatchId(json.data.batchId);
    setMessage(`Created a new ${scope} SOURCE intake without bypassing curation.`);
  };

  const cancel = async () => {
    if (!currentBatchId) return;
    await fetch(`/api/playlist-batches/${currentBatchId}`, { method: 'DELETE', headers: authHeaders(secret) });
    await loadBatch(currentBatchId);
    setMessage('Cancellation requested for open child work.');
  };

  const ringStatus = useMemo(() => batch?.result.status || 'locked', [batch]);

  return (
    <main className="min-h-screen bg-[#080b13] text-[#e6e2d3] [background-image:radial-gradient(circle_at_15%_10%,rgba(74,90,148,0.22),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(207,157,79,0.12),transparent_24%)]">
      <header className="border-b border-white/8 bg-[#080b13]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/overlays/WAIANCircle.png" width={64} height={64} alt="What Am I Appreciating Now circular flame mark" priority className="h-14 w-14 object-contain" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#cf9d4f]">Ethereal Flame Studio</p>
              <h1 className="font-serif text-xl text-[#f0ecdf] sm:text-2xl">What Am I Appreciating Now</h1>
            </div>
          </div>
          <nav aria-label="Studio links" className="flex gap-4 text-sm text-[#e6e2d3]/65">
            <Link href="/" className="min-h-10 py-2 hover:text-[#cf9d4f]">Preview</Link>
            <Link href="/batch" className="min-h-10 py-2 hover:text-[#cf9d4f]">Legacy tools</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6">
        <section className="grid gap-5 rounded-3xl border border-white/8 bg-[#0d111d]/85 p-5 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#cf9d4f]">Production ring · CURATE is open</p>
            <h2 className="mt-2 max-w-3xl font-serif text-3xl leading-tight text-[#f2eee2] sm:text-4xl">A calm operating room for moving worthy recordings into living visual experiences.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e6e2d3]/62">This is not an auto-publish machine. Every source rests for rights, taste, recipe, and output approval. Phase 3 can dispatch the flat render; the Unity intent stays visible and blocked until Phase 4 is genuinely wired.</p>
          </div>
          <div className="rounded-2xl border border-[#cf9d4f]/20 bg-black/20 p-4">
            <p className="font-serif text-lg text-[#f0d494]">The audience meaning</p>
            <p className="mt-2 text-sm leading-6 text-[#e6e2d3]/60">Desire becomes fulfillment; fulfillment becomes appreciation; appreciation allows the next desire. The circle grows because it keeps moving.</p>
            <div className="mt-4"><Ring items={BRAND_RING} label="Audience appreciation cycle" /></div>
          </div>
          <div className="lg:col-span-2"><Ring items={PRODUCTION_RING} active="CURATE" label="Eight-stage production ring" /></div>
        </section>

        <form onSubmit={unlock} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/8 bg-[#0d111d]/80 p-4">
          <div className="min-w-64 flex-1">
            <label htmlFor="operator-key" className="mb-1 block text-xs uppercase tracking-wider text-[#e6e2d3]/55">Operator key · held in memory only</label>
            <input id="operator-key" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" className="min-h-11 w-full rounded-full border border-white/15 bg-[#070a11] px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cf9d4f]" />
          </div>
          <button type="submit" disabled={!secret} className="min-h-11 rounded-full bg-[#4a5a94] px-5 font-semibold text-white disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cf9d4f]">Unlock studio</button>
          <p aria-live="polite" className="w-full text-sm text-[#b9c5ec]">{message}</p>
        </form>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-white/8 bg-[#0d111d]/80 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#cf9d4f]">SOURCE intake</p>
              <h2 className="mt-1 font-serif text-2xl">Bring in a playlist</h2>
              <form onSubmit={createBatch} className="mt-5 space-y-4">
                <div><label htmlFor="playlist-url" className="mb-1 block text-xs text-[#e6e2d3]/60">YouTube playlist URL</label><input id="playlist-url" type="url" required value={playlistUrl} onChange={(event) => setPlaylistUrl(event.target.value)} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#070a11] px-3 text-sm" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label htmlFor="target" className="mb-1 block text-xs text-[#e6e2d3]/60">Flat render target</label><select id="target" value={target} onChange={(event) => setTarget(event.target.value as typeof target)} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#070a11] px-3 text-sm"><option value="cloud">Cloud</option><option value="home">Home server</option><option value="local-agent">Local agent</option></select></div>
                  <div><label htmlFor="fps" className="mb-1 block text-xs text-[#e6e2d3]/60">FPS</label><select id="fps" value={fps} onChange={(event) => setFps(Number(event.target.value) as 30 | 60)} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#070a11] px-3 text-sm"><option value="30">30</option><option value="60">60</option></select></div>
                </div>
                {target === 'local-agent' && <div><label htmlFor="agent" className="mb-1 block text-xs text-[#e6e2d3]/60">Agent ID (optional)</label><input id="agent" value={targetAgentId} onChange={(event) => setTargetAgentId(event.target.value)} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#070a11] px-3 text-sm" /></div>}
                <div><label htmlFor="output" className="mb-1 block text-xs text-[#e6e2d3]/60">Preferred output</label><select id="output" value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#070a11] px-3 text-sm">{OUTPUT_FORMATS.map((format) => <option key={format}>{format}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-3"><div><label htmlFor="visual" className="mb-1 block text-xs text-[#e6e2d3]/60">Visual mode</label><select id="visual" value={visualMode} onChange={(event) => setVisualMode(event.target.value as typeof visualMode)} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#070a11] px-3 text-sm"><option value="flame">Flame</option><option value="mist">Mist</option></select></div><div><label htmlFor="max-items" className="mb-1 block text-xs text-[#e6e2d3]/60">Max items</label><input id="max-items" type="number" min="1" max="100" value={maxItems} onChange={(event) => setMaxItems(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} className="min-h-11 w-full rounded-lg border border-white/15 bg-[#070a11] px-3 text-sm" /></div></div>
                <label className="flex min-h-11 items-start gap-3 rounded-lg border border-white/8 p-3 text-sm"><input type="checkbox" checked={rightsAttested} onChange={(event) => setRightsAttested(event.target.checked)} className="mt-1 h-4 w-4" /><span>I attest that I can lawfully use these sources. Each item still needs its own receipt at CURATE.</span></label>
                <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={continueOnError} onChange={(event) => setContinueOnError(event.target.checked)} className="h-4 w-4" />Continue SOURCE intake after an ingest failure</label>
                <button disabled={!secret || !rightsAttested || submitting} className="min-h-12 w-full rounded-full bg-[#cf9d4f] font-semibold text-[#171109] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e7bd]">{submitting ? 'Opening intake…' : 'Open SOURCE intake'}</button>
                <p className="text-xs leading-5 text-[#e6e2d3]/45">No source can render from this form. The worker stops at review.</p>
              </form>
            </section>

            <section className="rounded-2xl border border-white/8 bg-[#0d111d]/80 p-5">
              <h2 className="font-serif text-xl">Recent rings</h2>
              <div className="mt-3 space-y-2">
                {recent.length === 0 && <p className="text-sm text-[#e6e2d3]/45">Unlock the studio to see batches.</p>}
                {recent.map((entry) => <button key={entry.id} onClick={() => setCurrentBatchId(entry.id)} className={`min-h-12 w-full rounded-xl border p-3 text-left ${currentBatchId === entry.id ? 'border-[#cf9d4f]/60 bg-[#cf9d4f]/8' : 'border-white/8 bg-black/15 hover:border-[#4a5a94]'}`}><span className="block truncate font-serif text-lg">{entry.playlistTitle}</span><span className="mt-1 block text-xs text-[#e6e2d3]/45">{entry.itemCount} sources · {entry.status} · {formatDate(entry.createdAt)}</span></button>)}
              </div>
            </section>
          </aside>

          <section className="space-y-5">
            {!batch ? (
              <div className="rounded-3xl border border-dashed border-white/12 p-12 text-center"><p className="font-serif text-2xl text-[#e6e2d3]/70">Select a ring to enter curation.</p></div>
            ) : (
              <>
                <div className="rounded-2xl border border-white/8 bg-[#0d111d]/80 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-[#cf9d4f]">{ringStatus}</p><h2 className="mt-1 font-serif text-3xl">{batch.metadata.playlistTitle}</h2><a href={batch.metadata.playlistUrl} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-[#9eaddd] hover:underline">Open playlist source</a></div><div className="flex flex-wrap gap-2"><button onClick={() => loadBatch(batch.id)} className="min-h-10 rounded-full border border-white/15 px-4 text-sm">Refresh</button><button onClick={() => retry('failed')} disabled={batch.result.summary.failed === 0} className="min-h-10 rounded-full border border-white/15 px-4 text-sm disabled:opacity-30">Retry ingest failures</button><button onClick={cancel} className="min-h-10 rounded-full border border-red-400/30 px-4 text-sm text-red-200">Cancel open work</button></div></div>
                  <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">{[['Review', batch.result.summary.pendingReview], ['Approved', batch.result.summary.approved], ['Active', batch.result.summary.active], ['Blocked', batch.result.summary.blocked], ['Done', batch.result.summary.completed], ['Failed', batch.result.summary.failed]].map(([label, value]) => <div key={label as string} className="rounded-xl bg-black/20 p-3"><span className="block text-[10px] uppercase tracking-wider text-[#e6e2d3]/45">{label}</span><span className="mt-1 block font-serif text-2xl text-[#f0d494]">{value}</span></div>)}</div>
                  <p className="mt-4 text-xs text-[#e6e2d3]/40">Publish target locked to channel {batch.metadata.expectedPublishChannelId}. Phase 6 remains closed.</p>
                </div>
                <div className="space-y-4">{batch.result.items.map((item) => <ReviewCard key={`${item.videoId}-${item.reviewGeneration}`} batch={batch} item={item} secret={secret} onReviewed={() => loadBatch(batch.id)} announce={setMessage} />)}</div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
