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

// ── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_TASKS: PersonalTask[] = [
  {
    id: 'task-1',
    title: 'Review budget spreadsheet',
    project: 'Finance',
    dueDate: '2026-02-24',
    priority: 'high',
    completed: false,
    overdue: true,
  },
  {
    id: 'task-2',
    title: 'Schedule dentist appointment',
    project: null,
    dueDate: '2026-02-26',
    priority: 'medium',
    completed: false,
    overdue: false,
  },
  {
    id: 'task-3',
    title: 'Update Visopscreen docs',
    project: 'Visopscreen',
    dueDate: '2026-02-26',
    priority: 'high',
    completed: false,
    overdue: false,
  },
  {
    id: 'task-4',
    title: 'Plan weekend trip itinerary',
    project: null,
    dueDate: '2026-02-28',
    priority: 'low',
    completed: false,
    overdue: false,
  },
  {
    id: 'task-5',
    title: 'Read Chapter 5 — Atomic Habits',
    project: 'Reading',
    dueDate: '2026-03-01',
    priority: 'low',
    completed: false,
    overdue: false,
  },
];

const MOCK_HABITS: PersonalHabit[] = [
  { id: 'habit-1', name: 'Meditation', frequency: 'daily', completedToday: true, currentStreak: 12 },
  { id: 'habit-2', name: 'Exercise', frequency: 'daily', completedToday: false, currentStreak: 5 },
  { id: 'habit-3', name: 'Read 30 min', frequency: 'daily', completedToday: true, currentStreak: 8 },
  { id: 'habit-4', name: 'Journal', frequency: 'daily', completedToday: false, currentStreak: 3 },
];

const MOCK_BILLS: PersonalBill[] = [
  { id: 'bill-1', name: 'Electric', amount: 142.50, dueDate: '2026-02-24', status: 'overdue', category: 'Utilities' },
  { id: 'bill-2', name: 'Internet', amount: 89.00, dueDate: '2026-02-28', status: 'due_soon', category: 'Utilities' },
  { id: 'bill-3', name: 'Gym membership', amount: 45.00, dueDate: '2026-02-15', status: 'paid', category: 'Health' },
];

const MOCK_EVENTS: CalendarEvent[] = [
  { id: 'event-1', title: 'Team standup', startTime: '2026-02-26T09:00', endTime: '2026-02-26T09:30', isToday: true },
  { id: 'event-2', title: 'Dentist appointment', startTime: '2026-02-27T14:00', endTime: '2026-02-27T15:00', isToday: false },
  { id: 'event-3', title: 'Weekend trip', startTime: '2026-02-28T08:00', endTime: '2026-02-28T18:00', isToday: false },
];

const MOCK_JOURNAL: JournalEntry[] = [
  { id: 'journal-1', date: '2026-02-26', content: 'Productive morning — got through most of the backlog before rounds...', mood: null },
];

const MOCK_GOALS: PersonalGoal[] = [
  { id: 'goal-1', title: 'Financial freedom', progress: 45, category: 'Finance' },
  { id: 'goal-2', title: 'Read 24 books this year', progress: 33, category: 'Growth' },
  { id: 'goal-3', title: 'Run a half marathon', progress: 20, category: 'Health' },
];

const MOCK_HEALTH: HealthItem[] = [
  { id: 'health-1', type: 'workout', title: 'Morning run', summary: '5K in 28:14', date: '2026-02-26' },
  { id: 'health-2', type: 'meal', title: 'Meal prep', summary: '1,800 cal tracked', date: '2026-02-26' },
];

// ── Computed Stats ─────────────────────────────────────────────────────────

function computeTodayStats(
  tasks: PersonalTask[],
  habits: PersonalHabit[],
  bills: PersonalBill[],
): TodayStats {
  const today = '2026-02-26';
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
  tasks: MOCK_TASKS,
  habits: MOCK_HABITS,
  bills: MOCK_BILLS,
  events: MOCK_EVENTS,
  journal: MOCK_JOURNAL,
  goals: MOCK_GOALS,
  health: MOCK_HEALTH,
  todayStats: computeTodayStats(MOCK_TASKS, MOCK_HABITS, MOCK_BILLS),

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
