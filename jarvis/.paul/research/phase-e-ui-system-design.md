# Jarvis UI System Design
## The Visual Language for a Multi-Domain Operating System

**Version:** 1.0
**Date:** 2026-02-25
**Foundation:** Information Architecture (E-02 v1.1) + UI Pattern Research + Existing Codebase Audit
**Consumed by:** E-04+ Build Waves

---

## SECTION 1: DESIGN TOKENS

### Color Palette

All tokens expressed as Tailwind classes. Dark theme only — no light mode.

#### Backgrounds (Surface Layers)

| Layer | Token | Tailwind | Usage |
|-------|-------|----------|-------|
| L0 | `surface-base` | `bg-black` | Page background, root canvas |
| L1 | `surface-primary` | `bg-zinc-950` | Primary panels (NotionPanel, domain views) |
| L2 | `surface-secondary` | `bg-zinc-900` | Cards, elevated surfaces, headers |
| L3 | `surface-tertiary` | `bg-zinc-800` | Inputs, interactive surfaces, hover states |
| L4 | `surface-quaternary` | `bg-zinc-700` | Disabled buttons, subtle backgrounds |
| Glass-1 | `surface-glass` | `bg-black/60 backdrop-blur-md` | Floating panels (dashboard sidebar) |
| Glass-2 | `surface-glass-heavy` | `bg-zinc-900/95 backdrop-blur-xl` | Chat panel, important overlays |
| Glass-3 | `surface-glass-light` | `bg-black/70 backdrop-blur-md` | Toasts, nudges, transient overlays |
| Scrim | `surface-scrim` | `bg-black/50` | Backdrop behind modals/sheets |

#### Text

| Token | Tailwind | Usage |
|-------|----------|-------|
| `text-primary` | `text-white/90` | Headings, important content |
| `text-secondary` | `text-white/70` | Body text, descriptions |
| `text-muted` | `text-white/60` | Secondary labels, metadata |
| `text-subtle` | `text-white/40` | Hints, placeholders, disabled |
| `text-ghost` | `text-white/20` | Barely visible, ultra-deemphasized |
| `text-inverse` | `text-black` | On bright accent backgrounds (cyan button text) |

#### Accent Colors

| Token | Tailwind | Usage |
|-------|----------|-------|
| `accent-primary` | `text-cyan-400` / `bg-cyan-600` | Primary actions, links, active states |
| `accent-primary-hover` | `bg-cyan-500` | Button hover, link hover |
| `accent-primary-subtle` | `text-cyan-400/80` | Chips, badges, secondary accent |
| `accent-primary-ghost` | `bg-cyan-500/10 border-cyan-400/20` | Subtle accent containers (info boxes) |
| `accent-secondary` | `text-blue-400` / `bg-blue-600` | Secondary actions (briefings, less common) |

#### Status Colors

| Status | Text | Background | Border | Icon |
|--------|------|-----------|--------|------|
| Critical | `text-red-400` | `bg-red-500/10` | `border-red-400/30` | `!` exclamation |
| Warning | `text-amber-400` | `bg-amber-500/10` | `border-amber-400/30` | `△` triangle |
| Success | `text-green-400` | `bg-green-500/10` | `border-green-400/30` | `✓` check |
| Info | `text-blue-400` | `bg-blue-500/10` | `border-blue-400/30` | `ℹ` info circle |
| Inactive | `text-zinc-500` | `bg-zinc-800` | `border-zinc-700` | `—` dash |

#### Domain Colors (Rail Icon Accents)

Each domain gets a unique color for its rail icon active state and health card stripe.

| Domain | Color | Tailwind | Icon (lucide) |
|--------|-------|----------|---------------|
| Home | `cyan` | `text-cyan-400` | `Home` |
| Personal | `violet` | `text-violet-400` | `User` |
| Ethereal Flame | `orange` | `text-orange-400` | `Flame` |
| Reset Biology | `emerald` | `text-emerald-400` | `Dna` |
| CritFailVlogs | `rose` | `text-rose-400` | `Dice6` |
| Visopscreen | `sky` | `text-sky-400` | `TrendingUp` |
| Satori Living | `amber` | `text-amber-400` | `Landmark` |
| Entity Building | `indigo` | `text-indigo-400` | `Building2` |

Inactive rail icons: `text-zinc-500`. Status dots use the status colors above (not domain colors).

---

### Typography

#### Scale

| Token | Tailwind | Usage |
|-------|----------|-------|
| `heading-xl` | `text-xl font-semibold text-white/90` | Page titles, onboarding headings |
| `heading-lg` | `text-lg font-semibold text-white/90` | Section headings, detail view titles |
| `heading-md` | `text-base font-medium text-white/90` | Card titles, sub-headings |
| `heading-sm` | `text-sm font-medium text-white/80` | List item titles, panel headers |
| `body` | `text-sm text-white/70 leading-relaxed` | Body text, descriptions |
| `body-small` | `text-xs text-white/60` | Secondary info, metadata |
| `label` | `text-xs uppercase tracking-wide text-white/60 font-medium` | Section labels ("TODAY", "PRIORITY") |
| `number` | `text-sm font-medium tabular-nums text-white/90` | Counts, percentages, metrics |
| `number-large` | `text-2xl font-semibold tabular-nums text-white/90` | Hero metrics (compliance %, P&L) |
| `caption` | `text-xs text-white/40` | Timestamps, hints, footer text |
| `chip` | `text-xs text-cyan-400/80` | Chip labels, quick action text |

#### Font Rules
- **Font family:** System stack (Tailwind default) — no custom fonts
- **Tabular nums:** Use `tabular-nums` (via `font-variant-numeric: tabular-nums`) for all numbers in tables, metrics, and countdowns so digits don't shift width
- **Truncation:** Use `truncate` for single-line overflow. Use `line-clamp-2` for 2-line descriptions.
- **Whitespace:** Use `whitespace-pre-line` for multi-line content (journal entries, briefing text)

---

### Spacing

#### Component Padding

| Size | Tailwind | Usage |
|------|----------|-------|
| `compact` | `px-2 py-1` / `px-2.5 py-1` | Chips, badges, small buttons |
| `default` | `px-3 py-2` / `px-4 py-2.5` | Standard buttons, inputs |
| `spacious` | `px-4 py-3` / `px-6 py-3` | Panel headers, large buttons, CTAs |

#### Layout Gaps

| Context | Tailwind | Usage |
|---------|----------|-------|
| `gap-tight` | `gap-1` / `gap-1.5` | Between dots, icon badges, inline elements |
| `gap-default` | `gap-2` / `gap-3` | Between buttons, list items, flex children |
| `gap-section` | `gap-4` / `gap-6` | Between card sections, dashboard widgets |
| `gap-page` | `gap-8` | Between major page sections |

#### Screen Padding

| Breakpoint | Padding | Tailwind |
|-----------|---------|----------|
| Mobile | 16px | `px-4` |
| Tablet | 24px | `md:px-6` |
| Desktop | 32px | `lg:px-8` |

---

### Surfaces

#### Border Radius

| Component | Tailwind | Usage |
|-----------|----------|-------|
| Cards, panels | `rounded-2xl` | DomainHealthCard, ChatPanel, dashboard |
| Buttons, inputs | `rounded-xl` | Standard interactive elements |
| Action buttons, modals | `rounded-lg` | Smaller buttons, modal content |
| Chips, pills, badges | `rounded-full` | Tags, status badges, FAB |

#### Shadows

| Level | Tailwind | Usage |
|-------|----------|-------|
| None | — | Most flat elements (cards on dark bg) |
| Subtle | `shadow-lg` | Floating buttons (FAB) |
| Strong | `shadow-2xl` | Modals, sheets, elevated overlays |

#### Glassmorphism Recipe

The signature Jarvis visual: frosted glass over dark canvas.

```
Standard glass:    bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl
Heavy glass:       bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl
Light glass:       bg-black/70 backdrop-blur-md border border-white/20 rounded-xl
```

#### Dividers

| Type | Tailwind | Usage |
|------|----------|-------|
| Section | `border-t border-white/10` | Between dashboard sections |
| Subtle | `border-t border-white/5` | Between list items |
| Strong | `border-t border-white/20` | Panel header separation |

---

## SECTION 2: COMPONENT ARCHITECTURE

### Naming Convention
- Files: PascalCase (`DomainHealthCard.tsx`)
- Components: PascalCase (`<DomainHealthCard />`)
- Props: camelCase interface suffixed with `Props` (`DomainHealthCardProps`)
- Barrel exports: `index.ts` per component folder

### File Organization
```
src/components/jarvis/
├── primitives/            ← Shared building blocks
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   ├── Toggle.tsx
│   ├── Sheet.tsx
│   ├── Toast.tsx
│   ├── Skeleton.tsx
│   └── index.ts
│
├── composites/            ← Built from primitives
│   ├── DomainHealthCard.tsx
│   ├── PriorityItem.tsx
│   ├── WidgetCard.tsx
│   ├── BriefingCard.tsx
│   ├── NavigationItem.tsx
│   ├── ActionSheet.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBanner.tsx
│   └── index.ts
│
├── layout/                ← The shell
│   ├── JarvisShell.tsx
│   ├── Header.tsx
│   ├── DomainRail.tsx
│   ├── BottomTabBar.tsx
│   ├── ChatOverlay.tsx
│   ├── CommandPalette.tsx
│   ├── ContentContainer.tsx
│   └── index.ts
│
├── domains/               ← Domain-specific views (E-04+)
│   ├── personal/
│   ├── ethereal-flame/
│   ├── reset-biology/
│   └── ...
│
└── legacy/                ← Existing components (archived during migration)
    ├── JarvisOrb.tsx
    ├── ChatPanel.tsx
    ├── DashboardPanel.tsx
    ├── NotionPanel.tsx
    ├── NudgeOverlay.tsx
    └── PushToTalk.tsx
```

### Primitives

#### Button

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;     // Left icon
  children?: React.ReactNode;
  onClick?: () => void;
}
```

| Variant | Classes |
|---------|---------|
| `primary` | `bg-cyan-600 hover:bg-cyan-500 text-white font-medium` |
| `secondary` | `bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium` |
| `ghost` | `text-white/60 hover:text-white hover:bg-white/10` |
| `destructive` | `bg-red-600/80 hover:bg-red-500 text-white font-medium` |
| `icon` | `text-white/60 hover:text-white hover:bg-white/10 p-2` |

| Size | Classes |
|------|---------|
| `sm` | `px-3 py-1.5 text-xs rounded-lg` |
| `md` | `px-4 py-2.5 text-sm rounded-xl` |
| `lg` | `px-6 py-3 text-sm rounded-xl` |

All buttons: `transition-colors disabled:opacity-40 disabled:cursor-not-allowed`
Loading state: spinner replaces icon, text preserved, pointer-events-none.

#### Card

```tsx
interface CardProps {
  variant: 'default' | 'glass' | 'interactive';
  padding: 'none' | 'sm' | 'md' | 'lg';
  statusStripe?: 'critical' | 'warning' | 'success' | 'info' | null;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

| Variant | Classes |
|---------|---------|
| `default` | `bg-zinc-900 border border-white/10 rounded-2xl` |
| `glass` | `bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl` |
| `interactive` | `bg-zinc-900 border border-white/10 rounded-2xl hover:bg-zinc-800 hover:border-white/20 cursor-pointer transition-colors` |

| Padding | Classes |
|---------|---------|
| `none` | — |
| `sm` | `p-3` |
| `md` | `p-4` |
| `lg` | `p-6` |

Status stripe: 4px colored `border-l` on the left edge (`border-l-4 border-l-red-400`, etc.)

#### Input

```tsx
interface InputProps {
  type: 'text' | 'search' | 'number';
  size: 'sm' | 'md';
  placeholder?: string;
  icon?: React.ReactNode;      // Left icon (search icon, etc.)
  suffix?: React.ReactNode;    // Right content (clear button, count)
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}
```

Base classes:
```
bg-white/5 text-white text-sm rounded-xl border border-white/10
focus:border-cyan-500/50 focus:outline-none
placeholder:text-white/30 disabled:opacity-50
transition-colors
```

| Size | Classes |
|------|---------|
| `sm` | `px-3 py-2 text-xs` |
| `md` | `px-4 py-2.5 text-sm` |

With icon: `pl-10` (icon absolutely positioned inside).

#### Badge

```tsx
interface BadgeProps {
  variant: 'status' | 'count' | 'domain';
  status?: 'critical' | 'warning' | 'success' | 'info' | 'inactive';
  count?: number;
  domainColor?: string;  // Tailwind color class
  size: 'sm' | 'md';
  children?: React.ReactNode;
}
```

| Variant | Example | Classes |
|---------|---------|---------|
| `status` (critical) | `! Overdue` | `bg-red-500/10 text-red-400 border border-red-400/30 rounded-full px-2 py-0.5 text-xs` |
| `status` (success) | `✓ Done` | `bg-green-500/10 text-green-400 border border-green-400/30 rounded-full px-2 py-0.5 text-xs` |
| `count` | `3` | `bg-cyan-500/80 text-white rounded-full min-w-[18px] h-[18px] text-[10px] font-bold flex items-center justify-center` |
| `domain` | `Personal` | `bg-violet-500/10 text-violet-400 rounded-full px-2 py-0.5 text-xs` |

#### Toggle

```tsx
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size: 'sm' | 'md';
}
```

| State | Track | Thumb |
|-------|-------|-------|
| Off | `bg-zinc-700` | `bg-zinc-400 translate-x-0` |
| On | `bg-cyan-600` | `bg-white translate-x-full` |

Track: `w-10 h-6 rounded-full transition-colors` (md), `w-8 h-5` (sm)
Thumb: `w-5 h-5 rounded-full shadow transition-transform` (md)

#### Sheet

```tsx
interface SheetProps {
  open: boolean;
  onClose: () => void;
  size: 'sm' | 'md' | 'lg' | 'full';  // Height on mobile, width on desktop modal
  children: React.ReactNode;
  title?: string;
}
```

**Mobile:** Bottom sheet with drag handle
```
fixed inset-x-0 bottom-0 z-50
bg-zinc-900 border-t border-white/10 rounded-t-2xl
transform transition-transform duration-300 ease-out
```
Drag handle: `w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2`

**Desktop:** Centered modal
```
fixed inset-0 z-50 flex items-center justify-center
```
Content: `bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full`
Backdrop: `bg-black/50` (click to close)

| Size | Mobile Height | Desktop Width |
|------|--------------|---------------|
| `sm` | `max-h-[40vh]` | `max-w-sm` |
| `md` | `max-h-[60vh]` | `max-w-md` |
| `lg` | `max-h-[80vh]` | `max-w-lg` |
| `full` | `h-[90vh]` | `max-w-2xl` |

#### Toast

```tsx
interface ToastProps {
  variant: 'success' | 'error' | 'info';
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;  // ms, default 4000
}
```

Position: top-center, slides down from top.
```
fixed top-4 left-1/2 -translate-x-1/2 z-[60]
bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl
px-4 py-3 shadow-2xl
animate-slide-in-down
```

Auto-dismiss after duration. Includes optional action button (e.g., "Undo").

#### Skeleton

```tsx
interface SkeletonProps {
  variant: 'text' | 'card' | 'list-item' | 'circle';
  width?: string;
  height?: string;
}
```

Base: `bg-zinc-800 rounded animate-pulse`

| Variant | Default Size |
|---------|-------------|
| `text` | `h-4 w-full rounded` |
| `card` | `h-32 w-full rounded-2xl` |
| `list-item` | `h-12 w-full rounded-xl` |
| `circle` | `w-10 h-10 rounded-full` |

---

### Composites

#### DomainHealthCard

Built from: Card (interactive) + Badge (status) + domain color stripe.

```
┌─────────────────────────┐
│ 🟢 ● Personal      →   │  ← Status dot + domain icon + name + chevron
│                         │
│ 3 tasks due today       │  ← One-line summary
│ 2 habits remaining      │  ← Second line (optional)
│                         │
│ ███████░░░ 70%         │  ← Progress bar (optional: compliance, etc.)
└─────────────────────────┘
```

Key props: `domain`, `status`, `title`, `summary`, `metric`, `progress`, `onClick`
Status stripe: left border color matches domain color.
Responsive: full-width on mobile, 1/2 or 1/3 width in grid on desktop.

#### PriorityItem

A single row in the Priority Stack on Home.

```
[🔴] [🧬] BPC-157 dose due at 2pm        [LOG DOSE]
```

Props: `urgency`, `domainIcon`, `domainColor`, `title`, `subtitle`, `quickAction`
Quick action: optional right-aligned button (e.g., "Log dose", "Mark done")
Urgency colors: Critical = red left stripe, Warning = amber, Routine = no stripe, Info = blue.

#### WidgetCard

Pinnable mini-card for Home screen. Two sizes: small (1-col) and wide (2-col).

```
Small (1-col):               Wide (2-col):
┌──────────┐                 ┌─────────────────────────┐
│ Next Dose │                 │ Daily Compliance    75% │
│ BPC 2pm   │                 │ ████████░░░░            │
│ [LOG]     │                 │ Breath ✓ Exercise ✗     │
└──────────┘                 └─────────────────────────┘
```

Props: `title`, `metric`, `quickAction`, `size: 'small' | 'wide'`, `domainColor`, `onClick`

#### BriefingCard

Expandable card showing the latest briefing. Collapsed = summary. Expanded = full briefing by domain.

Collapsed: single-line summary + expand chevron.
Expanded: domain sections with dividers (uses Card with nested domain groups).

#### NavigationItem

Used in DomainRail and BottomTabBar.

Rail: `icon + status dot + tooltip`
Tab: `icon + label + badge count`

Props: `icon`, `label`, `active`, `badgeCount`, `statusColor`, `onClick`

Active state (rail): domain color background tint + white icon.
Active state (tab): `text-cyan-400` icon + label, inactive = `text-zinc-500`.

#### ActionSheet

Sheet containing a list of contextual actions. Used for "+" button, long-press, context menus.

```
┌─────────────────────────┐
│ ── drag handle ──       │
│                         │
│ [📝] Add Task           │
│ [💊] Log Dose           │
│ [🍽️] Log Meal           │
│ [📔] Journal Entry      │
│ ─────────────────       │
│ [✕] Cancel              │
└─────────────────────────┘
```

Each action: icon + label, full-width touchable row. Divider above cancel.

#### EmptyState

Shown when a screen has no data yet.

```
┌─────────────────────────┐
│                         │
│     [illustration]      │  ← 80x80 area, domain-themed icon (large, muted)
│                         │
│   No peptide protocols  │  ← heading-md
│                         │
│   Track your dosing     │  ← body, text-muted
│   schedule here.        │
│                         │
│   [+ Create Protocol]   │  ← Button (primary, md)
│                         │
└─────────────────────────┘
```

Props: `icon`, `title`, `description`, `actionLabel`, `onAction`
Centered vertically in the content area. Illustration uses the domain's lucide icon at 48-64px, muted color.

#### ErrorBanner

Top-of-content warning bar shown when data is stale or API failed.

```
┌─────────────────────────────────────────┐
│ ⚠️ Reset Biology data unavailable        │
│    Last updated 3 hours ago.  [Retry]   │
└─────────────────────────────────────────┘
```

Props: `message`, `timestamp`, `onRetry`
Classes: `bg-amber-500/10 border border-amber-400/20 rounded-xl px-4 py-3`
Dismiss: tap X or auto-dismiss after successful retry.

---

### Layout Components

#### JarvisShell

The root layout wrapping all Jarvis routes. Everything nests inside this.

```
Mobile:
┌─────────────────────────────┐
│ Header                      │  z-50 (fixed top)
├─────────────────────────────┤
│ Domain Rail (horizontal)    │  z-40 (fixed, below header)
├─────────────────────────────┤
│                             │
│     Content Area            │  scrollable, main content
│     (page.tsx renders here) │
│                             │
├─────────────────────────────┤
│ Bottom Tab Bar              │  z-50 (fixed bottom)
└─────────────────────────────┘
  Chat Overlay (bottom sheet)    z-[55] (above everything when open)
  Command Palette (modal)        z-[60]
  Toast                          z-[60]

Desktop:
┌────┬──────────────────────────────────┐
│    │ Header                           │  z-50
│ D  ├──────────────────────────────────┤
│ o  │                                  │
│ m  │     Content Area                 │  scrollable
│ a  │     (wider, with max-width)      │
│ i  │                                  │
│ n  │                             ┌────┤
│    │                             │Chat│  z-[55] (side panel)
│ R  │                             │    │
│ a  │                             │    │
│ i  │                             │    │
│ l  │                             └────┤
└────┴──────────────────────────────────┘
```

#### Z-Index Hierarchy

| Layer | Z-Index | Component |
|-------|---------|-----------|
| Base content | `z-0` | Page content (scrollable) |
| Domain Rail | `z-40` | Navigation rail |
| Header | `z-50` | Top header bar |
| Bottom Tab Bar | `z-50` | Mobile bottom navigation |
| Chat Overlay | `z-[55]` | Chat bottom sheet / side panel |
| Command Palette | `z-[60]` | Cmd+K modal + backdrop |
| Toast | `z-[60]` | Notification toasts |
| Scrim | `z-[65]` | Sheet/modal backdrop |
| Sheet/Modal | `z-[70]` | Action sheets, modals |

#### Header

```
Mobile:
┌─────────────────────────────┐
│ [J] Jarvis    [🔍] [🔔3] [⚙️]│
└─────────────────────────────┘

Desktop:
┌────────────────────────────────────────────┐
│ [J] Jarvis              [🔍 Search...] [🔔3] [⚙️] │
└────────────────────────────────────────────┘
```

- Height: `h-14` (56px) — consistent on both breakpoints
- Classes: `fixed top-0 left-0 right-0 bg-zinc-950 border-b border-white/10`
- Desktop: `md:left-16` (offset by domain rail width)
- Logo [J]: small Jarvis icon, tap navigates to Home
- Search: icon-only on mobile (opens command palette), inline input on desktop
- Notification bell: Badge component with unread count
- Settings gear: navigates to /settings

#### DomainRail

```
Mobile (horizontal):
[🏠] [👤] [🔥] [🧬] [🎲] [📊] [⛩️] [🏗️]
─────────────────────────────────────────
Below header, above content. Swipeable if >5 items.
```

```
Desktop (vertical):
┌────┐
│ 🏠 │
│ 👤 │
│ 🔥 │
│ 🧬 │
│ 🎲 │
│ 📊 │
│ ⛩️ │
│ 🏗️ │
│    │
│ ⚙️ │  ← Settings at bottom
└────┘
```

- Mobile: `fixed left-0 right-0 h-12 bg-zinc-950 border-b border-white/10`
  - Position: below header (`top-14`)
  - Icons: `w-8 h-8` with `gap-1`, centered, horizontal scroll
- Desktop: `fixed left-0 top-0 bottom-0 w-16 bg-zinc-950 border-r border-white/10`
  - Icons: `w-10 h-10` with `gap-2`, centered, vertical layout
  - Settings icon pinned to bottom

Each icon:
- Inactive: `text-zinc-500 hover:text-zinc-300`
- Active: domain color background tint (`bg-{color}-500/15`) + domain color icon
- Status dot: `w-2 h-2 rounded-full absolute -top-0.5 -right-0.5` + status color
- Tooltip (desktop hover): domain name label

Only active domains shown (Hidden domains not rendered).

#### BottomTabBar

Mobile-only, 5 items.

```
[🏠 Home] [💬 Chat] [➕] [🔔 Alerts] [⚙️ Settings]
```

- Classes: `fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-white/10 safe-area-bottom`
- Desktop: `md:hidden`
- Items: icon (20px) + label (text-xs) stacked vertically
- Active: `text-cyan-400`, inactive: `text-zinc-500`
- Center item [+]: elevated, triggers ActionSheet for quick add
- Badge counts on Alerts tab

#### ChatOverlay

**Mobile:** Bottom sheet sliding up from bottom tab bar.
```
Trigger: tap Chat tab in BottomTabBar
Height: 70vh (draggable to full)
Classes: fixed inset-x-0 bottom-0 bg-zinc-900/95 backdrop-blur-xl
         border-t border-white/10 rounded-t-2xl z-[55]
         transition-transform duration-300
Drag handle at top. Swipe down to dismiss.
```

**Desktop:** Collapsible right sidebar panel.
```
Trigger: Cmd+Shift+C or header chat icon
Width: 400px
Classes: fixed right-0 top-14 bottom-0 w-[400px]
         bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 z-[55]
         transition-transform duration-300
```

Context injection: current domain and sub-view path passed to chat API.

#### CommandPalette

Cmd+K modal — search everything.

```
┌─────────────────────────────────────┐
│ [🔍] Search Jarvis...               │  ← Input (auto-focused)
├─────────────────────────────────────┤
│ RECENT                              │
│ [👤] Personal → Tasks               │
│ [🧬] Reset Bio → Peptides           │
├─────────────────────────────────────┤
│ ACTIONS                             │
│ [+] Add task              Cmd+.     │  ← Shortcut hint
│ [💊] Log dose                       │
│ [📔] Journal entry                  │
├─────────────────────────────────────┤
│ DOMAINS                             │
│ [🔥] Ethereal Flame       Cmd+2    │
│ [🧬] Reset Biology        Cmd+3    │
└─────────────────────────────────────┘
```

- Classes: `fixed inset-0 z-[60] flex items-start justify-center pt-[20vh]`
- Modal: `bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full mx-4`
- Sections: grouped by type (recent, actions, domains, results)
- Keyboard: arrow keys navigate, Enter selects, Escape closes
- Fuzzy search across all domains, actions, settings
- Mobile: full-screen modal, triggered via search icon or pull-down

#### ContentContainer

Wrapper for page content with consistent max-width and padding.

```tsx
<ContentContainer>
  {/* page content */}
</ContentContainer>
```

Classes:
```
w-full mx-auto px-4 md:px-6 lg:px-8
max-w-3xl             // Detail views (narrow)
md:max-w-5xl          // Dashboard views (wider)
lg:max-w-7xl          // Full-width views (grids)
```

Content offset:
- Mobile: `pt-[6.5rem]` (header 56px + rail 48px) + `pb-20` (bottom tab 64px)
- Desktop: `md:pl-16 md:pt-14` (rail width 64px, header 56px)

---

## SECTION 3: LAYOUT SYSTEM

### Grid System

Dashboard cards and domain health use a responsive grid:

```
Mobile (< 768px):   1 column, full width, stacked
Tablet (768-1024):  2 columns, equal width
Desktop (> 1024):   3 columns, equal width
```

Tailwind: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

Widget grid (pinned home widgets): same pattern but `gap-3` and widgets can span 2 cols (`col-span-2` for wide widgets).

### Content Regions

| Region | Scrolls? | Position |
|--------|----------|----------|
| Header | No | Fixed top |
| Domain Rail | No (mobile: horizontal scroll) | Fixed |
| Content Area | Yes | Main scrollable area |
| Bottom Tab Bar | No | Fixed bottom (mobile) |
| Chat Overlay | Internal scroll | Fixed overlay |

The Content Area is the ONLY scrollable region. Everything else is fixed chrome. This prevents scroll conflicts on mobile.

### Section Spacing Within Pages

```
Page layout:
┌───────────────────────────┐
│ [Section Label]           │  ← label typography
│ ┌───────────────────────┐ │
│ │ Card / Content        │ │  ← gap-4 between cards in a section
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │ Card / Content        │ │
│ └───────────────────────┘ │
│                           │  ← gap-8 between sections
│ [Section Label]           │
│ ┌───────────────────────┐ │
│ │ Card / Content        │ │
│ └───────────────────────┘ │
└───────────────────────────┘
```

---

## SECTION 4: RESPONSIVE STRATEGY

### Breakpoints

| Name | Width | Tailwind | Description |
|------|-------|----------|-------------|
| Mobile | < 768px | default | Phone (primary target) |
| Tablet | 768-1024px | `md:` | iPad, large phones landscape |
| Desktop | > 1024px | `lg:` | Laptop, monitor |

This extends the current single `md:` breakpoint to add `lg:` for 3-column layouts.

### Screen Type Adaptations

#### Priority Home

```
MOBILE                         DESKTOP
┌─────────────┐                ┌───┬────────────────────────────────┐
│ Header      │                │ R │ Header                         │
│ Domain Rail │                │ a ├────────────────────────────────┤
│             │                │ i │ Priority Stack (top 5-10)     │
│ Priority    │                │ l │                                │
│ Stack       │                │   │ Domain Health Grid (3-col)    │
│ (scrollable)│                │   │ ┌────┐ ┌────┐ ┌────┐         │
│             │                │   │ │Pers│ │EF  │ │RB  │         │
│ Domain      │                │   │ └────┘ └────┘ └────┘         │
│ Health      │                │   │ ┌────┐ ┌────┐ ┌────┐         │
│ (1-col grid)│                │   │ │Vis │ │Sat │ │Ent │         │
│             │                │   │ └────┘ └────┘ └────┘         │
│ Widgets     │                │   │                                │
│ (1-col)     │                │   │ Widgets (2-3 col)             │
│             │                │   │ Briefing Card                  │
│ Briefing    │                └───┴────────────────────────────────┘
│ Tab Bar     │
└─────────────┘
```

#### Domain Dashboard

```
MOBILE                         DESKTOP
┌─────────────┐                ┌───┬────────────────────────────────┐
│ Header      │                │ R │ Header: Domain Name            │
│ Domain Rail │                │ a ├────────────────────────────────┤
│             │                │ i │ KPI: Daily Compliance ██ 75%  │
│ KPI         │                │ l │                                │
│ ████ 75%    │                │   │ Sub-Programs (2x4 grid)       │
│             │                │   │ ┌─────┐ ┌─────┐ ┌─────┐      │
│ Sub-Programs│                │   │ │Breth│ │Exerc│ │Visn │      │
│ (2-col grid)│                │   │ └─────┘ └─────┘ └─────┘      │
│             │                │   │ ┌─────┐ ┌─────┐ ┌─────┐      │
│ Today Tasks │                │   │ │Nutrn│ │Pepti│ │Journ│      │
│             │                │   │ └─────┘ └─────┘ └─────┘      │
│ Tab Bar     │                │   │                                │
└─────────────┘                │   │ Today's Tasks                  │
                               └───┴────────────────────────────────┘
```

#### Sub-Program View

```
MOBILE                         DESKTOP
┌─────────────┐                ┌───┬────────────────────────────────┐
│ [←] Peptides│                │ R │ [←] Peptides                   │
│             │                │ a ├────────────────────────────────┤
│ Next dose:  │                │ i │ Next dose: BPC 250mcg 2pm     │
│ BPC 2pm     │                │ l │ [LOG DOSE NOW]                │
│ [LOG DOSE]  │                │   │                                │
│             │                │   │ Active Protocols  │ Schedule   │
│ Protocols   │                │   │ BPC-157 ████░   │ 08:00 ☑   │
│ Schedule    │                │   │ TB-500  ███░░   │ 14:00 ☐   │
│ History     │                │   │ Sema    ████░   │ 20:00 ☐   │
│             │                │   │                                │
│ Tab Bar     │                │   │ [Education] [Inventory] [Hist]│
└─────────────┘                └───┴────────────────────────────────┘
```

Desktop uses a two-column layout: primary content left, secondary content right.

#### Detail View

```
MOBILE                         DESKTOP
┌─────────────┐                ┌───┬────────────────────────────────┐
│ [←] BPC-157 │                │ R │ [←] BPC-157 Protocol           │
│             │                │ a ├────────────────────────────────┤
│ Protocol    │                │ i │  ┌────────────────────────┐   │
│ details     │                │ l │  │ Protocol details       │   │
│ (full width)│                │   │  │ (centered, max-w-2xl)  │   │
│             │                │   │  │                        │   │
│ Dose History│                │   │  │ Dose history           │   │
│             │                │   │  │ Notes                  │   │
│ Notes       │                │   │  │                        │   │
│             │                │   │  │ [Edit] [Archive] [Edu] │   │
│ Actions     │                │   │  └────────────────────────┘   │
│ Tab Bar     │                └───┴────────────────────────────────┘
└─────────────┘
```

Desktop: narrow centered column (`max-w-2xl mx-auto`) for readability.

#### Onboarding

```
MOBILE                         DESKTOP
┌─────────────┐                ┌──────────────────────────────────┐
│             │                │                                  │
│ [step dots] │                │  ┌──────────┬─────────────────┐ │
│             │                │  │          │                 │ │
│ Welcome     │                │  │ Illustr  │ Welcome to      │ │
│ to Jarvis   │                │  │ ation    │ Jarvis          │ │
│             │                │  │          │                 │ │
│ description │                │  │          │ description     │ │
│             │                │  │          │                 │ │
│ [Get Start] │                │  │          │ [Get Started]   │ │
│             │                │  └──────────┴─────────────────┘ │
└─────────────┘                └──────────────────────────────────┘
```

Desktop: 2-column layout with illustration left, content right.
Mobile: single column, stacked.

#### Settings

```
MOBILE                         DESKTOP
┌─────────────┐                ┌───┬────────┬───────────────────┐
│ [←] Settings│                │ R │Settings│                   │
│             │                │ a │ List   │ Setting Detail    │
│ General     │                │ i │        │ (selected)        │
│ Domains     │                │ l │ Genrl  │                   │
│ Notifs      │                │   │ Domns  │ Content of        │
│ Sentinel    │                │   │ Notifs │ selected setting  │
│ About       │                │   │ Sentnl │                   │
│             │                │   │ About  │                   │
│ Tab Bar     │                └───┴────────┴───────────────────┘
└─────────────┘
```

Desktop: split-pane (settings list left, detail right).
Mobile: list → tap → full-page detail (push navigation).

---

## SECTION 5: THE ORB DECISION

### Decision: Option B — Miniaturize as Ambient Status Indicator

**The orb is not archived. It is distilled.**

The full-screen Three.js orb served as Jarvis's identity when there was only a chat interface. In the multi-domain OS, the orb becomes a compact, ambient presence — the heartbeat of Jarvis visible in the system.

### Where the Mini-Orb Lives

1. **Header logo position** — The [J] in the header IS the mini-orb: a 32x32px animated canvas showing the orb's current state (idle glow, thinking pulse, speaking wave, listening ripple). This is always visible.

2. **Loading/thinking state** — When Jarvis is processing (chat response, briefing assembly, API calls), the mini-orb pulses with increased intensity. This replaces generic spinners for AI-related loading.

3. **Full-screen mode (opt-in)** — From Settings or via voice command "Show the orb", the classic full-screen orb can be activated as an ambient mode. This preserves the emotional connection for moments when you just want to talk to Jarvis without the dashboard.

### Implementation

- Extract the orb's particle system into a reusable `<MiniOrb size={32} />` component
- Reduce particle count proportionally for performance (32px needs ~50 particles vs ~2000 for full-screen)
- The mini-orb canvas runs at 30fps (not 60) to save battery on mobile
- Full-screen orb remains in codebase under `legacy/JarvisOrb.tsx`, accessible via Settings → Appearance → "Classic Orb Mode"
- Three.js is dynamically imported ONLY when the mini-orb or full-screen orb is rendered (no bundle cost for users who disable it)

### Rationale

| Factor | Analysis |
|--------|----------|
| Performance | Full-screen Three.js + 2000 particles = heavy on mobile battery. Mini 32px orb at 30fps = negligible. |
| Emotional attachment | The orb IS Jarvis. Removing it entirely loses identity. Miniaturizing preserves the soul. |
| Space | New shell needs every pixel. Full-screen orb conflicts with domain rail, priority stack, dashboard cards. |
| User control | Some days you want the zen orb, most days you need the command center. Opt-in full-screen respects both. |

---

## SECTION 6: ANIMATION & TRANSITION SYSTEM

### Timing Tokens

| Token | Duration | Tailwind | Usage |
|-------|----------|----------|-------|
| `fast` | 150ms | `duration-150` | Micro-interactions: toggle, hover, focus |
| `normal` | 250ms | `duration-250` | Standard transitions: color change, opacity |
| `slow` | 400ms | `duration-400` | Panel open/close, sheet slide |
| `dramatic` | 600ms | `duration-600` | Page transitions, onboarding steps |

### Easing

| Token | CSS | Tailwind | Usage |
|-------|-----|----------|-------|
| `ease-default` | `ease-out` | `ease-out` | Most transitions (enter, default) |
| `ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | `ease-out` | Elements appearing |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | `ease-in` | Elements disappearing |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | (custom) | Bouncy: sheet open, toggle, mini-orb pulse |

### Page Transitions

**Domain switching:** Instant content swap with fade crossfade (150ms).
- No slide animations between domains (feels sluggish, adds perceived latency)
- Content area fades: old content opacity 1→0 (75ms), new content opacity 0→1 (75ms)
- Domain rail icon highlight transitions smoothly (color change, 250ms)

**Navigation depth:** Push/pop with subtle slide.
- Push (deeper): content slides left 20px + fade in (250ms)
- Pop (back): content slides right 20px + fade in (250ms)
- Matched by swipe-back gesture on mobile

### Micro-Interactions

| Interaction | Animation |
|-------------|-----------|
| Toggle on/off | Thumb slides + track color change (150ms spring) |
| Mark task done | Strikethrough text (200ms) + checkbox fill + subtle scale pulse (1→1.05→1, 300ms) |
| Dismiss notification | Swipe right + fade out (200ms) |
| Quick action complete | Toast slides in from top (250ms ease-out) + auto-dismiss (4s) |
| Log dose | Button scale pulse (1→0.95→1, 150ms) + success toast |
| Open sheet | Slide up from bottom (400ms spring easing) + backdrop fade in |
| Close sheet | Slide down (300ms ease-in) + backdrop fade out |
| Chat message appear | Fade in + slide up 8px (300ms) — matches existing `animate-fade-in` |
| Rail icon tap | Background tint fade (150ms) + status dot update |
| Widget tap | Card scale 1→0.98→1 (100ms) then navigate |

### Loading Patterns

| Context | Pattern |
|---------|---------|
| Initial page load | Skeleton screens matching content shape (card skeletons, list item skeletons) |
| Data refresh | Content stays visible, subtle shimmer overlay on stale sections |
| AI processing | Mini-orb pulse in header + "Thinking..." text in chat |
| Action in-flight | Button shows spinner, disabled state |
| Full page (rare) | Centered mini-orb pulse + "Loading Jarvis..." |

### Reduced Motion

All animations respect `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  /* Replace animations with instant state changes */
  /* Fade becomes instant opacity change */
  /* Slide becomes instant position change */
  /* Spring becomes linear */
  /* Only mini-orb idle glow is preserved (ambient, non-jarring) */
}
```

Implementation: a `useReducedMotion()` hook that returns boolean. Components check this before applying animation classes.

---

## SECTION 7: ICON SYSTEM

### Decision: Adopt lucide-react

`lucide-react` is already installed (`^0.563.0`) but unused in Jarvis. It provides:
- 1500+ icons, actively maintained
- Tree-shakeable (only imports what's used)
- Consistent 24x24 grid, 2px stroke
- React components with full TypeScript support

**Migration path:** Replace hand-rolled inline SVGs with lucide-react imports as components are rebuilt in E-04+. Legacy components keep their inline SVGs until migrated.

### Icon Sizes

| Context | Size | Tailwind | Lucide `size` prop |
|---------|------|----------|-------------------|
| Inline (badges, labels) | 14px | `w-3.5 h-3.5` | `14` |
| Default (buttons, list items) | 16px | `w-4 h-4` | `16` |
| Navigation (rail, tabs) | 20px | `w-5 h-5` | `20` |
| Domain rail | 24px | `w-6 h-6` | `24` |
| Large (empty state illustration) | 48px | `w-12 h-12` | `48` |

### Color Rules

- **Default:** Icons inherit text color (`currentColor`) — no explicit color on icon
- **Status:** Icon uses status color (`text-red-400` for critical, etc.)
- **Domain:** Rail icons use domain color when active
- **Interactive:** Icons in buttons inherit button text color
- **Disabled:** Icons inherit disabled opacity from parent

### Domain Icon Assignments

| Domain | Lucide Icon | Rationale |
|--------|-------------|-----------|
| Home | `Home` | Universal home metaphor |
| Personal | `User` | Personal/individual |
| Ethereal Flame | `Flame` | Brand name |
| Reset Biology | `Dna` | Biology/science |
| CritFailVlogs | `Dice6` | D&D dice (brand identity) |
| Visopscreen | `TrendingUp` | Trading/investments |
| Satori Living | `Landmark` | Institution/nonprofit |
| Entity Building | `Building2` | Business entities |
| Settings | `Settings` | Universal gear |
| Chat | `MessageCircle` | Chat/conversation |
| Notifications | `Bell` | Universal notifications |
| Search | `Search` | Universal search |
| Quick Add | `Plus` | Universal add |

### Status Icon Pairings (Accessibility)

Every status color has a mandatory paired icon shape:

| Status | Color | Icon | Combined |
|--------|-------|------|----------|
| Critical | Red | `AlertCircle` (!) | 🔴 ! |
| Warning | Amber | `AlertTriangle` (△) | 🟡 △ |
| Success | Green | `CheckCircle` (✓) | 🟢 ✓ |
| Info | Blue | `Info` (ℹ) | 🔵 ℹ |
| Inactive | Gray | `Minus` (—) | ⚪ — |

This ensures color-blind users can distinguish status without relying on color alone.

---

## SECTION 8: ACCESSIBILITY BASELINE

### Color Contrast

| Combination | Ratio | WCAG Level |
|------------|-------|------------|
| `text-white/90` on `bg-black` | 18.1:1 | AAA |
| `text-white/70` on `bg-black` | 12.6:1 | AAA |
| `text-white/60` on `bg-zinc-900` | 7.2:1 | AAA |
| `text-white/40` on `bg-zinc-900` | 4.8:1 | AA |
| `text-cyan-400` on `bg-black` | 8.6:1 | AAA |
| `text-red-400` on `bg-black` | 5.1:1 | AA |
| `text-amber-400` on `bg-black` | 8.2:1 | AAA |

Minimum: AA (4.5:1) for all text. AAA preferred.
`text-white/40` is used only for non-essential hints — acceptable at AA.

### Focus States

Visible focus ring for keyboard navigation:
```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-cyan-500/50
focus-visible:ring-offset-2
focus-visible:ring-offset-zinc-900
```

Applied to: all interactive elements (buttons, inputs, links, cards, tabs, rail items).
Tab order follows visual order (no `tabindex` hacks).

### Keyboard Navigation

| Context | Keys | Behavior |
|---------|------|----------|
| Domain Rail | Arrow Up/Down (desktop), Arrow Left/Right (mobile) | Navigate between domains |
| Bottom Tab Bar | Arrow Left/Right | Navigate between tabs |
| Priority Stack | Arrow Up/Down | Navigate items, Enter = activate |
| Command Palette | Arrow Up/Down, Enter, Escape | Navigate results, select, close |
| Sheets/Modals | Escape | Close, return focus to trigger |
| Page content | Tab | Standard tab order |

### Semantic HTML

| Component | Element | ARIA |
|-----------|---------|------|
| Domain Rail | `<nav aria-label="Domains">` | Role: navigation |
| Bottom Tab Bar | `<nav aria-label="Main">` | Role: navigation |
| Priority Stack | `<ul role="list">` | Each item `<li>` |
| Cards | `<article>` or `<div role="article">` | Title as heading |
| Modals/Sheets | `<dialog>` or `role="dialog"` | `aria-modal="true"`, `aria-labelledby` |
| Toast | `role="alert" aria-live="polite"` | Auto-announced |
| Status badges | — | `aria-label="Status: critical"` |
| Domain health | — | `aria-label="Personal: 3 tasks due, status green"` |

### Touch Targets

- Minimum: 44x44px for all interactive elements on mobile
- Preferred: 48x48px for primary actions (buttons, rail icons, tab items)
- Spacing: at least 8px between adjacent touch targets
- Current violation: some inline SVG buttons are smaller — fix during component rebuild

### Reduced Motion

```tsx
// hooks/useReducedMotion.ts
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
```

When `reduced` is true:
- All transitions become instant (0ms duration)
- Sheet open/close: no slide, instant appear/disappear
- Page transitions: no crossfade, instant swap
- Mini-orb: static glow (no animation)
- Skeleton shimmer: static gray (no pulse)

### Text Scaling

UI must remain functional at 120% browser font size:
- No fixed pixel heights on text containers (use min-height)
- Flex layouts accommodate growing text
- Truncation (`truncate`) prevents overflow
- Test at 120% during E-04 build verification

---

## SECTION 9: FILE ORGANIZATION

### Project Structure

```
src/
├── app/
│   └── (jarvis)/              ← All Jarvis routes (E-02 routing architecture)
│       ├── layout.tsx          ← JarvisShell
│       ├── page.tsx            ← Priority Home
│       ├── onboarding/
│       ├── chat/
│       ├── settings/
│       ├── personal/
│       ├── ethereal-flame/
│       ├── reset-biology/
│       ├── critfail/
│       ├── visopscreen/
│       ├── satori/
│       └── entity/
│
├── components/
│   └── jarvis/
│       ├── primitives/         ← Button, Card, Input, Badge, Toggle, Sheet, Toast, Skeleton
│       ├── composites/         ← DomainHealthCard, PriorityItem, WidgetCard, etc.
│       ├── layout/             ← JarvisShell, Header, DomainRail, BottomTabBar, etc.
│       ├── domains/            ← Domain-specific components
│       │   ├── personal/
│       │   ├── ethereal-flame/
│       │   ├── reset-biology/
│       │   └── ...
│       └── legacy/             ← Existing components (migrate over time)
│
├── hooks/
│   └── jarvis/
│       ├── useReducedMotion.ts
│       ├── useFreshness.ts     ← Data freshness tier calculation
│       └── useCommandPalette.ts
│
├── lib/
│   └── jarvis/
│       ├── stores/             ← Zustand stores (E-02 state architecture)
│       │   ├── homeStore.ts
│       │   ├── navigationStore.ts
│       │   ├── chatStore.ts
│       │   ├── notificationStore.ts
│       │   ├── settingsStore.ts
│       │   └── domains/
│       └── ...                 ← Existing intelligence, memory, notion, etc.
│
└── styles/
    └── globals.css             ← Tailwind import + custom animations + safe area utils
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Component files | PascalCase | `DomainHealthCard.tsx` |
| Hook files | camelCase with `use` prefix | `useReducedMotion.ts` |
| Store files | camelCase with `Store` suffix | `homeStore.ts` |
| Route directories | kebab-case | `reset-biology/` |
| Barrel exports | `index.ts` per directory | `primitives/index.ts` |

### Import Pattern

```tsx
// Primitives imported from barrel
import { Button, Card, Badge, Input } from '@/components/jarvis/primitives';

// Composites imported from barrel
import { DomainHealthCard, PriorityItem } from '@/components/jarvis/composites';

// Layout imported from barrel
import { JarvisShell, Header, DomainRail } from '@/components/jarvis/layout';

// Domain-specific imported directly
import { PeptideSchedule } from '@/components/jarvis/domains/reset-biology/PeptideSchedule';
```

---

*This UI system is the visual language. Every component follows these tokens, patterns, and rules.*
*E-04 builds the shell. E-05+ fills the rooms. Every decision is made here.*
*The only styling questions remaining for build waves are domain-specific content layout.*
