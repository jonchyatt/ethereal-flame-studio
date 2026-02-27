# Jarvis Academy — Concept Document

> "Jarvis becomes a genius-level teacher that knows everything, has researched everything about the project, reviews the code before teaching, and walks you through an updated curriculum — a Jarvis Academy powered by Claude Opus."
> — Jonathan, Feb 2026

**Status:** Concept documented, not yet in execution
**Origin:** Planning session ea95a249 (Feb 27, 2026)
**Depends on:** Visopscreen strategy library completion (10 new strategies)

---

## 1. The Vision

Jarvis Academy is a mode where Jarvis (powered by Claude Opus) becomes a master teacher that can walk users through Visopscreen — and eventually every project in Jonathan's portfolio.

**Core idea:** Same brain, different instruction set. Academy mode is not a separate system — it's the existing Jarvis intelligence with a richer prompt context.

```
Normal Jarvis:  personality + memories + tools + preferences
Academy Mode:   personality + memories + tools + preferences
                + CURRICULUM KNOWLEDGE (what to teach)
                + STUDENT PROGRESS (what they know)
                + CODEBASE CONTEXT (what's actually in Visopscreen right now)
                + TEACHING GUIDELINES (how to teach it)
```

**What makes this special:**
- Jarvis **reads the actual codebase** before teaching, ensuring lessons reflect current reality
- Lessons are **dynamically generated** — Claude reads source files and generates teaching in real-time, not reading pre-authored scripts word-for-word
- The user can **ask anything mid-lesson** — full Claude brain available, not a locked tutorial rail
- Content **never goes stale** — if the code changes, the teaching changes automatically
- **One teacher, infinite domains** — the pattern works for every project

---

## 2. Why It Works (Existing Architecture Supports It)

### What Transfers from E-05 (Zero Work)

Phase E-05 built a comprehensive tutorial system. These assets transfer directly:

| Asset | Location | What It Does |
|-------|----------|-------------|
| `tutorialStore` | `stores/tutorialStore.ts` | Zustand state: progress, currentLesson, currentStep, skillLevel, completions — all persisted |
| Lesson chaining | `nextSuggestion` wiring | "Up next: ..." flow between lessons |
| Tutorial message styling | `ChatOverlay` | Left-bordered messages, GraduationCap icon, type-colored borders |
| Progress bar | `ChatOverlay` header | Step X of Y indicator |
| Skill level adaptation | `tutorialStore.skillLevel` | Beginner (click-by-click) vs advanced (goal-based) instructions |
| `tutorialActionBus` | `curriculum/tutorialActionBus.ts` | Pub/sub for events stores can't detect (e.g., chat messages) |
| `TutorialEngineContext` | React context | Engine API available to any component |
| Chat injection | `chatStore` | Tutorial instructions appear as warm conversational messages |
| Academy Hub UI | `academy/AcademyHub.tsx` | Tier-grouped lesson browser with progress rings |
| AcademyProgress widget | `academy/AcademyProgress.tsx` | Home screen card showing completion + next lesson |
| LessonCard component | `academy/LessonCard.tsx` | Individual lesson display with status |
| Command Palette | `useCommandPalette.ts` | Lessons indexed and searchable via Cmd+K |
| Bottom Tab "Learn" | `BottomTabBar.tsx` | Navigation entry point |

### What Does NOT Transfer (Cross-Origin Problem)

| Asset | Why It Doesn't Work |
|-------|-------------------|
| SpotlightOverlay / DOM spotlighting | Visopscreen is vanilla JS on a different origin — can't query `data-tutorial-id` across apps |
| Store verification (`evaluateVerification`) | Visopscreen uses `window.optionData`, not Zustand |
| Route verification | Different origin entirely |
| Mobile auto-close choreography | Specific to Jarvis in-app tutorials |

**Key insight:** Verification shifts from **DOM/store-based** (automated) to **conversational** (Jarvis asks, user confirms). This is actually better for cross-app teaching.

---

## 3. What's New (Requires Building)

### 3.1 Academy Context Injection

New `academyContext` field in `SystemPromptContext`:

```typescript
// Injected into system prompt when Academy mode is active
academyContext: {
  curriculum: CurriculumOutline;      // What to teach
  studentProgress: ProgressRecord[];   // What they know
  codebaseContext: string;             // Relevant source files
  teachingGuidelines: string;          // How to teach
}
```

The existing `SystemPromptContext` in `systemPrompt.ts` already supports conditional sections — Academy mode adds these four new sections.

### 3.2 New Academy Tools for Claude Brain

Five new tools for the Claude intelligence layer:

| Tool | Purpose |
|------|---------|
| `get_academy_curriculum()` | Returns full curriculum structure with student progress |
| `start_academy_lesson(lessonId)` | Loads lesson, injects relevant codebase files into prompt context |
| `query_visopscreen_code(topic)` | Fetches specific source files for teaching reference |
| `quiz_student(concept, difficulty)` | Generates comprehension check dynamically |
| `record_academy_progress(lessonId, status, score)` | Tracks completion + comprehension |

The existing tool execution loop supports up to 5 iterations per turn — these tools fit naturally.

### 3.3 "Code Review Before Teaching" Mechanism

The killer feature: a tool that fetches actual Visopscreen source files (e.g., `ratio-screener.js`, `screener-scoring.js`) and injects them into Claude's context so it teaches from **real code**, not memorized descriptions.

This means:
- Code changes → teaching automatically updates
- Claude can reference exact function names, variable meanings, thresholds
- "Let me show you what's actually happening in the scoring algorithm..." becomes possible

### 3.4 Conversational Verification Model

Replacing DOM/store verification with four new verification types:

| Type | How It Works | Example |
|------|-------------|---------|
| `conversational` | Jarvis asks, user confirms in chat | "Did you see the P&L curve update?" |
| `api` | Check Visopscreen endpoint (future) | Verify screener returned results |
| `timed` | Give user N seconds, then prompt | "Take a moment to explore the results..." |
| `quiz` | Ask a comprehension question | "What does ROC tell you about this trade?" |

### 3.5 Estimated New Code

~400-500 lines of new code:
- Academy context injection (~80 lines)
- 5 new tools (~200 lines)
- Code-fetch mechanism (~50 lines)
- Curriculum data files (~100-150 lines of lesson outlines)
- Conversational verification (~50 lines)

---

## 4. Curriculum Structure (5 Tracks, ~30 Lessons)

### Track 1: Foundation (Concepts — No App Needed)
| # | Lesson | Time | Concepts |
|---|--------|------|----------|
| 1.1 | What Are Options? | 5 min | Calls, puts, strikes, expirations |
| 1.2 | What Are Spreads? | 5 min | Legs, ratios, defined risk |
| 1.3 | The Greeks Family | 5 min | Delta, Gamma, Theta, Vega |
| 1.4 | Metrics That Matter | 5 min | ROC, POP, PPD, Margin, Breakeven |
| 1.5 | Reading P&L Curves | 5 min | Profit zones, shapes, breakevens |

### Track 2: Navigation (The App)
| # | Lesson | Time | Concepts |
|---|--------|------|----------|
| 2.1 | Data Connection | 3 min | TOS, Yahoo, Demo modes, freshness indicators |
| 2.2 | The 5-Tab Tour | 5 min | Find Trades, Build Strategy, Analysis, LEAP Cycles, Research |
| 2.3 | Strategy Library | 5 min | 14+ templates, when to use each |
| 2.4 | Settings & Config | 3 min | Preferences, display options |

### Track 3: Screener (Finding Trades)
| # | Lesson | Time | Concepts |
|---|--------|------|----------|
| 3.1 | Ratio Diagonal | 5 min | Shape scoring, hump metrics, loading winners |
| 3.2 | Vega Hedge / BWB | 5 min | Credit generation, wing config, POP |
| 3.3 | Dipper / Ladle | 5 min | Inverted ratios, directional bias |
| 3.4 | 27% Weekly PPD | 5 min | Theta decay arbitrage, ITM mechanics |
| 3.5-3.14 | (10 new strategies) | 5 min each | As they are built |

### Track 4: Analysis (Understanding What You Found)
| # | Lesson | Time | Concepts |
|---|--------|------|----------|
| 4.1 | Grid View | 5 min | Parallel comparison of strike variations |
| 4.2 | Overlay View | 5 min | Superimposed curves with legend |
| 4.3 | 3D Surface | 5 min | Price x time x profit landscape |
| 4.4 | Time Rolling | 5 min | Simulate decay, the time slider |
| 4.5 | LEAP Cycles | 5 min | Multi-cycle projection, DTE comparison |

### Track 5: Mastery (Advanced)
| # | Lesson | Time | Concepts |
|---|--------|------|----------|
| 5.1 | Custom Screener Design | 8 min | Weight adjustments, regime gating |
| 5.2 | Greeks Deep-Dive | 8 min | Vanna, Vomma, Charm, Color, Veta |
| 5.3 | Multi-Leg Construction | 8 min | Building from scratch |
| 5.4 | Archive Browsing | 5 min | Historical pattern recognition |
| 5.5 | Position Management | 8 min | Exit strategies |

---

## 5. Visopscreen Strategy Coverage

### 14 Existing Strategies (Teachable Now)

**Diagonals (4):**
- Call Ratio Diagonal (the "hump" shape)
- Put Ratio Diagonal
- Call Dipper
- Put Dipper

**Butterflies (3):**
- Long Call Butterfly
- Long Put Butterfly
- Iron Butterfly

**Calendars (3):**
- Call Calendar
- Put Calendar
- Double Calendar

**Ratio Spreads (4):**
- Call Ratio Spread
- Put Ratio Spread
- Back Ratio Call
- Back Ratio Put

### 10 Planned Strategies (Must Build First)

These need to be added to the Visopscreen library before they can be taught. Jonathan has designs for these but they aren't implemented yet. Academy curriculum for existing strategies can start while these are being built.

### Example Lesson Structure

```
Lesson: Ratio Diagonal Screener
Prerequisites: [spreads-basics, greeks-overview]
Concepts: [ratio-spread, hump-shape, shape-scoring, ROC]
Visopscreen files: [ratio-screener.js, screener-scoring.js]

Learning objectives:
  1. Understand what a ratio diagonal spread is
  2. Know what the screener is looking for (hump shapes)
  3. Read the results table (ROC, margin, hump score)
  4. Load a winner into Strategy Builder

Teaching flow:
  1. Concept explanation (what + why)
  2. Navigate to it in the app
  3. Run a scan with demo data
  4. Read results together
  5. Load best trade -> see it in Builder
  6. Quiz: "What does ROC tell you?"
  7. Teaching point: "In real trading, you'd..."
```

---

## 6. Visopscreen Lesson Clusters (Detailed Breakdown)

### Cluster 1: Getting Started (2 lessons, ~15 min)
- **Lesson 1:** Data Connection & Status — connect TOS/demo, understand freshness indicators
- **Lesson 2:** The 5-Tab Tour — Find Trades, Build Strategy, Analysis, LEAP Cycles, Research

### Cluster 2: Finding Trades (3 lessons, ~30 min)
- **Lesson 3:** Ratio Diagonal Screener — shape scoring, ROC, margin, loading winners
- **Lesson 4:** Vega Hedge / BWB — credit spreads, POP, wing configuration
- **Lesson 5:** 27% Weekly PPD Scanner — theta decay arbitrage, ITM mechanics

### Cluster 3: Understanding What You Found (3 lessons, ~30 min)
- **Lesson 6:** Reading P&L Curves — profit zones, breakeven, max loss
- **Lesson 7:** Greeks at a Glance — Delta, Gamma, Theta, Vega (what each tells you)
- **Lesson 8:** Visualization Modes — Grid vs Overlay vs 3D, when to use each

### Cluster 4: Advanced Analysis (2 lessons, ~20 min)
- **Lesson 9:** Time Rolling — simulate position decay, the time slider
- **Lesson 10:** LEAP Cycles — long-term projections, DTE comparison

---

## 7. Dependencies and Sequencing

```
1. Build the 10 new strategies in Visopscreen
   | (can't teach what doesn't exist)
   v
2. Deep-dive audit of Visopscreen codebase (like Phase A of Jarvis v4.0)
   | (know everything before designing curriculum)
   v
3. Design curriculum structure (tracks, lessons, prerequisites)
   | (the learning path)
   v
4. Build Academy engine in Jarvis (tools, context injection, UI)
   | (the delivery system, ~400-500 lines of new code)
   v
5. Author lesson outlines (NOT full scripts — just structure)
   | (Claude fills in the teaching dynamically)
   v
6. Test end-to-end (walk through the curriculum from live site)
```

**Parallelism opportunities:**
- Steps 1 and 2-3 can partially overlap
- Curriculum for the 14 existing strategies can start now
- Step 4 (engineering) and Step 5 (content) are partially parallel

**The honest dependency:** The 10 new strategies need to exist in Visopscreen before they can be taught. But the existing 14 strategies provide plenty of curriculum to start with.

---

## 8. The Multi-Domain Pattern

Visopscreen is the **first** Academy domain. The architecture is designed to replicate across all projects:

| Domain | Color | Academy Use Case |
|--------|-------|-----------------|
| **Visopscreen** | sky | "Let me teach you options screening and every strategy" — FIRST TARGET |
| **Reset Biology** | emerald | "Let me walk you through your supplement protocol dashboard" |
| **Ethereal Flame** | orange | "Here's how your render pipeline works" |
| **Satori Living** | amber | "Let's review your compliance deadlines" |
| **Entity Building** | indigo | "Let's walk through your business formation checklist" |
| **CritFailVlogs** | rose | Content creation workflows |

Each domain follows the same pattern:
1. Audit the domain's codebase
2. Design a domain-specific curriculum
3. Write lesson outlines (not full scripts)
4. Claude reads the actual source code before teaching, adapts dynamically

**The vision: "Jarvis becomes the single source of truth for how to use ALL your tools. One teacher, infinite domains."**

---

## 9. Dynamic vs Pre-Authored — Why This Is Better

| Pre-authored (E-05 model) | Dynamic Academy (this concept) |
|---------------------------|-------------------------------|
| Fixed scripts, word for word | Claude generates teaching dynamically |
| Goes stale when code changes | Reads current code before each lesson |
| Same explanation every time | Adapts to questions and pace |
| Cannot answer follow-ups | Full Claude brain — ask anything mid-lesson |
| Content authoring is bottleneck | Curriculum OUTLINE + code context = Claude fills in the rest |
| One skill level per lesson | Genuinely adapts (beginner vs intermediate) |

---

## 10. Related Files

### Existing Infrastructure (in this repo)
- `src/lib/jarvis/stores/tutorialStore.ts` — Zustand progress store
- `src/lib/jarvis/curriculum/tutorialLessons.ts` — Tier 1 lesson definitions
- `src/lib/jarvis/curriculum/verificationEngine.ts` — Step verification
- `src/lib/jarvis/curriculum/tutorialActionBus.ts` — Event pub/sub
- `src/lib/jarvis/hooks/useTutorialEngine.ts` — Lesson orchestrator
- `src/components/jarvis/academy/AcademyHub.tsx` — Academy hub page
- `src/components/jarvis/academy/AcademyProgress.tsx` — Home widget
- `src/components/jarvis/onboarding/SpotlightOverlay.tsx` — Spotlight system

### Planning Documents
- `jarvis/.paul/research/phase-e-jarvis-academy-vision.md` — Original E-05 vision doc
- `jarvis/.paul/phases/E-mobile-ui/E-04-08-PLAN.md` — Onboarding + Academy foundation
- `jarvis/.paul/phases/E-mobile-ui/E-05-01-PLAN.md` — Tutorial data layer
- `jarvis/.paul/phases/E-mobile-ui/E-05-02-SUMMARY.md` — Tutorial engine

### Target Codebase
- `C:\Users\jonch\Visopscreen\` — The options screening app to teach

---

## 11. Open Questions (For Future Planning)

1. **Code access mechanism:** How does Jarvis fetch Visopscreen source files at runtime? API endpoint? Build-time bundling? Git integration?
2. **Cross-origin navigation:** Should Jarvis open Visopscreen tabs/windows, or just describe what to do?
3. **Progress persistence:** Use existing tutorialStore or new Academy-specific store?
4. **Visopscreen domain activation:** Currently `active: false` in domain registry — needs activation
5. **Strategy build priority:** Which of the 10 new strategies should be built first?

---

*This concept document is for future reference. Execute with evolving perfection when ready.*
