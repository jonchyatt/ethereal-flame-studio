'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Shield, ShieldOff } from 'lucide-react';

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Local Agents</h1>
          <p className="text-sm text-neutral-400">
            Manage registered render agents, monitor heartbeats, and disable machines from receiving new jobs.
          </p>
        </div>

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
    </div>
  );
}
