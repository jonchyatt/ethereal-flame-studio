'use client';

import { useEffect } from 'react';
import { getScheduler, destroyScheduler } from '@/lib/jarvis/executive/Scheduler';
import { refetchJarvisData } from '@/lib/jarvis/hooks/useJarvisFetch';
import { toast } from '@/lib/jarvis/stores/toastStore';
import { useChatStore } from '@/lib/jarvis/stores/chatStore';
import { useSettingsStore } from '@/lib/jarvis/stores/settingsStore';
import { useHomeStore } from '@/lib/jarvis/stores/homeStore';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';
import type { ScheduledEvent } from '@/lib/jarvis/executive/types';

// ── Event config: labels + contextual chat prompts ─────────────────────────

const EVENT_CONFIG: Record<string, { label: string; chatPrompt: string }> = {
  morning_briefing: {
    label: 'Morning Briefing',
    chatPrompt: 'Walk me through my morning briefing',
  },
  midday_checkin: {
    label: 'Midday Check-in',
    chatPrompt: "How's my day going? Walk me through my progress",
  },
  evening_checkin: {
    label: 'Evening Check-in',
    chatPrompt: 'Help me review my day and plan tomorrow',
  },
  evening_wrap: {
    label: 'Evening Wrap',
    chatPrompt: "Let's do my evening wrap — what got done and what's tomorrow?",
  },
  weekly_review_reminder: {
    label: 'Weekly Review',
    chatPrompt: 'Time for my weekly review — walk me through it',
  },
};

// ── Notification mode gate ─────────────────────────────────────────────────

function shouldNotify(mode: string, eventType: string): boolean {
  if (mode === 'dnd') return false;
  if (mode === 'review') return false;
  if (mode === 'focus') return eventType === 'morning_briefing';
  return true; // 'active' — all events
}

// ── Data-driven message builder ────────────────────────────────────────────

function buildEventMessage(eventType: string): string {
  const priorities = useHomeStore.getState().priorityItems;
  const tasks = usePersonalStore.getState().tasks;

  if (eventType === 'morning_briefing') {
    const overdue = priorities.filter((i) => i.urgency === 'critical').length;
    const todayTasks = tasks.filter((t) => !t.completed && !t.overdue).length;
    const bills = priorities.filter((i) => i.id.startsWith('bill-')).length;
    const parts: string[] = [];
    if (todayTasks > 0) parts.push(`${todayTasks} task${todayTasks !== 1 ? 's' : ''} today`);
    if (overdue > 0) parts.push(`${overdue} overdue`);
    if (bills > 0) parts.push(`${bills} bill${bills !== 1 ? 's' : ''} due`);
    return parts.length > 0
      ? `Good morning — ${parts.join(', ')}`
      : 'Good morning — clear day ahead';
  }

  if (eventType === 'midday_checkin') {
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    if (total === 0) return 'Midday — no tasks tracked today';
    const pct = Math.round((completed / total) * 100);
    if (pct >= 80) return `Midday — ${completed}/${total} done, crushing it`;
    if (pct <= 20 && total > 3) return `Midday — ${completed}/${total} done. Focus on the critical ones`;
    return `Midday — ${completed} of ${total} tasks done`;
  }

  if (eventType === 'evening_checkin') {
    return 'Evening — time to review your day';
  }

  if (eventType === 'evening_wrap') {
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    return total > 0
      ? `Evening wrap — ${completed}/${total} tasks completed today`
      : 'Evening wrap — ready for tomorrow?';
  }

  const config = EVENT_CONFIG[eventType];
  return config?.label ?? eventType.replace(/_/g, ' ');
}

// ── Chat action builder ────────────────────────────────────────────────────

function openChat(eventType: string): void {
  const config = EVENT_CONFIG[eventType];
  if (config) {
    useChatStore.getState().openWithMessage(config.chatPrompt);
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useExecutiveBridge(): void {
  useEffect(() => {
    destroyScheduler(); // singleton safety on hot reload

    const handleTrigger = async (event: ScheduledEvent) => {
      // Always refresh data — mode only gates the toast, not the fetch
      await refetchJarvisData(true).catch(() => {});

      const mode = useSettingsStore.getState().notificationMode;
      if (!shouldNotify(mode, event.type)) return;

      const message = buildEventMessage(event.type);
      toast.info(message, {
        duration: 10000,
        action: { label: 'Chat', onClick: () => openChat(event.type) },
      });
    };

    const handleMissed = async (event: ScheduledEvent) => {
      await refetchJarvisData(true).catch(() => {});

      const mode = useSettingsStore.getState().notificationMode;
      if (!shouldNotify(mode, event.type)) return;

      const config = EVENT_CONFIG[event.type];
      const label = config?.label ?? event.type;
      toast.warning(`Missed: ${label}`, {
        duration: 8000,
        action: { label: 'Chat', onClick: () => openChat(event.type) },
      });
    };

    const scheduler = getScheduler(handleTrigger, handleMissed);
    scheduler.start();

    return () => {
      destroyScheduler();
    };
  }, []);
}
