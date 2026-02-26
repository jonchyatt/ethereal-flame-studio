---
phase: E-mobile-ui
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/jarvis/primitives/Button.tsx
  - src/components/jarvis/primitives/Card.tsx
  - src/components/jarvis/primitives/Badge.tsx
  - src/components/jarvis/primitives/Skeleton.tsx
  - src/components/jarvis/primitives/index.ts
  - src/lib/jarvis/domains.ts
  - src/lib/jarvis/stores/shellStore.ts
  - src/components/jarvis/layout/JarvisShell.tsx
  - src/components/jarvis/layout/Header.tsx
  - src/components/jarvis/layout/DomainRail.tsx
  - src/components/jarvis/layout/BottomTabBar.tsx
  - src/components/jarvis/layout/ContentContainer.tsx
  - src/components/jarvis/layout/index.ts
  - src/app/jarvis/app/layout.tsx
  - src/app/jarvis/app/page.tsx
  - src/app/jarvis/app/personal/page.tsx
  - src/app/jarvis/app/settings/page.tsx
autonomous: true
---

<objective>
## Goal
Build the navigable app shell — layout chrome (header, domain rail, bottom tabs, content area), core primitive components, and route structure — so all subsequent E-04 plans have a skeleton to fill in.

## Purpose
This is the first code of the new multi-domain operating system. Everything else (Home screen, Personal domain, Chat overlay, etc.) depends on the shell existing and being navigable. After this plan, visiting `/jarvis/app` shows a working responsive shell with domain navigation.

## Output
- 4 primitive components (Button, Card, Badge, Skeleton)
- 5 layout components (JarvisShell, Header, DomainRail, BottomTabBar, ContentContainer)
- Domain config + shell state store
- Route structure with 3 placeholder pages (Home, Personal, Settings)
- Old `/jarvis` page untouched — new shell lives at `/jarvis/app` for safe parallel testing
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Blueprint Documents (critical — specs live here)
@.paul/research/phase-e-ui-system-design.md (Section 1: Design Tokens, Section 2: Component Architecture, Section 3: Layout System)
@.paul/research/phase-e-information-architecture.md (Section 1: Navigation Model)

## Source Files
@src/app/jarvis/layout.tsx (existing Jarvis layout — wraps all /jarvis/* routes)
@src/app/jarvis/page.tsx (existing orb UI — DO NOT MODIFY)
@src/lib/jarvis/stores/jarvisStore.ts (existing store pattern to follow)
@tailwind.config.ts (may need minor extension for animations)
</context>

<skills>
No SPECIAL-FLOWS.md — skills section omitted.
</skills>

<acceptance_criteria>

## AC-1: Primitives render correctly
```gherkin
Given the primitives are imported from '@/components/jarvis/primitives'
When Button, Card, Badge, and Skeleton are rendered with their variant props
Then each renders with correct Tailwind classes per UI System Design spec
And TypeScript compilation succeeds with no type errors
```

## AC-2: Shell layout is responsive
```gherkin
Given the JarvisShell is rendered at /jarvis/app
When viewed on mobile viewport (<768px)
Then Header is fixed top, DomainRail is horizontal below header, BottomTabBar is fixed bottom, content scrolls between them
When viewed on desktop viewport (>1024px)
Then DomainRail is vertical on the left (60px), Header is offset right, BottomTabBar is hidden, content fills remaining space
```

## AC-3: Domain navigation works
```gherkin
Given the shell is rendered with DomainRail showing active domains
When a domain icon is tapped/clicked
Then the active domain updates in shellStore
And the DomainRail highlights the selected domain with its color
And the URL navigates to the domain's route
```

## AC-4: Build passes and old Jarvis untouched
```gherkin
Given the new shell is added under /jarvis/app/
When `npm run build` is executed
Then the build completes with no errors
And the existing /jarvis page.tsx is unchanged
And the existing /jarvis route still renders the orb UI
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Core Primitives + Domain Config</name>
  <files>
    src/components/jarvis/primitives/Button.tsx,
    src/components/jarvis/primitives/Card.tsx,
    src/components/jarvis/primitives/Badge.tsx,
    src/components/jarvis/primitives/Skeleton.tsx,
    src/components/jarvis/primitives/index.ts,
    src/lib/jarvis/domains.ts,
    src/lib/jarvis/stores/shellStore.ts
  </files>
  <action>
    **Primitives** — Create `src/components/jarvis/primitives/` directory with 4 components:

    1. **Button.tsx** — 'use client'. Props: variant ('primary'|'secondary'|'ghost'|'destructive'|'icon'), size ('sm'|'md'|'lg'), disabled, loading, icon (ReactNode), children, onClick. Plus className and ...rest spread.
       - Variant classes per UI System Design Section 2 (primary = `bg-cyan-600 hover:bg-cyan-500 text-white font-medium`, etc.)
       - Size classes: sm = `px-3 py-1.5 text-xs rounded-lg`, md = `px-4 py-2.5 text-sm rounded-xl`, lg = `px-6 py-3 text-sm rounded-xl`
       - All buttons: `transition-colors disabled:opacity-40 disabled:cursor-not-allowed`
       - Loading: show a small spinner SVG, keep text, add `pointer-events-none`
       - Use a simple `cn()` helper (inline or import from a tiny utility) for class merging — just template literal joining, no external lib needed

    2. **Card.tsx** — 'use client'. Props: variant ('default'|'glass'|'interactive'), padding ('none'|'sm'|'md'|'lg'), statusStripe ('critical'|'warning'|'success'|'info'|null), header, footer, children, onClick, className.
       - Variant classes per spec (default = `bg-zinc-900 border border-white/10 rounded-2xl`, glass = `bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl`, interactive adds `hover:bg-zinc-800 hover:border-white/20 cursor-pointer transition-colors`)
       - Status stripe: conditional `border-l-4 border-l-{color}-400`
       - Render header above children (if provided), footer below (if provided), with `border-t border-white/5` dividers

    3. **Badge.tsx** — Props: variant ('status'|'count'|'domain'), status, count, domainColor, size ('sm'|'md'), children.
       - Status variant: colored bg/text/border per status level (critical = red, warning = amber, success = green, info = blue, inactive = zinc)
       - Count variant: `bg-cyan-500/80 text-white rounded-full min-w-[18px] h-[18px] text-[10px] font-bold flex items-center justify-center`
       - Domain variant: uses domainColor prop for `bg-{color}-500/10 text-{color}-400`

    4. **Skeleton.tsx** — Props: variant ('text'|'card'|'list-item'|'circle'), width, height, className.
       - Base: `bg-zinc-800 rounded animate-pulse`
       - Variant defaults: text = `h-4 w-full rounded`, card = `h-32 w-full rounded-2xl`, list-item = `h-12 w-full rounded-xl`, circle = `w-10 h-10 rounded-full`

    5. **index.ts** — Barrel export all 4 primitives.

    **Domain Config** — Create `src/lib/jarvis/domains.ts`:
    - Export a `Domain` type: { id: string, name: string, icon: string (lucide icon name), color: string (Tailwind color prefix like 'cyan', 'violet'), route: string, active: boolean }
    - Export `DOMAINS` array with all 8 entries (Home, Personal, Ethereal Flame, Reset Biology, CritFailVlogs, Visopscreen, Satori Living, Entity Building) per E-03 spec
    - For now, only Home and Personal are `active: true`. Others are `active: false` (hidden from rail per "Empty rooms don't waste space" principle)
    - Export helper: `getActiveDomains()` returns domains where active is true
    - Export a `DOMAIN_COLORS` record mapping color names to Tailwind class fragments

    **Shell Store** — Create `src/lib/jarvis/stores/shellStore.ts`:
    - Follow the pattern of existing jarvisStore.ts (zustand)
    - State: activeDomain (string, default 'home'), isChatOpen (boolean, false), isCommandPaletteOpen (boolean, false)
    - Actions: setActiveDomain(id), toggleChat(), toggleCommandPalette(), closeChat(), closeCommandPalette()

    Avoid: importing any external UI library, adding shadcn, creating design token files that duplicate what Tailwind already provides.
  </action>
  <verify>
    - All files exist in correct paths
    - `npm run build` passes with no type errors in new files
    - Imports resolve: `import { Button, Card, Badge, Skeleton } from '@/components/jarvis/primitives'`
  </verify>
  <done>AC-1 satisfied: Primitives compile with correct props and variant classes per spec</done>
</task>

<task type="auto">
  <name>Task 2: Layout Components (Shell Chrome)</name>
  <files>
    src/components/jarvis/layout/JarvisShell.tsx,
    src/components/jarvis/layout/Header.tsx,
    src/components/jarvis/layout/DomainRail.tsx,
    src/components/jarvis/layout/BottomTabBar.tsx,
    src/components/jarvis/layout/ContentContainer.tsx,
    src/components/jarvis/layout/index.ts
  </files>
  <action>
    Create `src/components/jarvis/layout/` directory with 5 components. All are 'use client'.

    1. **Header.tsx** — Fixed top bar.
       - Height: `h-14` (56px)
       - Classes: `fixed top-0 left-0 right-0 bg-zinc-950 border-b border-white/10 z-50`
       - Desktop offset: `md:left-16` (pushed right by domain rail)
       - Left side: Jarvis logo/text — a small "J" badge or text "Jarvis" with `text-cyan-400 font-semibold text-sm`, clicking navigates to home
       - Right side: search icon button (mobile: opens command palette placeholder, desktop: inline text hint "Search..." clickable), notification bell with Badge(count), settings gear icon
       - Use lucide-react icons: `Search`, `Bell`, `Settings`
       - All icon buttons use the Button primitive with variant='icon'
       - Mobile: search, bell, settings as icon buttons
       - Desktop: add `hidden md:flex` search hint text

    2. **DomainRail.tsx** — Domain switcher rail.
       - Reads `DOMAINS` from domains.ts, filters to `getActiveDomains()`
       - Reads `activeDomain` from shellStore
       - Mobile: `fixed left-0 right-0 top-14 h-12 bg-zinc-950 border-b border-white/10 z-40 md:hidden`
         - Horizontal flex of domain icons with `gap-1`, centered, `overflow-x-auto`
       - Desktop: `fixed left-0 top-0 bottom-0 w-16 bg-zinc-950 border-r border-white/10 z-40 hidden md:flex md:flex-col md:items-center md:py-4`
         - Vertical flex of icons with `gap-2`
         - Settings icon pinned to bottom via `mt-auto`
       - Each icon:
         - Import lucide icons dynamically or use a lookup map: { 'Home': Home, 'User': User, etc. }
         - Inactive: `text-zinc-500 hover:text-zinc-300 p-2 rounded-xl transition-colors`
         - Active: `bg-{domainColor}-500/15 text-{domainColor}-400 p-2 rounded-xl`
         - On click: `setActiveDomain(domain.id)` + router.push(domain.route)
       - Use `useRouter` from next/navigation for client-side navigation

    3. **BottomTabBar.tsx** — Mobile-only bottom navigation.
       - Classes: `fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-white/10 z-50 md:hidden safe-area-bottom`
       - 5 items: Home, Chat, [+], Alerts, Settings
       - Each: icon (20px) + label (text-xs) stacked vertically, `flex-1 flex flex-col items-center justify-center gap-1`
       - Active: `text-cyan-400`, inactive: `text-zinc-500`
       - Home tap: navigate to /jarvis/app
       - Chat tap: `toggleChat()` from shellStore
       - [+] center: slightly elevated visually (`-mt-3`), triggers quick add (placeholder for now — just logs)
       - Alerts: Bell icon with badge count (0 for now)
       - Settings: navigate to /jarvis/app/settings
       - Icons: `Home`, `MessageCircle`, `Plus`, `Bell`, `Settings` from lucide-react

    4. **ContentContainer.tsx** — Content area wrapper with consistent padding and offsets.
       - Props: children, maxWidth ('narrow'|'default'|'wide') defaulting to 'default'
       - Classes: `w-full mx-auto px-4 md:px-6 lg:px-8`
       - Max width: narrow = `max-w-3xl`, default = `max-w-5xl`, wide = `max-w-7xl`
       - Offsets: `pt-[6.5rem] pb-20 md:pt-14 md:pb-4` (mobile: header 56px + rail 48px = 104px top, tab bar bottom; desktop: header only, no bottom tab)
       - Desktop rail offset: `md:pl-16`
       - Scrollable: `min-h-screen` with `overflow-y-auto` on parent

    5. **JarvisShell.tsx** — Root shell composing all layout components.
       - Props: children
       - Renders: Header, DomainRail, main content area wrapping children, BottomTabBar
       - Structure:
         ```
         <div className="h-dvh w-full bg-black text-white">
           <Header />
           <DomainRail />
           <main className="h-full overflow-y-auto">
             {children}
           </main>
           <BottomTabBar />
         </div>
         ```
       - The main area is the scrollable region; Header, DomainRail, BottomTabBar are fixed chrome

    6. **index.ts** — Barrel export all layout components.

    Avoid: Adding ChatOverlay or CommandPalette in this plan (those come in E-04-03+). Do not modify any existing components in `src/components/jarvis/`. Do not add framer-motion or any animation library.
  </action>
  <verify>
    - All 5 layout components compile without errors
    - `npm run build` passes
    - JarvisShell renders Header (fixed top), DomainRail (horizontal mobile / vertical desktop), content area (scrollable), BottomTabBar (mobile only)
  </verify>
  <done>AC-2 satisfied: Shell layout is responsive with correct positioning. AC-3 satisfied: Domain navigation updates store and highlights active domain.</done>
</task>

<task type="auto">
  <name>Task 3: Route Structure + Build Verification</name>
  <files>
    src/app/jarvis/app/layout.tsx,
    src/app/jarvis/app/page.tsx,
    src/app/jarvis/app/personal/page.tsx,
    src/app/jarvis/app/settings/page.tsx
  </files>
  <action>
    Create Next.js App Router routes under `src/app/jarvis/app/` — this maps to `/jarvis/app` in the URL, keeping the old `/jarvis` orb page untouched.

    1. **src/app/jarvis/app/layout.tsx** — Server component layout.
       - Import JarvisShell from `@/components/jarvis/layout`
       - Wrap children in JarvisShell
       - Export metadata: title = 'Jarvis', description = 'Multi-domain operating system'
       - No viewport export here (parent layout already handles it)

    2. **src/app/jarvis/app/page.tsx** — Priority Home placeholder.
       - 'use client'
       - Import ContentContainer from `@/components/jarvis/layout`
       - Import Card from `@/components/jarvis/primitives`
       - Render ContentContainer wrapping:
         - A heading: "Priority Home" (heading-xl style: `text-xl font-semibold text-white/90`)
         - A subtitle: "Your command center" (`text-sm text-white/60`)
         - A Card (variant='glass', padding='md') containing placeholder text: "Priority stack, domain health grid, and widgets will appear here."
         - This is a minimal placeholder proving the shell works

    3. **src/app/jarvis/app/personal/page.tsx** — Personal domain placeholder.
       - Same pattern: ContentContainer + heading "Personal" + Card placeholder
       - Text: "Tasks, habits, bills, calendar, and more coming in the next wave."

    4. **src/app/jarvis/app/settings/page.tsx** — Settings placeholder.
       - Same pattern: ContentContainer + heading "Settings" + Card placeholder
       - Text: "Feature toggles, notification preferences, and account settings."

    After creating routes, run `npm run build` to verify:
    - No TypeScript errors
    - No build-time import resolution failures
    - Existing `/jarvis` page still compiles
    - New `/jarvis/app` route compiles with the shell layout

    Avoid: Modifying `src/app/jarvis/page.tsx` or `src/app/jarvis/layout.tsx`. Do not add any API routes. Do not add data fetching.
  </action>
  <verify>
    - `npm run build` succeeds with exit code 0
    - `src/app/jarvis/page.tsx` is byte-identical to before (unchanged)
    - New routes exist: app/page.tsx, app/personal/page.tsx, app/settings/page.tsx
    - No new build warnings related to the jarvis routes
  </verify>
  <done>AC-4 satisfied: Build passes, old Jarvis untouched, new shell routes created.</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `src/app/jarvis/page.tsx` — existing orb UI, must remain untouched
- `src/app/jarvis/layout.tsx` — existing metadata/viewport, do not modify
- `src/components/jarvis/ChatPanel.tsx` — will be migrated in a later plan
- `src/components/jarvis/Dashboard/*` — will be replaced in a later plan
- `src/components/jarvis/JarvisOrb.tsx` — preserved, not touched
- `src/lib/jarvis/stores/jarvisStore.ts` — existing store, do not modify
- `tailwind.config.ts` — do not modify (all tokens use existing Tailwind classes)

## SCOPE LIMITS
- No ChatOverlay component (E-04-03)
- No CommandPalette component (E-04-03)
- No widget system or widget registry (E-04-02)
- No data fetching or API calls
- No Toast component in this plan (primitive exists in spec, built when needed)
- No Input, Toggle, or Sheet primitives in this plan (built when needed)
- No framer-motion or animation libraries
- DomainRail shows only Home + Personal for now (others inactive)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` exits with code 0
- [ ] All 4 primitives importable from `@/components/jarvis/primitives`
- [ ] All 5 layout components importable from `@/components/jarvis/layout`
- [ ] shellStore provides activeDomain, setActiveDomain, toggleChat
- [ ] domains.ts exports DOMAINS array with 8 entries, getActiveDomains returns 2
- [ ] /jarvis/app route renders JarvisShell with Header, DomainRail, BottomTabBar
- [ ] /jarvis/app/personal and /jarvis/app/settings render inside the shell
- [ ] /jarvis (old orb page) is completely unchanged — verified by git diff
- [ ] No new TypeScript errors or build warnings
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- Build succeeds (`npm run build` exit 0)
- Old Jarvis page untouched (git shows no changes to src/app/jarvis/page.tsx)
- New shell is navigable at /jarvis/app with responsive layout
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-04-01-SUMMARY.md`
</output>
