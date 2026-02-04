/**
 * Tutorial Module Definitions
 *
 * Based on Simon's Notion Life OS onboarding framework.
 * Each module is designed to be delivered conversationally via voice.
 */

import { TutorialModule, TutorialModuleId } from './types';

/**
 * Complete tutorial module definitions
 */
export const TUTORIAL_MODULES: Record<TutorialModuleId, TutorialModule> = {
  welcome: {
    id: 'welcome',
    title: 'Welcome & Mindset',
    description: 'Introduction to Jarvis and setting expectations',
    duration: 3,
    prerequisites: [],
    triggers: ['start', 'begin', 'welcome', 'hello', 'new here', 'first time'],
    content: {
      intro: `Welcome to Jarvis. I'm your executive function partner - here to help you stay on track without adding to your mental load.

Before we dive in, a few things to know.`,
      sections: [
        {
          title: 'Mindset',
          content: `First: use what's useful, ignore the rest. I have a lot of capabilities, but you don't need to use all of them. Start simple.

Second: you can't break anything. Experiment freely. Ask me weird questions. I'll figure it out.

Third: I adapt to you, not the other way around. Tell me what works and what doesn't.`
        },
        {
          title: 'What I Can Do',
          content: `Here's what I'm good at:

Voice conversations - just talk to me naturally.
Morning and evening briefings to keep you oriented.
Task and project management through your Notion Life OS.
Bill tracking and reminders before things are due.
Habit awareness - I'll notice patterns.
Memory - I remember what you tell me across our conversations.`,
          examples: [
            "What's on my plate today?",
            "Add a task: call the dentist",
            "What bills are due this week?"
          ]
        },
        {
          title: 'What I Won\'t Do',
          content: `I won't take actions without your approval.
I won't access anything without permission.
I won't nag you or add guilt about unfinished tasks.
I'm here to help, not to manage you.`
        }
      ],
      overwhelmAlert: `If you only remember one thing: just talk to me. Say "What's on my plate today?" and go from there. Everything else can wait.`,
      exercise: `Try it now. Ask me something simple like "What can you do?" or "What's on my plate today?"`,
      outro: `That's the mindset. When you're ready, you can say "continue tutorial" to learn about navigation, or just start using me naturally. I'll help as we go.`
    }
  },

  navigation: {
    id: 'navigation',
    title: 'Three Ways to Interact',
    description: 'How to navigate and use Jarvis',
    duration: 5,
    prerequisites: ['welcome'],
    triggers: ['navigate', 'navigation', 'how to use', 'interface', 'interact'],
    content: {
      intro: `There are three ways to interact with me. Let me walk you through each one.`,
      sections: [
        {
          title: 'Voice (Primary)',
          content: `Voice is the main way we'll work together.

You push the button to talk, speak naturally, and I respond with voice and text.

Best for: daily use, quick tasks, conversations, anything on the go.`,
          examples: [
            "Add a task: pick up groceries",
            "What's my top priority today?",
            "Help me plan my week"
          ],
          method: 'simple'
        },
        {
          title: 'Dashboard (Visual)',
          content: `The dashboard shows your tasks, calendar, habits, and bills at a glance.

You can tap to expand details or use it for planning.

Best for: overview, seeing everything at once, mobile use.`,
          method: 'simple'
        },
        {
          title: 'Coming Soon: Telegram',
          content: `In a future update, you'll be able to message me from your phone via Telegram.

Same capabilities, works when you're away from the computer.

Best for: on-the-go commands, overnight tasks.`,
          method: 'advanced'
        }
      ],
      overwhelmAlert: `Start with voice only. The dashboard is there when you need to see the big picture. Most of the time, just talking to me is enough.`,
      outro: `Ready to set up your life areas? Say "continue tutorial" or just ask me to teach you about life areas.`
    }
  },

  'life-areas': {
    id: 'life-areas',
    title: 'Setting Up Life Areas',
    description: 'Configure the major areas of your life',
    duration: 5,
    prerequisites: ['navigation'],
    triggers: ['life areas', 'areas', 'categories', 'life area', 'wheel of life'],
    content: {
      intro: `Life areas are the big buckets of your life - Health, Career, Family, and so on.

Getting these right helps everything else fall into place.`,
      sections: [
        {
          title: 'Default Life Areas',
          content: `I'm set up with common life areas that work for most people:

Health and Fitness
Career and Business
Finances
Family and Social
Personal Growth
Environment - your home and spaces

You can add, remove, or rename these anytime.`,
          examples: [
            "Add a life area called Pets",
            "Remove Content Creation from my life areas",
            "Rename Environment to Home"
          ]
        },
        {
          title: 'Life Area Awareness',
          content: `Here's something useful: I track activity across your life areas over time.

If you haven't touched Health and Fitness in a couple weeks, I might gently mention it.

Not to nag - just to keep you aware. You decide if it matters.`
        },
        {
          title: 'The Wheel of Life',
          content: `You can rate each life area on a scale of 1 to 10 - how satisfied are you right now?

This creates a wheel of life view that shows what's working and what might need attention.

Say "show me my wheel of life" or "how are my life areas doing?" anytime.`
        }
      ],
      overwhelmAlert: `The default life areas work fine for most people. You don't need to customize anything right now.`,
      exercise: `Think for a moment: is there a life area you'd add? Pets? Spirituality? A hobby? Tell me if you want to add one.`,
      outro: `With life areas set, you can start adding goals. Say "teach me about goals" when ready.`
    }
  },

  goals: {
    id: 'goals',
    title: 'Adding Your First Goals',
    description: 'Set up meaningful goals for your life areas',
    duration: 5,
    prerequisites: ['life-areas'],
    triggers: ['goals', 'goal', 'objectives', 'targets', 'goal setting'],
    content: {
      intro: `Goals are the big targets you're working toward. They live under your life areas.`,
      sections: [
        {
          title: 'Writing Good Goals',
          content: `Write goals as if they've already been achieved:

"I run three times a week."
"My emergency fund has three months of expenses."
"I've published twelve YouTube videos this year."

This makes them concrete and measurable.`,
          examples: [
            "Add a goal under Health: I exercise consistently",
            "Create a goal for Finances: I'm debt free"
          ]
        },
        {
          title: 'Goals, Projects, Tasks',
          content: `Think of it like this:

Goals are the destination.
Projects are the vehicle.
Tasks are the fuel.

A goal like "Get fit" might have a project "Join a gym" with tasks like "Research gyms" and "Sign up for membership."`
        },
        {
          title: 'Keep It Simple',
          content: `You don't need many goals. Three to five meaningful goals per year is plenty.

Quality over quantity. One goal you actually work on beats ten goals gathering dust.`
        }
      ],
      overwhelmAlert: `Don't overthink this. Even one goal is enough to get started. You can add more anytime.`,
      exercise: `What's one goal that matters to you right now? Tell me and I'll add it.`,
      outro: `Now let's get everything out of your head. Say "continue" to learn about the brain dump.`
    }
  },

  'brain-dump': {
    id: 'brain-dump',
    title: 'The Brain Dump',
    description: 'Get all your tasks and projects out of your head',
    duration: 10,
    prerequisites: ['goals'],
    triggers: ['brain dump', 'dump', 'tasks', 'get it out', 'clear my head', 'everything'],
    content: {
      intro: `The brain dump is where you get everything out of your head and into the system.

Every task, every project, every worry - let's capture it all.`,
      sections: [
        {
          title: 'Simple Method',
          content: `Just tell me things as they come to mind:

"I need to call the dentist."
"Remind me to pick up groceries."
"I should work on the quarterly report."

I'll capture each one as a task. We can organize later.`,
          examples: [
            "Add: call mom this week",
            "I need to renew my passport",
            "Don't let me forget about the team meeting"
          ],
          method: 'simple'
        },
        {
          title: 'Tasks vs Projects',
          content: `As you dump, notice which items are single actions and which have multiple steps.

"Call the dentist" - that's a task.
"Get teeth fixed" - that's a project. It has research, appointments, follow-ups.

Tell me "that's a project" and I'll set it up with room for sub-tasks.`,
          method: 'advanced'
        },
        {
          title: 'Don\'t Filter Yet',
          content: `During a brain dump, don't judge what comes out.

Capture everything. Big things, small things, silly things.

We'll sort the important from the noise later.`
        }
      ],
      overwhelmAlert: `If you're feeling overwhelmed by how much is in your head, that's exactly why we're doing this. Getting it out is the first step to feeling lighter.`,
      exercise: `Take five minutes right now. Tell me everything on your mind. Every task, worry, idea. I'll capture them all.`,
      outro: `Great. Now you have it all captured. Next we'll process and organize. Say "continue" to learn about processing your inbox.`
    }
  },

  processing: {
    id: 'processing',
    title: 'Processing Your Inbox',
    description: 'Organize tasks with priorities and links',
    duration: 7,
    prerequisites: ['brain-dump'],
    triggers: ['process', 'inbox', 'organize', 'priority', 'sort', 'prioritize'],
    content: {
      intro: `Processing means taking your raw dump and making it actionable.

For each item, we ask a few questions.`,
      sections: [
        {
          title: 'The Questions',
          content: `For each task, consider:

Does it need a due date? Add one.
Does it belong to a project? Link it.
Which life area does it touch? Connect it.
Is it urgent? Important? Both? Neither?`
        },
        {
          title: 'The Priority Matrix',
          content: `I use a priority matrix:

Urgent and Important - do it now.
Important only - schedule it.
Urgent only - can it be batched or delegated?
Neither - is this even worth doing?

When you add priority, I'll help you focus on what matters.`,
          examples: [
            "Make that urgent and important",
            "Link that to the bathroom renovation project",
            "That's a Health and Fitness task"
          ]
        },
        {
          title: 'Voice Processing',
          content: `You can process conversationally:

"Jarvis, let's process my inbox."

I'll go through items with you, and you can assign details as we go.`,
          method: 'advanced'
        }
      ],
      overwhelmAlert: `You don't need to process everything perfectly. Good enough is good enough. You can always update items later.`,
      outro: `With tasks processed, let's talk about your daily rhythm. Say "continue" or "teach me about daily rhythm."`
    }
  },

  'daily-rhythm': {
    id: 'daily-rhythm',
    title: 'The Daily Rhythm',
    description: 'Morning briefings, check-ins, and evening wraps',
    duration: 8,
    prerequisites: ['processing'],
    triggers: ['daily', 'rhythm', 'routine', 'briefing', 'morning', 'evening', 'check-in'],
    content: {
      intro: `I can check in with you throughout the day. Here's how it works.`,
      sections: [
        {
          title: 'Morning Briefing',
          content: `The morning briefing is a five-minute overview of your day:

Your tasks for today.
Calendar events coming up.
Bills due soon.
Habits to track.
Any life area insights.

I speak it as a summary so you can listen while getting ready.`,
          examples: [
            "Jarvis, morning briefing",
            "What's on my plate today?",
            "Brief me"
          ]
        },
        {
          title: 'Midday Check-In',
          content: `Around midday, a quick pulse:

How's your day going?
Any tasks to update?
Anything new to capture?

Two minutes, keeps you on track.`
        },
        {
          title: 'Evening Wrap',
          content: `End of day, we review:

What got done.
What moves to tomorrow.
Capture any last thoughts.
Quick preview of tomorrow.

Helps you close the day clean.`
        },
        {
          title: 'Customizing',
          content: `All of these are optional. Enable what helps:

"Jarvis, enable morning briefings."
"I want check-ins at two PM."
"Skip evening wrap for now."

Start with one and add more if it helps.`,
          examples: [
            "Enable morning briefings",
            "Turn off midday check-ins",
            "Change briefing time to 7 AM"
          ]
        }
      ],
      overwhelmAlert: `You don't need all three. Most people start with just the morning briefing. Try one for a week.`,
      outro: `Now let's cover voice commands in more depth. Say "continue" when ready.`
    }
  },

  'voice-commands': {
    id: 'voice-commands',
    title: 'Voice Commands Effectively',
    description: 'Natural language patterns that work well',
    duration: 5,
    prerequisites: ['daily-rhythm'],
    triggers: ['commands', 'voice', 'how to say', 'what to say', 'phrases'],
    content: {
      intro: `You don't need to memorize commands. I understand natural language. But here are patterns that work well.`,
      sections: [
        {
          title: 'Queries',
          content: `For asking about things:

"What's on my plate today?"
"Do I have any bills due this week?"
"What are my top priorities?"
"How's my Health and Fitness life area doing?"`,
          examples: [
            "Show me overdue tasks",
            "What projects am I working on?",
            "Any habits I'm missing?"
          ]
        },
        {
          title: 'Actions',
          content: `For doing things:

"Add a task: description here"
"Mark task name as complete"
"Create a project called name"
"Mark the electric bill as paid"`,
          examples: [
            "Add: call mom tomorrow",
            "Done with the dentist appointment",
            "I paid the internet bill"
          ]
        },
        {
          title: 'Conversations',
          content: `For thinking together:

"I'm feeling overwhelmed, can you help me prioritize?"
"What should I focus on this week?"
"Help me plan my weekend."`,
          examples: [
            "I have too much to do",
            "What's most important right now?",
            "Plan my day for me"
          ]
        },
        {
          title: 'Natural Language',
          content: `The key: speak naturally. I understand context.

Don't say: "Add task priority urgent due date tomorrow call mom"
Do say: "I need to call my mom tomorrow, it's pretty urgent"

I'll figure out the structure.`
        }
      ],
      overwhelmAlert: `If you forget the "right way" to say something, just say it however comes naturally. I'll understand.`,
      outro: `Let's cover some specific features. Say "teach me about bills" or "teach me about habits" or "continue" for the next topic.`
    }
  },

  bills: {
    id: 'bills',
    title: 'Bills & Finances',
    description: 'Track bills and get payment reminders',
    duration: 5,
    prerequisites: ['voice-commands'],
    triggers: ['bills', 'bill', 'finances', 'payment', 'pay', 'money', 'due'],
    content: {
      intro: `I connect to your Notion Life OS bills database. Here's how to use it.`,
      sections: [
        {
          title: 'Adding Bills',
          content: `Add bills with the details:

"Add a bill: Netflix fifteen ninety-nine due on the fifteenth monthly."

I'll track the amount, due date, and recurrence.`,
          examples: [
            "Add bill: rent $1500 due first of month",
            "New bill: gym membership $30 monthly",
            "Track my phone bill: $80 due on the 20th"
          ]
        },
        {
          title: 'Checking Status',
          content: `Ask about your bills anytime:

"What bills are due this week?"
"What bills are unpaid?"
"How much do I owe this month?"

I'll give you the rundown.`,
          examples: [
            "Any bills overdue?",
            "What's coming up?",
            "Show me this month's bills"
          ]
        },
        {
          title: 'Marking Paid',
          content: `When you pay a bill:

"Mark Netflix as paid."
"I paid the electricity bill."

I'll update it and move on.`
        },
        {
          title: 'Reminders',
          content: `I'll nudge you before bills are due:

"Heads up - electricity bill is due in three days."

You can adjust how much notice you want or turn off bill reminders.`
        }
      ],
      overwhelmAlert: `You don't need to add all your bills at once. Start with the ones you sometimes forget.`,
      outro: `Next up: habits. Say "continue" or "teach me about habits."`
    }
  },

  habits: {
    id: 'habits',
    title: 'Habits & Life Area Tracking',
    description: 'Track recurring behaviors and life balance',
    duration: 5,
    prerequisites: ['bills'],
    triggers: ['habits', 'habit', 'streak', 'tracking', 'routine', 'balance'],
    content: {
      intro: `Habits are the recurring behaviors that shape your life. Exercise, reading, meditation - whatever matters to you.`,
      sections: [
        {
          title: 'Tracking Habits',
          content: `When you complete a habit, just tell me:

"I exercised today."
"Did my morning meditation."
"Journaled."

I'll log it and track your streak.`,
          examples: [
            "I went to the gym",
            "Completed my reading",
            "Skip today's meditation"
          ]
        },
        {
          title: 'Checking Streaks',
          content: `Ask about your progress:

"How's my exercise streak?"
"What habits am I missing this week?"
"Show me my habit progress."`,
          examples: [
            "Am I on track with my habits?",
            "What's my longest streak?",
            "Habit summary"
          ]
        },
        {
          title: 'Life Area Awareness',
          content: `I track activity across your life areas over a twenty-eight day window.

If you haven't engaged with a life area in a while, I might mention it:

"I've noticed you haven't touched Personal Growth lately. Everything okay?"

Not judgy. Just aware. You decide if it matters.`
        }
      ],
      overwhelmAlert: `Start with one or two habits you really want to build. Don't try to track everything.`,
      outro: `One more important topic: memory. Say "continue" or "teach me about memory."`
    }
  },

  memory: {
    id: 'memory',
    title: 'Jarvis\'s Memory',
    description: 'How persistent memory works',
    duration: 5,
    prerequisites: ['habits'],
    triggers: ['memory', 'remember', 'forget', 'know about me', 'what you know'],
    content: {
      intro: `I have persistent memory. What you tell me, I remember across our conversations.`,
      sections: [
        {
          title: 'Telling Me Things',
          content: `You can explicitly tell me to remember:

"Remember that I prefer morning meetings."
"Keep in mind my dentist is Doctor Smith."
"I always take Wednesdays off."

I'll store it and use it naturally in future conversations.`,
          examples: [
            "Remember that I'm vegetarian",
            "My anniversary is June 15th",
            "I work from home on Fridays"
          ]
        },
        {
          title: 'What I Notice',
          content: `I also notice patterns over time:

You're most productive in the morning.
You prefer brief responses.
You work on creative projects on weekends.

I'll adapt to these patterns without necessarily announcing them.`
        },
        {
          title: 'Conversation Continuity',
          content: `I remember what we talked about:

Yesterday's conversation.
Last week's priorities.
Ongoing projects and their status.

You can reference past conversations naturally.`,
          examples: [
            "What did I tell you about the project?",
            "What were my priorities last week?",
            "Did I mention the dentist appointment?"
          ]
        },
        {
          title: 'Memory Control',
          content: `You control your memory:

"What do you know about me?" - I'll list highlights.
"Forget that I said X" - I'll remove it.
"Clear all memories" - Nuclear option, requires confirmation.`,
          examples: [
            "What do you remember?",
            "Forget about the dentist",
            "Delete all memories"
          ]
        }
      ],
      overwhelmAlert: `You don't need to actively manage memory. Just talk to me normally, and I'll remember what's important.`,
      outro: `One last thing: what to do when you're overwhelmed. Say "continue" for the final module.`
    }
  },

  overwhelm: {
    id: 'overwhelm',
    title: 'Overwhelm Recovery',
    description: 'What to do when everything is too much',
    duration: 3,
    prerequisites: ['memory'],
    triggers: ['overwhelm', 'overwhelmed', 'too much', 'stressed', 'can\'t handle', 'help me'],
    content: {
      intro: `I'm designed for people who get overwhelmed. That's the whole point. So let's talk about what to do when it happens.`,
      sections: [
        {
          title: 'Overwhelmed by Jarvis',
          content: `If Jarvis itself feels like too much:

Turn off briefings temporarily.
Just use voice for simple tasks.
Ignore the dashboard.
Say: "Jarvis, I'm overwhelmed, help me simplify."

I'll dial back and focus on essentials.`
        },
        {
          title: 'Overwhelmed by Life',
          content: `If everything feels like too much:

"Jarvis, I can't handle all this. What's the ONE thing I should do?"
"Help me pick just three things for today."
"Everything feels urgent, can you help me sort?"

I'll help you triage and focus.`,
          examples: [
            "Too much on my plate",
            "What's most important?",
            "Help me focus"
          ]
        },
        {
          title: 'What I Won\'t Do',
          content: `I won't add to your stress:

No guilt about missed tasks.
No judgment about ignored items.
No pressure to use every feature.

I'm here to help, not to nag.`
        }
      ],
      overwhelmAlert: `If you're overwhelmed right now, just say "help me focus" and I'll guide you to one thing.`,
      outro: `That's the core tutorial. You're ready to use Jarvis. Say "show me advanced features" when you want to go deeper, or just start using me naturally.`
    }
  },

  advanced: {
    id: 'advanced',
    title: 'Advanced Features',
    description: 'Features to explore when ready',
    duration: 3,
    prerequisites: ['overwhelm'],
    triggers: ['advanced', 'more features', 'power user', 'what else'],
    content: {
      intro: `These are features to explore once you're comfortable with the basics.`,
      sections: [
        {
          title: 'Weekly Reviews',
          content: `A full weekly planning session with me.

Factual retrospective of what happened.
Forward planning for the coming week.
Horizon scan for what's coming up.

Say "start weekly review" when ready.`
        },
        {
          title: 'Time Tracking',
          content: `Track time spent on projects.

Start a timer when working.
See reports of where your time goes.
Useful for client work or self-awareness.`
        },
        {
          title: 'Calendar Integration',
          content: `I can see your Notion Calendar.

Events show up in briefings.
I'll remind you before meetings.
Time blocks appear on the timeline.`
        },
        {
          title: 'Coming Soon',
          content: `In future versions:

Telegram control - message me from anywhere.
Custom briefing sections - see what you want.
Goal progress tracking - percentage toward targets.
Automated workflows - let me handle routine tasks.`
        }
      ],
      overwhelmAlert: `Don't rush to these. Master the basics first. These features will be here when you need them.`,
      outro: `That's everything. You now know how to use Jarvis. Just talk to me, and we'll figure out the rest together.`
    }
  }
};

/**
 * Module sequence for guided tutorial
 */
export const TUTORIAL_SEQUENCE: TutorialModuleId[] = [
  'welcome',
  'navigation',
  'life-areas',
  'goals',
  'brain-dump',
  'processing',
  'daily-rhythm',
  'voice-commands',
  'bills',
  'habits',
  'memory',
  'overwhelm',
  'advanced'
];

/**
 * Find module by trigger keyword
 */
export function findModuleByTrigger(query: string): TutorialModule | undefined {
  const lowerQuery = query.toLowerCase();

  for (const module of Object.values(TUTORIAL_MODULES)) {
    for (const trigger of module.triggers) {
      if (lowerQuery.includes(trigger)) {
        return module;
      }
    }
  }

  return undefined;
}

/**
 * Get next module in sequence
 */
export function getNextModule(completedModules: TutorialModuleId[]): TutorialModule | undefined {
  for (const moduleId of TUTORIAL_SEQUENCE) {
    if (!completedModules.includes(moduleId)) {
      return TUTORIAL_MODULES[moduleId];
    }
  }
  return undefined;
}

/**
 * Check if prerequisites are met for a module
 */
export function hasCompletedPrerequisites(
  moduleId: TutorialModuleId,
  completedModules: TutorialModuleId[]
): boolean {
  const module = TUTORIAL_MODULES[moduleId];
  return module.prerequisites.every(prereq => completedModules.includes(prereq));
}
