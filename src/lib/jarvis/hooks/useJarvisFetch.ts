'use client';

import { useEffect, useRef } from 'react';
import { fetchBriefingData } from '@/lib/jarvis/executive/BriefingClient';
import { useHomeStore } from '@/lib/jarvis/stores/homeStore';
import { usePersonalStore } from '@/lib/jarvis/stores/personalStore';
import type { BriefingData } from '@/lib/jarvis/executive/types';
import type { PriorityItem, DomainHealthItem, HealthStatus } from '@/lib/jarvis/stores/homeStore';
import type { PersonalTask, PersonalHabit, PersonalBill, PersonalGoal, PersonalMeal } from '@/lib/jarvis/stores/personalStore';
import type { CalendarEvent as StoreCalendarEvent } from '@/lib/jarvis/stores/personalStore';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ── Transform: BriefingData → Home Store ──────────────────────────────────

function transformPriorities(data: BriefingData): PriorityItem[] {
  const items: PriorityItem[] = [];

  for (const task of data.tasks.overdue) {
    items.push({
      id: `task-overdue-${task.id}`,
      domainId: 'personal',
      title: task.title,
      subtitle: task.dueDate ? `Due ${task.dueDate}` : null,
      urgency: 'critical',
      urgencyScore: 100,
      quickActionLabel: 'View',
    });
  }

  for (const task of data.tasks.today) {
    items.push({
      id: `task-today-${task.id}`,
      domainId: 'personal',
      title: task.title,
      subtitle: task.priority ? `${task.priority} priority` : null,
      urgency: 'warning',
      urgencyScore: 80,
      quickActionLabel: 'View',
    });
  }

  for (const bill of data.bills.thisWeek) {
    items.push({
      id: `bill-${bill.id}`,
      domainId: 'personal',
      title: bill.title,
      subtitle: `$${bill.amount.toFixed(2)}`,
      urgency: 'warning',
      urgencyScore: 70,
      quickActionLabel: null,
    });
  }

  for (const event of data.calendar.today) {
    items.push({
      id: `cal-${event.id}`,
      domainId: 'personal',
      title: event.title,
      subtitle: event.time,
      urgency: 'info',
      urgencyScore: 20,
      quickActionLabel: null,
    });
  }

  return items.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

function transformDomainHealth(data: BriefingData): DomainHealthItem[] {
  const overdueCount = data.tasks.overdue.length;
  const todayCount = data.tasks.today.length;
  const status: HealthStatus =
    overdueCount > 0 ? 'red' : todayCount > 5 ? 'amber' : 'green';

  return [
    {
      domainId: 'personal',
      status,
      metric: `${todayCount + overdueCount} tasks`,
      summary: `${overdueCount} overdue, ${data.habits.active.length} habits`,
    },
  ];
}

function transformBriefingSummary(data: BriefingData): string {
  const parts: string[] = [];
  const taskCount = data.tasks.today.length;
  const overdueCount = data.tasks.overdue.length;

  if (taskCount > 0 || overdueCount > 0) {
    parts.push(
      `${taskCount} task${taskCount !== 1 ? 's' : ''} today${overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}`,
    );
  }

  if (data.bills.thisWeek.length > 0) {
    parts.push(
      `${data.bills.thisWeek.length} bill${data.bills.thisWeek.length !== 1 ? 's' : ''} due ($${data.bills.total.toFixed(0)})`,
    );
  }

  if (data.habits.active.length > 0) {
    parts.push(`${data.habits.active.length} habits tracked`);
  }

  if (data.goals.active.length > 0) {
    parts.push(`${data.goals.active.length} active goals`);
  }

  if (data.meals) {
    const todayMeals = data.meals.today;
    if (todayMeals.length === 1) {
      const m = todayMeals[0];
      const label = m.timeOfDay ? `${m.title} for ${m.timeOfDay.toLowerCase()}` : m.title;
      parts.push(label);
    } else if (todayMeals.length === 2) {
      const labels = todayMeals.map(m =>
        m.timeOfDay ? `${m.title} for ${m.timeOfDay.toLowerCase()}` : m.title
      );
      parts.push(labels.join(', '));
    } else if (todayMeals.length > 2) {
      parts.push(`${todayMeals.length} meals planned today`);
    }
    if (data.meals.shoppingListCount > 0) {
      parts.push(`${data.meals.shoppingListCount} item${data.meals.shoppingListCount !== 1 ? 's' : ''} on shopping list`);
    }
  }

  return parts.length > 0 ? parts.join('. ') + '.' : 'No data available yet.';
}

// ── Transform: BriefingData → Personal Store ──────────────────────────────

function normalizePriority(p: string | null): 'high' | 'medium' | 'low' {
  if (!p) return 'medium';
  const lower = p.toLowerCase();
  if (lower.includes('high') || lower === '1') return 'high';
  if (lower.includes('low') || lower === '3') return 'low';
  return 'medium';
}

function transformTasks(data: BriefingData): PersonalTask[] {
  const today = new Date().toISOString().split('T')[0];
  const tasks: PersonalTask[] = [];

  for (const task of data.tasks.overdue) {
    tasks.push({
      id: task.id,
      title: task.title,
      project: null,
      dueDate: task.dueDate ?? '',
      priority: normalizePriority(task.priority),
      completed: false,
      overdue: true,
    });
  }

  for (const task of data.tasks.today) {
    tasks.push({
      id: task.id,
      title: task.title,
      project: null,
      dueDate: task.dueDate ?? today,
      priority: normalizePriority(task.priority),
      completed: false,
      overdue: false,
    });
  }

  return tasks;
}

function transformHabits(data: BriefingData): PersonalHabit[] {
  const today = new Date().toISOString().split('T')[0];
  return data.habits.active.map((habit) => ({
    id: habit.id,
    name: habit.title,
    frequency: (habit.frequency === 'weekly' ? 'weekly' : 'daily') as 'daily' | 'weekly',
    completedToday: habit.lastCompleted === today,
    currentStreak: habit.streak,
  }));
}

function transformBills(data: BriefingData): PersonalBill[] {
  const today = new Date().toISOString().split('T')[0];
  return data.bills.thisWeek.map((bill) => {
    let status: PersonalBill['status'] = 'upcoming';
    if (bill.dueDate) {
      if (bill.dueDate < today) status = 'overdue';
      else if (bill.dueDate <= today) status = 'due_soon';
      else {
        // Due within 3 days = due_soon
        const due = new Date(bill.dueDate + 'T00:00:00');
        const now = new Date(today + 'T00:00:00');
        const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        status = diffDays <= 3 ? 'due_soon' : 'upcoming';
      }
    }
    return {
      id: bill.id,
      name: bill.title,
      amount: bill.amount,
      dueDate: bill.dueDate ?? '',
      status,
      category: '',
      serviceLink: bill.serviceLink,
    };
  });
}

function transformGoals(data: BriefingData): PersonalGoal[] {
  return data.goals.active.map((goal) => ({
    id: goal.id,
    title: goal.title,
    progress: goal.progress ?? 0,
    category: '',
  }));
}

function transformCalendar(data: BriefingData): StoreCalendarEvent[] {
  return data.calendar.today.map((event) => ({
    id: event.id,
    title: event.title,
    startTime: event.time,
    endTime: event.endTime || '',
    isToday: true,
    allDay: event.allDay,
    location: event.location,
    source: event.source,
  }));
}

function transformMeals(data: BriefingData): PersonalMeal[] {
  if (!data.meals) return [];
  return data.meals.planned.map((meal) => ({
    id: meal.id,
    name: meal.title,
    dayOfWeek: meal.dayOfWeek ?? '',
    timeOfDay: meal.timeOfDay ?? '',
    setting: meal.setting ?? '',
    servings: meal.servings,
    recipeIds: meal.recipeIds,
    prepTime: meal.prepTime ?? null,
    cookTime: meal.cookTime ?? null,
  }));
}

// ── Standalone fetch function (callable from anywhere) ────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000]; // delays before retry 2 and 3

export async function refetchJarvisData(silent = false): Promise<void> {
  const homeStore = useHomeStore.getState();
  const personalStore = usePersonalStore.getState();

  if (!silent) homeStore.setLoading(true);
  homeStore.setFetchError(null);

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await fetchBriefingData();

      // Populate Home store
      homeStore.setPriorityItems(transformPriorities(data));
      homeStore.setDomainHealth(transformDomainHealth(data));
      homeStore.setBriefingSummary(transformBriefingSummary(data));
      homeStore.setLastFetched(new Date());

      // Populate Personal store
      personalStore.setTasks(transformTasks(data));
      personalStore.setHabits(transformHabits(data));
      personalStore.setBills(transformBills(data));
      personalStore.setGoals(transformGoals(data));
      personalStore.setEvents(transformCalendar(data));
      personalStore.setMeals(transformMeals(data));
      personalStore.setShoppingListCount(data.meals?.shoppingListCount ?? 0);
      // Journal and Health: not available from briefing API — stays empty (honest)

      homeStore.setLoading(false);
      return; // Success — exit early
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Failed to fetch data';
      console.warn(`[useJarvisFetch] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError);

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }
    }
  }

  // All retries exhausted
  homeStore.setFetchError(lastError);
  console.error('[useJarvisFetch] All retries exhausted:', lastError);
  homeStore.setLoading(false);
}

// ── Hook (mount in JarvisShell only) ──────────────────────────────────────

export function useJarvisFetch(): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch on mount
  useEffect(() => {
    refetchJarvisData();
  }, []);

  // Periodic refresh — only when tab is visible
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refetchJarvisData(true); // silent refresh — no loading flash
      }
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
