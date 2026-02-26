---
phase: E-mobile-ui
plan: 01
type: execute
wave: 1
depends_on: ["D-02"]
files_modified:
  - src/lib/jarvis/memory/schema.ts
  - src/lib/jarvis/memory/queries/userSettings.ts
  - src/app/api/jarvis/settings/route.ts
  - src/components/jarvis/SettingsPanel.tsx
  - src/lib/jarvis/stores/settingsStore.ts
  - src/lib/jarvis/config.ts
  - src/app/jarvis/page.tsx
autonomous: false
---

<objective>
## Goal
Build a settings page behind a gear icon where the user can toggle Jarvis features without touching Vercel env vars. User settings stored in Turso, override env var defaults at runtime.

## Purpose
The user explicitly requested this in Phase D planning: "Can we get some sort of Jarvis settings behind a gear icon where we would hide many of our modifiable aspects?" Currently all feature flags require Vercel env var changes + redeploy. This gives immediate, live control.

## Output
- `user_settings` table in Turso (key-value, per-user ready but single-user for now)
- `/api/jarvis/settings` GET/PUT endpoint
- `SettingsPanel.tsx` — slide-out panel with gear icon trigger, toggle switches
- `settingsStore.ts` — Zustand store for client-side settings state
- `config.ts` updated — reads user_settings from DB, falls back to env vars
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/D-self-improvement/D-02-SUMMARY.md

## Source Files
@src/lib/jarvis/config.ts
@src/lib/jarvis/memory/schema.ts
@src/lib/jarvis/memory/db.ts
@src/app/jarvis/page.tsx
@src/components/jarvis/ChatPanel.tsx
</context>

<acceptance_criteria>

## AC-1: Settings Table Exists
```gherkin
Given the app deploys with drizzle-kit push in the build
When the build runs
Then a user_settings table exists with columns: id, key, value, updatedAt
```

## AC-2: Settings API Works
```gherkin
Given the settings API route exists
When GET /api/jarvis/settings is called
Then it returns all current settings as a JSON object { key: value }
When PUT /api/jarvis/settings is called with { key: "enableSelfImprovement", value: "false" }
Then the setting is upserted in the database
```

## AC-3: Gear Icon Opens Settings Panel
```gherkin
Given the user is on the Jarvis page
When they tap the gear icon (top-left, always visible)
Then a settings panel slides in from the left with toggle switches
And tapping outside or the X closes it
```

## AC-4: Toggle Switches Control Features
```gherkin
Given the settings panel is open
When the user toggles "Self-Improvement" off
Then the setting is saved via PUT /api/jarvis/settings
And the next conversation respects the new setting (enableSelfImprovement = false)
```

## AC-5: Config Falls Back to Env Vars
```gherkin
Given no user_settings entry exists for a key
When getJarvisConfig() is called
Then it returns the env var default (existing behavior preserved)
When a user_settings entry exists for that key
Then it overrides the env var value
```

## AC-6: Build Passes
```gherkin
Given all changes are complete
When npm run build executes
Then zero new TypeScript errors are introduced
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create user_settings table and API route</name>
  <files>
    src/lib/jarvis/memory/schema.ts,
    src/lib/jarvis/memory/queries/userSettings.ts,
    src/app/api/jarvis/settings/route.ts,
    src/lib/jarvis/config.ts
  </files>
  <action>
    **schema.ts:**
    Add a `userSettings` table:
    ```
    userSettings = sqliteTable('user_settings', {
      id: integer('id').primaryKey({ autoIncrement: true }),
      key: text('key').notNull().unique(),
      value: text('value').notNull(),
      updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
    })
    ```
    Export `UserSetting` type.

    **queries/userSettings.ts:**
    - `getAllSettings()` → returns Record<string, string> (all key-value pairs)
    - `getSetting(key)` → returns string | null
    - `upsertSetting(key, value)` → insert or update on conflict

    **route.ts:**
    - GET: calls `getAllSettings()`, returns JSON object
    - PUT: accepts `{ key: string, value: string }` body, calls `upsertSetting()`, returns updated setting
    - No auth needed (single user, same as other Jarvis routes)

    **config.ts:**
    - Add `getJarvisConfigWithOverrides()` async function that:
      1. Gets base config from env vars (existing `getJarvisConfig()`)
      2. Loads user_settings from DB via `getAllSettings()`
      3. For each known config key, checks if a user_settings override exists
      4. Returns merged config (user settings win over env vars)
    - Keep existing sync `getJarvisConfig()` unchanged (for non-async contexts)
    - Mapping: user_settings key "enableSelfImprovement" → config field enableSelfImprovement, etc.

    Settings keys to support initially:
    - `enableSelfImprovement` (boolean as string "true"/"false")
    - `enableMemoryLoading` (boolean)
    - `enableMcpConnector` (boolean)
    - `enableSelfHealing` (boolean)

    Avoid:
    - Do NOT break existing sync getJarvisConfig() — it's used in many places
    - Do NOT add auth — single user system
    - Use drizzle's onConflictDoUpdate for upsert
  </action>
  <verify>TypeScript compiles: zero new errors from tsc --noEmit (excluding pre-existing audio-prep)</verify>
  <done>AC-1, AC-2, AC-5 satisfied: settings table, API, and config override working</done>
</task>

<task type="auto">
  <name>Task 2: Build SettingsPanel UI with gear icon</name>
  <files>
    src/components/jarvis/SettingsPanel.tsx,
    src/lib/jarvis/stores/settingsStore.ts,
    src/app/jarvis/page.tsx
  </files>
  <action>
    **settingsStore.ts:**
    Zustand store with:
    - `settings: Record<string, string>` — current settings from server
    - `isOpen: boolean` — panel open/closed
    - `isLoading: boolean`
    - `togglePanel()`, `setOpen(bool)`
    - `fetchSettings()` — GET /api/jarvis/settings, updates state
    - `updateSetting(key, value)` — PUT /api/jarvis/settings, optimistic update

    **SettingsPanel.tsx:**
    Create a slide-out panel from the left side:

    Layout:
    - Gear icon button: `fixed top-4 left-4 z-40` — always visible, 40px, white/60 opacity, hover white
    - Panel: `fixed top-0 left-0 bottom-0 w-[85%] max-w-sm z-[45]` — dark glass background (bg-black/90 backdrop-blur-xl)
    - Backdrop: `fixed inset-0 z-[44] bg-black/50` — tap to close
    - Slide animation: translateX(-100%) → translateX(0)
    - Close button (X) top-right of panel

    Content:
    - Header: "Settings" with subtle border-bottom
    - Section: "Features" with toggle switches for:
      - Self-Improvement (enableSelfImprovement)
      - Memory System (enableMemoryLoading)
      - MCP Connector (enableMcpConnector)
      - Self-Healing (enableSelfHealing)
    - Each toggle: label on left, switch on right, subtle description text below label
    - Toggle descriptions:
      - Self-Improvement: "Evaluate conversations and evolve behavioral rules"
      - Memory System: "Load cross-session memory and preferences"
      - MCP Connector: "Use Notion via Anthropic MCP (requires OAuth token)"
      - Self-Healing: "Automatic retry and circuit breakers for failed services"
    - Footer: "v4.0" version text, subtle

    Toggle component:
    - Use a simple CSS toggle switch (no library needed)
    - ON: cyan-500 background, OFF: gray-600 background
    - Optimistic: toggle immediately, PUT in background
    - If PUT fails: revert toggle, show brief error toast

    Load settings on panel open (fetchSettings).

    **page.tsx:**
    - Import and render `<SettingsPanel />` at the top level of the render tree
    - Place after other fixed overlays but before the main content
    - The gear icon should be visible on both mobile and desktop

    Design principles:
    - Match the existing dark, glass-morphism aesthetic (bg-black, white text, cyan accents)
    - Mobile-first: full-width on mobile, max-w-sm on desktop
    - Smooth 200ms slide animation
    - No scroll needed for 4 toggles — keep it simple

    Avoid:
    - Do NOT use any UI library (shadcn, radix, etc.) — hand-craft with Tailwind
    - Do NOT add a settings panel that looks different from NotionPanel/ChatPanel aesthetic
    - Do NOT add too many settings — start with the 4 feature flags, expand later
  </action>
  <verify>TypeScript compiles with zero new errors</verify>
  <done>AC-3, AC-4, AC-6 satisfied: gear icon opens panel, toggles save settings, build passes</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Settings page with gear icon:
    - user_settings table in Turso (auto-created via drizzle-kit push on deploy)
    - GET/PUT /api/jarvis/settings API
    - Gear icon (top-left, always visible) opens slide-out settings panel
    - 4 feature toggles: Self-Improvement, Memory, MCP, Self-Healing
    - Config overrides: user settings win over env vars
    - Dark glass aesthetic matching existing Jarvis UI
  </what-built>
  <how-to-verify>
    1. Review the settings panel design — does it match the Jarvis aesthetic?
    2. Review toggle descriptions — clear enough?
    3. Review config override logic — correct precedence?
    4. Build passes with zero new TS errors
    5. After deploy: tap gear icon on live site, toggle a setting, verify it persists
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/components/jarvis/JarvisOrb.tsx (orb stays as-is for E-01)
- src/components/jarvis/ChatPanel.tsx (chat redesign is a separate plan)
- src/components/jarvis/NotionPanel.tsx (preserved per roadmap)
- src/components/jarvis/Dashboard/* (dashboard redesign is a separate plan)
- src/lib/jarvis/intelligence/* (backend intelligence is Phase D, complete)

## SCOPE LIMITS
- Only 4 feature flag toggles — no voice settings, no color customization yet
- No user authentication — single user system
- No responsive layout changes to the main page — just adding the gear icon + panel
- Future E-02+ plans will handle: chat-first layout, orb archival, dashboard redesign

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx tsc --noEmit` passes (excluding pre-existing audio-prep errors)
- [ ] user_settings table schema defined
- [ ] API route handles GET and PUT
- [ ] SettingsPanel renders with gear icon trigger
- [ ] config.ts has async override function
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- User can toggle features from the UI without touching env vars
</success_criteria>

<output>
After completion, create `.paul/phases/E-mobile-ui/E-01-SUMMARY.md`
</output>
