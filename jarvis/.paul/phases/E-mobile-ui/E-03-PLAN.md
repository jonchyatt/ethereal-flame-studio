---
phase: E-mobile-ui
plan: 03
type: research
wave: 1
depends_on: [E-02]
files_modified:
  - jarvis/.paul/research/phase-e-ui-system-design.md
autonomous: false
---

<objective>
## Goal
Design the complete UI system for the Jarvis multi-domain operating system — design tokens, component architecture, layout system, responsive strategy, animation patterns, icon system, and accessibility rules. This is the visual language that every screen and component follows.

## Purpose
E-02 designed the house (navigation, rooms, connections). E-03 designs how every room *looks* and *feels* — the materials, the fixtures, the lighting, the proportions. Without this, each build wave would invent its own patterns and the UI would feel like a patchwork.

The system must:
- Formalize existing ad-hoc Tailwind patterns into a coherent design system
- Define shared component primitives that don't exist yet (Button, Card, Input, etc.)
- Specify the JarvisShell layout (header, domain rail, bottom tabs, chat overlay)
- Document responsive breakpoints and how every screen type adapts
- Decide what happens to the 3D orb (archive, miniaturize, or repurpose)
- Establish animation and transition patterns
- Ensure accessibility from the start

## Output
- `jarvis/.paul/research/phase-e-ui-system-design.md` — the comprehensive UI system document
- Consumed by E-04+ build waves as the component and visual reference
</objective>

<context>
## Architecture Foundation
@.paul/research/phase-e-information-architecture.md (v1.1 — the blueprint)
@.paul/phases/E-mobile-ui/E-03-RESEARCH-UI-PATTERNS.md (UI pattern research)
@.paul/phases/E-mobile-ui/CONTEXT.md (vision, constraints)

## Current UI (understand what exists to build from)
@src/app/jarvis/page.tsx
@src/components/jarvis/ChatPanel.tsx
@src/components/jarvis/NotionPanel.tsx
@src/components/jarvis/Dashboard/DashboardPanel.tsx
@src/components/jarvis/JarvisOrb.tsx
@src/components/jarvis/NudgeOverlay.tsx
@src/components/jarvis/PushToTalk.tsx
@src/lib/jarvis/stores/

## Existing Styling
@src/app/globals.css (custom animations, safe area utilities)
@tailwind.config.ts
@package.json (dependencies: Tailwind v4, Zustand, lucide-react, React 19, Next 15)

## State
@.paul/STATE.md
</context>

<acceptance_criteria>

## AC-1: Design Tokens Formalized
```gherkin
Given the existing ad-hoc Tailwind patterns (bg-black, bg-zinc-900, cyan-400, etc.)
When design tokens are defined
Then the document specifies:
  - Color palette: backgrounds, text, accents, status colors, domain colors
  - Typography scale: headings, body, labels, numbers, monospace
  - Spacing scale: component padding, grid gaps, section margins
  - Border radius, shadows, blur values
  - All tokens expressed as Tailwind classes (no custom CSS where avoidable)
  - Dark theme is the ONLY theme (no light mode — consistent with current aesthetic)
```

## AC-2: Component Architecture Defined
```gherkin
Given no shared component primitives exist (every component is hand-built)
When the component system is designed
Then it defines:
  - Primitive components: Button, Card, Input, Badge, Toggle, Modal/Sheet, Toast
  - Composite components: DomainHealthCard, PriorityItem, Widget, BriefingCard
  - Layout components: JarvisShell, Header, DomainRail, BottomTabBar, ChatOverlay
  - Each component specifies: variants, sizes, props, responsive behavior
  - Component naming convention and file organization
  - No external UI library (hand-built Tailwind — user constraint)
```

## AC-3: Layout System Specified
```gherkin
Given the Information Architecture defines 8 screen types
When the layout system is designed
Then it defines:
  - JarvisShell structure (how header, rail, tabs, chat compose)
  - Grid system for dashboard cards (responsive columns)
  - Content container max-widths per breakpoint
  - How domain dashboards, sub-program views, and detail views nest inside the shell
  - Spacing rhythm (consistent gaps between sections)
```

## AC-4: Responsive Strategy Documented
```gherkin
Given mobile-first is a non-negotiable principle
When the responsive strategy is designed
Then it specifies:
  - Breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
  - Each screen type from E-02 shows its layout at each breakpoint
  - Domain Rail: horizontal (mobile) ↔ vertical (desktop)
  - Bottom tab bar: visible (mobile) ↔ hidden (desktop)
  - Chat overlay: bottom sheet (mobile) ↔ side panel (desktop)
  - Content grids: 1-col (mobile) → 2-col (tablet) → 3-col (desktop)
  - Touch targets: minimum 44px on mobile
```

## AC-5: Orb Decision Made
```gherkin
Given the 3D orb is the current full-screen background
When the orb's fate is decided
Then the document makes a definitive choice:
  - Option A: Archive entirely (remove from UI, keep in codebase)
  - Option B: Miniaturize as status indicator (loading/thinking animation)
  - Option C: Repurpose as ambient background behind Priority Home
  - The decision considers: performance impact, mobile battery, user attachment,
    the new layout's space needs
```

## AC-6: Animation & Icon Systems Defined
```gherkin
Given current animations are ad-hoc CSS keyframes
When animation and icon systems are defined
Then the document specifies:
  - Transition timing (duration, easing for different contexts)
  - Page transition pattern (domain switching)
  - Micro-interactions (toggle, mark done, dismiss)
  - Loading states (skeleton screens, shimmer patterns)
  - Icon library choice (lucide-react is installed but unused)
  - Icon usage rules (size per context, color inheritance)
```

## AC-7: Accessibility Baseline Established
```gherkin
Given the current UI uses color-coded status (red/amber/green)
When accessibility rules are defined
Then the document specifies:
  - Color contrast ratios (WCAG AA minimum for text)
  - Color-blind safe: every color indicator has a paired icon/shape
  - Focus ring styling (keyboard navigation)
  - Reduced motion: respect prefers-reduced-motion
  - Touch targets: minimum 44x44px on mobile
  - Screen reader: semantic HTML requirements for key components
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Audit existing UI patterns and extract the implicit design system</name>
  <files>
    (research output — informs Task 2)
  </files>
  <action>
    Read the following files to extract every visual pattern currently in use:

    1. `src/app/globals.css` — custom animations, safe area utilities
    2. `src/components/jarvis/ChatPanel.tsx` — chat UI patterns
    3. `src/components/jarvis/Dashboard/DashboardPanel.tsx` — dashboard layout
    4. `src/components/jarvis/NotionPanel.tsx` — panel slide-in
    5. `src/components/jarvis/NudgeOverlay.tsx` — notification pattern
    6. `src/components/jarvis/JarvisOrb.tsx` — orb integration
    7. `src/components/jarvis/PushToTalk.tsx` — voice UI
    8. `src/app/jarvis/page.tsx` — page composition
    9. `tailwind.config.ts` — any custom theme config

    For each file, extract:
    - Colors used (all bg-*, text-*, border-* classes)
    - Typography (text size, font weight, letter spacing patterns)
    - Spacing (padding, margin, gap patterns)
    - Border radius, shadows, blur values
    - Animation/transition patterns
    - Responsive breakpoint usage (md:, sm:, lg:)
    - Glassmorphism and overlay patterns
    - Touch/interaction patterns

    Compile into a structured audit showing the IMPLICIT design system —
    the patterns that already exist but haven't been formalized.
  </action>
  <verify>Audit covers all listed files with extracted patterns categorized</verify>
  <done>Implicit design system documented, ready for formalization in Task 2</done>
</task>

<task type="auto">
  <name>Task 2: Design and write the complete UI system document</name>
  <files>
    jarvis/.paul/research/phase-e-ui-system-design.md
  </files>
  <action>
    Synthesize the implicit design audit (Task 1) + Information Architecture (E-02) +
    UI Pattern Research (E-03-RESEARCH) + user constraints into a comprehensive UI
    system design document.

    **The document MUST contain these sections:**

    ## Section 1: Design Tokens
    Formalize every visual primitive:
    - **Color Palette:**
      - Backgrounds: surface layers (L0 black, L1 zinc-950, L2 zinc-900, L3 zinc-800)
      - Text: primary (white/90), secondary (white/70), muted (white/40), disabled (white/20)
      - Accent: primary (cyan), secondary (pick from existing), destructive (red)
      - Status: critical (red-400), warning (amber-400), success (green-400), info (blue-400), inactive (zinc-600)
      - Domain colors: assign a unique accent color per domain for the rail icons
    - **Typography:**
      - Scale: xs through 2xl with specific use cases per size
      - Weights: regular, medium, semibold — when to use each
      - Special: monospace for numbers/codes, uppercase tracking for labels
    - **Spacing:**
      - Component scale: padding variants (compact, default, spacious)
      - Layout scale: section gaps, card margins, screen padding
    - **Surfaces:**
      - Border radius per component type (cards, buttons, inputs, pills)
      - Shadow levels (none for most, subtle for elevated, strong for modals)
      - Glassmorphism recipe: bg-opacity + backdrop-blur + border-opacity

    ## Section 2: Component Architecture
    Define every shared component with:
    - **Component name**
    - **Variants** (primary, secondary, ghost, destructive, etc.)
    - **Sizes** (sm, md, lg)
    - **Props interface** (TypeScript-style)
    - **Tailwind class composition** (show the actual classes)
    - **Responsive behavior** (what changes at breakpoints)

    **Primitives (build first, used everywhere):**
    - Button — primary, secondary, ghost, icon-only variants
    - Card — surface container with optional header, footer, status stripe
    - Input — text, search, with icon prefix/suffix
    - Badge — status, count, domain-colored
    - Toggle — on/off switch
    - Sheet — bottom sheet (mobile) / modal (desktop) with drag handle
    - Toast — notification toast (success, error, info)
    - Skeleton — loading placeholder matching card/list shapes

    **Composite (built from primitives):**
    - DomainHealthCard — Card + Badge + sparkline + status stripe
    - PriorityItem — domain icon + title + urgency badge + quick action
    - WidgetCard — Card variant, small/wide, with tap action + optional quick CTA
    - BriefingCard — expandable card with domain sections
    - NavigationItem — icon + label + badge count (for rail and tabs)
    - ActionSheet — Sheet with a list of contextual actions
    - EmptyState — illustration area + headline + description + CTA button
    - ErrorBanner — warning bar with message + retry + timestamp

    **Layout (the shell):**
    - JarvisShell — the root layout wrapping all screens
    - Header — logo, search, notifications bell with badge, settings gear
    - DomainRail — horizontal (mobile) or vertical (desktop) icon strip
    - BottomTabBar — mobile-only 5-item tab bar
    - ChatOverlay — bottom sheet (mobile) / side panel (desktop)
    - CommandPalette — Cmd+K modal with search input + results list
    - ContentContainer — max-width wrapper with responsive padding

    ## Section 3: Layout System
    - **JarvisShell Composition:**
      - How Header, DomainRail, BottomTabBar, ChatOverlay, and content area compose
      - Z-index hierarchy (which layer is on top)
      - Safe area handling (PWA notch)
    - **Grid System:**
      - Card grids: 1/2/3 columns responsive
      - List layouts: full-width items with spacing
      - Detail layouts: single-column centered content
    - **Content Regions:**
      - Max content width per screen type
      - Padding per breakpoint
      - Scroll behavior (which regions scroll, which are fixed)

    ## Section 4: Responsive Strategy
    For each screen type from E-02:
    - **Priority Home:** layout at mobile / tablet / desktop
    - **Domain Dashboard:** layout changes per breakpoint
    - **Sub-Program View:** single column → wider content
    - **Detail View:** centered narrow → wider with sidebars
    - **Chat:** bottom sheet → side panel → full-screen option
    - **Action Sheet:** bottom sheet → centered modal
    - **Onboarding:** single-column wizard → wider with illustration
    - **Settings:** list → split-pane

    Show ASCII wireframes for each at mobile and desktop.

    ## Section 5: The Orb Decision
    Make a definitive choice with reasoning:
    - Analyze: performance cost (Three.js bundle, GPU, battery on mobile)
    - Analyze: emotional attachment (it IS Jarvis's visual identity)
    - Analyze: space constraints (new shell needs the full viewport)
    - Recommend: one of the three options from AC-5
    - If miniaturized: specify exactly where and how (header? loading states? domain transitions?)

    ## Section 6: Animation & Transition System
    - **Timing tokens:** fast (150ms), normal (250ms), slow (400ms), dramatic (600ms)
    - **Easing:** default (ease-out), enter (ease-out), exit (ease-in), bounce (custom)
    - **Page transitions:** domain switching (crossfade? slide? instant?)
    - **Micro-interactions:**
      - Toggle: scale bounce
      - Mark done: strikethrough + fade + confetti pulse
      - Dismiss: swipe + fade-out
      - Notification toast: slide-in from top + auto-dismiss
      - Sheet: spring-physics slide-up
    - **Loading patterns:**
      - Skeleton screens: shimmer animation matching card shapes
      - Inline loading: spinner replacing content
      - Full-page: Jarvis logo pulse (or mini orb?)
    - **Reduced motion:** all animations have prefers-reduced-motion fallback

    ## Section 7: Icon System
    - Library decision: adopt lucide-react (already installed) or stay with hand-SVG
    - Icon sizes: 16px (inline), 20px (buttons/inputs), 24px (navigation), 32px (domain rail)
    - Color rules: inherit text color by default, explicit color for status icons
    - Domain icons: assign a specific icon per domain (from lucide or custom SVG)
    - Custom icons: any icons not available in the chosen library

    ## Section 8: Accessibility Baseline
    - Color contrast: minimum ratios for text/background combinations
    - Focus states: visible focus ring style (color, offset, width)
    - Status indicators: every color has a paired shape/icon (red+!, amber+△, green+✓, gray+—)
    - Keyboard navigation: tab order, arrow key navigation in rail/tabs
    - Screen reader: semantic HTML rules (nav, main, aside, heading levels)
    - Touch targets: 44px minimum, 48px preferred on mobile
    - Reduced motion: prefers-reduced-motion query applied to all animations
    - Text scaling: UI must not break at 120% font size

    ## Section 9: File Organization
    - Where shared components live in the codebase
    - Naming convention (PascalCase files, kebab-case routes)
    - How domain-specific components relate to shared ones
    - Barrel exports pattern

    **Design Principles (enforce throughout):**
    - Dark and focused: black canvas, glassmorphic surfaces, cyan accent
    - Hand-crafted: no UI libraries, every component built with taste
    - Consistent grammar: learn one component pattern, apply everywhere
    - Mobile-native: thumb-reachable, large tap targets, minimal typing
    - Performance-conscious: no unnecessary animation, lazy loading

    **Write for the build executor:** The document should be detailed enough that
    E-04+ can implement components without asking style or pattern questions.
  </action>
  <verify>
    Document contains all 9 sections. Every component has variant/size/class definitions.
    Responsive strategy covers all screen types. Orb decision is definitive.
    Icon library is chosen. Accessibility baseline is concrete.
  </verify>
  <done>AC-1 through AC-7 satisfied: complete UI system design ready for E-04+</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Complete UI system design for the Jarvis multi-domain operating system:
    - Design tokens (colors, typography, spacing, surfaces — all as Tailwind classes)
    - Component architecture (8 primitives + 8 composites + 7 layout components)
    - Layout system (JarvisShell composition, grid system, content regions)
    - Responsive strategy (every screen type at mobile/tablet/desktop with wireframes)
    - The Orb Decision (definitive choice with reasoning)
    - Animation & transition system (timing, easing, micro-interactions, loading)
    - Icon system (library choice, sizes, domain icons)
    - Accessibility baseline (contrast, focus, screen reader, touch targets)
    - File organization (where everything lives in the codebase)
  </what-built>
  <how-to-verify>
    Review the UI system document at:
    jarvis/.paul/research/phase-e-ui-system-design.md

    Key questions to validate:
    1. Does the visual language feel right? Dark, focused, elegant?
    2. Do the component definitions match how you want Jarvis to look and feel?
    3. Is the orb decision correct for you?
    4. Do the responsive layouts work for your desktop + mobile workflow?
    5. Is anything missing that would block building?

    This is the last design document before code. After this: build waves.
  </how-to-verify>
  <resume-signal>Type "approved" to proceed to E-04 build, or describe what needs changing</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/intelligence/* (self-improvement system — Phase D)
- src/lib/jarvis/notion/* (Notion integration — stable)
- src/lib/jarvis/memory/* (memory system — stable)
- .paul/research/phase-e-domain-atlas.md (input document)
- .paul/research/phase-e-information-architecture.md (input document)

## SCOPE LIMITS
- This plan produces a DESIGN DOCUMENT, not code
- No React components built (that's E-04)
- No actual Tailwind theme configuration changes (that's E-04)
- No routing changes (that's E-04)
- Design specific COMPONENTS with classes, not full screens
- The document defines WHAT to build, E-04 builds it

</boundaries>

<verification>
Before declaring plan complete:
- [ ] Design tokens cover all colors, typography, spacing, surfaces
- [ ] Every component in the architecture has variants, sizes, and class definitions
- [ ] Layout system shows how JarvisShell composes
- [ ] Responsive strategy covers all 8 screen types at all breakpoints
- [ ] Orb decision is definitive (not "we could do X or Y")
- [ ] Animation system has timing tokens and specific patterns
- [ ] Icon library is chosen with domain icon assignments
- [ ] Accessibility baseline is concrete (not "we should be accessible")
- [ ] File organization specified
- [ ] User has approved the design system at checkpoint
</verification>

<success_criteria>
- UI system document written with all 9 sections
- Design tokens formalized from existing ad-hoc patterns
- Component architecture comprehensive enough to build from
- Responsive strategy resolves all layout questions
- Orb decision made
- User approves design system at checkpoint
- E-04 can begin building immediately from this document
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-03-SUMMARY.md`
</output>
