# Project State

## Current Position

Milestone: v4.0 Brain Swap & Life Manager UI
Phase: E of G (Multi-Domain Operating System) — E-04 Build Wave 1
Plan: E-04-08 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-02-26 — Created E-04-08-PLAN.md (Onboarding Wizard + Jarvis Academy Foundation)

Progress:
- Milestone: [########░░] 80% (Phase A + B + C + D complete, E in progress, F-G remaining)
- Phase E: [██████████] 92% (E-01/02/03 research + E-04-01 through E-04-07 built, E-04-08 planned)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [E-04-08 plan created, awaiting approval]
```

## Phase E Sub-Phase Progress

- E-01: Grand Research (Domain Atlas) — COMPLETE
- E-02: Information Architecture — COMPLETE
- E-03: UI System Design — COMPLETE
- E-04: Build Wave 1 (Shell + Personal) — IN PROGRESS
  - E-04-01: Shell Foundation — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-01-SUMMARY.md)
  - E-04-02: Priority Home + Widget System — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-02-SUMMARY.md)
  - E-04-03: Remaining Primitives + Chat Overlay — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-03-SUMMARY.md)
  - E-04-04: Settings + Domain Activation — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-04-SUMMARY.md)
  - E-04-05: Personal Dashboard Foundation — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-05-SUMMARY.md)
  - E-04-05.5: Visual Polish Pass — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-05.5-SUMMARY.md)
  - E-04-06: Personal Sub-Views Wave 1 (Tasks + Habits + Bills) — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-06-SUMMARY.md)
  - E-04-07: Personal Sub-Views Wave 2 (Calendar + Journal + Goals + Health) — COMPLETE (SUMMARY: .paul/phases/E-mobile-ui/E-04-07-SUMMARY.md)
  - E-04-08: Onboarding + Notification Foundation — not yet planned
- E-05+: Build Waves 2-5 — Not started

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

## Completed Phases

- Phase A: Intelligence Audit — COMPLETE
- Phase B: SDK Integration — COMPLETE
- Phase C: Memory & Intelligence Preservation — COMPLETE
- Phase D: Self-Improvement Loop — COMPLETE

## Session Continuity

Last session: 2026-02-26 (evening)
Stopped at: E-04-08 plan created, awaiting approval
Next action: /paul:apply .paul/phases/E-mobile-ui/E-04-08-PLAN.md
Resume file: .paul/HANDOFF-2026-02-26b.md
Resume context:
- E-04-08 PLAN created: Onboarding Wizard + Jarvis Academy Foundation (2 tasks, 8 ACs)
- Vision document created: .paul/research/phase-e-jarvis-academy-vision.md (500+ lines)
- No code written yet — all research + planning + documentation
- Scope: 6-step setup wizard, settingsStore extensions, tutorialStore, SpotlightOverlay, onboarding redirect
- Future phase needed: Jarvis Academy lessons (Tier 1-4, 15+ tutorials)
- Quality bar: glass surfaces, fadeInUp entrance, spring easing — wizard MUST match
