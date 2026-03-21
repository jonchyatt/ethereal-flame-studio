'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, HelpCircle, Loader2, RefreshCw, Shield, ShieldOff, X } from 'lucide-react';
import { NavShell } from '@/components/nav/NavShell';

type AgentRecord = {
  agentId: string;
  label: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
  capabilities: Record<string, unknown>;
  disabled: boolean;
  disabledExpiresAt: string | null;
  disabledMetadata: Record<string, unknown> | null;
};

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatRelative(value: string | null): string {
  if (!value) return 'offline';
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return 'unknown';
  if (ms < 15_000) return 'just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / (60 * 60_000))}h ago`;
}

export default function LocalAgentsPage() {
  const [adminToken, setAdminToken] = useState('');
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAgentId, setSavingAgentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem('localAgentAdminToken');
    if (saved) setAdminToken(saved);
  }, []);

  const saveToken = useCallback((token: string) => {
    setAdminToken(token);
    window.sessionStorage.setItem('localAgentAdminToken', token);
  }, []);

  const fetchAgents = useCallback(async () => {
    if (!adminToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/local-agent/agents', {
        headers: { Authorization: `Bearer ${adminToken.trim()}` },
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || `Failed to load agents (${res.status})`);
      }
      setAgents((json.data?.agents || []) as AgentRecord[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (!autoRefresh || !adminToken.trim()) return;
    fetchAgents().catch(() => {});
    const t = setInterval(() => {
      fetchAgents().catch(() => {});
    }, 15_000);
    return () => clearInterval(t);
  }, [autoRefresh, adminToken, fetchAgents]);

  const updateDisabled = useCallback(async (agentId: string, disabled: boolean) => {
    if (!adminToken.trim()) {
      setError('Enter an admin token first');
      return;
    }
    setSavingAgentId(agentId);
    setError(null);
    try {
      const res = await fetch(`/api/local-agent/agents/${encodeURIComponent(agentId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disabled,
          reason: disabled ? (disableReason.trim() || undefined) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || `Failed to update agent (${res.status})`);
      }
      await fetchAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
    } finally {
      setSavingAgentId(null);
    }
  }, [adminToken, disableReason, fetchAgents]);

  const summary = useMemo(() => {
    const online = agents.filter((a) => a.expiresAt && new Date(a.expiresAt).getTime() > Date.now()).length;
    const disabled = agents.filter((a) => a.disabled).length;
    return { total: agents.length, online, disabled };
  }, [agents]);

  return (
    <NavShell>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Local Agents</h1>
            <p className="text-sm text-zinc-400">
              Manage registered render agents, monitor heartbeats, and disable machines.
            </p>
          </div>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`
              mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all flex-shrink-0
              ${showGuide
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/8 hover:text-zinc-300'
              }
            `}
          >
            {showGuide ? <X className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
            {showGuide ? 'Close Guide' : 'How It Works'}
          </button>
        </div>

        {showGuide && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 space-y-6 text-sm text-zinc-300">
            {/* Overview */}
            <div>
              <h2 className="text-base font-medium text-white mb-2">What Are Local Agents?</h2>
              <p className="leading-relaxed">
                Local Agents are render workers that run on your own machines (your PC, a spare laptop, a GPU server).
                When you submit a render job from the <span className="text-white font-medium">Create Video</span> or{' '}
                <span className="text-white font-medium">Batch</span> page, the job can be routed to one of these agents instead
                of cloud rendering. The agent downloads the audio, renders the video locally using Puppeteer + FFmpeg (or Blender),
                then uploads the finished file back to cloud storage (R2).
              </p>
            </div>

            {/* Why use them */}
            <div>
              <h2 className="text-base font-medium text-white mb-2">Why Use Local Agents?</h2>
              <ul className="space-y-1.5 list-none">
                <li className="flex gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>
                  <span><span className="text-white font-medium">Free GPU power</span> — use your own hardware instead of paying for cloud compute</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>
                  <span><span className="text-white font-medium">Faster for heavy renders</span> — 4K, 8K VR, and Blender Cycles renders benefit from a dedicated GPU</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>
                  <span><span className="text-white font-medium">Overnight batch rendering</span> — leave your machine running, jobs get picked up automatically</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span>
                  <span><span className="text-white font-medium">Scale horizontally</span> — register multiple machines and they share the workload</span>
                </li>
              </ul>
            </div>

            {/* How it works */}
            <div>
              <h2 className="text-base font-medium text-white mb-2">How It Works</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <div className="text-white font-medium">Start the agent script on your machine</div>
                    <code className="block mt-1 text-xs bg-black/40 rounded-lg px-3 py-2 text-zinc-400 overflow-x-auto">
                      npx tsx scripts/local-render-agent.ts --server https://www.whatamiappreciatingnow.com --token YOUR_SECRET
                    </code>
                    <p className="mt-1 text-zinc-500 text-xs">
                      The script auto-generates an agent ID, reports system capabilities (OS, CPU, hostname), and starts polling for jobs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <div className="text-white font-medium">Agent registers and sends heartbeats</div>
                    <p className="text-zinc-400">
                      On startup, the agent calls <code className="text-zinc-300 bg-black/30 px-1 rounded">/api/local-agent/register</code> with its ID and capabilities.
                      Every 5 seconds it polls <code className="text-zinc-300 bg-black/30 px-1 rounded">/api/local-agent/poll</code> — this doubles as a heartbeat and a job check.
                      If an agent misses heartbeats, its presence lease expires and it shows as Offline here.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <div className="text-white font-medium">Jobs get dispatched automatically</div>
                    <p className="text-zinc-400">
                      When you submit a render with <span className="text-zinc-300">Local Agent</span> as the target, the job enters a queue.
                      The next agent that polls picks it up, acquires a lease (preventing other agents from claiming it), downloads the audio via a signed URL,
                      and begins rendering.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                  <div>
                    <div className="text-white font-medium">Agent renders and uploads</div>
                    <p className="text-zinc-400">
                      The agent runs the render pipeline locally (Puppeteer captures the Three.js canvas frame-by-frame, FFmpeg encodes to video).
                      During rendering, it renews its job lease to prevent timeout. Once finished, it uploads the video to R2 storage via multipart upload
                      and reports completion.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</div>
                  <div>
                    <div className="text-white font-medium">Job marked complete</div>
                    <p className="text-zinc-400">
                      The server updates the job status. Notifications fire (ntfy push, webhook). The finished video is available for download from cloud storage
                      and can be synced to Google Drive.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* This page specifically */}
            <div>
              <h2 className="text-base font-medium text-white mb-2">What This Page Does</h2>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-zinc-500 mt-px flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                  </span>
                  <span>
                    <span className="text-white font-medium">Admin Token</span> — authenticates you as the admin. This is your{' '}
                    <code className="text-zinc-300 bg-black/30 px-1 rounded">LOCAL_AGENT_ADMIN_SECRET</code> environment variable (or the shared secret fallback).
                    Stored in sessionStorage so you don't have to re-enter it per tab.
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-500 mt-px flex-shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </span>
                  <span>
                    <span className="text-white font-medium">Agent List</span> — shows all agents that have ever registered. Each card displays the agent ID, label,
                    online/offline status (based on heartbeat recency), platform, architecture, hostname, and last seen time.
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-500 mt-px flex-shrink-0">
                    <ShieldOff className="w-4 h-4" />
                  </span>
                  <span>
                    <span className="text-white font-medium">Disable/Enable</span> — temporarily block an agent from receiving new jobs. Useful during maintenance,
                    GPU driver updates, or if a machine is rendering poorly. Disabled agents still heartbeat but the server refuses to dispatch jobs to them.
                    You can optionally provide a reason (e.g. &quot;unstable GPU driver&quot;) that shows on the agent card.
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-500 mt-px flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </span>
                  <span>
                    <span className="text-white font-medium">Auto-refresh</span> — when enabled, the agent list polls every 15 seconds so you can watch agents come online/offline in real time.
                  </span>
                </div>
              </div>
            </div>

            {/* Quick reference */}
            <div className="border-t border-blue-500/10 pt-4">
              <h2 className="text-base font-medium text-white mb-2">Quick Reference</h2>
              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div className="rounded-lg bg-black/20 border border-white/5 p-3">
                  <div className="text-zinc-500 mb-1">Start an agent</div>
                  <code className="text-zinc-300">npx tsx scripts/local-render-agent.ts -s URL -t TOKEN</code>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 p-3">
                  <div className="text-zinc-500 mb-1">Custom agent ID</div>
                  <code className="text-zinc-300">--agent-id my-gpu-rig --label &quot;RTX 4090 Desktop&quot;</code>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 p-3">
                  <div className="text-zinc-500 mb-1">Poll interval</div>
                  <code className="text-zinc-300">--poll-ms 3000</code> <span className="text-zinc-500">(default 5000ms)</span>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 p-3">
                  <div className="text-zinc-500 mb-1">Required env vars</div>
                  <code className="text-zinc-300">LOCAL_AGENT_SECRET</code> <span className="text-zinc-500">(auth token)</span>
                </div>
              </div>
            </div>

            {/* API endpoints */}
            <div className="border-t border-blue-500/10 pt-4">
              <h2 className="text-base font-medium text-white mb-2">API Endpoints (for debugging)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-500 border-b border-white/5">
                      <th className="text-left py-1.5 pr-3 font-medium">Method</th>
                      <th className="text-left py-1.5 pr-3 font-medium">Endpoint</th>
                      <th className="text-left py-1.5 font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-400">
                    <tr className="border-b border-white/3"><td className="py-1.5 pr-3 text-emerald-400">POST</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/register</td><td className="py-1.5">Agent registers with ID, label, capabilities</td></tr>
                    <tr className="border-b border-white/3"><td className="py-1.5 pr-3 text-emerald-400">POST</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/poll</td><td className="py-1.5">Heartbeat + check for available jobs</td></tr>
                    <tr className="border-b border-white/3"><td className="py-1.5 pr-3 text-blue-400">POST</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/heartbeat</td><td className="py-1.5">Keep-alive without polling for jobs</td></tr>
                    <tr className="border-b border-white/3"><td className="py-1.5 pr-3 text-blue-400">GET</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/agents</td><td className="py-1.5">List all registered agents (admin)</td></tr>
                    <tr className="border-b border-white/3"><td className="py-1.5 pr-3 text-amber-400">PATCH</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/agents/:id</td><td className="py-1.5">Enable/disable an agent (admin)</td></tr>
                    <tr className="border-b border-white/3"><td className="py-1.5 pr-3 text-emerald-400">POST</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/jobs/:id/renew</td><td className="py-1.5">Renew job lease during render</td></tr>
                    <tr className="border-b border-white/3"><td className="py-1.5 pr-3 text-emerald-400">POST</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/jobs/:id/complete</td><td className="py-1.5">Mark job as finished</td></tr>
                    <tr><td className="py-1.5 pr-3 text-red-400">POST</td><td className="py-1.5 pr-3 font-mono text-zinc-300">/api/local-agent/jobs/:id/fail</td><td className="py-1.5">Report job failure</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            <label className="block">
              <div className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Admin Token</div>
              <input
                type="password"
                value={adminToken}
                onChange={(e) => saveToken(e.target.value)}
                placeholder="LOCAL_AGENT_ADMIN_SECRET (or shared secret fallback)"
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-500"
              />
            </label>
            <button
              onClick={() => fetchAgents()}
              disabled={!adminToken.trim() || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/30"
              />
              Auto-refresh
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block">
              <div className="mb-1 text-xs uppercase tracking-wide text-neutral-400">Disable Reason (Optional)</div>
              <input
                type="text"
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="Maintenance, unstable GPU driver, etc."
                className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-500"
              />
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs text-neutral-300">
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-neutral-500">Total</div>
                <div className="text-base font-semibold text-white">{summary.total}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-neutral-500">Online</div>
                <div className="text-base font-semibold text-emerald-300">{summary.online}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-neutral-500">Disabled</div>
                <div className="text-base font-semibold text-amber-300">{summary.disabled}</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {agents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-neutral-400">
              {adminToken.trim() ? 'No agents found yet. Start a local agent and click Refresh.' : 'Enter an admin token to load agents.'}
            </div>
          ) : (
            agents.map((agent) => {
              const online = !!agent.expiresAt && new Date(agent.expiresAt).getTime() > Date.now();
              const caps = agent.capabilities || {};
              const platform = typeof caps.platform === 'string' ? caps.platform : null;
              const arch = typeof caps.arch === 'string' ? caps.arch : null;
              const hostname = typeof caps.hostname === 'string' ? caps.hostname : null;
              const disabledReasonValue = agent.disabledMetadata && typeof agent.disabledMetadata.reason === 'string'
                ? agent.disabledMetadata.reason
                : null;

              return (
                <div key={agent.agentId} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold text-white">{agent.label || agent.agentId}</div>
                        <code className="rounded bg-black/30 px-2 py-0.5 text-xs text-neutral-300">{agent.agentId}</code>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            online ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-700/40 text-neutral-300'
                          }`}
                        >
                          {online ? `Online (${formatRelative(agent.lastSeenAt)})` : 'Offline'}
                        </span>
                        {agent.disabled && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                            Disabled
                          </span>
                        )}
                      </div>

                      <div className="grid gap-1 text-xs text-neutral-400 sm:grid-cols-2">
                        <div>Last seen: <span className="text-neutral-200">{formatDate(agent.lastSeenAt)}</span></div>
                        <div>Presence lease expires: <span className="text-neutral-200">{formatDate(agent.expiresAt)}</span></div>
                        <div>Platform: <span className="text-neutral-200">{platform || 'unknown'}</span></div>
                        <div>Arch: <span className="text-neutral-200">{arch || 'unknown'}</span></div>
                        <div className="sm:col-span-2">Hostname: <span className="text-neutral-200">{hostname || 'unknown'}</span></div>
                        {agent.disabled && (
                          <div className="sm:col-span-2">
                            Disable reason: <span className="text-amber-100">{disabledReasonValue || 'none provided'}</span>
                          </div>
                        )}
                      </div>

                      <details className="rounded-lg border border-white/10 bg-black/20 p-2">
                        <summary className="cursor-pointer text-xs text-neutral-300">Capabilities JSON</summary>
                        <pre className="mt-2 overflow-x-auto text-xs text-neutral-400">
                          {JSON.stringify(agent.capabilities || {}, null, 2)}
                        </pre>
                      </details>
                    </div>

                    <div className="flex gap-2">
                      {agent.disabled ? (
                        <button
                          onClick={() => updateDisabled(agent.agentId, false)}
                          disabled={savingAgentId === agent.agentId || !adminToken.trim()}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                        >
                          {savingAgentId === agent.agentId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          Enable
                        </button>
                      ) : (
                        <button
                          onClick={() => updateDisabled(agent.agentId, true)}
                          disabled={savingAgentId === agent.agentId || !adminToken.trim()}
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 disabled:opacity-50"
                        >
                          {savingAgentId === agent.agentId ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                          Disable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </NavShell>
  );
}
