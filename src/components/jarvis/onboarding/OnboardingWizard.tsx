'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS, DOMAIN_COLORS } from '@/lib/jarvis/domains';
import { WIDGET_REGISTRY } from '@/lib/jarvis/widgets/registry';
import { useSettingsStore, type NotificationSchedule } from '@/lib/jarvis/stores/settingsStore';
import { useHomeStore } from '@/lib/jarvis/stores/homeStore';
import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';
import { useAcademyStore } from '@/lib/jarvis/stores/academyStore';
import { useChatStore } from '@/lib/jarvis/stores/chatStore';
import { toast } from '@/lib/jarvis/stores/toastStore';
import { DomainIcon } from '@/components/jarvis/home/DomainIcon';
import { Button } from '@/components/jarvis/primitives/Button';
import { Card } from '@/components/jarvis/primitives/Card';
import { Input } from '@/components/jarvis/primitives/Input';
import { Badge } from '@/components/jarvis/primitives/Badge';
import {
  Check,
  ChevronLeft,
  ArrowRight,
  ListTodo,
  Zap,
  DollarSign,
  Target,
  Sun,
  Moon,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;
const MAX_WIDGETS = 4;
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  personal: 'Tasks, habits, bills, calendar, journal, goals, health',
  'ethereal-flame': 'Your creative visual experience',
  'reset-biology': 'Health protocols and biohacking data',
  critfailvlogs: 'Content creation and video planning',
  visopscreen: 'Options trading analysis and screening',
  'satori-living': 'Property and living space management',
  'entity-building': 'Business entities and legal structure',
};

const DATA_SOURCE_INFO: Record<string, { connected: boolean; label: string; hasInput: boolean }> = {
  personal: { connected: true, label: 'Notion Life OS is already connected — 38 databases ready', hasInput: false },
  'ethereal-flame': { connected: true, label: 'Already connected — same codebase', hasInput: false },
  'reset-biology': { connected: false, label: 'Enter your Reset Biology site URL', hasInput: true },
  critfailvlogs: { connected: false, label: 'No data source needed yet — content tools coming soon', hasInput: false },
  visopscreen: { connected: false, label: 'Enter your Visopscreen URL', hasInput: true },
  'satori-living': { connected: false, label: 'Enter your Satori Living site URL', hasInput: true },
  'entity-building': { connected: false, label: 'No data source needed yet', hasInput: false },
};

const DAY_LABELS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'];

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Wizard Selections ─────────────────────────────────────────────────────

interface WizardSelections {
  activeDomains: string[];
  dataSourceUrls: Record<string, string>;
  pinnedWidgets: string[];
  notificationSchedule: NotificationSchedule;
}

const DEFAULT_SELECTIONS: WizardSelections = {
  activeDomains: ['home', 'personal'],
  dataSourceUrls: {},
  pinnedWidgets: ['habit-streak', 'bill-due'],
  notificationSchedule: {
    workDays: [1, 2, 3, 4, 5],
    workStart: '06:00',
    workEnd: '18:00',
    sleepStart: '22:00',
    sleepEnd: '06:00',
  },
};

// ── Component ─────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<WizardSelections>(DEFAULT_SELECTIONS);

  const settingsStore = useSettingsStore;
  const homeStore = useHomeStore;

  // Domains visible in the wizard (exclude 'home' — it's implicit)
  const displayDomains = useMemo(() => DOMAINS.filter((d) => d.id !== 'home'), []);

  // Widgets filtered to active domains
  const availableWidgets = useMemo(
    () => WIDGET_REGISTRY.filter((w) => selections.activeDomains.includes(w.domain)),
    [selections.activeDomains]
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const toggleDomain = (id: string) => {
    if (id === 'personal') return; // locked
    setSelections((prev) => {
      const has = prev.activeDomains.includes(id);
      return {
        ...prev,
        activeDomains: has
          ? prev.activeDomains.filter((d) => d !== id)
          : [...prev.activeDomains, id],
      };
    });
  };

  const setDataSourceUrl = (domainId: string, url: string) => {
    setSelections((prev) => ({
      ...prev,
      dataSourceUrls: { ...prev.dataSourceUrls, [domainId]: url },
    }));
  };

  const toggleWidget = (widgetId: string) => {
    setSelections((prev) => {
      const has = prev.pinnedWidgets.includes(widgetId);
      if (!has && prev.pinnedWidgets.length >= MAX_WIDGETS) {
        toast.info('Remove one widget first — maximum 4 allowed');
        return prev;
      }
      return {
        ...prev,
        pinnedWidgets: has
          ? prev.pinnedWidgets.filter((w) => w !== widgetId)
          : [...prev.pinnedWidgets, widgetId],
      };
    });
  };

  const toggleWorkDay = (day: number) => {
    setSelections((prev) => {
      const has = prev.notificationSchedule.workDays.includes(day);
      return {
        ...prev,
        notificationSchedule: {
          ...prev.notificationSchedule,
          workDays: has
            ? prev.notificationSchedule.workDays.filter((d) => d !== day)
            : [...prev.notificationSchedule.workDays, day].sort((a, b) => a - b),
        },
      };
    });
  };

  const updateSchedule = (field: keyof NotificationSchedule, value: string) => {
    setSelections((prev) => ({
      ...prev,
      notificationSchedule: { ...prev.notificationSchedule, [field]: value },
    }));
  };

  const finishOnboarding = () => {
    // Set Academy active project so Jarvis curriculum is ready on arrival
    useAcademyStore.getState().setActiveProject('jarvis');
    const store = settingsStore.getState();
    // Activate selected domains
    selections.activeDomains.forEach((id) => {
      if (id !== 'home' && id !== 'personal') {
        store.activateDomain(id);
      }
    });
    // Store notification schedule
    store.setNotificationSchedule(selections.notificationSchedule);
    // Store data source URLs
    Object.entries(selections.dataSourceUrls).forEach(([domainId, url]) => {
      if (url.trim()) store.setDataSourceUrl(domainId, url.trim());
    });
    // Sync pinned widgets
    const hStore = homeStore.getState();
    const currentPinned = hStore.pinnedWidgets.map((w) => w.widgetId);
    // Unpin widgets not in selections
    currentPinned.forEach((wId) => {
      if (!selections.pinnedWidgets.includes(wId)) hStore.unpinWidget(wId);
    });
    // Pin new widgets
    selections.pinnedWidgets.forEach((wId) => {
      if (!currentPinned.includes(wId)) hStore.pinWidget(wId);
    });
    // Mark onboarded
    store.setOnboarded();
    router.push('/jarvis/app');
  };

  const startTour = () => {
    finishOnboarding();
    // Open chat with guided tour message — triggers Claude to begin welcome-tour with spotlights
    // Must be AFTER finishOnboarding() so the shell chrome is visible when chat opens
    setTimeout(() => {
      useChatStore.getState().openWithMessage('Start my guided tour of Jarvis');
    }, 500);
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // ── Step Renders ──────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
      {/* Visual */}
      <div className="flex items-center justify-center">
        <div
          className="w-48 h-48 md:w-64 md:h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.3) 0%, rgba(34,211,238,0.05) 60%, transparent 80%)',
            animation: 'onboard-orb-pulse 4s ease-in-out infinite',
          }}
        />
      </div>
      {/* Content */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
        <h1 className="text-3xl font-bold text-white">Welcome to Jarvis</h1>
        <p className="text-lg text-white/60">Your multi-domain operating system</p>
        <p className="text-sm text-white/40 max-w-md">
          Jarvis connects every area of your life into one intelligent dashboard. Let&apos;s get you set up.
        </p>
        <Button size="lg" onClick={next} className="mt-4">
          Get Started <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Choose your domains</h2>
        <p className="text-sm text-white/40 mt-2">
          Each domain connects a different area of your life. You can always add more later from Settings.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayDomains.map((domain) => {
          const isActive = selections.activeDomains.includes(domain.id);
          const isLocked = domain.id === 'personal';
          const colors = DOMAIN_COLORS[domain.color];
          return (
            <button
              key={domain.id}
              onClick={() => toggleDomain(domain.id)}
              disabled={isLocked}
              className={`
                relative bg-black/60 backdrop-blur-md rounded-xl p-4
                border transition-all duration-200
                ${isActive
                  ? `${colors.border} shadow-lg ${colors.shadow}`
                  : 'border-white/10 hover:border-white/20'
                }
                ${isLocked ? '' : 'cursor-pointer'}
                text-left
              `.trim().replace(/\s+/g, ' ')}
              style={isActive && !isLocked ? {
                transform: 'scale(1)',
                transition: `all 200ms ${SPRING}`,
              } : undefined}
            >
              {/* Top row: icon + indicator */}
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${colors?.bgSubtle || 'bg-white/10'}`}>
                  <DomainIcon name={domain.icon} className={`w-5 h-5 ${colors?.text || 'text-white'}`} />
                </div>
                {isLocked ? (
                  <Badge status="success" size="sm">Always on</Badge>
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isActive ? 'bg-cyan-500 border-cyan-500' : 'border-white/20'
                  }`}
                    style={{ transition: `all 200ms ${SPRING}` }}
                  >
                    {isActive && <Check className="w-3 h-3 text-white" />}
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-white">{domain.name}</p>
              <p className="text-xs text-white/40 mt-0.5 line-clamp-2">
                {DOMAIN_DESCRIPTIONS[domain.id] || ''}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const activeDomains = displayDomains.filter((d) => selections.activeDomains.includes(d.id));
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Connect your data</h2>
          <p className="text-sm text-white/40 mt-2">
            Jarvis will pull relevant information from your connected sources.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {activeDomains.map((domain) => {
            const info = DATA_SOURCE_INFO[domain.id];
            if (!info) return null;
            const colors = DOMAIN_COLORS[domain.color];
            return (
              <Card key={domain.id} variant="glass" padding="md">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${colors?.bgSubtle || 'bg-white/10'}`}>
                    <DomainIcon name={domain.icon} className={`w-4 h-4 ${colors?.text || 'text-white'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{domain.name}</p>
                    {info.connected ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="text-xs text-green-400/80">{info.label}</span>
                      </div>
                    ) : info.hasInput ? (
                      <div className="mt-2">
                        <Input
                          size="sm"
                          placeholder={`https://${domain.id.replace('-', '')}.com`}
                          value={selections.dataSourceUrls[domain.id] || ''}
                          onChange={(e) => setDataSourceUrl(domain.id, e.target.value)}
                        />
                        <p className="text-xs text-white/30 mt-1">{info.label}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40 mt-1">{info.label}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Customize your Home screen</h2>
        <p className="text-sm text-white/40 mt-2">
          Pin up to 4 widgets for quick access to what matters most.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {availableWidgets.map((widget) => {
          const isSelected = selections.pinnedWidgets.includes(widget.id);
          const domain = DOMAINS.find((d) => d.id === widget.domain);
          const colors = domain ? DOMAIN_COLORS[domain.color] : null;
          return (
            <button
              key={widget.id}
              onClick={() => toggleWidget(widget.id)}
              className={`
                bg-black/60 backdrop-blur-md rounded-xl p-4
                border transition-all duration-200
                hover:bg-white/[0.08] hover:border-white/20
                text-left
                ${isSelected
                  ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'border-white/10'
                }
              `.trim().replace(/\s+/g, ' ')}
              style={{ transition: `all 200ms ${SPRING}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{widget.name}</span>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-white/20'
                }`}
                  style={{ transition: `all 200ms ${SPRING}` }}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              {domain && (
                <Badge variant="domain" domainColor={domain.color} size="sm">
                  {domain.name}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-white/40">
        {selections.pinnedWidgets.length} of {MAX_WIDGETS} widgets selected
      </p>
    </div>
  );

  const renderStep5 = () => {
    const sched = selections.notificationSchedule;

    // Timeline visualization
    const timeToPercent = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return ((h * 60 + m) / 1440) * 100;
    };
    const workStart = timeToPercent(sched.workStart);
    const workEnd = timeToPercent(sched.workEnd);
    const sleepStart = timeToPercent(sched.sleepStart);
    const sleepEnd = timeToPercent(sched.sleepEnd);

    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">When should Jarvis reach out?</h2>
          <p className="text-sm text-white/40 mt-2">
            Jarvis adapts its behavior based on your schedule.
          </p>
        </div>

        {/* Work days */}
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">When are you at work?</span>
          </div>
          <div className="flex gap-2 mb-4">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleWorkDay(i)}
                className={`
                  w-10 h-10 rounded-lg text-xs font-medium
                  transition-all duration-200
                  ${sched.workDays.includes(i)
                    ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                  }
                `.trim().replace(/\s+/g, ' ')}
                style={{ transition: `all 200ms ${SPRING}` }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">Start</label>
              <select
                value={sched.workStart}
                onChange={(e) => updateSchedule('workStart', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">{formatTime(t)}</option>
                ))}
              </select>
            </div>
            <span className="text-white/30 pt-5">—</span>
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">End</label>
              <select
                value={sched.workEnd}
                onChange={(e) => updateSchedule('workEnd', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">{formatTime(t)}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Sleep schedule */}
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-medium text-white">When do you sleep?</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">Bedtime</label>
              <select
                value={sched.sleepStart}
                onChange={(e) => updateSchedule('sleepStart', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">{formatTime(t)}</option>
                ))}
              </select>
            </div>
            <span className="text-white/30 pt-5">—</span>
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">Wake up</label>
              <select
                value={sched.sleepEnd}
                onChange={(e) => updateSchedule('sleepEnd', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">{formatTime(t)}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Visual timeline */}
        <Card variant="glass" padding="md">
          <p className="text-xs text-white/40 mb-2">Your day at a glance</p>
          <div className="relative h-8 rounded-lg overflow-hidden bg-white/5">
            {/* Sleep zone (wraps around midnight) */}
            <div
              className="absolute top-0 bottom-0 bg-violet-500/20"
              style={{ left: `${sleepStart}%`, right: '0%' }}
            />
            <div
              className="absolute top-0 bottom-0 bg-violet-500/20"
              style={{ left: '0%', width: `${sleepEnd}%` }}
            />
            {/* Work zone */}
            <div
              className="absolute top-0 bottom-0 bg-cyan-500/20"
              style={{ left: `${workStart}%`, width: `${workEnd - workStart}%` }}
            />
            {/* Active zones (gaps) */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/15"
              style={{ left: `${sleepEnd}%`, width: `${workStart - sleepEnd}%` }}
            />
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/15"
              style={{ left: `${workEnd}%`, width: `${sleepStart - workEnd}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-white/30">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>12 AM</span>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500/30" />
              <span className="text-[10px] text-white/40">Focus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20" />
              <span className="text-[10px] text-white/40">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-violet-500/25" />
              <span className="text-[10px] text-white/40">DND</span>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderStep6 = () => (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Here&apos;s what a day with Jarvis looks like</h2>
      </div>

      <Card variant="glass" padding="lg">
        <p className="text-lg font-medium text-white mb-4">
          {getGreeting()}
        </p>
        <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Example briefing</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <ListTodo className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-sm text-white/70">3 tasks due today</span>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm text-white/70">2 habit streaks active</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm text-white/70">$127 in bills due this week</span>
          </div>
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-sm text-white/70">1 goal at 65% progress</span>
          </div>
        </div>
        <p className="text-sm text-white/40 mt-4 italic">
          Your real data will appear once your sources sync.
        </p>
      </Card>

      <Button size="lg" onClick={startTour} className="w-full">
        Start the Guided Tour <ArrowRight className="w-4 h-4 ml-1" />
      </Button>

      <button
        onClick={finishOnboarding}
        className="text-sm text-white/40 hover:text-white/60 transition-colors text-center"
      >
        Skip tour and go to Home →
      </button>
    </div>
  );

  const STEP_RENDERERS = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  // ── Render ────────────────────────────────────────────────────────────

  const showBackButton = step > 0;
  const showContinue = step > 0 && step < TOTAL_STEPS - 1;

  return (
    <>
      <style>{`
        @keyframes onboard-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes onboard-orb-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>

      <div className="min-h-dvh bg-black text-white flex flex-col">
        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-4">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-2.5 h-2.5 bg-cyan-400'
                  : i < step
                    ? 'w-2 h-2 bg-cyan-400/60'
                    : 'w-2 h-2 bg-white/20'
              }`}
              style={{
                transform: i === step ? 'scale(1)' : 'scale(0.85)',
                transition: `all 300ms ${SPRING}`,
              }}
            />
          ))}
        </div>

        {/* Step content with fadeInUp on step change */}
        <div
          key={step}
          className="flex-1 px-5 pb-24"
          style={{ animation: 'onboard-fade-up 300ms ease forwards' }}
        >
          {STEP_RENDERERS[step]()}
        </div>

        {/* Navigation bar (steps 2-5) */}
        {(showBackButton || showContinue) && (
          <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/5 px-5 py-4 flex items-center justify-between safe-area-bottom">
            {showBackButton ? (
              <Button variant="ghost" onClick={back}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : <div />}
            {showContinue && (
              <Button onClick={next}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
