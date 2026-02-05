/**
 * Lesson Content — Step-by-step content for curriculum lessons.
 *
 * Each lesson has an intro, 3-5 steps with narration, and an outro.
 * Claude receives all content in one tool call and narrates step-by-step.
 */

export interface LessonStep {
  title: string;
  narration: string;
  panelNote?: string;
}

export interface LessonContent {
  lessonId: string;
  intro: string;
  steps: LessonStep[];
  outro: string;
}

// ─── Daily Action Lessons ────────────────────────────────────────────────────

const tasksOverview: LessonContent = {
  lessonId: 'tasks-overview',
  intro:
    "Let's explore your Tasks database. This is where all your action items live — think of it as your personal command center for getting things done.",
  steps: [
    {
      title: 'The Task Inbox',
      narration:
        'Your task inbox captures everything that needs doing. New tasks land here first before you organize them. Open the Tasks database in Notion and take a look at the default view.',
      panelNote: 'Open Notion to see this',
    },
    {
      title: 'Views: Today, This Week, By Project',
      narration:
        "Notion gives you multiple views of the same data. You'll see Today, This Week, and By Project views. Each one filters your tasks differently so you can focus on what matters right now. Ready for the next step?",
      panelNote: 'Try switching views',
    },
    {
      title: 'Task Properties',
      narration:
        'Every task has properties like Status, Priority, Due Date, and Project. These let you slice and filter your tasks. Status moves from Not Started, through In Progress, to Done. Ready for the next step?',
      panelNote: 'Check a task\'s properties',
    },
    {
      title: 'Completing Tasks',
      narration:
        "To mark a task done, just change its status to Done. You can also tell me to complete a task by voice — say something like \"mark buy groceries as done\". That's the basics of your task system!",
      panelNote: 'Try completing one',
    },
  ],
  outro:
    "Nice work! You now know how to navigate your tasks, use different views, and mark things done. You can always ask me to show your tasks or create new ones by voice.",
};

const tasksCreate: LessonContent = {
  lessonId: 'tasks-create',
  intro:
    "Now let's learn how to create tasks. The fastest way is by voice through me, but you can also add them directly in Notion.",
  steps: [
    {
      title: 'Quick Add via Voice',
      narration:
        'The fastest way to add a task is to tell me. Just say something like "add a task to call the dentist" and I\'ll create it in your Tasks database with the right properties. Ready for the next step?',
      panelNote: 'Try it by voice',
    },
    {
      title: 'Setting Dates and Priorities',
      narration:
        'You can include details when creating tasks. Say "add a high priority task to review the budget by Friday" and I\'ll set the priority and due date automatically. Ready for the next step?',
      panelNote: 'Include date and priority',
    },
    {
      title: 'Linking to Projects',
      narration:
        'Tasks can belong to a project. Say "add a task to update the homepage for the website project" and I\'ll link it. In Notion, you can also set the Project property directly on any task. Ready for the next step?',
      panelNote: 'Link task to a project',
    },
    {
      title: 'Batch Tips',
      narration:
        "For quick brain dumps, just tell me several tasks in one go — like \"add tasks: buy milk, call mom, schedule dentist\". I'll create them all. You can organize them into projects later.",
      panelNote: 'Try a batch add',
    },
  ],
  outro:
    "Great! You can now create tasks by voice with dates, priorities, and project links. Brain-dump freely — I'll capture everything.",
};

const projectsOverview: LessonContent = {
  lessonId: 'projects-overview',
  intro:
    "Let's look at Projects — the containers that group related tasks together. Projects help you track bigger goals that need multiple steps.",
  steps: [
    {
      title: 'Projects vs Tasks',
      narration:
        'A task is a single action. A project is a goal with multiple tasks. For example, "Plan vacation" is a project, while "book flights" and "reserve hotel" are tasks inside it. Ready for the next step?',
      panelNote: 'Projects contain tasks',
    },
    {
      title: 'The Projects Dashboard',
      narration:
        'Open your Projects database to see all active projects. Each project shows its status, linked area, and how many tasks are connected to it. Ready for the next step?',
      panelNote: 'Open Projects in Notion',
    },
    {
      title: 'Creating a Project',
      narration:
        'You can create a project in Notion or ask me. Say "create a project called Home Renovation" and I\'ll set it up. Then you can start adding tasks to it. Ready for the next step?',
      panelNote: 'Create one to try',
    },
    {
      title: 'Linking Tasks to Projects',
      narration:
        "Once you have a project, link tasks to it by setting the Project property. Or tell me — \"add a task to get paint samples for the Home Renovation project\". Tasks show up in the project's linked view automatically.",
      panelNote: 'Link a task now',
    },
  ],
  outro:
    "You've got Projects down! Use them to organize related tasks under a single goal. Ask me to show your projects anytime.",
};

const habitsIntro: LessonContent = {
  lessonId: 'habits-intro',
  intro:
    "Let's set up your Habit Tracker. Habits are the daily routines that compound over time — things like exercise, reading, or drinking enough water.",
  steps: [
    {
      title: 'What Are Habits?',
      narration:
        "In your Life OS, habits are recurring actions you want to do regularly. Unlike tasks that you complete once, habits repeat daily or weekly. They're tracked separately so you can build streaks. Ready for the next step?",
      panelNote: 'Habits repeat daily',
    },
    {
      title: 'Viewing Your Habits',
      narration:
        'Open the Habits database in Notion. You\'ll see each habit with its frequency and current streak. The daily view shows checkboxes for today. Ready for the next step?',
      panelNote: 'Open Habits in Notion',
    },
    {
      title: 'Creating a Habit',
      narration:
        'Add a new habit by creating an entry in the Habits database. Give it a name like "Meditate 10 min", set the frequency to daily, and it will start appearing in your daily checklist. Ready for the next step?',
      panelNote: 'Add a simple habit',
    },
    {
      title: 'Tracking Daily',
      narration:
        'Each day, check off the habits you completed. You can do this in Notion or tell me — say "I did my meditation today" and I\'ll log it. Consistency is what matters most. Ready for the next step?',
      panelNote: 'Check off today\'s habits',
    },
    {
      title: 'Building Streaks',
      narration:
        "Your streak count shows how many consecutive days you've completed a habit. Don't break the chain! If you miss a day, just start fresh — the goal is progress, not perfection.",
      panelNote: 'Watch your streaks grow',
    },
  ],
  outro:
    "Your Habit Tracker is ready! Start with just 2-3 habits and build from there. I can remind you to check in each day if you'd like.",
};

const areasIntro: LessonContent = {
  lessonId: 'areas-intro',
  intro:
    "Let's explore Life Areas — the big categories that everything in your life falls into. Areas help you maintain balance across what matters most.",
  steps: [
    {
      title: 'Areas vs Projects',
      narration:
        'Areas are ongoing responsibilities like Health, Career, or Relationships. Unlike projects, areas never end — they\'re the domains of your life that need continuous attention. Projects live inside areas. Ready for the next step?',
      panelNote: 'Areas are ongoing',
    },
    {
      title: 'The Areas Dashboard',
      narration:
        "Open your Areas database in Notion. You'll see your life areas listed with their linked projects and status. Some templates come with default areas you can customize. Ready for the next step?",
      panelNote: 'Open Areas in Notion',
    },
    {
      title: 'Balancing Your Areas',
      narration:
        "The power of areas is seeing the big picture. If you notice all your projects are in Career and none in Health, that's a signal to rebalance. Review your areas weekly to stay on track. Ready for the next step?",
      panelNote: 'Look for imbalances',
    },
    {
      title: 'Spotting Neglected Areas',
      narration:
        "Areas without recent activity might need attention. I can help you spot these — ask me \"which areas need attention?\" and I'll check for areas with no active projects or tasks.",
      panelNote: 'Ask me for a check-up',
    },
  ],
  outro:
    "You now understand Life Areas! They're your compass for staying balanced. Ask me to show your areas or check which ones need attention anytime.",
};

// ─── Content Map ─────────────────────────────────────────────────────────────

export const LESSON_CONTENT: Record<string, LessonContent> = {
  'tasks-overview': tasksOverview,
  'tasks-create': tasksCreate,
  'projects-overview': projectsOverview,
  'habits-intro': habitsIntro,
  'areas-intro': areasIntro,
};

/** Get lesson content by ID. Returns undefined for lessons without content yet. */
export function getLessonContent(lessonId: string): LessonContent | undefined {
  return LESSON_CONTENT[lessonId];
}
