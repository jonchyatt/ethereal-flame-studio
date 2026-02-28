import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PersonalTask {
  id: string;
  title: string;
  project: string | null;
  dueDate: string; // ISO date string
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  overdue: boolean;
}

export interface PersonalHabit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  completedToday: boolean;
  currentStreak: number;
}

export interface PersonalBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'overdue' | 'due_soon' | 'paid' | 'upcoming';
  category: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isToday: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: 'great' | 'good' | 'okay' | 'rough' | null;
}

export interface PersonalGoal {
  id: string;
  title: string;
  progress: number; // 0-100
  category: string;
}

export interface HealthItem {
  id: string;
  type: 'workout' | 'meal' | 'sleep';
  title: string;
  summary: string;
  date: string;
}

export interface TodayStats {
  tasksDue: number;
  tasksCompleted: number;
  habitsDone: number;
  habitsTotal: number;
  billsDue: number;
  streak: number;
}

// ── Computed Stats ─────────────────────────────────────────────────────────

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function computeTodayStats(
  tasks: PersonalTask[],
  habits: PersonalHabit[],
  bills: PersonalBill[],
): TodayStats {
  const today = getToday();
  const tasksDue = tasks.filter((t) => !t.completed && (t.overdue || t.dueDate === today)).length;
  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const habitsDone = habits.filter((h) => h.completedToday).length;
  const habitsTotal = habits.length;
  const billsDue = bills.filter((b) => b.status === 'overdue' || b.status === 'due_soon').length;
  const streak = Math.max(...habits.map((h) => h.currentStreak), 0);

  return { tasksDue, tasksCompleted, habitsDone, habitsTotal, billsDue, streak };
}

// ── Store ──────────────────────────────────────────────────────────────────

interface PersonalState {
  tasks: PersonalTask[];
  habits: PersonalHabit[];
  bills: PersonalBill[];
  events: CalendarEvent[];
  journal: JournalEntry[];
  goals: PersonalGoal[];
  health: HealthItem[];
  todayStats: TodayStats;
}

interface PersonalActions {
  setTasks: (tasks: PersonalTask[]) => void;
  setHabits: (habits: PersonalHabit[]) => void;
  setBills: (bills: PersonalBill[]) => void;
  setEvents: (events: CalendarEvent[]) => void;
  setJournal: (journal: JournalEntry[]) => void;
  setJournalMood: (id: string, mood: JournalEntry['mood']) => void;
  setGoals: (goals: PersonalGoal[]) => void;
  setHealth: (health: HealthItem[]) => void;
  toggleTask: (id: string) => void;
  toggleHabit: (id: string) => void;
  markBillPaid: (id: string) => void;
}

type PersonalStore = PersonalState & PersonalActions;

export const usePersonalStore = create<PersonalStore>()((set) => ({
  tasks: [],
  habits: [],
  bills: [],
  events: [],
  journal: [],
  goals: [],
  health: [],
  todayStats: computeTodayStats([], [], []),

  setTasks: (tasks) =>
    set((state) => ({
      tasks,
      todayStats: computeTodayStats(tasks, state.habits, state.bills),
    })),
  setHabits: (habits) =>
    set((state) => ({
      habits,
      todayStats: computeTodayStats(state.tasks, habits, state.bills),
    })),
  setBills: (bills) =>
    set((state) => ({
      bills,
      todayStats: computeTodayStats(state.tasks, state.habits, bills),
    })),
  setEvents: (events) => set({ events }),
  setJournal: (journal) => set({ journal }),
  setJournalMood: (id, mood) =>
    set((state) => ({
      journal: state.journal.map((j) => (j.id === id ? { ...j, mood } : j)),
    })),
  setGoals: (goals) => set({ goals }),
  setHealth: (health) => set({ health }),

  toggleTask: (id) =>
    set((state) => {
      const tasks = state.tasks.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, overdue: !t.completed ? false : t.overdue }
          : t,
      );
      return { tasks, todayStats: computeTodayStats(tasks, state.habits, state.bills) };
    }),

  toggleHabit: (id) =>
    set((state) => {
      const habits = state.habits.map((h) =>
        h.id === id
          ? {
              ...h,
              completedToday: !h.completedToday,
              currentStreak: !h.completedToday
                ? h.currentStreak + 1
                : Math.max(0, h.currentStreak - 1),
            }
          : h,
      );
      return { habits, todayStats: computeTodayStats(state.tasks, habits, state.bills) };
    }),

  markBillPaid: (id) =>
    set((state) => {
      const bills = state.bills.map((b) =>
        b.id === id ? { ...b, status: 'paid' as const } : b,
      );
      return { bills, todayStats: computeTodayStats(state.tasks, state.habits, bills) };
    }),
}));
