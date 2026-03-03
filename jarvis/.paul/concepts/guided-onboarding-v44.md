# v4.4 Guided Onboarding — Academy-Driven

> "Instead of building onboarding in a vacuum and hoping it works, I go through it live with Jarvis in Academy mode. We fix what breaks in real-time and iterate until it's smooth. The Academy becomes both the delivery mechanism AND the QA process."
> — Jonathan, March 2026

**Status:** Concept documented, ready for milestone planning
**Origin:** Planning session, 2026-03-02
**Depends on:** ~~GITHUB_TOKEN + GITHUB_OWNER set in Vercel~~ DONE (2026-03-01)

---

## 1. The Vision

**The problem:** Jarvis has a powerful brain (v4.0), teaching engine (v4.3), full dashboard (v4.0 E), onboarding wizard (E-05), and Telegram bot — but when you open the app, you hit the legacy orb at `/jarvis`. The new dashboard at `/jarvis/app` has never been walked through by a real user. The onboarding wizard exists but nobody's triggered it in production. The tutorials exist but they've never fired. The Academy is built but the GitHub token isn't set. It's all plumbing with no water flowing.

**The solution:** A milestone focused on making everything *reachable and usable*. But not by building in a vacuum — by using the Academy framework itself as the delivery AND testing mechanism:

1. Fix the front door (`/jarvis` → `/jarvis/app`)
2. Build "How to Use Jarvis" Academy curriculum (Tasks, Bills, Calendar, Meals, Morning Briefing)
3. Merge tutorial spotlight/verification with Academy conversational teaching
4. Jonathan walks through each module live, we fix what breaks, iterate until smooth
5. Exit criteria: someone can open the URL cold and get guided through everything

**The key insight:** The Academy is already built to teach external codebases (Visopscreen, Creator Workflow). But when the Academy teaches about *Jarvis itself*, it gets a massive advantage: **same-origin access**. That means DOM spotlight overlays work, store verification works, route detection works. You get the rich automated verification of the E-05 tutorial system PLUS the dynamic conversational teaching of the Academy. Best of both worlds.

**The double win:** By the time we're done, Jonathan has:
1. A polished onboarding experience that actually works end-to-end
2. Academy curriculum for "How to Use Jarvis" (reusable for wife, or anyone)
3. Confidence that Tasks/Bills/Calendar/Meals actually function correctly
4. A battle-tested list of bugs caught and fixed during the walkthrough
5. A proven pattern for Academy-as-QA that applies to future features

---

## 2. The Front Door Fix

### Current State (Broken)

```
User visits whatamiappreciatingnow.com/jarvis
         ↓
Sees old voice orb (JarvisOrb.tsx)
         ↓
No navigation to new dashboard
No onboarding, no tutorials, no Academy
Dead end for anyone who doesn't know /jarvis/app exists
```

### Two interfaces exist:

| Route | Interface | Status |
|-------|-----------|--------|
| `/jarvis` | Old voice orb — 3D particle system, push-to-talk, minimal UI | Legacy, NOT connected to new shell |
| `/jarvis/app` | New dashboard — Domain Rail, Priority Home, Academy, Settings, Chat | Current, all features live here |

### Fix (Trivial)

**Option A (Recommended):** Redirect `/jarvis` → `/jarvis/app`
- Simple Next.js redirect in `next.config.js` or middleware
- Old orb is preserved at a different route if ever needed (e.g., `/jarvis/orb`)
- Zero user confusion

**Option B:** Add prominent "Open Dashboard" link on old orb page
- Preserves voice-first entry for future convergence
- Adds a clear path to the new experience

**Recommendation:** Option A. The old orb has no voice pipeline in the new system, 6 empty domains, no Academy access. It's a dead end. Redirect and move on.

---

## 3. Architecture — Merging Tutorials + Academy

### What Exists Today (Two Separate Systems)

**E-05 Tutorial System** (pre-authored, DOM-driven):
```
tutorialLessons.ts → useTutorialEngine.ts → tutorialStore.ts
                                           → SpotlightOverlay.tsx
                                           → verificationEngine.ts
                                           → tutorialActionBus.ts
```
- 4 Tier 1 lessons: Tasks, Habits, Bills, Morning Briefing
- Pre-scripted step-by-step instructions
- DOM spotlight overlays (pulse/ring on `[data-tutorial-id]` elements)
- Automated verification: route changes, store state, action bus events
- Skill-level adaptation (beginner vs advanced instruction text)
- Stored in localStorage via Zustand persist

**K Academy System** (dynamic, conversational):
```
projects.ts → academyStore.ts → Academy API routes
                               → Academy tools (7)
                               → Teaching intelligence (system prompt injection)
                               → AcademyHub.tsx + CurriculumTopicCard.tsx
```
- 30 topics across 2 projects (Visopscreen, Creator Workflow)
- Claude reads actual source code before teaching
- Conversational verification (Jarvis asks, user confirms)
- DB-backed progress (academy_progress table)
- Demotion guards (client + server)

### The Merge — Academy-Driven Onboarding

The new system combines the strengths of both:

| Capability | Source | Why It Works for Jarvis Onboarding |
|-----------|--------|-----------------------------------|
| Dynamic conversational teaching | Academy (K) | Jarvis explains WHY, not just WHERE to click |
| DOM spotlight overlays | Tutorials (E-05) | Same-origin = full spotlight access |
| Store/route verification | Tutorials (E-05) | Same-origin = automated step detection |
| DB-backed progress | Academy (K) | Progress survives across sessions/devices |
| Curriculum-as-data | Academy (K) | Topics defined in registry, not hardcoded |
| Codebase context injection | Academy (K) | Jarvis can read its own source to explain features |
| Teaching intelligence evaluation | Academy (K) | Self-improvement tracks teaching quality |
| Skill adaptation | Tutorials (E-05) | Beginner (click-by-click) vs advanced (goal-based) |
| Mistake hints | Tutorials (E-05) | Contextual corrections when user does wrong thing |

### Why Same-Origin Changes Everything

When Academy teaches Visopscreen (cross-origin):
- Can't spotlight DOM elements (different origin)
- Can't verify store state (different app)
- Can't detect route changes (different origin)
- Verification is conversational only ("Did you see it?")

When Academy teaches Jarvis itself (same-origin):
- **CAN** spotlight any `[data-tutorial-id]` element
- **CAN** verify Zustand store state (`personalStore.tasks.some(t => t.completed)`)
- **CAN** detect route changes (`/jarvis/app/personal/tasks`)
- **CAN** use tutorialActionBus for events stores can't detect
- Gets FULL automated verification + conversational teaching

This is the best of both worlds — something neither system could do alone.

### New Architecture Flow

```
User clicks "Learn about Tasks" in Academy Hub
         ↓
academyStore.markExplored('jarvis', 'tasks-basics')
         ↓
Chat opens with enriched context:
  - STUDENT PROGRESS (what they've completed)
  - TEACHING GUIDELINES (conversational + spotlight available)
  - JARVIS CONTEXT (current tasks data, UI state)
         ↓
Claude teaches dynamically:
  1. "Let's navigate to your Tasks. See the Personal card?"
  2. Sets spotlight on home-domain-card-personal
  3. Waits for route verification (/jarvis/app/personal)
  4. "Great! Now tap the Tasks card..."
  5. Continues with rich explanations, not just "click here"
         ↓
On completion: academy_update_progress('jarvis', 'tasks-basics', 'completed')
         ↓
DB persists. Next topic unlocked. Home widget updates.
```

---

## 4. Curriculum — "How to Use Jarvis"

### Project Registration

A new `jarvis` project entry in the Academy registry:

```typescript
{
  id: 'jarvis',
  name: 'Jarvis Personal OS',
  repo: 'ethereal-flame-studio',
  basePath: 'src/components/jarvis',
  description: 'Your personal operating system — tasks, habits, bills, calendar, meals, and more',
  curriculum: [ /* topics below */ ]
}
```

### Curriculum Topics

#### Tier 0: First Contact (Pre-Onboarding)
| Topic | Difficulty | Description | Prerequisites |
|-------|-----------|-------------|--------------|
| `welcome-tour` | 1 | Meet Jarvis — what this app does and how it's organized | None |
| `navigation-basics` | 1 | Domain Rail, Bottom Tabs, Command Palette (Cmd+K) | welcome-tour |

#### Tier 1: Your First Day (Core Personal Features)
| Topic | Difficulty | Description | Prerequisites |
|-------|-----------|-------------|--------------|
| `tasks-basics` | 1 | View, complete, and create tasks — your daily to-do list | navigation-basics |
| `habits-basics` | 1 | Track daily habits, build streaks, compound consistency | navigation-basics |
| `bills-basics` | 2 | Track bills, mark paid, understand urgency colors | navigation-basics |
| `calendar-basics` | 1 | View your calendar, understand event integration | navigation-basics |
| `meals-basics` | 2 | Meal planning, grocery lists, kitchen intelligence | navigation-basics |
| `morning-briefing` | 1 | Ask Jarvis "brief me" — your daily executive summary | tasks-basics |

#### Tier 2: Going Deeper (Power Features)
| Topic | Difficulty | Description | Prerequisites |
|-------|-----------|-------------|--------------|
| `chat-mastery` | 2 | Everything you can do through chat — create, query, manage | morning-briefing |
| `goals-tracking` | 2 | Set and track personal goals | tasks-basics |
| `journal-intro` | 2 | Daily journaling and mood tracking | navigation-basics |
| `health-metrics` | 2 | Health data visualization and trends | navigation-basics |
| `academy-intro` | 2 | How the Academy itself works — meta-learning | All Tier 1 |

#### Tier 3: Mastery
| Topic | Difficulty | Description | Prerequisites |
|-------|-----------|-------------|--------------|
| `command-palette` | 3 | Power-user Cmd+K for everything | chat-mastery |
| `settings-customization` | 2 | Brain health, domain config, preferences | academy-intro |
| `multi-domain-overview` | 3 | Understanding all 7 domains and their purposes | All Tier 2 |

### Topic Detail Example

```typescript
{
  id: 'tasks-basics',
  name: 'Managing Your Tasks',
  category: 'Your First Day',
  difficulty: 1,
  description: 'View, complete, and create tasks. Your daily to-do list lives here.',
  teachingNotes: `
    Tasks sync bidirectionally with Notion. The UI groups tasks by urgency:
    overdue (red) → due today (amber) → upcoming (glass). Users can complete
    tasks by tapping the checkbox, or create them through chat ("add task: buy
    groceries"). The TasksList component renders from personalStore.tasks.
    Key file: src/components/jarvis/personal/TasksList.tsx
    Store: src/lib/jarvis/stores/personalStore.ts (tasks slice)
    Chat creation: handled by add_task tool in brain tools
  `,
  keyFiles: [
    { path: 'src/components/jarvis/personal/TasksList.tsx', explanation: 'Task list UI with urgency grouping' },
    { path: 'src/lib/jarvis/stores/personalStore.ts', explanation: 'Tasks state management' },
  ],
  prerequisites: ['navigation-basics'],
  conceptsIntroduced: ['task-completion', 'urgency-grouping', 'chat-creation', 'notion-sync'],
  // NEW: Same-origin tutorial integration
  spotlightTargets: [
    'home-domain-card-personal',
    'personal-subprogram-tasks',
    'tasks-summary',
    'tasks-first-checkbox',
    'bottom-tab-chat',
    'chat-input',
  ],
  verificationSteps: [
    { type: 'route', check: '/jarvis/app/personal' },
    { type: 'route', check: '/jarvis/app/personal/tasks' },
    { type: 'store', check: 'personalStore.tasks.some(t => t.completed && t.justToggled)' },
    { type: 'store', check: 'shellStore.isChatOpen === true' },
    { type: 'action', check: 'user-sent-chat-message' },
  ],
}
```

---

## 5. The Testing Loop Methodology

This is the killer innovation of v4.4. Instead of build → ship → hope, we use:

### Build → Walk Through → Fix → Repeat

```
Phase 1: Build the curriculum + merge architecture
         ↓
Phase 2: Jonathan opens whatamiappreciatingnow.com/jarvis/app (fresh localStorage)
         ↓
Phase 3: Walk through each Academy topic LIVE:
         - Onboarding wizard fires
         - Academy suggests first topic
         - Jonathan follows Jarvis's teaching
         - Every bug, confusion, or broken flow → logged
         ↓
Phase 4: Fix everything found in Phase 3
         ↓
Phase 5: Clear localStorage, walk through AGAIN
         - Verify fixes work
         - Find second-order issues
         ↓
Phase 6: Repeat until smooth
         ↓
Exit: Jonathan's wife can do it cold with zero help
```

### What This Catches (That Normal Development Misses)

| Category | Examples |
|----------|---------|
| **Data issues** | Tasks show stale data, bills don't populate, calendar is empty |
| **UX friction** | Steps that are confusing, buttons that don't do what's expected |
| **Flow breaks** | Onboarding → tutorial handoff fails, chat doesn't open, spotlight misaligned |
| **Mobile issues** | Bottom tab obscures content, spotlight off-screen, text too small |
| **Store bugs** | State not updating after action, optimistic update fails |
| **API issues** | Briefing data doesn't load, task creation fails, Notion sync broken |
| **Teaching quality** | Instructions unclear, Jarvis explains wrong thing, verification too strict/loose |

### Session Format

Each testing session follows this structure:
1. **Clear state** (fresh localStorage or new device)
2. **Record** what happens at each step (screenshot or description)
3. **Note** every friction point, no matter how small
4. **Fix** in real-time where possible
5. **Mark** what needs a separate fix (deferred to next pass)
6. **Re-test** the fixed flow end-to-end

---

## 6. What Transfers From Existing Systems

### From E-05 Tutorials (Direct Reuse)

| Asset | File | What It Does | Reuse Plan |
|-------|------|-------------|------------|
| `tutorialStore` | `stores/tutorialStore.ts` | Progress, spotlight, skill level (Zustand persist) | Keep for same-origin spotlight state |
| `SpotlightOverlay` | `onboarding/SpotlightOverlay.tsx` | Visual highlight on `[data-tutorial-id]` elements | Direct reuse — same-origin |
| `verificationEngine` | `curriculum/verificationEngine.ts` | Route/store/action verification | Direct reuse — powers automated checks |
| `tutorialActionBus` | `curriculum/tutorialActionBus.ts` | Pub/sub for non-store events | Direct reuse |
| Tutorial message styling | `ChatOverlay.tsx` | Left-bordered messages, type-colored | Direct reuse |
| Skill level adaptation | `tutorialStore.skillLevel` | Beginner vs advanced instructions | Extend into Academy topics |
| Mistake hints | `tutorialLessons.ts` | Contextual corrections | New hints per Academy topic |

### From K Academy (Direct Reuse)

| Asset | File | What It Does | Reuse Plan |
|-------|------|-------------|------------|
| `academyStore` | `stores/academyStore.ts` | DB-backed progress (not_started/explored/completed) | Primary progress tracker |
| Academy API | `api/jarvis/academy/progress` | GET/POST progress persistence | Direct reuse |
| `AcademyHub` | `academy/AcademyHub.tsx` | Tabbed curriculum browser | Add "Jarvis" tab |
| `CurriculumTopicCard` | `academy/CurriculumTopicCard.tsx` | 4-state topic cards | Direct reuse |
| Teaching intelligence | System prompt injection | Student progress + teaching guidelines | Extend with spotlight instructions |
| `academy_update_progress` tool | Brain tools | Server-side completion marking | Direct reuse |
| Demotion guards | Client + server | Can't downgrade completed → explored | Direct reuse |

### From Onboarding Wizard (Partial Reuse)

| Asset | Status | Plan |
|-------|--------|------|
| 6-step configuration wizard | Keep as-is | Runs before Academy topics — configures domains, schedule |
| "Start Guided Tour" button | Rewire | Instead of triggering old tutorial, launches Academy topic chain |
| Domain selection | Keep | Determines which Academy topics are relevant |
| Widget pinning | Keep | Part of personalization |
| Notification schedule | Keep | Useful configuration |

---

## 7. What's New to Build

### 7.1 Jarvis Project in Academy Registry

Add `jarvis` as an Academy project in `projects.ts` with full curriculum (see Section 4).

**Estimated work:** ~200-300 lines of curriculum data

### 7.2 Academy-Spotlight Bridge

A mechanism that lets Academy topics trigger E-05 spotlight overlays:

```typescript
// When Academy is teaching a same-origin topic, it can set spotlights
interface AcademySpotlightStep {
  elementId: string;
  type: 'pulse' | 'ring';
  verification: { type: 'route' | 'store' | 'action'; check: string };
  waitForVerification: boolean;
}
```

The teaching intelligence (Claude) would have access to a new tool or enhanced `academy_update_progress` that can:
1. Set a spotlight on a DOM element
2. Wait for verification before proceeding
3. Clear spotlight when step is complete

**Estimated work:** ~100-150 lines (bridge between tutorialStore.setSpotlight and Academy teaching flow)

### 7.3 Onboarding → Academy Handoff

After the OnboardingWizard completes (Step 6), instead of triggering `setSuggestedNext('tasks-basics')` in the old tutorial system, it should:

1. Set `academyStore.setActiveProject('jarvis')`
2. Navigate to `/jarvis/app` (home)
3. Show Academy progress widget with "Start Learning" CTA
4. First click triggers `welcome-tour` topic

**Estimated work:** ~30 lines (rewire OnboardingWizard completion handler)

### 7.4 Enhanced Teaching Context for Same-Origin

When the Academy project is `jarvis`, the teaching intelligence prompt gets additional context:

```
SAME-ORIGIN CAPABILITIES:
- You can set spotlight overlays on UI elements via [data-tutorial-id] attributes
- You can verify user actions via store state and route changes
- Available spotlight targets for this topic: [list from curriculum]
- Available verification checks: [list from curriculum]

TEACHING APPROACH (same-origin):
- Guide the user step-by-step with spotlights
- Wait for verification before advancing
- Use conversational teaching BETWEEN verified steps
- Explain WHY features work the way they do, not just WHERE to click
```

**Estimated work:** ~50-80 lines (system prompt extension)

### 7.5 Front Door Redirect

Redirect `/jarvis` → `/jarvis/app` via Next.js config or middleware.

**Estimated work:** ~5 lines

---

## 8. Phasing Strategy

### Phase L-01: Foundation (Front Door + Curriculum + Bridge)
- Redirect `/jarvis` → `/jarvis/app`
- Add `jarvis` project to Academy registry with full curriculum
- Build Academy-Spotlight bridge
- Rewire Onboarding → Academy handoff
- Enhanced teaching context for same-origin topics

### Phase L-02: Live Walkthrough Pass 1 (Jonathan Tests)
- Jonathan clears localStorage and opens the app fresh
- Walks through: Onboarding Wizard → Welcome Tour → Tasks → Habits → Bills
- Every bug/friction documented
- Fixes applied in real-time where possible

### Phase L-03: Live Walkthrough Pass 2 (Calendar + Meals + Briefing)
- Continue: Calendar → Meals → Morning Briefing → Chat Mastery
- Bug fixes from Pass 1 verified
- New issues documented and fixed

### Phase L-04: Polish + Wife Test
- Final bug fixes
- Clear all state, fresh walkthrough end-to-end
- Exit criteria: wife test — can she open the URL cold and get guided through?

---

## 9. Exit Criteria

### Must Have (Milestone Complete)
- [ ] `/jarvis` redirects to `/jarvis/app`
- [ ] Onboarding wizard → Academy handoff works
- [ ] "Jarvis" project appears in Academy Hub with curriculum
- [ ] Tier 1 topics all functional: Tasks, Habits, Bills, Calendar, Meals, Morning Briefing
- [ ] Spotlight overlays work for same-origin teaching
- [ ] Automated verification works (route + store + action)
- [ ] Progress persists in DB across sessions
- [ ] Jonathan has walked through entire Tier 1 with zero blockers

### Nice to Have (Stretch)
- [ ] Tier 2 topics functional (Chat Mastery, Goals, Journal, Health)
- [ ] Wife completes Tier 1 cold with zero help
- [ ] Academy-driven teaching quality evaluated by self-improvement pipeline
- [ ] Command Palette indexes Jarvis Academy topics

---

## 10. Decisions Already Made

| Decision | Rationale |
|----------|-----------|
| Academy-as-delivery, not separate onboarding system | One system to maintain, Academy already built and proven |
| Same-origin spotlight + conversational hybrid | Best of both worlds — automated verification + dynamic teaching |
| DB-backed progress (not localStorage) | Survives device changes, server tools can update |
| Jonathan-as-tester methodology | Real user testing catches what code review can't |
| Redirect `/jarvis` → `/jarvis/app` | Old orb is a dead end, no voice pipeline in new shell yet |
| Tier 1 first, expand later | Tasks/Bills/Calendar/Meals are the daily-driver features |
| Curriculum-as-data in registry | Same pattern as Visopscreen/Creator, extensible |

---

## 11. Prerequisites (Before Milestone Starts)

### GITHUB_TOKEN Setup — ALREADY DONE (2026-03-01)

Jonathan created the "Jarvis Academy" fine-grained PAT (no expiration) and set both `GITHUB_TOKEN` and `GITHUB_OWNER` in Vercel env vars on 2026-03-01. Token shows "Never used" as of 2026-03-02 — will activate on first Academy teaching session in production.

**No remaining prerequisites.** The milestone can start immediately.

---

## 12. Parked Ideas (Future Milestones)

These ideas came up in the v4.4 discussion but are explicitly deferred:

| Idea | Why It's Deferred | Concept Doc |
|------|-------------------|-------------|
| **Intelligence Evolution** | Requires research validation, not user-facing | `concepts/intelligence-evolution-v41.md` |
| **Vision Input** | Needs hardware decisions (Ring vs Reolink) | `concepts/jarvis-vision-research/00-SYNTHESIS.md` |
| **Domain Expansion** | Content for 6 empty domains — scope creep risk | Not yet documented |
| **Voice Pipeline** | Old orb voice not converged with new shell | Not yet documented |
| **Auto-fetching topic files** | Convenience improvement, not a blocker | Add to Academy backlog |
| **Structured comprehension scoring** | Binary progress works fine for v4.4 | Add to Academy backlog |

---

## 13. Related Files

### Existing Infrastructure
- `src/lib/jarvis/curriculum/tutorialLessons.ts` — 4 Tier 1 tutorials (Tasks, Habits, Bills, Briefing)
- `src/lib/jarvis/hooks/useTutorialEngine.ts` — Tutorial orchestrator
- `src/lib/jarvis/stores/tutorialStore.ts` — Tutorial progress (localStorage)
- `src/lib/jarvis/stores/academyStore.ts` — Academy progress (DB-backed)
- `src/lib/jarvis/academy/projects.ts` — Academy project registry
- `src/lib/jarvis/curriculum/verificationEngine.ts` — Step verification
- `src/lib/jarvis/curriculum/tutorialActionBus.ts` — Event pub/sub
- `src/components/jarvis/onboarding/OnboardingWizard.tsx` — 6-step wizard
- `src/components/jarvis/onboarding/SpotlightOverlay.tsx` — DOM highlight system
- `src/components/jarvis/academy/AcademyHub.tsx` — Academy page
- `src/components/jarvis/academy/CurriculumTopicCard.tsx` — Topic cards
- `src/components/jarvis/academy/AcademyProgress.tsx` — Home widget
- `src/components/jarvis/layout/JarvisShell.tsx` — Shell (onboarding redirect logic)

### Planning Documents
- `jarvis/.paul/concepts/jarvis-academy.md` — Original Academy concept (Visopscreen focus)
- `jarvis/.paul/concepts/intelligence-evolution-v41.md` — Intelligence Evolution (parked)
- `jarvis/.paul/concepts/jarvis-vision-research/00-SYNTHESIS.md` — Vision research (parked)

---

*This concept document captures the v4.4 milestone vision as discussed on 2026-03-02. Execute with the Academy-as-QA methodology: build → walk through → fix → repeat until smooth.*
