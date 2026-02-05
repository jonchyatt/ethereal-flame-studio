import type { ClusterName } from '../notion/notionUrls';

export interface LessonMeta {
  id: string;
  title: string;
  cluster: ClusterName;
  description: string;
  /** Which database this lesson teaches (key into NOTION_URLS) */
  databaseKey: string;
}

export const LESSON_REGISTRY: LessonMeta[] = [
  // ── Daily Action (5 lessons) ──
  { id: 'tasks-overview',     title: 'Tasks & Action View',   cluster: 'daily_action', description: 'Navigate your task inbox and views',          databaseKey: 'tasks' },
  { id: 'tasks-create',       title: 'Creating Tasks',        cluster: 'daily_action', description: 'Add tasks with dates and priorities',         databaseKey: 'tasks' },
  { id: 'projects-overview',  title: 'Projects Overview',     cluster: 'daily_action', description: 'Organize work into projects',                 databaseKey: 'projects' },
  { id: 'habits-intro',       title: 'Habit Tracker Setup',   cluster: 'daily_action', description: 'Set up and track daily habits',               databaseKey: 'habits' },
  { id: 'areas-intro',        title: 'Life Areas',            cluster: 'daily_action', description: 'Define your key life areas',                  databaseKey: 'areas' },

  // ── Financial (4 lessons) ──
  { id: 'budgets-intro',      title: 'Budgets & Subscriptions', cluster: 'financial', description: 'Track budgets and recurring subscriptions',  databaseKey: 'budgets' },
  { id: 'income-tracking',    title: 'Income Tracking',         cluster: 'financial', description: 'Log income sources',                         databaseKey: 'income' },
  { id: 'expenses-overview',  title: 'Expenditure Tracking',    cluster: 'financial', description: 'Track where your money goes',                databaseKey: 'expenditure' },
  { id: 'invoices-intro',     title: 'Invoice Management',      cluster: 'financial', description: 'Create and manage invoices',                 databaseKey: 'invoice_items' },

  // ── Knowledge (4 lessons) ──
  { id: 'notes-intro',        title: 'Notes & References',   cluster: 'knowledge', description: 'Capture and organize notes',                    databaseKey: 'notes' },
  { id: 'journal-intro',      title: 'Journal',              cluster: 'knowledge', description: 'Daily journaling workflow',                      databaseKey: 'journal' },
  { id: 'crm-intro',          title: 'CRM & Contacts',       cluster: 'knowledge', description: 'Manage your network',                           databaseKey: 'crm' },
  { id: 'topics-intro',       title: 'Topics & Resources',   cluster: 'knowledge', description: 'Organize learning resources',                   databaseKey: 'topics' },

  // ── Tracking (4 lessons) ──
  { id: 'workouts-intro',     title: 'Workout Tracker',      cluster: 'tracking', description: 'Log workouts and track progress',                databaseKey: 'workout_sessions' },
  { id: 'meals-intro',        title: 'Meal Planner',         cluster: 'tracking', description: 'Plan weekly meals and recipes',                  databaseKey: 'meal_plan' },
  { id: 'timesheets-intro',   title: 'Timesheets',           cluster: 'tracking', description: 'Track time spent on activities',                 databaseKey: 'timesheets' },
  { id: 'days-intro',         title: 'Daily Log',            cluster: 'tracking', description: 'Review and rate your days',                      databaseKey: 'days' },

  // ── Planning (4 lessons) ──
  { id: 'goals-intro',        title: 'Goal Setting',         cluster: 'planning', description: 'Set and track your goals',                       databaseKey: 'goals' },
  { id: 'years-intro',        title: 'Yearly Planning',      cluster: 'planning', description: 'Plan your year ahead',                           databaseKey: 'years' },
  { id: 'wheel-intro',        title: 'Wheel of Life',        cluster: 'planning', description: 'Assess life balance across areas',               databaseKey: 'wheel_of_life' },
  { id: 'dreams-intro',       title: 'Dream Setting',        cluster: 'planning', description: 'Capture your dreams and aspirations',            databaseKey: 'dream_setting' },

  // ── Business (3 lessons) ──
  { id: 'content-intro',      title: 'Content Management',   cluster: 'business', description: 'Plan and track content creation',                databaseKey: 'content' },
  { id: 'clients-intro',      title: 'Client Portal',        cluster: 'business', description: 'Manage client relationships',                    databaseKey: 'client_portal' },
  { id: 'channels-intro',     title: 'Channels & Tweets',    cluster: 'business', description: 'Manage social channels',                         databaseKey: 'channels' },
];

/** Get all lessons for a specific cluster */
export function getLessonsForCluster(clusterId: ClusterName): LessonMeta[] {
  return LESSON_REGISTRY.filter((l) => l.cluster === clusterId);
}

/** Get a lesson by its ID */
export function getLessonById(lessonId: string): LessonMeta | undefined {
  return LESSON_REGISTRY.find((l) => l.id === lessonId);
}

/** Get lesson counts per cluster: { daily_action: 5, financial: 4, ... } */
export function getLessonCounts(): Record<ClusterName, number> {
  const counts = {} as Record<ClusterName, number>;
  for (const lesson of LESSON_REGISTRY) {
    counts[lesson.cluster] = (counts[lesson.cluster] || 0) + 1;
  }
  return counts;
}
