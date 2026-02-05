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

// ─── Financial Cluster Lessons ───────────────────────────────────────────────

const budgetsIntro: LessonContent = {
  lessonId: 'budgets-intro',
  intro:
    "Let's get your budgets set up. Budgets give you a clear picture of where your money goes — and where you want it to go instead.",
  steps: [
    {
      title: 'Budget Categories',
      narration:
        'Open your Budgets database in Notion. You\'ll see categories like Housing, Food, Transport, and Entertainment. Each one has a monthly limit you can customize. Ready for the next step?',
      panelNote: 'Open Budgets in Notion',
    },
    {
      title: 'Setting Spending Limits',
      narration:
        'For each category, set a realistic monthly limit. Start with what you actually spend, then adjust over time. The goal is awareness first, optimization later. Ready for the next step?',
      panelNote: 'Set your monthly limits',
    },
    {
      title: 'Tracking Subscriptions',
      narration:
        'Subscriptions are sneaky budget drains. Add each recurring subscription — streaming services, apps, memberships — so you can see the total. You might be surprised how they add up. Ready for the next step?',
      panelNote: 'List your subscriptions',
    },
    {
      title: 'Reviewing Spending vs Budget',
      narration:
        "At the end of each month, compare your actual spending to your limits. Look for categories where you consistently overspend — that's where small changes make the biggest difference.",
      panelNote: 'Compare actual vs planned',
    },
  ],
  outro:
    "Your budget framework is in place! Review it monthly and adjust as your life changes. You can ask me anytime to show your budget summary.",
};

const incomeTracking: LessonContent = {
  lessonId: 'income-tracking',
  intro:
    "Let's set up income tracking. Knowing exactly what comes in is just as important as knowing what goes out.",
  steps: [
    {
      title: 'Income Sources',
      narration:
        'Open your Income database in Notion. Each entry represents a source of income — your salary, freelance work, side projects, or investments. Add all your current income streams. Ready for the next step?',
      panelNote: 'Open Income in Notion',
    },
    {
      title: 'Logging Payments',
      narration:
        'When money comes in, log it with the amount, date, and source. You can tell me too — say "log income of $3,000 from salary" and I\'ll record it. Ready for the next step?',
      panelNote: 'Log a recent payment',
    },
    {
      title: 'Recurring Income',
      narration:
        'For regular income like a salary, mark it as recurring so you can forecast ahead. This helps you plan for months when irregular income might dip. Ready for the next step?',
      panelNote: 'Mark recurring sources',
    },
    {
      title: 'Income vs Expenditure',
      narration:
        "The overview shows your total income against total expenses. A positive gap means you're saving. If the gap is tight, your budget categories will show you where to trim.",
      panelNote: 'Check your net balance',
    },
  ],
  outro:
    "Nice! You now have full visibility on your income. Pair this with your budget to get a complete financial picture.",
};

const expensesOverview: LessonContent = {
  lessonId: 'expenses-overview',
  intro:
    "Let's explore expense tracking. Logging what you spend helps you make intentional choices with your money.",
  steps: [
    {
      title: 'Expense Categories',
      narration:
        'Your Expenses database organizes spending by category — groceries, dining, transport, shopping, and more. Each entry captures what you spent, when, and on what. Ready for the next step?',
      panelNote: 'Open Expenses in Notion',
    },
    {
      title: 'Logging Expenses',
      narration:
        'Add expenses as they happen. You can tell me — say "log expense of $45 for groceries" and I\'ll capture it. The more consistent you are, the better your spending picture becomes. Ready for the next step?',
      panelNote: 'Log a recent expense',
    },
    {
      title: 'Recurring vs One-Off',
      narration:
        'Some expenses repeat monthly — rent, utilities, subscriptions. Others are one-off. Tagging which is which helps you see your fixed costs versus flexible spending. Ready for the next step?',
      panelNote: 'Tag recurring expenses',
    },
    {
      title: 'Spotting Spending Patterns',
      narration:
        "After a few weeks of logging, patterns emerge. Maybe you spend more on weekends, or dining out adds up faster than you thought. These insights are the real value of tracking.",
      panelNote: 'Look for patterns',
    },
  ],
  outro:
    "You're set up to track expenses! Even logging a few times a week builds powerful awareness over time. Ask me to show your recent spending anytime.",
};

const invoicesIntro: LessonContent = {
  lessonId: 'invoices-intro',
  intro:
    "Let's look at invoice management. If you do any freelance or client work, invoices keep your billing organized and professional.",
  steps: [
    {
      title: 'Invoice Basics',
      narration:
        'Open your Invoices database in Notion. Each invoice has a client, amount, date, and payment status. This is your single source of truth for who owes you what. Ready for the next step?',
      panelNote: 'Open Invoices in Notion',
    },
    {
      title: 'Creating an Invoice',
      narration:
        'To create an invoice, add a new entry with the client name, line items, total amount, and due date. You can use the template to keep formatting consistent across all your invoices. Ready for the next step?',
      panelNote: 'Create a sample invoice',
    },
    {
      title: 'Tracking Payment Status',
      narration:
        'Each invoice moves through statuses — Draft, Sent, Paid, or Overdue. Update the status as payments come in so you always know your outstanding balance at a glance. Ready for the next step?',
      panelNote: 'Update a status',
    },
    {
      title: 'Linking to Clients',
      narration:
        "Link each invoice to a client in your CRM database. This way you can see all invoices for a specific client in one place — great for tracking payment history and spotting late payers.",
      panelNote: 'Link to a client',
    },
  ],
  outro:
    "Your invoicing system is ready! Keep statuses updated and you'll always know exactly where your money stands. Ask me to show outstanding invoices anytime.",
};

// ─── Knowledge Cluster Lessons ──────────────────────────────────────────────

const notesIntro: LessonContent = {
  lessonId: 'notes-intro',
  intro:
    "Let's set up your Notes system. Notes are your second brain — a place to capture ideas, references, and anything worth remembering.",
  steps: [
    {
      title: 'The Notes Database',
      narration:
        'Open your Notes database in Notion. This is where all your notes live — meeting notes, ideas, research, bookmarks, anything. Each note is a page you can fill with rich content. Ready for the next step?',
      panelNote: 'Open Notes in Notion',
    },
    {
      title: 'Creating a Note',
      narration:
        'Add a new note by creating an entry. Give it a clear title — "Meeting with Sarah" or "App idea: habit streaks". The more descriptive the title, the easier it is to find later. Ready for the next step?',
      panelNote: 'Create a quick note',
    },
    {
      title: 'Organizing with Tags',
      narration:
        'Use tags or notebooks to group related notes. Tags like "work", "personal", or "research" let you filter your notes quickly. You can add multiple tags to a single note. Ready for the next step?',
      panelNote: 'Add tags to a note',
    },
    {
      title: 'Quick Capture',
      narration:
        "When an idea strikes, speed matters. You can tell me — say \"save a note about...\" and I'll capture it instantly. Polish it later in Notion. The important thing is never losing an idea.",
      panelNote: 'Try voice capture',
    },
  ],
  outro:
    "Your Notes system is live! Capture freely and organize later. The best note system is one you actually use, so keep it simple.",
};

const journalIntro: LessonContent = {
  lessonId: 'journal-intro',
  intro:
    "Let's explore journaling. A daily journal helps you process thoughts, track your mood, and notice patterns in your life.",
  steps: [
    {
      title: 'Daily Journaling',
      narration:
        'Your Journal database is designed for daily entries. Each entry captures your thoughts, wins, challenges, and reflections for the day. Even a few sentences is valuable. Ready for the next step?',
      panelNote: 'Open Journal in Notion',
    },
    {
      title: 'Creating an Entry',
      narration:
        'Start a new journal entry for today. Write freely — there\'s no wrong way to journal. Some people write about their day, others focus on gratitude or lessons learned. Ready for the next step?',
      panelNote: 'Write today\'s entry',
    },
    {
      title: 'Reflection Prompts',
      narration:
        'If you\'re not sure what to write, use prompts. "What went well today?", "What did I learn?", or "What am I grateful for?" are great starters. You can ask me for a prompt anytime. Ready for the next step?',
      panelNote: 'Try a prompt',
    },
    {
      title: 'Reviewing Past Entries',
      narration:
        "The magic of journaling shows up over time. Scroll back through past entries to spot recurring themes, track how challenges resolved, and appreciate how far you've come.",
      panelNote: 'Read a past entry',
    },
  ],
  outro:
    "Your journal is ready! Even two minutes a day builds a powerful record of your life. Ask me for a writing prompt whenever you need one.",
};

const crmIntro: LessonContent = {
  lessonId: 'crm-intro',
  intro:
    "Let's set up your CRM — your personal database for managing relationships. Whether it's clients, friends, or networking contacts, this keeps everyone organized.",
  steps: [
    {
      title: 'The Contact Database',
      narration:
        'Open your CRM database in Notion. Each entry is a person or organization with details like name, email, company, and relationship type. Think of it as your enhanced address book. Ready for the next step?',
      panelNote: 'Open CRM in Notion',
    },
    {
      title: 'Adding People',
      narration:
        'Add your key contacts — clients, collaborators, mentors, anyone you interact with regularly. Include notes about how you met or what you discussed. These details matter months later. Ready for the next step?',
      panelNote: 'Add a few contacts',
    },
    {
      title: 'Tracking Interactions',
      narration:
        'Log interactions with your contacts — calls, meetings, emails. This creates a timeline so you can see when you last connected with someone and what you discussed. Ready for the next step?',
      panelNote: 'Log an interaction',
    },
    {
      title: 'Relationship Maintenance',
      narration:
        "Set follow-up reminders for important contacts. You can tell me — say \"remind me to check in with Sarah next week\". Relationships grow when you show up consistently.",
      panelNote: 'Set a follow-up',
    },
  ],
  outro:
    "Your CRM is set up! Nurture your relationships by logging interactions and following up regularly. Ask me to show your contacts or set reminders anytime.",
};

const topicsIntro: LessonContent = {
  lessonId: 'topics-intro',
  intro:
    "Let's explore Topics — your system for organizing knowledge by subject. Topics connect related notes, resources, and projects into a structured knowledge base.",
  steps: [
    {
      title: 'Topic Organization',
      narration:
        'Open your Topics database in Notion. Each topic is a subject area you care about — like "Marketing", "Cooking", or "Machine Learning". Topics act as containers for related knowledge. Ready for the next step?',
      panelNote: 'Open Topics in Notion',
    },
    {
      title: 'Saving Resources',
      narration:
        'When you find a useful article, video, or tool, save it under the relevant topic. Add a quick note about why it\'s useful. Over time, each topic becomes a curated resource library. Ready for the next step?',
      panelNote: 'Save a resource',
    },
    {
      title: 'Linking to Projects',
      narration:
        'Topics can link to related projects. Working on a website redesign? Link it to your "Design" topic. This creates a web of connections that makes your knowledge actionable. Ready for the next step?',
      panelNote: 'Link a topic to a project',
    },
    {
      title: 'Building a Knowledge Base',
      narration:
        "As you add notes and resources to topics over weeks and months, you're building a personal knowledge base. It becomes your go-to reference for any subject you've explored.",
      panelNote: 'Grow it over time',
    },
  ],
  outro:
    "Your Topics system is ready! Start with 3-5 topics you're actively interested in and grow from there. A little curation goes a long way.",
};

// ─── Tracking Cluster Lessons ───────────────────────────────────────────────

const workoutsIntro: LessonContent = {
  lessonId: 'workouts-intro',
  intro:
    "Let's set up your Workout Tracker. Logging your exercise helps you stay consistent and see real progress over time.",
  steps: [
    {
      title: 'Logging Sessions',
      narration:
        'Open your Workouts database in Notion. Each entry is a workout session with the date, type, duration, and notes. After each workout, add an entry to build your history. Ready for the next step?',
      panelNote: 'Open Workouts in Notion',
    },
    {
      title: 'Exercise Types',
      narration:
        'Categorize your workouts — weights, cardio, yoga, sports, or classes. This lets you see how balanced your routine is and make sure you\'re hitting all the areas you care about. Ready for the next step?',
      panelNote: 'Pick your categories',
    },
    {
      title: 'Tracking Progress',
      narration:
        'For strength training, log weights and reps. For cardio, log distance or time. You can tell me — say "log a 30 minute run" and I\'ll record it. Small improvements add up fast. Ready for the next step?',
      panelNote: 'Log today\'s workout',
    },
    {
      title: 'Reviewing History',
      narration:
        "Use the calendar or timeline view to see your workout frequency. Look for patterns — are you consistent? Are rest days balanced? Your history tells the real story of your fitness journey.",
      panelNote: 'Check your consistency',
    },
  ],
  outro:
    "Your Workout Tracker is live! Consistency beats intensity, so just focus on showing up. Ask me to log workouts by voice to make it effortless.",
};

const mealsIntro: LessonContent = {
  lessonId: 'meals-intro',
  intro:
    "Let's explore the Meal Planner. Planning meals ahead saves time, money, and the daily stress of figuring out what to eat.",
  steps: [
    {
      title: 'Weekly Meal Plan',
      narration:
        'Open your Meals database in Notion. The weekly view shows each day with slots for breakfast, lunch, dinner, and snacks. Fill these in at the start of each week to plan ahead. Ready for the next step?',
      panelNote: 'Open Meals in Notion',
    },
    {
      title: 'Adding Meals',
      narration:
        'Add meals by name — "Chicken stir-fry", "Overnight oats", or even "Leftovers". Keep it simple. The goal is knowing what you\'re eating, not creating a cookbook. Ready for the next step?',
      panelNote: 'Plan a few meals',
    },
    {
      title: 'Linking Recipes',
      narration:
        'If you have favorite recipes, link them to your meal entries. Paste a URL or write out the steps. Next time you plan that meal, everything you need is right there. Ready for the next step?',
      panelNote: 'Attach a recipe',
    },
    {
      title: 'Shopping from Ingredients',
      narration:
        "Once your week is planned, scan the ingredients to build your shopping list. Some people add a shopping list property right on the meal plan. No more wandering the grocery store wondering what to buy.",
      panelNote: 'Build a shopping list',
    },
  ],
  outro:
    "Your Meal Planner is set! Even planning just dinners for the week makes a huge difference. You can ask me to help brainstorm meal ideas anytime.",
};

const timesheetsIntro: LessonContent = {
  lessonId: 'timesheets-intro',
  intro:
    "Let's set up Timesheets. Tracking your time reveals where your hours actually go — essential for freelancers and anyone who wants to work more intentionally.",
  steps: [
    {
      title: 'Time Entries',
      narration:
        'Open your Timesheets database in Notion. Each entry records a block of time — what you worked on, how long, and when. Think of it as a log of how you spend your working hours. Ready for the next step?',
      panelNote: 'Open Timesheets in Notion',
    },
    {
      title: 'Logging Hours',
      narration:
        'After a work session, log your hours. Include the start time, duration, and a brief description. You can tell me — say "log 2 hours on the website redesign" and I\'ll record it. Ready for the next step?',
      panelNote: 'Log a time entry',
    },
    {
      title: 'Linking to Projects',
      narration:
        'Connect time entries to projects so you can see how much time each project consumes. This is critical for billing clients accurately and understanding where your effort goes. Ready for the next step?',
      panelNote: 'Link to a project',
    },
    {
      title: 'Reviewing Time Allocation',
      narration:
        "At the end of each week, review where your time went. Are you spending hours on the right things? Time tracking data often reveals surprising gaps between intention and reality.",
      panelNote: 'Review your week',
    },
  ],
  outro:
    "Your Timesheets are ready! Track consistently for a week and you'll gain real insight into how you spend your time. Ask me to log hours by voice anytime.",
};

const daysIntro: LessonContent = {
  lessonId: 'days-intro',
  intro:
    "Let's explore the Daily Log. This is your space to capture each day — what happened, how you felt, and what stood out.",
  steps: [
    {
      title: 'Daily Log Entries',
      narration:
        'Open your Daily Log database in Notion. Each entry represents one day and captures highlights, mood, energy level, and any notes. It\'s a lightweight diary of your life. Ready for the next step?',
      panelNote: 'Open Daily Log in Notion',
    },
    {
      title: 'Rating Your Day',
      narration:
        'Give each day a simple rating — great, good, okay, or tough. This one data point, tracked over weeks, reveals patterns in your wellbeing you\'d never notice otherwise. Ready for the next step?',
      panelNote: 'Rate today',
    },
    {
      title: 'Capturing Highlights',
      narration:
        'Jot down 1-3 highlights from the day. A good conversation, a task completed, something that made you smile. These highlights become a gratitude log you can look back on. Ready for the next step?',
      panelNote: 'Note today\'s highlights',
    },
    {
      title: 'Spotting Patterns Over Time',
      narration:
        "After a few weeks, look at your day ratings and highlights together. You'll start to see what makes a good day for you — and what drains your energy. Use those insights to design better days.",
      panelNote: 'Look for trends',
    },
  ],
  outro:
    "Your Daily Log is set! It takes just a minute each evening. Over time, it becomes one of the most valuable databases in your system.",
};

// ─── Planning Cluster Lessons ───────────────────────────────────────────────

const goalsIntro: LessonContent = {
  lessonId: 'goals-intro',
  intro:
    "Let's set up your Goals. Goals turn vague ambitions into clear targets with measurable progress — the bridge between dreaming and doing.",
  steps: [
    {
      title: 'The Goals Database',
      narration:
        'Open your Goals database in Notion. Each goal has a title, target date, status, and linked area. This is where you define what you want to achieve in the coming months. Ready for the next step?',
      panelNote: 'Open Goals in Notion',
    },
    {
      title: 'Creating a Goal',
      narration:
        'Add a goal with a clear, specific outcome — "Run a 5K by June" is better than "Get fit". Include a target date to create urgency. You can tell me — say "add a goal to..." and I\'ll set it up. Ready for the next step?',
      panelNote: 'Create a specific goal',
    },
    {
      title: 'Linking to Projects and Areas',
      narration:
        'Connect your goal to a life area and any related projects. "Run a 5K" links to Health and your Running Training project. These connections make your system work as a whole. Ready for the next step?',
      panelNote: 'Link goal to area',
    },
    {
      title: 'Tracking Progress',
      narration:
        "Update your goal's progress regularly — weekly works well. Move the status from Not Started to In Progress, and eventually to Achieved. Celebrate your wins along the way.",
      panelNote: 'Update your progress',
    },
  ],
  outro:
    "Your Goals database is ready! Start with 2-3 goals that truly matter to you. Focus beats volume every time. Ask me to show your goals anytime.",
};

const yearsIntro: LessonContent = {
  lessonId: 'years-intro',
  intro:
    "Let's explore Yearly Planning. Zooming out to the year level helps you set direction and make sure your daily actions align with your bigger vision.",
  steps: [
    {
      title: 'Year Pages',
      narration:
        'Open your Years database in Notion. Each year gets its own page where you capture your theme, major goals, and key milestones. Start by creating or reviewing this year\'s page. Ready for the next step?',
      panelNote: 'Open Years in Notion',
    },
    {
      title: 'Annual Themes',
      narration:
        'Instead of rigid resolutions, pick a theme for the year — "Growth", "Simplify", or "Build". A theme guides your decisions without the pressure of pass-or-fail goals. Ready for the next step?',
      panelNote: 'Pick your theme',
    },
    {
      title: 'Quarterly Milestones',
      narration:
        'Break the year into quarters and set 2-3 milestones for each. Q1 might be "Launch the podcast", Q2 "Hire an assistant". Quarterly chunks feel manageable and keep momentum. Ready for the next step?',
      panelNote: 'Set quarterly targets',
    },
    {
      title: 'Year in Review',
      narration:
        "At year's end, review what you accomplished, what surprised you, and what you'd do differently. This reflection makes next year's planning far more effective.",
      panelNote: 'Reflect at year-end',
    },
  ],
  outro:
    "Your yearly planning system is in place! Review it quarterly to stay on track. A year is both shorter and longer than you think — plan accordingly.",
};

const wheelIntro: LessonContent = {
  lessonId: 'wheel-intro',
  intro:
    "Let's explore the Wheel of Life. This is a simple but powerful tool for assessing balance across the key areas of your life.",
  steps: [
    {
      title: 'Life Balance Assessment',
      narration:
        'The Wheel of Life divides your life into areas like Health, Career, Relationships, Finance, Fun, and Growth. Open it in Notion and take a look at the categories. Ready for the next step?',
      panelNote: 'Open Wheel of Life',
    },
    {
      title: 'Scoring Each Area',
      narration:
        'Rate each area from 1 to 10 based on how satisfied you feel right now. Be honest — this is for you, not anyone else. There are no wrong answers. Ready for the next step?',
      panelNote: 'Rate 1-10 per area',
    },
    {
      title: 'Spotting Imbalances',
      narration:
        'Look at your scores together. A "lumpy" wheel — high in some areas, low in others — shows where life feels off balance. Areas scoring below 5 deserve attention. Ready for the next step?',
      panelNote: 'Find the low scores',
    },
    {
      title: 'Planning Improvements',
      narration:
        "Pick 1-2 low-scoring areas and create a goal or project to improve them. Small actions in neglected areas often have the biggest impact on overall life satisfaction.",
      panelNote: 'Create an action plan',
    },
  ],
  outro:
    "Your Wheel of Life is ready! Revisit it monthly or quarterly to track how your balance shifts. Even small improvements in low areas feel transformative.",
};

const dreamsIntro: LessonContent = {
  lessonId: 'dreams-intro',
  intro:
    "Let's set up your Dreams database. Dreams are your biggest aspirations — the things you want to experience, achieve, or become someday.",
  steps: [
    {
      title: 'The Aspirations Database',
      narration:
        'Open your Dreams database in Notion. Unlike goals with deadlines, dreams are open-ended visions — "Write a book", "Visit Japan", "Start a business". Capture them all without filtering. Ready for the next step?',
      panelNote: 'Open Dreams in Notion',
    },
    {
      title: 'Capturing Big Dreams',
      narration:
        'Write down everything you dream of doing, no matter how big or distant. Travel, career milestones, creative projects, lifestyle changes — get them out of your head and into the database. Ready for the next step?',
      panelNote: 'Dream big, write freely',
    },
    {
      title: 'Connecting to Goals',
      narration:
        'When you\'re ready to act on a dream, link it to a specific goal. "Write a book" becomes the goal "Write first draft by December". Dreams inspire, goals execute. Ready for the next step?',
      panelNote: 'Link a dream to a goal',
    },
    {
      title: 'Visualization',
      narration:
        "Add images, descriptions, or inspiration to your dreams. The more vivid they feel, the more they pull you forward. Revisit your dreams list regularly to stay connected to what truly excites you.",
      panelNote: 'Make dreams vivid',
    },
  ],
  outro:
    "Your Dreams database is alive! Let it grow freely — some dreams will become goals, others will evolve, and new ones will appear. That's the beauty of it.",
};

// ─── Business Cluster Lessons ───────────────────────────────────────────────

const contentIntro: LessonContent = {
  lessonId: 'content-intro',
  intro:
    "Let's explore Content Management. If you create content — blogs, videos, newsletters, or social posts — this system keeps your pipeline organized from idea to published.",
  steps: [
    {
      title: 'The Content Pipeline',
      narration:
        'Open your Content database in Notion. Each entry is a piece of content with a title, type, status, and publish date. The board view shows content flowing from Idea to Draft to Published. Ready for the next step?',
      panelNote: 'Open Content in Notion',
    },
    {
      title: 'Creating Content Entries',
      narration:
        'When you have a content idea, add it immediately — title, type, and a quick outline. Don\'t wait for it to be perfect. You can tell me — say "add content idea about..." and I\'ll capture it. Ready for the next step?',
      panelNote: 'Capture an idea',
    },
    {
      title: 'Tracking Status',
      narration:
        'Move content through your pipeline: Idea, Drafting, Editing, Ready, Published. This makes it easy to see what needs writing, what needs review, and what\'s ready to go. Ready for the next step?',
      panelNote: 'Update a status',
    },
    {
      title: 'Linking to Channels',
      narration:
        "Connect each piece of content to the channel it's published on — blog, YouTube, newsletter, social. This shows you which channels get the most content and which need more attention.",
      panelNote: 'Link to a channel',
    },
  ],
  outro:
    "Your content pipeline is set! Capture ideas fast, move them through the stages, and you'll never run out of things to publish. Ask me to show your content queue anytime.",
};

const clientsIntro: LessonContent = {
  lessonId: 'clients-intro',
  intro:
    "Let's set up your Client Portal. This keeps all your client relationships, deliverables, and billing in one organized place.",
  steps: [
    {
      title: 'The Client Database',
      narration:
        'Open your Clients database in Notion. Each client has a profile with contact info, project history, and current status. This is your home base for managing client relationships. Ready for the next step?',
      panelNote: 'Open Clients in Notion',
    },
    {
      title: 'Adding Clients',
      narration:
        'Add each client with their name, company, contact details, and any relevant notes. Include how you acquired them and what services they need. This context is gold for future interactions. Ready for the next step?',
      panelNote: 'Add a client profile',
    },
    {
      title: 'Tracking Deliverables',
      narration:
        'For each client, track what you\'ve promised and what you\'ve delivered. Link tasks and projects to the client so nothing falls through the cracks. Ready for the next step?',
      panelNote: 'Link deliverables',
    },
    {
      title: 'Linking Invoices',
      narration:
        "Connect invoices to their client. This gives you a complete billing history per client — what's been paid, what's outstanding, and your total revenue from each relationship.",
      panelNote: 'Connect invoices',
    },
  ],
  outro:
    "Your Client Portal is ready! Professional client management builds trust and keeps projects running smoothly. Ask me to show your client list anytime.",
};

const channelsIntro: LessonContent = {
  lessonId: 'channels-intro',
  intro:
    "Let's explore Channels. This is where you manage your social media presence and content distribution across platforms.",
  steps: [
    {
      title: 'Social Channels',
      narration:
        'Open your Channels database in Notion. Each entry represents a platform — Twitter, Instagram, LinkedIn, YouTube, your blog. Track follower counts, posting frequency, and engagement. Ready for the next step?',
      panelNote: 'Open Channels in Notion',
    },
    {
      title: 'Tweet and Post Drafts',
      narration:
        'Draft your social posts right in Notion. Write tweets, captions, or threads and refine them before publishing. Having a backlog of ready-to-post content removes daily pressure. Ready for the next step?',
      panelNote: 'Draft a post',
    },
    {
      title: 'Content Scheduling',
      narration:
        'Plan when to publish each piece. Add a scheduled date to your drafts and use the calendar view to visualize your posting rhythm. Consistency matters more than volume. Ready for the next step?',
      panelNote: 'Schedule your posts',
    },
    {
      title: 'Cross-Posting',
      narration:
        "Repurpose content across channels. A blog post becomes a Twitter thread, an Instagram carousel, and a LinkedIn article. Link related content entries to see your cross-posting opportunities.",
      panelNote: 'Repurpose across platforms',
    },
  ],
  outro:
    "Your Channels system is set! Plan your content, draft ahead, and post consistently. Ask me to help brainstorm post ideas or check your content calendar anytime.",
};

// ─── Content Map ─────────────────────────────────────────────────────────────

export const LESSON_CONTENT: Record<string, LessonContent> = {
  // Daily Action
  'tasks-overview': tasksOverview,
  'tasks-create': tasksCreate,
  'projects-overview': projectsOverview,
  'habits-intro': habitsIntro,
  'areas-intro': areasIntro,
  // Financial
  'budgets-intro': budgetsIntro,
  'income-tracking': incomeTracking,
  'expenses-overview': expensesOverview,
  'invoices-intro': invoicesIntro,
  // Knowledge
  'notes-intro': notesIntro,
  'journal-intro': journalIntro,
  'crm-intro': crmIntro,
  'topics-intro': topicsIntro,
  // Tracking
  'workouts-intro': workoutsIntro,
  'meals-intro': mealsIntro,
  'timesheets-intro': timesheetsIntro,
  'days-intro': daysIntro,
  // Planning
  'goals-intro': goalsIntro,
  'years-intro': yearsIntro,
  'wheel-intro': wheelIntro,
  'dreams-intro': dreamsIntro,
  // Business
  'content-intro': contentIntro,
  'clients-intro': clientsIntro,
  'channels-intro': channelsIntro,
};

/** Get lesson content by ID. Returns undefined for lessons without content yet. */
export function getLessonContent(lessonId: string): LessonContent | undefined {
  return LESSON_CONTENT[lessonId];
}
