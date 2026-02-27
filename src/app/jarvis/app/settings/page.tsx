'use client';

import { useState, useEffect, useCallback } from 'react';
import { ContentContainer } from '@/components/jarvis/layout';
import { Card, Toggle, Badge, Skeleton } from '@/components/jarvis/primitives';
import { DomainIcon } from '@/components/jarvis/home/DomainIcon';
import { DOMAINS, DOMAIN_COLORS } from '@/lib/jarvis/domains';
import {
  useSettingsStore,
  type NotificationMode,
} from '@/lib/jarvis/stores/settingsStore';
import {
  Shield,
  Bell,
  BellOff,
  Eye,
  Mic,
  Maximize2,
  Brain,
  Activity,
  RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Notification Modes ─────────────────────────────────────────────────────

interface ModeOption {
  id: NotificationMode;
  label: string;
  description: string;
  icon: LucideIcon;
}

const NOTIFICATION_MODES: ModeOption[] = [
  { id: 'focus', label: 'Focus', description: 'Hospital hours — critical only', icon: Shield },
  { id: 'active', label: 'Active', description: 'Available — critical + important', icon: Bell },
  { id: 'review', label: 'Review', description: 'Dedicated time — everything', icon: Eye },
  { id: 'dnd', label: 'DND', description: 'Do not disturb — nothing', icon: BellOff },
];

// ── Feature Toggles ────────────────────────────────────────────────────────

interface FeatureOption {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const FEATURES: FeatureOption[] = [
  { key: 'voiceEnabled', label: 'Voice Input', description: 'Enable voice commands and transcription', icon: Mic },
  { key: 'orbFullscreen', label: 'Full-Screen Orb', description: 'Show the orb in full-screen mode', icon: Maximize2 },
  { key: 'selfImprovement', label: 'Self-Improvement', description: 'Let Jarvis learn and evolve from conversations', icon: Brain },
];

// ── Protected Domains ──────────────────────────────────────────────────────

const ALWAYS_ON = ['home', 'personal'];

// ── Brain Health Section ──────────────────────────────────────────────────

interface HealthData {
  db: { connected: boolean };
  brain: {
    lastEvaluation: string | null;
    evaluationCount: number;
    activeRules: number;
    lastReflection: string | null;
    lastMetaEval: { timestamp: string } | null;
  } | null;
  memory: {
    totalEntries: number;
    embeddingCount: number;
    vectorCoverage: number;
  } | null;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function BrainHealthSection() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/jarvis/health');
      if (!res.ok) throw new Error('fetch failed');
      setHealth(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  if (loading) {
    return (
      <Card variant="glass" padding="md">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-44" />
        </div>
      </Card>
    );
  }

  if (error || !health) {
    return (
      <Card variant="glass" padding="md">
        <div className="text-center text-white/40 text-sm py-2">
          Could not load brain health
        </div>
      </Card>
    );
  }

  const brainStatus = !health.db.connected
    ? 'Error'
    : health.brain && health.brain.evaluationCount > 0
      ? 'Active'
      : 'Dormant';

  const badgeStatus = brainStatus === 'Active'
    ? 'success' as const
    : brainStatus === 'Dormant'
      ? 'inactive' as const
      : 'critical' as const;

  return (
    <Card variant="glass" padding="md">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <Badge status={badgeStatus}>{brainStatus}</Badge>
          </div>
          <button
            onClick={fetchHealth}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Now
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="text-white/40">Last Reflection</div>
          <div className="text-white/70 text-right">{formatRelativeTime(health.brain?.lastReflection ?? null)}</div>

          <div className="text-white/40">Active Rules</div>
          <div className="text-white/70 text-right">{health.brain?.activeRules ?? 0}</div>

          <div className="text-white/40">Evaluations</div>
          <div className="text-white/70 text-right">
            {health.brain?.evaluationCount ?? 0}
            {health.brain?.lastEvaluation && (
              <span className="text-white/30 ml-1">({formatRelativeTime(health.brain.lastEvaluation)})</span>
            )}
          </div>

          {health.brain?.lastMetaEval && (
            <>
              <div className="text-white/40">Meta-Eval</div>
              <div className="text-white/70 text-right">{formatRelativeTime(health.brain.lastMetaEval.timestamp)}</div>
            </>
          )}

          <div className="text-white/40">Memories</div>
          <div className="text-white/70 text-right">{health.memory?.totalEntries ?? 0}</div>

          <div className="text-white/40">Vector Coverage</div>
          <div className="text-white/70 text-right">{health.memory?.vectorCoverage ?? 0}%</div>
        </div>
      </div>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const activeDomainIds = useSettingsStore((s) => s.activeDomainIds);
  const activateDomain = useSettingsStore((s) => s.activateDomain);
  const deactivateDomain = useSettingsStore((s) => s.deactivateDomain);
  const notificationMode = useSettingsStore((s) => s.notificationMode);
  const setNotificationMode = useSettingsStore((s) => s.setNotificationMode);
  const featureToggles = useSettingsStore((s) => s.featureToggles);
  const setFeatureToggle = useSettingsStore((s) => s.setFeatureToggle);

  const handleDomainToggle = (domainId: string, isActive: boolean) => {
    if (isActive) {
      deactivateDomain(domainId);
    } else {
      activateDomain(domainId);
    }
  };

  return (
    <ContentContainer>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white/90">Settings</h1>
          <p className="text-sm text-white/60 mt-1">Configure your Jarvis experience</p>
        </div>

        {/* Section 1: Domains */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-1">Domains</h2>
          <p className="text-xs text-white/30 mb-3">Activate domains to see them in your rail and home</p>
          <Card variant="glass" padding="none">
            <div className="divide-y divide-white/5">
              {DOMAINS.filter((d) => d.id !== 'home').map((domain) => {
                const isActive = activeDomainIds.includes(domain.id);
                const isProtected = ALWAYS_ON.includes(domain.id);
                const colors = DOMAIN_COLORS[domain.color];

                return (
                  <div
                    key={domain.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className={colors?.text ?? 'text-white/60'}>
                      <DomainIcon name={domain.icon} className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/80">{domain.name}</span>
                      {isProtected && (
                        <span className="ml-2 text-[10px] text-white/30">(always on)</span>
                      )}
                    </div>
                    <Toggle
                      checked={isActive}
                      onChange={() => handleDomainToggle(domain.id, isActive)}
                      disabled={isProtected}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Section 2: Notification Mode */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Notification Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {NOTIFICATION_MODES.map((mode) => {
              const isSelected = notificationMode === mode.id;
              const Icon = mode.icon;

              return (
                <button
                  key={mode.id}
                  onClick={() => setNotificationMode(mode.id)}
                  className={`
                    text-left rounded-2xl p-4 border transition-colors
                    ${isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 ring-2 ring-cyan-500/20'
                      : 'bg-black/60 backdrop-blur-md border-white/10 hover:border-white/20'
                    }
                  `.trim().replace(/\s+/g, ' ')}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-cyan-400' : 'text-white/50'}`} />
                  <div className={`text-sm font-medium ${isSelected ? 'text-cyan-300' : 'text-white/80'}`}>
                    {mode.label}
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5 leading-tight">
                    {mode.description}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Features */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Features</h2>
          <Card variant="glass" padding="none">
            <div className="divide-y divide-white/5">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                const isEnabled = featureToggles[feature.key] ?? false;

                return (
                  <div
                    key={feature.key}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Icon className="w-5 h-5 text-white/40 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/80">{feature.label}</div>
                      <div className="text-[11px] text-white/40 leading-tight">{feature.description}</div>
                    </div>
                    <Toggle
                      checked={isEnabled}
                      onChange={(v) => setFeatureToggle(feature.key, v)}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Section 4: Brain Health */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Brain Health</h2>
          <BrainHealthSection />
        </section>

        {/* Section 5: About */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">About</h2>
          <Card variant="glass" padding="md">
            <div className="text-center space-y-1">
              <div className="text-lg font-semibold text-white/90">Jarvis v4.0</div>
              <div className="text-sm text-white/60">Brain Swap & Personal Domain</div>
              <div className="text-xs text-white/30 pt-2">Built with love between patients</div>
            </div>
          </Card>
        </section>
      </div>
    </ContentContainer>
  );
}
