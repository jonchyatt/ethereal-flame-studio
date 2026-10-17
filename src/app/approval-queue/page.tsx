'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import type { ApprovalQueueEntry } from '@/lib/playlist-batch/approvalQueue';

const FLAT_OUTPUTS = ['flat-1080p-landscape', 'flat-1080p-portrait', 'flat-4k-landscape'];

function authHeaders(secret: string): HeadersInit {
  return { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
}

function QueueCard({ entry, secret, onDone, announce }: {
  entry: ApprovalQueueEntry;
  secret: string;
  onDone: () => Promise<void>;
  announce: (message: string) => void;
}) {
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [experimentId, setExperimentId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const keys = useRef<Record<string, string>>({});

  // Fail-closed: every server-listed source must be ticked, and the entry must be approvable.
  const canApprove = entry.approvable
    && !!entry.mixRecipeId
    && !!entry.mixRecipeFingerprint
    && experimentId.trim() !== ''
    && entry.sources.length > 0
    && entry.sources.every((source) => confirmed.includes(source.assetId));

  const submit = async (action: 'approve' | 'reject') => {
    setBusy(true);
    try {
      keys.current[action] ||= globalThis.crypto?.randomUUID?.() || `waia-${Date.now()}-${Math.random()}`;
      const common = { action, idempotencyKey: keys.current[action], expectedGeneration: entry.reviewGeneration };
      const body = action === 'approve'
        ? {
            ...common,
            sourceRights: entry.sources.map((source) => ({ assetId: source.assetId, confirmed: true })),
            mixRecipeId: entry.mixRecipeId,
            mixRecipeFingerprint: entry.mixRecipeFingerprint,
            brandPackVersion: 'waian-circle-v1',
            experimentId: experimentId.trim(),
            outputs: [
              {
                outputFormat: FLAT_OUTPUTS.includes(entry.outputFormat) ? entry.outputFormat : 'flat-1080p-landscape',
                fps: entry.fps,
                engine: 'puppeteer',
                target: entry.target,
                targetAgentId: entry.targetAgentId || undefined,
              },
              { outputFormat: '360-mono-4k', fps: entry.fps, engine: 'unity', target: 'home' },
            ],
          }
        : { ...common, reason: reason.trim() };
      const response = await fetch(`/api/playlist-batches/${entry.batchId}/items/${entry.itemIndex}/review`, {
        method: 'POST',
        headers: authHeaders(secret),
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message || `${action} failed`);
      announce(`${entry.title}: ${action} recorded. Nothing was published.`);
      await onDone();
    } catch (error) {
      announce(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-[#101522]/90 p-4">
      <p className="text-[11px] tracking-[0.18em] text-[#cf9d4f]">{entry.playlistTitle}</p>
      <h2 className="mt-1 font-serif text-xl text-[#eee9da]">{entry.title}</h2>
      <a className="text-xs text-[#9eaddd] underline-offset-4 hover:underline" href={entry.url} target="_blank" rel="noreferrer">Open source recording</a>

      {entry.previewUrl
        ? <audio className="mt-3 w-full" controls preload="none" src={entry.previewUrl} />
        : <p className="mt-3 text-sm text-[#e6e2d3]/55">No preview yet.</p>}

      {!entry.approvable && (
        <p role="alert" className="mt-3 rounded-lg border border-red-300/30 p-3 text-sm text-red-200">Blocked: {entry.blockedReason}</p>
      )}

      <div className="mt-4 rounded-xl border border-white/8 bg-black/15 p-3 text-xs">
        <p className="text-[#e6e2d3]/60">Mix recipe <span className="text-[#eee9da]">{entry.mixRecipeId ?? 'none'}</span></p>
        <p className="mt-1 break-all font-mono text-[#e6e2d3]/60">sha256 {entry.mixRecipeFingerprint ?? 'none'}</p>
      </div>

      <fieldset className="mt-4 space-y-2">
        <legend className="text-xs uppercase tracking-wider text-[#e6e2d3]/55">Source rights: tick each after reading its evidence</legend>
        {entry.sources.map((source) => (
          <label key={source.assetId} className="flex min-h-12 items-start gap-3 rounded-lg border border-white/8 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={confirmed.includes(source.assetId)}
              onChange={() => setConfirmed((cur) => cur.includes(source.assetId) ? cur.filter((id) => id !== source.assetId) : [...cur, source.assetId])}
            />
            <span>
              <strong className="block font-medium text-[#eee9da]">{source.attribution || source.assetId} · {source.rightsBasis}</strong>
              <span className="block text-xs text-[#e6e2d3]/50">{source.rightsEvidence}</span>
              <a className="text-xs text-[#9eaddd] underline-offset-4 hover:underline" href={source.sourceUrl} target="_blank" rel="noreferrer">Source page</a>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-3">
        <input aria-label={`Experiment ID for ${entry.title}`} value={experimentId} onChange={(e) => setExperimentId(e.target.value)} placeholder="Experiment ID (what are we learning?)" className="min-h-11 min-w-64 flex-1 rounded-full border border-white/15 bg-[#090c15] px-4 text-sm" />
        <button type="button" disabled={busy || !canApprove} onClick={() => submit('approve')} className="min-h-11 rounded-full bg-[#cf9d4f] px-5 text-sm font-semibold text-[#171109] disabled:cursor-not-allowed disabled:opacity-35">
          Approve for render
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <input aria-label={`Rejection reason for ${entry.title}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason required to reject" className="min-h-11 min-w-64 flex-1 rounded-full border border-white/15 bg-[#090c15] px-4 text-sm" />
        <button type="button" disabled={busy || !reason.trim()} onClick={() => submit('reject')} className="min-h-11 rounded-full border border-white/20 px-5 text-sm disabled:opacity-35">
          Reject
        </button>
      </div>
      <p className="mt-3 text-xs text-[#e6e2d3]/45">Approving queues a render only. Publishing is a separate step and never happens from this screen.</p>
    </article>
  );
}

export default function ApprovalQueuePage() {
  const [secret, setSecret] = useState('');
  const [queue, setQueue] = useState<ApprovalQueueEntry[] | null>(null);
  const [message, setMessage] = useState('Locked. Enter the operator key to load the queue.');

  const load = useCallback(async () => {
    const response = await fetch('/api/playlist-batches/queue', { headers: authHeaders(secret) });
    const json = await response.json();
    if (!json.success) {
      setQueue(null);
      setMessage(json.error?.message || 'Could not load the queue');
      return;
    }
    setQueue(json.data.queue);
    setMessage(`${json.data.queue.length} waiting for your word.`);
  }, [secret]);

  return (
    <main className="min-h-screen bg-[#070a11] px-4 py-8 text-[#e6e2d3]">
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <h1 className="font-serif text-3xl text-[#eee9da]">Approval queue</h1>
          <p className="mt-1 text-sm text-[#e6e2d3]/60">Every item waiting at the curation gate, across all batches. <Link href="/playlist-batches" className="underline">Batch view</Link></p>
        </header>
        <div className="flex flex-wrap gap-3">
          <label htmlFor="queue-key" className="sr-only">Operator key</label>
          <input id="queue-key" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Operator key (kept in memory only)" className="min-h-11 flex-1 rounded-full border border-white/15 bg-[#090c15] px-4 text-sm" />
          <button type="button" onClick={load} disabled={!secret} className="min-h-11 rounded-full border border-[#cf9d4f]/60 px-5 text-sm text-[#f0d494] disabled:opacity-35">Load queue</button>
        </div>
        <p role="status" aria-live="polite" className="text-sm text-[#e6e2d3]/70">{message}</p>
        {queue?.map((entry) => (
          <QueueCard key={`${entry.batchId}-${entry.itemIndex}-${entry.reviewGeneration}`} entry={entry} secret={secret} onDone={load} announce={setMessage} />
        ))}
      </div>
    </main>
  );
}
