# Project State

## Current Position

Milestone: v4.0 Brain Swap & Personal Domain
Phase: H of H (Google Calendar Integration) — Planning
Plan: H-01 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-02-28 — Created H-01-PLAN.md (Google Calendar service account import)

Progress:
- Milestone: [#########░] 93% (A-G complete, H planning)
- Phase H: [░░░░░░░░░░] 0%

## Phase G Sub-Plan Progress (REDESIGNED)

- G-01: Brain Activation (enableMemoryLoading ON) — COMPLETE
- G-02: Live Data Pipeline (Home + Personal real Notion data + QuickActions + BriefingCard freshness) — COMPLETE
- G-03: Executive Bridge (Scheduler + mode-aware toasts, NO NudgeManager) — COMPLETE
- G-04: Production Hardening & Day-One Readiness — COMPLETE

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan created, awaiting approval]
```

## Phase E Sub-Phase Progress

- E-01: Grand Research (Domain Atlas) — COMPLETE
- E-02: Information Architecture — COMPLETE
- E-03: UI System Design — COMPLETE
- E-04: Build Wave 1 (Shell + Personal) — COMPLETE
  - E-04-01: Shell Foundation — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-01-SUMMARY.md)
  - E-04-02: Priority Home + Widget System — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-02-SUMMARY.md)
  - E-04-03: Remaining Primitives + Chat Overlay — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-03-SUMMARY.md)
  - E-04-04: Settings + Domain Activation — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-04-SUMMARY.md)
  - E-04-05: Personal Dashboard Foundation — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-05-SUMMARY.md)
  - E-04-05.5: Visual Polish Pass — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-05.5-SUMMARY.md)
  - E-04-06: Personal Sub-Views Wave 1 (Tasks + Habits + Bills) — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-06-SUMMARY.md)
  - E-04-07: Personal Sub-Views Wave 2 (Calendar + Journal + Goals + Health) — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-07-SUMMARY.md)
  - E-04-08: Onboarding Wizard + Jarvis Academy Foundation — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-08-SUMMARY.md)
- E-05: Jarvis Academy — COMPLETE
  - E-05-01: Tutorial Data Layer + Spotlight Wiring — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-05-01-SUMMARY.md)
  - E-05-02: Lesson Execution Engine + ChatOverlay Integration — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-05-02-SUMMARY.md)
  - E-05-03: Academy Hub + Suggestion Intelligence — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-05-03-SUMMARY.md)
    - Suggestion intelligence: getSuggestedLesson() follows nextSuggestion chain with fallback to first incomplete
    - Academy Hub page (/jarvis/app/academy): grouped lesson catalog with progress ring, 4 lesson card states (completed/in-progress/suggested/default)
    - AcademyProgress: dedicated Home section between Quick Actions and Widgets
    - BottomTabBar: Learn tab (GraduationCap) replaces placeholder Alerts tab
    - ~440 lines across 4 new + 3 modified files
- E-06: Command Palette — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-06-01-SUMMARY.md)
  - ~700 lines across 2 new + 2 modified files
  - Scored fuzzy search, match highlighting, keyboard nav, persistent recents, animated close
  - Header search button now functional (was dead since E-04-01)
- E-07+: Build Waves 2-5 (remaining domains + advanced features) — Not started

## What E-04-01 Delivered

- 4 primitives: Button, Card, Badge, Skeleton
- 5 layout components: JarvisShell, Header, DomainRail, BottomTabBar, ContentContainer
- Domain config (8 domains, 2 active) + shellStore (zustand)
- Route structure at /jarvis/app with 3 placeholder pages
- 761 lines across 17 files

## What E-04-02 Delivered

- 5 home composites: PriorityStack, DomainHealthGrid, QuickActionsBar, WidgetZone, BriefingCard
- Widget registry (8 definitions) + homeStore (zustand) + data freshness utility
- DomainIcon helper (shared icon resolver)
- Priority Home assembled with mock data — all 5 sections visible
- 682 lines across 12 files

## What E-04-03 Delivered

- 4 primitives completing full set (8/8): Input, Toggle, Sheet, Toast
- ChatOverlay: responsive bottom sheet (mobile) / side panel (desktop) with drag-to-dismiss, bouncing typing dots, staggered chip reveals, message entrance animations
- Toast system: toastStore + ToastContainer with progress bars, stacking depth effect, swipe-to-dismiss
- JarvisShell wired with ChatOverlay + ToastContainer
- Keyboard shortcut Cmd/Ctrl+Shift+C for desktop chat toggle
- 1,065 lines across 10 files — zero animation libraries

## What E-04-04 Delivered

- settingsStore (zustand + persist): activeDomainIds, notificationMode, featureToggles
- useActiveDomains() hook — canonical way to get active domains for any component
- Functional Settings page: 4 sections (Domains, Notifications, Features, About)
- DomainRail + DomainHealthGrid wired to settingsStore for dynamic domain visibility
- Protected domains: Home and Personal cannot be deactivated
- 277 lines across 1 new + 3 modified files

## What E-04-05 Delivered

- EmptyState primitive (9th primitive) — reusable empty state with icon, title, description, optional CTA
- personalStore (zustand) — 7 typed interfaces, mock data for tasks/habits/bills/calendar/journal/goals/health, computed todayStats
- Personal dashboard: TodaySnapshot (4-stat grid) + 7 SubProgramCards with live stats and status indicators
- 7 sub-route placeholder pages with EmptyState + back navigation
- ~500 lines across 12 new + 2 modified files

## What E-04-06 Delivered

- 3 view components: TasksList (grouped sections + checkbox), HabitsList (progress bar + streaks), BillsList (financial summary + Mark Paid)
- 3 store mutations: toggleTask, toggleHabit, markBillPaid — all recompute todayStats
- Summary heroes per view: stat pills (tasks), progress bar (habits), dollar totals (bills)
- Glass surfaces, fadeInUp entrance animations, spring easing on all new components
- ~400 lines across 3 new + 4 modified files

## What E-04-07 Delivered

- 4 view components: CalendarView (timeline), JournalView (mood selector), GoalsList (progress bars), HealthView (type-grouped)
- 1 store mutation: setJournalMood — mood selection on today's journal entry
- All 7 Personal sub-programs now have functional views (7/7 complete)
- ~380 lines across 4 new + 5 modified files

## What E-04-08 Delivered

- 6-step onboarding setup wizard at /jarvis/app/onboarding (Welcome → Domains → Data Sources → Home Setup → Notifications → Briefing)
- settingsStore extensions: onboarded flag, notificationSchedule, dataSourceUrls + 3 actions + partialize
- tutorialStore (zustand + persist): progress tracking, spotlight state, skill level — foundation for Jarvis Academy
- SpotlightOverlay: tutorial element highlighting with pulse/ring animations, auto-repositioning
- JarvisShell: onboarding redirect guard + conditional chrome hiding for full-screen onboarding
- ~1,061 lines across 4 new + 2 modified files

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Option B — Anthropic MCP Connector for brain swap | Phase B | Anthropic API + MCP Connector |
| Multi-model routing | Phase B | Haiku for CRUD, Sonnet for complex |
| Dual-path brain architecture | Phase C | thinkLocal + thinkWithMcp |
| Haiku as critic, tool_choice for structured output | Phase D-01 | Cheap, fast evaluations |
| Opus for reflection | Phase D-02 | Best reasoning for self-improvement |
| Meta-evaluator — second-order feedback loop | Phase D-02 | Weekly health check |
| Phase E is multi-domain OS, not UI facelift | Phase E | Ground-up design |
| Full scope now, no deferring to v5/v6 | Phase E | All domains anticipated |
| Domain Rail + Priority Home + Command Palette + Quick Capture | Phase E-02 | 4-layer navigation |
| Pinnable Home Widgets (max 4) | Phase E-02 | iOS-style widget registry |
| Chat as contextual overlay | Phase E-02 | Not a dedicated screen |
| Proxy pattern for Reset Bio + Visopscreen | Phase E-02 | Display layer only |
| Data freshness model (5 tiers) | Phase E-02 | Trust layer for proxied data |
| Weekly Review (Sunday retrospective) | Phase E-02 | Self-improvement meets UI |
| 6-step onboarding wizard | Phase E-02 | First-run experience |
| Mini-orb (32px in header), not archived | Phase E-03 | Preserves identity |
| lucide-react for icons | Phase E-03 | Already installed, tree-shakeable |
| Dark theme only, glassmorphism signature | Phase E-03 | Formalized existing aesthetic |
| 8 domain colors (violet, orange, emerald, rose, sky, amber, indigo) | Phase E-03 | Visual identity per domain |
| New shell at /jarvis/app, old /jarvis untouched | Phase E-04-01 | Safe parallel testing |
| DOMAIN_COLORS lookup for dynamic Tailwind classes | Phase E-04-01 | Avoids dynamic class string issues |
| DomainIcon as shared helper component | Phase E-04-02 | Resolves icon name strings to lucide components |
| Mock data in homeStore initial state | Phase E-04-02 | Home is immediately visual without API endpoints |
| PriorityItem/DomainHealthItem types in homeStore | Phase E-04-02 | UI types separate from backend BriefingData |
| Peer-focus pattern: input before icon in DOM | Phase E-04-03 | Required for Tailwind peer-focus selectors |
| CSS keyframes via style tags in components | Phase E-04-03 | Self-contained, no global CSS or animation libs |
| Ref-based touch tracking (no state during drag) | Phase E-04-03 | 60fps gesture performance |
| toast convenience API (toast.success/error/info) | Phase E-04-03 | Any component can trigger toasts without store import |
| settingsStore as domain activation source of truth | Phase E-04-04 | Replaces hardcoded domains.ts `active` flag |
| Protected domains guard (home, personal always on) | Phase E-04-04 | Cannot be deactivated per IA spec |
| useActiveDomains() hook as canonical API | Phase E-04-04 | All components use this instead of getActiveDomains() |
| Notification mode stored but not wired | Phase E-04-04 | UI ready, pipeline comes later |
| E-04-05+ split into 4 plans | Phase E-04-05 | Manageable scope per plan |
| Glass-interactive as default interactive surface | Phase E-04-05.5 | All new interactive cards MUST use glass-interactive, never default |
| Staggered fadeInUp on all lists/grids (400ms/50ms) | Phase E-04-05.5 | Entrance animation is mandatory pattern for new components |
| No flat bg-zinc-900 containers anywhere | Phase E-04-05.5 | Use glass or glass-interactive for all visible containers |
| Spring easing for transforms, ease for opacity | Phase E-04-05.5 | cubic-bezier(0.34,1.56,0.64,1) for scale, ease for color |
| Custom checkbox via button + Check icon | Phase E-04-06 | Spring scaling, not HTML checkbox |
| useMemo for all group computations | Phase E-04-06 | Prevents re-filtering on every toggle |
| SECTION_CONFIG declarative mapping for bills | Phase E-04-06 | Status → container/header style without nested ternaries |
| Status-tinted section containers | Phase E-04-06 | Red for overdue, amber for due_soon, glass for upcoming/paid |
| Inline span for category labels (not Badge) | Phase E-04-07 | Badge has no outline variant; plain span avoids primitive changes |
| Mood selector only on today's entry | Phase E-04-07 | Prevents retroactive mood editing on past entries |
| Violet tint for calendar today section | Phase E-04-07 | Matches Personal domain color identity |
| TYPE_CONFIG for health grouping | Phase E-04-07 | Mirrors SECTION_CONFIG pattern from BillsList |
| JarvisShell conditional chrome for onboarding | Phase E-04-08 | Hides shell chrome when pathname is /onboarding |
| Wizard local state → store write on finalize | Phase E-04-08 | All-or-nothing store commit on "Go to Home" |
| SpotlightOverlay rAF-throttled resize tracking | Phase E-04-08 | 60fps positioning without layout thrashing |
| Added Phase E-06: Command Palette | Phase E-05 | Deferred E-04 item — dead button in Header discovered during UAT |
| Instructions through ChatOverlay, not separate UI | Phase E-05-02 | Jarvis IS the teacher — conversation is the natural channel |
| Snapshot-based store verification | Phase E-05-02 | Detects NEW actions vs pre-existing state |
| React context for engine API | Phase E-05-02 | ChatOverlay accesses engine without prop drilling |
| Mobile auto-close chat after instruction | Phase E-05-02 | 70vh sheet covers UI; user needs to see spotlight targets |
| Reactive suggestedNext subscription | Phase E-05-02 | Store subscription reacts to changes vs one-shot useEffect |
| Start Tour as primary button | Phase E-05-02 | User missed ghost text 3 times during UAT |
| Hand-rolled fuzzy match — no external library | Phase E-06-01 | Scored matching with consecutive/word-start bonuses |
| OpenAI text-embedding-3-small for embeddings | Phase F-01 | Second provider (Anthropic has no embedding model) |
| Turso F32_BLOB + raw SQL (not Drizzle) for vectors | Phase F-01 | Drizzle can't manage vector column types |
| RRF fusion (k=60) for dual retrieval | Phase F-01 | Standard constant, combines BM25 + vector rankings |
| Separated bm25FindMemories to break circular deps | Phase F-01 | vectorSearch imports BM25, memoryEntries imports dualSearch |
| Fire-and-forget all embedding operations | Phase F-01 | Never blocks tool responses |
| Conditional mount for zero-cost palette | Phase E-06-01 | Hook only runs when palette is open |
| Animated close via closing state + onAnimationEnd | Phase E-06-01 | 150ms fade-out, no jarring unmount |
| Actions excluded from recents | Phase E-06-01 | Ephemeral commands, not destinations |
| Section cap of 4 per type | Phase E-06-01 | Prevents overwhelming walls of results |
| Stored-embedding subquery for candidate detection | Phase F-02 | Zero OpenAI API calls for detection |
| groupId = keepId-removeId for tool confirm parsing | Phase F-02 | Simple, deterministic two-phase flow |
| Longer content wins keep target, tiebreak on lastAccessed | Phase F-02 | Preserves maximum information |
| Haiku synthesis with fallback to longer content | Phase F-02 | Graceful degradation on API failure |
| Skip NudgeManager in new shell | Phase G-03 | Voice-era artifact: double-fetch, sound, redundant with PriorityStack |
| Scheduler as proactive conversation trigger | Phase G-03 | Toast "Chat" → chatStore.openWithMessage → AI executive walkthrough |
| Notification mode gates toasts, not data refresh | Phase G-03 | focus=morning only, active=all, dnd/review=silent; data always refreshes |
| Data-driven toast messages from store state | Phase G-03 | "Good morning — 5 tasks, 2 overdue" not static "briefing ready" |

## Completed Phases

- Phase A: Intelligence Audit — COMPLETE
- Phase B: SDK Integration — COMPLETE
- Phase C: Memory & Intelligence Preservation — COMPLETE
- Phase D: Self-Improvement Loop — COMPLETE
- Phase F: Vector Memory — COMPLETE (F-01 + F-02)

## What E-05-02 Delivered

- 3 new files: tutorialActionBus (pub/sub), verificationEngine (snapshot-based predicates), useTutorialEngine (337-line orchestrator)
- ChatOverlay integration: progress bar header, colored message borders, graduation cap icon, next-lesson chip
- JarvisShell: engine mount + TutorialEngineContext provider
- chatStore: tutorial metadata field on ChatMessage
- Hotfix: reactive suggestedNext subscription + Start Tour button prominence
- 653 lines across 3 new + 4 modified files

## What E-05-03 Delivered

- Suggestion intelligence: getSuggestedLesson() — follows nextSuggestion chain, falls back to first incomplete, returns null when all done
- Academy Hub page (/jarvis/app/academy): lesson catalog grouped by tier, SVG progress ring, 4 lesson card visual states
- LessonCard: completed (green check, muted), in-progress (amber ring + pulsing dot + Resume), suggested (cyan ring + Recommended badge + Start), default (ghost Start)
- AcademyProgress: Home section with next lesson name + mini progress ring, links to Academy
- BottomTabBar: Learn tab (GraduationCap icon) replaces placeholder Alerts tab
- ~440 lines across 4 new + 3 modified files

## What F-01 Delivered

- embeddings.ts: Lazy OpenAI singleton, ensureEmbeddingsTable (F32_BLOB + DiskANN index), generateEmbedding, storeEmbedding, deleteEmbedding, backfillEmbeddings
- vectorSearch.ts: vectorSearch (vector_top_k), dualSearch (BM25 + vector RRF fusion, k=60)
- search_memories tool: Natural language memory search available to Claude during conversations
- findMemoriesMatching upgraded: Transparently uses dual retrieval when OPENAI_API_KEY is set
- Graceful degradation: Everything works without OPENAI_API_KEY (falls back to BM25-only)
- ~260 lines across 2 new + 6 modified files + openai SDK dependency

## What F-02 Delivered

- consolidation.ts: findConsolidationCandidates (stored-embedding detection, zero API calls), synthesizeMergedMemory (Haiku), executeConsolidation, runConsolidation
- consolidate_memories tool: Two-phase (preview candidates → confirm merges), matching forget_fact pattern
- updateMemoryContent in memoryEntries.ts: Content + hash update with fire-and-forget re-embed
- ~210 lines new (consolidation.ts) + ~130 lines across 4 modified files

## What E-06-01 Delivered

- useCommandPalette hook: scored fuzzy match, multi-word tokenized search, search registry (5 content types), keyboard nav, persistent recents (localStorage)
- CommandPalette component: animated open (spring scale) + close (150ms fade), match highlighting (cyan), responsive layout, keyboard footer hints
- JarvisShell: global Cmd+K listener + conditional CommandPalette mount
- Header search button now functional — was dead no-op since E-04-01
- ~700 lines across 2 new + 2 modified files

## Integration Audit Findings (2026-02-27)

Deep 5-agent audit revealed:
- ChatOverlay: FULLY WIRED to /api/jarvis/chat (SSE streaming, real backend) ✓
- Executive functions: COMPLETELY ORPHANED from new /jarvis/app shell ✗
- Voice pipeline: Absent from new shell (by design — text-first dashboard) ~
- 4 gems DORMANT (enableMemoryLoading defaults OFF): memory scoring, proactive surfacing, decay, summarization ✗
- Home screen: All mock data (PriorityStack, DomainHealthGrid, BriefingCard) ✗
- Old /jarvis page: Fully functional, retains voice + executive functions ✓

## Session Continuity

Last session: 2026-02-28
Stopped at: H-01 plan audit complete — 3 issues found and corrected in plan
Next action: Review corrected H-01 plan, then run /paul:apply H-01
Resume file: .paul/HANDOFF-2026-02-28-f.md
Resume context:
- H-01 plan AUDITED + CORRECTED (3 fixes: RFC 3339 compliance, evening wrap bug, MCP mode gap)
- Fix 1: Added getTimezoneOffsetString() utility — all time boundaries now RFC 3339 compliant
- Fix 2: Evening wrap calendar.today was using tomorrowTasks (pre-existing bug) — corrected to today's tasks
- Fix 3: MCP mode now includes calendarTools — query_calendar works in both modes
- Verification checklist expanded from 15 to 19 checks
- Checkpoint: Jonathan needs Google Cloud service account before real data flows (or skip — graceful degradation)
- No code changes this session — only plan file edits
