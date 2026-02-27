---
phase: E-06-command-palette
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/hooks/useCommandPalette.ts
  - src/components/jarvis/layout/CommandPalette.tsx
  - src/components/jarvis/layout/JarvisShell.tsx
  - src/components/jarvis/layout/index.ts
autonomous: true
---

<objective>
## Goal
Build the Command Palette — a Cmd+K / Ctrl+K search-everything overlay that searches across domains, pages, personal items, academy lessons, and quick actions. Completes E-06 and the dead search button in the Header.

## Purpose
The Command Palette is Layer 3 of the 4-layer navigation model (Domain Rail → Priority Home → **Command Palette** → Quick Capture). It lets power users shortcut to any depth instantly. The Header's search button has been a dead no-op since E-04-01 — this plan brings it to life.

## Output
- `useCommandPalette.ts` — scored fuzzy matching, search registry, keyboard navigation, persistent recent items
- `CommandPalette.tsx` — full modal UI with match highlighting, animated open/close, responsive mobile/desktop, keyboard hint footer
- JarvisShell wired with lightweight global Cmd+K listener + conditional CommandPalette mount
</objective>

<context>
## Project Context
@jarvis/.paul/PROJECT.md
@jarvis/.paul/ROADMAP.md
@jarvis/.paul/STATE.md

## Prior Work
- E-04-01 created `shellStore.isCommandPaletteOpen`, `toggleCommandPalette`, `closeCommandPalette` — all working, nothing consumes the state
- Header.tsx has two trigger elements (icon button + desktop pill) already wired to `toggleCommandPalette`
- ChatOverlay pattern (bottom sheet mobile / side panel desktop, z-[55]) is the closest sibling component

## Source Files
@src/lib/jarvis/stores/shellStore.ts
@src/components/jarvis/layout/Header.tsx
@src/components/jarvis/layout/JarvisShell.tsx
@src/components/jarvis/layout/ChatOverlay.tsx (reference: z-index, overlay pattern)
@src/components/jarvis/layout/index.ts
@src/lib/jarvis/domains.ts (searchable domains)
@src/lib/jarvis/stores/personalStore.ts (searchable tasks, habits, bills, goals)
@src/lib/jarvis/curriculum/tutorialLessons.ts (searchable lessons)
@src/lib/jarvis/stores/settingsStore.ts (useActiveDomains)

## Design Specs
- IA doc specifies: desktop `Cmd+K`, mobile search icon or pull-down, fuzzy search across all content
- UI System Design specifies: z-[60], `fixed inset-0`, `pt-[20vh]` desktop / full-screen mobile, `bg-zinc-900 border border-white/10 rounded-2xl`
- Superhuman-inspired: passive shortcut learning (show shortcuts next to commands), one palette for everything
- Sections: Recent → Actions → Domains → Pages → Items (filtered by query)
</context>

<acceptance_criteria>

## AC-1: Global Keyboard Shortcut
```gherkin
Given Jarvis Shell is rendered and no modal input is focused
When user presses Cmd+K (Mac) or Ctrl+K (Windows)
Then the Command Palette opens with the search input auto-focused
And pressing Escape closes it with a fade-out animation
```

## AC-2: Header Button Activation
```gherkin
Given the Header search icon (mobile) or search pill (desktop) exists
When user clicks either trigger
Then the Command Palette opens (same behavior as Cmd+K)
```

## AC-3: Scored Fuzzy Search Across All Content
```gherkin
Given the Command Palette is open
When user types a query (e.g., "tsk" matches "Tasks", "rst" matches "Reset Biology")
Then results appear grouped by type (Domains, Pages, Items, Actions, Lessons)
And matching uses scored fuzzy logic — characters must appear in order, consecutive runs score higher
And matched characters are visually highlighted in each result label
And results are sorted by score (best matches first) within each section
And each section shows at most 4 results to prevent overwhelming walls of text
And results update as the user types (no debounce needed for <100 items)
```

## AC-4: Keyboard Navigation
```gherkin
Given search results are visible in the palette
When user presses Arrow Down / Arrow Up
Then the active selection moves through results (wrapping at edges)
And the active item scrolls into view automatically
And pressing Enter navigates to the selected result and closes the palette
```

## AC-5: Persistent Recent Items
```gherkin
Given the palette opens with an empty query
Then the "Recent" section shows up to 5 recently selected items
And selecting an item adds it to recents
And recents persist across palette opens AND across sessions (localStorage)
```

## AC-6: Responsive Layout
```gherkin
Given the Command Palette is open on mobile (<768px)
Then it renders as a near-full-screen modal (inset-4, no pt-[20vh])
Given the Command Palette is open on desktop (≥768px)
Then it renders centered at pt-[20vh] with max-w-lg
```

## AC-7: Visual Polish
```gherkin
Given the Command Palette opens
Then it fades in with a backdrop blur scrim + panel scale animation
Given the Command Palette closes
Then it fades out smoothly (150ms) before unmounting — no jarring instant disappearance
And each result row shows: domain-colored icon, label with highlighted matches, shortcut hint (if any)
And the active/hovered row has a visible highlight
And a footer bar shows keyboard navigation hints (↑↓ navigate · ↵ select · esc close)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create useCommandPalette hook — fuzzy scoring engine + search registry + keyboard nav + persistent recents</name>
  <files>src/lib/jarvis/hooks/useCommandPalette.ts</files>
  <action>
    Create the hook that powers all Command Palette logic:

    **PaletteItem Type:**
    ```ts
    type PaletteItem = {
      id: string;           // unique key for dedup (e.g., 'domain:personal', 'page:tasks', 'item:task-3')
      type: 'domain' | 'page' | 'action' | 'item' | 'lesson';
      label: string;
      route?: string;       // navigation target
      onSelect?: () => void; // for actions that don't navigate
      icon?: string;        // lucide icon name
      domainColor?: string; // for domain-colored rendering
      shortcut?: string;    // e.g., '⌘K' — displayed as passive hint
    };

    type ScoredItem = PaletteItem & {
      score: number;        // fuzzy match score
      matchIndices: number[]; // character positions that matched (for highlighting)
    };
    ```

    **Fuzzy Match Algorithm (no external library):**
    Create a `fuzzyMatch(query: string, target: string)` function:
    - Walk through query characters in order against target characters (case-insensitive)
    - All query characters must appear in target in order, or it's not a match
    - **Scoring:** +10 per matched character. +5 bonus for consecutive matches (characters in a row). +10 bonus for matching at word start (after space, hyphen, or at index 0). +3 bonus for matching at target start.
    - Return `{ match: boolean; score: number; indices: number[] }` where `indices` are the positions in target that matched
    - Example: query "hbt" against "Habits" → matches H(0), b(2), t(4) → score 30 + bonuses for start match
    - Example: query "rst bio" → treat as two tokens, score independently against "Reset Biology", sum scores. Split query on spaces, each token must fuzzy-match. This handles multi-word queries naturally.

    **Item Registry (built with useMemo):**
    Build a flat `PaletteItem[]` array from existing sources:
    - **Domains:** Import `DOMAINS` from domains.ts → map to items with `type: 'domain'`. Only include active domains (use `useSettingsStore` activeDomainIds).
    - **Pages:** Static list of known sub-routes (Personal sub-views: tasks, habits, bills, calendar, journal, goals, health; Academy; Settings). Each with `type: 'page'`, label, route, parent domain color.
    - **Actions:** Static list of quick actions — "Add task", "Journal entry", "Toggle chat" (calls toggleChat), "Open settings" (navigates). Each with `type: 'action'`, label, `onSelect` callback, appropriate icon name.
    - **Personal Items:** Import `usePersonalStore` → map tasks (by title), habits (by name), goals (by title) to items with `type: 'item'`, label, route to their parent view, parent domain color.
    - **Lessons:** Import `TUTORIAL_LESSONS` from curriculum → map to items with `type: 'lesson'`, lesson name, route to `/jarvis/app/academy`.

    **Search + Sectioning:**
    - `query` state (string)
    - `sections` = useMemo:
      - If query is empty → return empty array (component handles showing recents/defaults)
      - If query has text → run `fuzzyMatch(query, item.label)` against every item in registry
      - Keep only matches (`match === true`)
      - Sort all matches by score descending
      - Group into sections by type, maintaining score order within each section
      - **Cap each section at 4 results** — prevents any single type from flooding the list
      - Section order: Actions → Domains → Pages → Items → Academy (consistent ordering)
      - Each section: `{ type: string; label: string; items: ScoredItem[] }`

    **Keyboard Navigation:**
    - `activeIndex` state (number, -1 = none)
    - Reset to 0 when query changes (so first result is always pre-selected)
    - `flatItems` = useMemo: flatten all sections' items into a single array for index-based navigation
    - `onKeyDown` handler: ArrowDown increments (wrap to 0), ArrowUp decrements (wrap to end), Enter selects item at activeIndex, Escape closes
    - Return `activeIndex` so component can match it against flatItems for highlight

    **Persistent Recent Items:**
    - On mount, load recents from `localStorage.getItem('jarvis-command-palette-recents')` — parse as PaletteItem[] or default to []
    - `recents` state: array of PaletteItem[], max 5, most-recent-first
    - `addRecent(item)`: prepend, deduplicate by `item.id`, cap at 5, write to localStorage
    - Actions (type === 'action') should NOT be saved to recents — they're ephemeral commands, not destinations

    **Selection:**
    - `selectItem(item)`: add to recents (if not action type), navigate to item.route (useRouter), or call item.onSelect for actions, then call `closeCommandPalette` from shellStore

    **Return type:**
    ```ts
    {
      query: string;
      setQuery: (q: string) => void;
      sections: { type: string; label: string; items: ScoredItem[] }[];
      activeIndex: number;
      onKeyDown: (e: React.KeyboardEvent) => void;
      selectItem: (item: PaletteItem) => void;
      recents: PaletteItem[];
      flatItems: ScoredItem[]; // flattened for index-based keyboard nav
    }
    ```

    **Important:**
    - Do NOT use any external search library (fuse.js, cmdk, etc.)
    - Items from inactive domains should NOT appear (respect settingsStore)
    - The hook should compute `sections` that the component renders directly
    - The fuzzyMatch function should be a pure utility at module scope, not inside the hook
    - Multi-word queries: split on spaces, each token must match. Sum scores across tokens.
  </action>
  <verify>TypeScript compiles with no errors: `npm run build`</verify>
  <done>AC-3 (scored fuzzy search), AC-4 (keyboard nav), AC-5 (persistent recents) logic layers satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Create CommandPalette component with match highlighting, animated close, keyboard footer + wire into JarvisShell</name>
  <files>src/components/jarvis/layout/CommandPalette.tsx, src/components/jarvis/layout/JarvisShell.tsx, src/components/jarvis/layout/index.ts</files>
  <action>
    **CommandPalette.tsx:**

    Create the modal overlay component. This component is **conditionally rendered** by JarvisShell (only when `isCommandPaletteOpen` is true). The global Cmd+K listener lives in JarvisShell, NOT here — this keeps the heavy hook from running when the palette is closed.

    1. **Animated Open + Close:**
       - Use an internal `closing` state (boolean, default false)
       - When the component mounts: animate in (CSS keyframe, 200ms)
       - When Escape is pressed or scrim is clicked: set `closing = true`, start close animation (150ms fade-out + slight scale-down), then after animation completes call `closeCommandPalette()` from shellStore
       - Use an `onAnimationEnd` handler on the scrim to detect when close animation finishes, then call `closeCommandPalette()`
       - This gives a smooth 150ms exit instead of jarring instant unmount

       **CSS Keyframes (in `<style>` tag, same pattern as ChatOverlay):**
       ```
       @keyframes palette-scrim-in { from { opacity: 0 } to { opacity: 1 } }
       @keyframes palette-scrim-out { from { opacity: 1 } to { opacity: 0 } }
       @keyframes palette-panel-in { from { opacity: 0; transform: scale(0.98) translateY(-8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
       @keyframes palette-panel-out { from { opacity: 1; transform: scale(1) translateY(0) } to { opacity: 0; transform: scale(0.98) translateY(-8px) } }
       ```
       - Scrim: `animation: palette-scrim-in 150ms ease` (or `palette-scrim-out` when closing)
       - Panel: `animation: palette-panel-in 200ms cubic-bezier(0.34,1.56,0.64,1)` (or `palette-panel-out 150ms ease` when closing)

    2. **Scrim + Container:**
       - Scrim: `fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm` — click triggers close animation
       - Desktop (md+): panel wrapper with `pt-[20vh]`, panel itself `max-w-lg w-full mx-auto`
       - Mobile (<md): panel `fixed inset-4 top-8` (near full-screen, slight margin)
       - Panel: `bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col`

    3. **Search Input:**
       - Full-width input at top with Search icon (lucide-react)
       - `autoFocus` on mount
       - Placeholder: "Search Jarvis..."
       - Right side: `Esc` kbd badge — `text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded`
       - Glass-style input area: `bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-3`
       - The actual `<input>` is unstyled (`bg-transparent outline-none text-white flex-1`)
       - onChange → setQuery, onKeyDown → hook's onKeyDown

    4. **Results Area:**
       - Scrollable area below input: `flex-1 overflow-y-auto` with `max-h-[60vh]`
       - **When query is empty:** Show "Recent" section (from hook.recents) if any, then "Quick Actions" section (filter registry for type=action), then "Domains" section (filter for type=domain)
       - **When query has text:** Show hook.sections (filtered + scored + capped results grouped by type)
       - Section headers: `text-[11px] uppercase tracking-wider text-white/30 px-4 py-2 font-medium`
       - Section type → label mapping: domain→"Domains", page→"Pages", item→"Items", action→"Actions", lesson→"Academy", recent→"Recent"

    5. **Match Highlighting (HighlightedLabel):**
       - Create an inline helper component: `HighlightedLabel({ label, indices }: { label: string; indices: number[] })`
       - Splits label into characters. Characters at positions in `indices` get wrapped in `<span className="text-cyan-400 font-medium">`. Non-matched characters render normally in `text-white/90`.
       - This makes the connection between what you typed and what matched visually obvious.
       - When showing items without match indices (recents, default sections), render label as plain text.

    6. **Result Rows:**
       - Each row: `px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors rounded-lg mx-2`
       - Active row (matches activeIndex in flatItems): `bg-white/10`
       - Hover: `hover:bg-white/5`
       - Left: DomainIcon (for domains) or lucide icon (for actions/pages/lessons), colored by item's domain color (use DOMAIN_COLORS). Size: `w-4 h-4`.
         - Action icons: Plus (Add task), BookOpen (Journal entry), MessageCircle (Toggle chat), Settings (Open settings)
         - Page icons: inherit parent domain icon or use generic FileText
         - Lesson icons: GraduationCap
       - Center: `<HighlightedLabel>` for searched items, plain label for recents/defaults. `text-sm`
       - Right: shortcut hint if exists — `text-[10px] text-white/20 font-mono`
       - onClick → selectItem(item)
       - Use a `ref` callback + `scrollIntoView({ block: 'nearest' })` when item becomes active via keyboard

    7. **Empty State:**
       - When query has text but no results: centered text `text-white/30 text-sm py-8` — "No results for '[query]'"

    8. **Footer — Keyboard Hints:**
       - Fixed at bottom of panel (not in scroll area): `border-t border-white/5 px-4 py-2 flex items-center gap-4`
       - Three hint groups, each: `text-[11px] text-white/20 flex items-center gap-1.5`
       - `↑↓` + "navigate" | `↵` + "select" | `esc` + "close"
       - Each key character in a mini kbd badge: `bg-white/5 px-1 py-0.5 rounded text-[10px] font-mono`

    **JarvisShell.tsx:**
    - Import `CommandPalette` from `./CommandPalette`
    - Add a lightweight `useEffect` for the global Cmd+K / Ctrl+K listener:
      ```ts
      useEffect(() => {
        const handler = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            toggleCommandPalette();
          }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
      }, []);
      ```
    - **Conditionally render** `<CommandPalette />` only when `isCommandPaletteOpen` is true (from shellStore)
    - This means the heavy `useCommandPalette` hook only runs when the palette is visible — zero cost when closed
    - Place after `<SpotlightOverlay />` in the JSX (last overlay in the stack)

    **index.ts:**
    - Add export: `export { CommandPalette } from './CommandPalette';`

    **Important:**
    - Use `DomainIcon` from `@/components/jarvis/home/DomainIcon` for domain-colored icons
    - z-[60] — palette should render ABOVE ChatOverlay (z-[55])
    - The close animation requires the component to stay mounted during the 150ms fade-out. Use the `closing` state pattern: Escape/scrim click → set closing=true → animation plays → onAnimationEnd → closeCommandPalette() removes from DOM
    - Scroll active item into view when keyboard-navigating (use `scrollIntoView({ block: 'nearest' })`)
    - Reset `query` to empty string when palette opens (clear previous search). Since the component unmounts on close and remounts on open, this happens naturally via initial state.
  </action>
  <verify>
    1. `npm run build` passes with no errors
    2. Visual check: push to GitHub, test on live site — Cmd+K opens palette, search works, keyboard nav works, clicking results navigates, close animation is smooth
  </verify>
  <done>AC-1 (keyboard shortcut), AC-2 (header button), AC-6 (responsive), AC-7 (visual polish + close animation + match highlighting + footer hints) satisfied. Combined with Task 1, all ACs met.</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `src/lib/jarvis/stores/shellStore.ts` — the `isCommandPaletteOpen`, `toggleCommandPalette`, `closeCommandPalette` are already correct
- `src/components/jarvis/layout/Header.tsx` — search buttons already wired, no changes needed
- `src/lib/jarvis/domains.ts` — domain data structure is stable
- `src/lib/jarvis/stores/personalStore.ts` — read-only consumption, do not modify
- `src/lib/jarvis/curriculum/tutorialLessons.ts` — read-only consumption, do not modify
- Any files under `src/components/jarvis/primitives/` — primitives are locked
- Any files under `src/components/jarvis/personal/` — personal views are locked

## SCOPE LIMITS
- No external libraries (no cmdk, fuse.js, or other search packages)
- No "Quick Add" functionality — actions navigate to existing pages, they don't create modals
- No Cmd+1..7 domain switching shortcuts (future scope)
- No Cmd+. quick capture (future scope)
- No pull-down gesture on mobile (search icon trigger is sufficient)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] CommandPalette renders when Cmd+K / Ctrl+K is pressed
- [ ] CommandPalette renders when Header search button is clicked
- [ ] Typing filters results with scored fuzzy matching (e.g., "hbt" finds "Habits")
- [ ] Matched characters are highlighted in cyan in result labels
- [ ] Each section capped at 4 results — no overwhelming walls of text
- [ ] Arrow keys navigate results, Enter selects, Escape closes with smooth fade-out
- [ ] Selected items appear in "Recent" section on next open (persists across sessions)
- [ ] Actions do NOT appear in recents (ephemeral commands)
- [ ] Mobile layout uses near-full-screen modal
- [ ] Desktop layout uses centered max-w-lg panel at pt-[20vh]
- [ ] Footer shows keyboard hints (↑↓ navigate · ↵ select · esc close)
- [ ] Cmd+K listener has zero performance cost when palette is closed
- [ ] No regressions: ChatOverlay, ToastContainer, SpotlightOverlay still work
</verification>

<success_criteria>
- All 7 acceptance criteria met (updated with fuzzy scoring, highlighting, close animation, persistent recents, footer, caps)
- Both tasks completed
- `npm run build` passes
- Header search button is no longer a dead no-op
- Command Palette searches across all active domain content with intelligent fuzzy matching
- Keyboard-first navigation works (Cmd+K → type → arrow → Enter)
- Feels delightful: smooth animations in AND out, highlighted matches, persistent recents, keyboard footer
</success_criteria>

<output>
After completion, create `jarvis/.paul/phases/E-mobile-ui/E-06-01-SUMMARY.md`
</output>
