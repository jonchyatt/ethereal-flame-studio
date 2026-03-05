/**
 * Verification Engine — maps lesson step verification specs to runtime predicates.
 *
 * Three verification types:
 *   route  → checks window.location.pathname
 *   store  → looks up a registered predicate keyed by the check string
 *   action → checks the tutorialActionBus
 */

import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';
import { useShellStore } from '@/lib/jarvis/stores/shellStore';
import { useChatStore } from '@/lib/jarvis/stores/chatStore';
import { tutorialActionBus } from './tutorialActionBus';

// ── Snapshot context captured when a step begins ─────────────────────────

export interface StepContext {
  startedAt: number;
  completedTaskCount: number;
  completedHabitCount: number;
  paidBillCount: number;
  chatMessageCount: number;
}

/** Capture a snapshot of current state for comparison-based verification. */
export function captureStepContext(): StepContext {
  const { tasks, habits, bills } = usePersonalStore.getState();
  const { messages } = useChatStore.getState();

  return {
    startedAt: Date.now(),
    completedTaskCount: tasks.filter((t) => t.completed).length,
    completedHabitCount: habits.filter((h) => h.completedToday).length,
    paidBillCount: bills.filter((b) => b.status === 'paid').length,
    chatMessageCount: messages.length,
  };
}

// ── Store Verifier Registry ──────────────────────────────────────────────

type Predicate = (ctx: StepContext) => boolean;

/**
 * Maps each unique `check` string from tutorialLessons.ts to a real predicate.
 * Uses snapshot-based comparison so we detect NEW actions, not pre-existing state.
 */
const storeVerifiers: Record<string, Predicate> = {
  // Tasks: a task was toggled to completed AFTER the step started
  'personalStore.tasks.some(t => t.completed && t.justToggled)': (ctx) => {
    const tasks = usePersonalStore.getState().tasks;
    return tasks.filter((t) => t.completed).length > ctx.completedTaskCount;
  },

  // Shell: chat is open
  'shellStore.isChatOpen === true': () => {
    return useShellStore.getState().isChatOpen;
  },

  // Habits: a habit was completed today AFTER step started
  'personalStore.habits.some(h => h.completedToday)': (ctx) => {
    const habits = usePersonalStore.getState().habits;
    return habits.filter((h) => h.completedToday).length > ctx.completedHabitCount;
  },

  // Habits: today stats show habits done
  'personalStore.todayStats.habitsComplete > 0': () => {
    return usePersonalStore.getState().todayStats.habitsDone > 0;
  },

  // Chat: at least 2 messages in chat (for morning briefing)
  'chatStore.messages.length >= 2': () => {
    return useChatStore.getState().messages.length >= 2;
  },
};

// ── Public API ───────────────────────────────────────────────────────────

interface VerificationSpec {
  type: 'route' | 'store' | 'action';
  check: string;
}

/**
 * Evaluate whether a step's verification condition is satisfied.
 * Returns true if the condition passes.
 */
export function evaluateVerification(spec: VerificationSpec, ctx: StepContext): boolean {
  switch (spec.type) {
    case 'route':
      return typeof window !== 'undefined' && window.location.pathname.startsWith(spec.check);

    case 'store': {
      const predicate = storeVerifiers[spec.check];
      if (!predicate) {
        console.warn(`[verificationEngine] Unknown store check: "${spec.check}"`);
        return false;
      }
      return predicate(ctx);
    }

    case 'action':
      return tutorialActionBus.check(spec.check);

    default:
      return false;
  }
}
