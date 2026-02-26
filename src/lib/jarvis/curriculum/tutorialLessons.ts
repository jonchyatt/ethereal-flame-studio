import type { SpotlightTarget } from '@/lib/jarvis/stores/tutorialStore';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MistakeHint {
  detect: string;
  correction: string;
}

export interface TutorialStep {
  id: string;
  instruction: string;
  instructionAdvanced: string;
  spotlight?: SpotlightTarget;
  verification: {
    type: 'route' | 'store' | 'action';
    check: string;
  };
  mistakeHints: MistakeHint[];
  teachingPoint?: string;
}

export interface TutorialLesson {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3 | 4;
  estimatedMinutes: number;
  prerequisites: string[];
  steps: TutorialStep[];
  completionMessage: string;
  nextSuggestion: string | null;
}

// ── Tier Metadata ──────────────────────────────────────────────────────────

export const TUTORIAL_TIERS: Record<number, { name: string; description: string }> = {
  1: { name: 'Your First Day', description: 'The essential features that change your daily routine' },
  2: { name: 'Your First Week', description: 'Deeper capabilities for life integration' },
  3: { name: 'Your First Month', description: 'Advanced lifestyle features' },
  4: { name: 'Mastery', description: 'Power user capabilities' },
};

// ── Tier 1 Lessons ─────────────────────────────────────────────────────────

const tasksBasics: TutorialLesson = {
  id: 'tasks-basics',
  name: 'Managing Your Tasks',
  description: 'Learn to view, complete, and create tasks — your daily to-do list lives here.',
  tier: 1,
  estimatedMinutes: 3,
  prerequisites: [],
  steps: [
    {
      id: 'tasks-1-navigate-personal',
      instruction:
        "Let's start with your tasks. See the card labeled 'Personal' on your home screen? It has a violet border. Tap it now.",
      instructionAdvanced: 'Head to your Personal dashboard.',
      spotlight: { elementId: 'home-domain-card-personal', type: 'pulse' },
      verification: { type: 'route', check: '/jarvis/app/personal' },
      mistakeHints: [
        {
          detect: 'opened Settings or another domain',
          correction:
            "That opened a different area. Look for the card with the violet border labeled 'Personal' on your home screen.",
        },
      ],
      teachingPoint:
        'Personal is your life command center — tasks, habits, bills, calendar, journal, goals, and health all live here.',
    },
    {
      id: 'tasks-2-open-tasks',
      instruction:
        "Great! You're in your Personal dashboard. See those cards below? Tap the one labeled 'Tasks' with the checkmark icon.",
      instructionAdvanced: 'Open your Tasks view.',
      spotlight: { elementId: 'personal-subprogram-tasks', type: 'pulse' },
      verification: { type: 'route', check: '/jarvis/app/personal/tasks' },
      mistakeHints: [
        {
          detect: 'opened Habits or Bills instead',
          correction:
            "Close one! That's a different section. Look for the card with the checkmark icon labeled 'Tasks'.",
        },
      ],
    },
    {
      id: 'tasks-3-view-list',
      instruction:
        "Here's your task list! Tasks are grouped by urgency — overdue at the top in red, due today in amber, and upcoming below. Take a moment to look around.",
      instructionAdvanced: 'Review your tasks grouped by status.',
      spotlight: { elementId: 'tasks-summary', type: 'ring' },
      verification: { type: 'route', check: '/jarvis/app/personal/tasks' },
      mistakeHints: [
        {
          detect: 'navigated away',
          correction:
            'Looks like you left the Tasks page. Tap the back arrow and then the Tasks card again.',
        },
      ],
      teachingPoint:
        'Overdue tasks always float to the top so nothing falls through the cracks. The summary card at the top shows your counts at a glance.',
    },
    {
      id: 'tasks-4-complete-task',
      instruction:
        'Now try completing a task. See the circle next to each task? Tap it to mark the task as done. Watch it animate!',
      instructionAdvanced: 'Mark any task as complete.',
      spotlight: { elementId: 'tasks-first-checkbox', type: 'pulse' },
      verification: {
        type: 'store',
        check: 'personalStore.tasks.some(t => t.completed && t.justToggled)',
      },
      mistakeHints: [
        {
          detect: 'tapped the task name instead of checkbox',
          correction:
            'Almost! Tap the circle on the left side of the task, not the task name.',
        },
      ],
      teachingPoint:
        'Tasks sync bidirectionally with your Notion workspace. Complete it here and it\'s done in Notion too — and vice versa.',
    },
    {
      id: 'tasks-5-open-chat',
      instruction:
        "Now let's create a task using Jarvis. Tap the chat icon at the bottom of your screen — it looks like a message bubble.",
      instructionAdvanced: 'Open the chat to create a task by voice.',
      spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' },
      verification: { type: 'store', check: 'shellStore.isChatOpen === true' },
      mistakeHints: [
        {
          detect: 'tapped home or add button instead',
          correction:
            "That's a different button. Look for the speech bubble icon in the bottom bar — it's labeled 'Chat'.",
        },
      ],
    },
    {
      id: 'tasks-6-create-via-chat',
      instruction:
        "Type something like 'add task: buy groceries' and hit send. Jarvis will create it for you instantly.",
      instructionAdvanced: "Create a task through chat: type 'add task: [anything]'.",
      spotlight: { elementId: 'chat-input', type: 'ring' },
      verification: { type: 'action', check: 'user-sent-chat-message' },
      mistakeHints: [
        {
          detect: "typed but didn't send",
          correction:
            "Don't forget to tap the send button (or press Enter) after typing your message!",
        },
      ],
      teachingPoint:
        'You can create tasks three ways: tapping in the UI, typing in chat, or speaking to Jarvis. Whatever feels natural.',
    },
  ],
  completionMessage:
    "You just learned Tasks! You can now manage your entire to-do list from here, from Notion, or just by talking to Jarvis. Nothing falls through the cracks.",
  nextSuggestion: 'habits-basics',
};

const habitsBasics: TutorialLesson = {
  id: 'habits-basics',
  name: 'Building Habit Streaks',
  description: 'Track daily habits, build streaks, and let consistency compound into real change.',
  tier: 1,
  estimatedMinutes: 3,
  prerequisites: [],
  steps: [
    {
      id: 'habits-1-navigate',
      instruction:
        "Let's build some habits! From your Personal dashboard, tap the 'Habits' card — the one with the lightning bolt icon.",
      instructionAdvanced: 'Open Habits from your Personal dashboard.',
      spotlight: { elementId: 'personal-subprogram-habits', type: 'pulse' },
      verification: { type: 'route', check: '/jarvis/app/personal/habits' },
      mistakeHints: [
        {
          detect: 'not on Personal dashboard first',
          correction:
            "Head to your Personal dashboard first (tap 'Personal' on the home screen), then look for the Habits card.",
        },
      ],
    },
    {
      id: 'habits-2-understand',
      instruction:
        "This is your Habit Tracker! The progress bar at the top shows how many habits you've completed today. Below, each habit shows its name, frequency, and current streak.",
      instructionAdvanced: 'Review your habits and progress bar.',
      spotlight: { elementId: 'habits-progress', type: 'ring' },
      verification: { type: 'route', check: '/jarvis/app/personal/habits' },
      mistakeHints: [
        {
          detect: 'navigated away',
          correction: 'Looks like you left the Habits page. Head back through Personal → Habits.',
        },
      ],
      teachingPoint:
        'Habits are grouped by frequency — daily, weekly, monthly. The progress bar fills as you complete today\'s habits.',
    },
    {
      id: 'habits-3-log-completion',
      instruction:
        'Try logging a habit! Tap the circle next to any habit to mark it done for today. Watch your streak grow!',
      instructionAdvanced: 'Mark a habit as complete.',
      spotlight: { elementId: 'habits-first-toggle', type: 'pulse' },
      verification: {
        type: 'store',
        check: 'personalStore.habits.some(h => h.completedToday)',
      },
      mistakeHints: [
        {
          detect: 'tapped habit name',
          correction: "Tap the circle on the left side, not the habit name. That's the toggle!",
        },
      ],
      teachingPoint:
        "Streaks are powerful motivation. Each consecutive day you complete a habit, the streak counter grows. Miss a day and it resets — but don't worry, just start again.",
    },
    {
      id: 'habits-4-watch-progress',
      instruction:
        'See how the progress bar at the top updated? And the streak count went up! Every small win adds up.',
      instructionAdvanced: 'Observe the progress bar and streak update.',
      spotlight: { elementId: 'habits-progress', type: 'ring' },
      verification: {
        type: 'store',
        check: 'personalStore.todayStats.habitsComplete > 0',
      },
      mistakeHints: [
        {
          detect: "progress didn't change",
          correction:
            "Hmm, the progress didn't update. Try tapping the circle next to a habit that isn't checked off yet.",
        },
      ],
      teachingPoint:
        'Jarvis can remind you about your habits in your evening check-in. Consistency beats perfection — even logging 3 out of 5 habits daily builds real change over time.',
    },
    {
      id: 'habits-5-create-via-chat',
      instruction:
        "Want to add a new habit? Open the chat and tell Jarvis something like 'I want to track meditation daily'.",
      instructionAdvanced: 'Create a new habit through chat.',
      spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' },
      verification: { type: 'action', check: 'user-sent-chat-message' },
      mistakeHints: [
        {
          detect: "didn't open chat",
          correction: 'Tap the chat bubble in the bottom bar first, then type your new habit.',
        },
      ],
    },
  ],
  completionMessage:
    "Habits unlocked! Consistency is how small actions become big changes. Start with just 2-3 habits and build from there — Jarvis will help you stay on track.",
  nextSuggestion: 'bills-basics',
};

const billsBasics: TutorialLesson = {
  id: 'bills-basics',
  name: 'Tracking Bills & Subscriptions',
  description: 'Stay on top of every bill, subscription, and payment — no more financial surprises.',
  tier: 1,
  estimatedMinutes: 4,
  prerequisites: [],
  steps: [
    {
      id: 'bills-1-navigate',
      instruction:
        "Time to get your finances organized! From your Personal dashboard, tap the 'Bills & Finance' card — the one with the receipt icon.",
      instructionAdvanced: 'Open Bills from Personal.',
      spotlight: { elementId: 'personal-subprogram-bills', type: 'pulse' },
      verification: { type: 'route', check: '/jarvis/app/personal/bills' },
      mistakeHints: [
        {
          detect: 'on wrong page',
          correction:
            "Head to your Personal dashboard first, then look for 'Bills & Finance' with the receipt icon.",
        },
      ],
    },
    {
      id: 'bills-2-color-system',
      instruction:
        'Bills are organized by urgency. Red sections are overdue — pay these first. Amber means due soon. And the glass sections are upcoming or already paid.',
      instructionAdvanced: 'Review bills grouped by urgency status.',
      verification: { type: 'route', check: '/jarvis/app/personal/bills' },
      mistakeHints: [
        {
          detect: 'navigated away',
          correction: "Stay on the Bills page — there's more to see!",
        },
      ],
      teachingPoint:
        'The color system is your early warning system. Red means something needs attention NOW. Amber is your heads-up. No surprises.',
    },
    {
      id: 'bills-3-financial-summary',
      instruction:
        "See the card at the top? It shows your total due, any overdue amount, and how many bills you've already paid. This is your financial snapshot.",
      instructionAdvanced: 'Review the financial summary card.',
      spotlight: { elementId: 'bills-summary', type: 'ring' },
      verification: { type: 'route', check: '/jarvis/app/personal/bills' },
      mistakeHints: [
        {
          detect: 'scrolled past summary',
          correction:
            'Scroll back to the top — the financial summary card is the first thing on the page.',
        },
      ],
      teachingPoint:
        'Jarvis automatically calculates your total upcoming bills. No spreadsheet needed — the numbers update every time you mark a bill paid or a new one comes due.',
    },
    {
      id: 'bills-4-mark-paid',
      instruction:
        "Find a bill and tap the 'Mark Paid' button. It's the small button on the right side of each unpaid bill.",
      instructionAdvanced: 'Mark any bill as paid.',
      spotlight: { elementId: 'bills-first-mark-paid', type: 'pulse' },
      verification: {
        type: 'store',
        check: 'personalStore.bills.some(b => b.status === "paid")',
      },
      mistakeHints: [
        {
          detect: 'tapped bill name instead',
          correction:
            "Look for the 'Mark Paid' button on the right side of the bill row, not the bill name.",
        },
      ],
      teachingPoint:
        'When you mark a bill paid, Jarvis updates the totals instantly and moves it to the Paid section. It also updates in Notion.',
    },
    {
      id: 'bills-5-create-via-chat',
      instruction:
        "Let's add a new bill. Open the chat and type something like 'add bill: Netflix $15.99 monthly'.",
      instructionAdvanced: 'Create a bill through chat.',
      spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' },
      verification: { type: 'action', check: 'user-sent-chat-message' },
      mistakeHints: [
        {
          detect: "didn't include amount",
          correction:
            "Try including the amount and frequency, like: 'add bill: Netflix $15.99 monthly'. Jarvis needs those details to track it.",
        },
      ],
    },
    {
      id: 'bills-6-review-updated',
      instruction:
        'Head back to the Bills page and check your summary. The numbers should reflect your changes. This is your real-time financial dashboard.',
      instructionAdvanced: 'Return to Bills to see updated totals.',
      verification: { type: 'route', check: '/jarvis/app/personal/bills' },
      mistakeHints: [
        {
          detect: 'still in chat',
          correction:
            'Close the chat and navigate back to Personal → Bills to see your updated summary.',
        },
      ],
      teachingPoint:
        'Monthly, yearly, weekly, and quarterly billing frequencies are all supported. You can even add the payment link so \'Mark Paid\' takes you straight to the payment page.',
    },
  ],
  completionMessage:
    "Bills mastered! No more missed payments, no more financial surprises. Jarvis keeps your money organized so you can focus on what matters.",
  nextSuggestion: 'morning-briefing',
};

const morningBriefing: TutorialLesson = {
  id: 'morning-briefing',
  name: 'Your Morning Briefing',
  description: 'Start every day with a personalized briefing — Jarvis knows your tasks, habits, and goals.',
  tier: 1,
  estimatedMinutes: 2,
  prerequisites: [],
  steps: [
    {
      id: 'briefing-1-open-chat',
      instruction:
        "Let's see what Jarvis can tell you about your day. Tap the chat bubble at the bottom of your screen.",
      instructionAdvanced: 'Open chat.',
      spotlight: { elementId: 'bottom-tab-chat', type: 'pulse' },
      verification: { type: 'store', check: 'shellStore.isChatOpen === true' },
      mistakeHints: [
        {
          detect: 'tapped wrong tab',
          correction: 'Look for the speech bubble icon in the bottom bar.',
        },
      ],
    },
    {
      id: 'briefing-2-ask',
      instruction:
        "Type 'good morning' or 'brief me' and hit send. Jarvis will pull together everything you need to know about your day.",
      instructionAdvanced: 'Request your daily briefing.',
      spotlight: { elementId: 'chat-input', type: 'ring' },
      verification: { type: 'action', check: 'user-sent-chat-message' },
      mistakeHints: [
        {
          detect: "typed but didn't send",
          correction: 'Hit the send button or press Enter after typing.',
        },
      ],
      teachingPoint:
        'Jarvis pulls from ALL your connected domains for the briefing — tasks, habits, bills, goals, calendar. Morning, midday, and evening briefings are available. Just ask.',
    },
    {
      id: 'briefing-3-read',
      instruction:
        'Look at that! Jarvis knows your tasks, your habit streaks, your bills, and your goals. This briefing gets richer the more you use Jarvis.',
      instructionAdvanced: 'Review the briefing content.',
      verification: {
        type: 'store',
        check: 'chatStore.messages.length >= 2',
      },
      mistakeHints: [
        {
          detect: 'no response yet',
          correction:
            "Jarvis might need a moment to generate your briefing. If nothing appears, try typing 'brief me' and sending again.",
        },
      ],
      teachingPoint:
        'The briefing is personalized and time-aware. Morning briefings focus on the day ahead. Evening briefings summarize what you accomplished.',
    },
    {
      id: 'briefing-4-interact',
      instruction:
        "Try asking Jarvis something! Type 'what tasks are due today?' or 'how are my habits going?' — Jarvis can answer questions about any part of your life.",
      instructionAdvanced: 'Ask Jarvis a follow-up question.',
      spotlight: { elementId: 'chat-input', type: 'ring' },
      verification: { type: 'action', check: 'user-sent-second-message' },
      mistakeHints: [
        {
          detect: 'closed chat',
          correction:
            'Open the chat again and try asking a question. Jarvis is always ready to help.',
        },
      ],
      teachingPoint:
        'You can ask Jarvis anything — check your calendar, look up a contact, create a task, log a workout. The chat is your universal interface to your entire life system.',
    },
  ],
  completionMessage:
    "You now have a personal executive assistant. Every morning, Jarvis is ready with everything you need to know. Good morning indeed.",
  nextSuggestion: null,
};

// ── Exports ────────────────────────────────────────────────────────────────

export const TIER_1_LESSONS: TutorialLesson[] = [
  tasksBasics,
  habitsBasics,
  billsBasics,
  morningBriefing,
];

export function getTier1Lessons(): TutorialLesson[] {
  return TIER_1_LESSONS;
}

export function getLesson(id: string): TutorialLesson | undefined {
  return TIER_1_LESSONS.find((l) => l.id === id);
}
