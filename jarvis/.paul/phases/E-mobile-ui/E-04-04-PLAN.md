---
phase: E-mobile-ui
plan: 04-04
type: execute
wave: 1
depends_on: ["04-03"]
files_modified:
  - src/lib/jarvis/stores/settingsStore.ts
  - src/lib/jarvis/domains.ts
  - src/app/jarvis/app/settings/page.tsx
  - src/components/jarvis/layout/DomainRail.tsx
  - src/components/jarvis/layout/BottomTabBar.tsx
  - src/components/jarvis/home/DomainHealthGrid.tsx
autonomous: true
---

<objective>
## Goal
Build a functional Settings page with real controls and a settingsStore that drives domain activation, notification mode, and feature toggles — making the domain system dynamic instead of hardcoded.

## Purpose
Settings is the control center for Jarvis. Until domains can be activated/deactivated from the UI, the domain rail and health grid are static. This plan makes the multi-domain system interactive: users can enable domains, set notification modes, and toggle features — all persisted in localStorage.

## Output
- `settingsStore.ts` — zustand + persist store for user preferences
- Fully functional Settings page with 4 sections: Domains, Notifications, Features, About
- DomainRail, BottomTabBar, and DomainHealthGrid wired to settingsStore for dynamic domain visibility
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/E-mobile-ui/E-04-01-SUMMARY.md — Shell layout, DomainRail, BottomTabBar
@.paul/phases/E-mobile-ui/E-04-03-SUMMARY.md — All 8 primitives (Toggle, Input used heavily here)

## Source Files
@src/lib/jarvis/domains.ts — Current domain config (hardcoded `active` flag)
@src/lib/jarvis/stores/shellStore.ts — Shell state pattern reference
@src/lib/jarvis/stores/homeStore.ts — Persist pattern reference
@src/app/jarvis/app/settings/page.tsx — Current placeholder
@src/components/jarvis/layout/DomainRail.tsx — Currently reads from domains.ts
@src/components/jarvis/layout/BottomTabBar.tsx — May need settings route awareness
@src/components/jarvis/home/DomainHealthGrid.tsx — Currently reads from domains.ts

## Blueprint
@.paul/research/phase-e-information-architecture.md — Section 2 (Activation Model), Section 5 (Notification Modes), Section 7 (State Management)
</context>

<skills>
No specialized flows configured.
</skills>

<acceptance_criteria>

## AC-1: Settings Store Persists Preferences
```gherkin
Given a fresh app load with no localStorage
When the settingsStore initializes
Then activeDomainIds defaults to ['home', 'personal']
And notificationMode defaults to 'active'
And featureToggles include voiceEnabled (false), orbFullscreen (false), selfImprovement (true)
And preferences persist to localStorage under 'jarvis-settings' key
```

## AC-2: Domain Activation Controls
```gherkin
Given the Settings page Domains section
When the user taps a Toggle next to an inactive domain (e.g., Reset Biology)
Then that domain's ID is added to activeDomainIds in settingsStore
And the DomainRail immediately shows the new domain icon
And the DomainHealthGrid shows a new health card for that domain
```

## AC-3: Domain Deactivation
```gherkin
Given a domain is active (not Home or Personal)
When the user toggles it off in Settings
Then the domain is removed from activeDomainIds
And the DomainRail and DomainHealthGrid no longer show it
And Home and Personal cannot be deactivated (toggles disabled)
```

## AC-4: Notification Mode Selection
```gherkin
Given the Settings page Notifications section
When the user selects a notification mode (Focus, Active, Review, DND)
Then the settingsStore updates notificationMode
And the selected mode shows a visual indicator (highlighted card)
```

## AC-5: Feature Toggles
```gherkin
Given the Settings page Features section
When the user toggles a feature (e.g., Voice, Full-screen Orb, Self-Improvement)
Then the featureToggles map updates in settingsStore
And the toggle visually reflects the new state
```

## AC-6: Build Compiles Clean
```gherkin
Given all changes are complete
When running npx tsc --noEmit
Then zero new TypeScript errors are introduced
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create settingsStore with domain activation, notification mode, and feature toggles</name>
  <files>src/lib/jarvis/stores/settingsStore.ts</files>
  <action>
    Create a zustand store with persist middleware (pattern matches homeStore.ts):

    **State:**
    - `activeDomainIds: string[]` — default `['home', 'personal']` (matches IA: "Personal Life = Active, all others = Hidden")
    - `notificationMode: 'focus' | 'active' | 'review' | 'dnd'` — default `'active'`
    - `featureToggles: Record<string, boolean>` — default `{ voiceEnabled: false, orbFullscreen: false, selfImprovement: true }`

    **Actions:**
    - `activateDomain(id: string)` — adds to activeDomainIds if not present
    - `deactivateDomain(id: string)` — removes from activeDomainIds; guard: cannot remove 'home' or 'personal'
    - `isDomainActive(id: string): boolean` — selector
    - `setNotificationMode(mode)` — sets notification mode
    - `setFeatureToggle(key: string, value: boolean)` — updates single toggle
    - `getActiveDomains()` — returns full Domain[] objects by joining activeDomainIds with DOMAINS from domains.ts

    **Persist config:**
    - name: `'jarvis-settings'`
    - Partialize: persist all state (activeDomainIds, notificationMode, featureToggles)

    **Export a derived helper:**
    - `useActiveDomains()` — hook that returns Domain[] filtered by settingsStore.activeDomainIds, ordered by DOMAINS array order

    Avoid: Do NOT modify domains.ts `active` field — the store is now the source of truth for activation. The `active` field in domains.ts becomes the "default" only used if no localStorage exists.
  </action>
  <verify>npx tsc --noEmit — file compiles with no type errors</verify>
  <done>AC-1 satisfied: settingsStore initializes with correct defaults and persists to localStorage</done>
</task>

<task type="auto">
  <name>Task 2: Build Settings page with Domains, Notifications, Features, and About sections</name>
  <files>src/app/jarvis/app/settings/page.tsx</files>
  <action>
    Replace the placeholder Settings page with a functional page using existing primitives:

    **Page structure** (all inside ContentContainer, scrollable):

    **Header:** "Settings" title + "Configure your Jarvis experience" subtitle (keep existing style)

    **Section 1 — Domains:**
    - Heading: "Domains" with subtitle "Activate domains to see them in your rail and home"
    - List of all 8 domains (from DOMAINS array in domains.ts), each row:
      - DomainIcon (from home/DomainIcon.tsx) + domain name + domain color dot
      - Toggle (from primitives) bound to settingsStore.activeDomainIds
      - Home and Personal: Toggle disabled with "(always on)" label
    - Wrap in Card variant="glass"

    **Section 2 — Notifications:**
    - Heading: "Notification Mode"
    - 4 mode cards (tappable, one selected), each in a Card variant="glass":
      - Focus: "Hospital hours — critical only" with Shield icon
      - Active: "Available — critical + important" with Bell icon
      - Review: "Dedicated time — everything" with Eye icon
      - DND: "Do not disturb — nothing" with BellOff icon
    - Selected mode: ring-2 ring-cyan-500/40 border + cyan text
    - Unselected: default glass card appearance

    **Section 3 — Features:**
    - Heading: "Features"
    - Toggle rows in Card variant="glass":
      - "Voice Input" — voiceEnabled toggle (Mic icon)
      - "Full-Screen Orb" — orbFullscreen toggle (Maximize2 icon)
      - "Self-Improvement" — selfImprovement toggle (Brain icon)
    - Each row: icon + label + description text + Toggle aligned right

    **Section 4 — About:**
    - Card variant="glass" with:
      - "Jarvis v4.0" title
      - "Brain Swap & Life Manager UI" subtitle
      - "Built with love between patients" tagline in text-white/40

    Use lucide-react icons: Shield, Bell, BellOff, Eye, Mic, Maximize2, Brain, User, Flame, Dna, Dice6, TrendingUp, Landmark, Building2

    Avoid: Do NOT add navigation sub-pages (settings/notifications, settings/domains). Keep it a single scrollable page for now. Do NOT add form validation — toggles are immediate-effect.
  </action>
  <verify>npx tsc --noEmit — page compiles. Visual: Settings page renders 4 sections with working toggles.</verify>
  <done>AC-2, AC-3, AC-4, AC-5 satisfied: All settings controls functional with settingsStore binding</done>
</task>

<task type="auto">
  <name>Task 3: Wire DomainRail, BottomTabBar, and DomainHealthGrid to settingsStore</name>
  <files>src/components/jarvis/layout/DomainRail.tsx, src/components/jarvis/layout/BottomTabBar.tsx, src/components/jarvis/home/DomainHealthGrid.tsx</files>
  <action>
    Update these three components to read active domains from settingsStore instead of the hardcoded domains.ts `active` flag:

    **DomainRail.tsx:**
    - Import `useActiveDomains` from settingsStore
    - Replace `getActiveDomains()` call with `useActiveDomains()`
    - The rail now dynamically updates when domains are activated/deactivated in Settings
    - Home icon always first, then domains in DOMAINS array order

    **BottomTabBar.tsx:**
    - No domain filtering change needed (BottomTabBar shows fixed tabs: Home, Chat, Activity, Notifications, Settings)
    - BUT ensure the Settings tab has proper active styling when on /jarvis/app/settings route
    - If BottomTabBar currently uses domain filtering, switch to settingsStore

    **DomainHealthGrid.tsx:**
    - Import `useActiveDomains` from settingsStore
    - Filter health cards to only show active domains (exclude 'home' — home doesn't get a health card)
    - When a domain is freshly activated, show it with 'gray' status and "Set up to see data" summary (no mock data explosion)

    Avoid: Do NOT remove the `active` field from domains.ts — it still serves as the initial default. Do NOT change the homeStore mock data — keep existing mock priorities as-is.
  </action>
  <verify>npx tsc --noEmit — all three files compile. Toggling a domain in Settings should cause immediate visual change in DomainRail and DomainHealthGrid.</verify>
  <done>AC-2, AC-3, AC-6 satisfied: Domain activation is fully reactive across shell components</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/primitives/* (all 8 primitives are stable)
- src/components/jarvis/layout/Header.tsx (header is stable)
- src/components/jarvis/layout/ChatOverlay.tsx (chat overlay is stable)
- src/components/jarvis/layout/ToastContainer.tsx (toast system is stable)
- src/components/jarvis/home/PriorityStack.tsx (home composites are stable)
- src/components/jarvis/home/QuickActionsBar.tsx
- src/components/jarvis/home/WidgetZone.tsx
- src/components/jarvis/home/BriefingCard.tsx
- src/lib/jarvis/stores/homeStore.ts (home store data stays as-is)
- src/lib/jarvis/stores/toastStore.ts
- src/lib/jarvis/stores/shellStore.ts
- src/app/jarvis/app/page.tsx (home page stays as-is)
- src/app/jarvis/app/personal/page.tsx (personal page handled in future plan)
- Any files outside src/components/jarvis/ and src/lib/jarvis/ and src/app/jarvis/

## SCOPE LIMITS
- No sub-pages under settings (no /settings/notifications, /settings/domains)
- No notification pipeline implementation (just the mode selector UI)
- No actual voice/orb/self-improvement feature wiring (just toggle state)
- No onboarding flow
- No empty state pattern components (generic patterns come in a future plan)
- No Personal domain views
- No API calls or data fetching — all state is local/mock

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` passes with zero new errors
- [ ] settingsStore persists to localStorage (key: 'jarvis-settings')
- [ ] Settings page renders 4 sections: Domains, Notifications, Features, About
- [ ] Toggling a domain in Settings updates DomainRail in real-time
- [ ] Toggling a domain in Settings updates DomainHealthGrid in real-time
- [ ] Home and Personal cannot be deactivated
- [ ] Notification mode selection visually highlights the active mode
- [ ] Feature toggles reflect state correctly
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All 3 tasks completed
- All 6 acceptance criteria pass
- All verification checks pass
- No new TypeScript errors
- Settings page is the first interactive configuration surface in the new UI
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-04-SUMMARY.md`
</output>
