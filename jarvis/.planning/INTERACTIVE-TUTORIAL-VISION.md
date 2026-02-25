# Interactive AI Tutorial System — Full Vision

**Created:** 2026-02-24
**Status:** Planned — not started
**Context:** Jarvis tutorial system currently exists as static text (glorified PowerPoint). This doc captures the full vision for transforming it into an AI-guided interactive experience.

---

## The Problem

The current tutorial system (`NotionPanel.tsx` in teach mode) is:
- Static text per step — narration is written but never spoken
- No AI context — Jarvis has no idea the user is in a tutorial
- No interactivity — can't ask "where is that?" or "why do we do this?"
- No verification — no way to confirm the user actually did the action
- No visual guidance — can't point at the relevant UI element

---

## The Full Vision

Jarvis guides you through your Notion Life OS like a real instructor:

1. **Step loads** → Jarvis speaks the narration via ElevenLabs TTS
2. **Laser pointer** appears on screen, gliding to highlight the relevant element (Tasks button, a specific database view, etc.)
3. **User explores** freely — they can ask "where is that?" or "why?" via voice or text
4. **Jarvis answers** with full awareness of the current step and lesson context
5. **User says "done" or taps Next** → Jarvis acknowledges, advances, narrates next step
6. **Future:** Jarvis can verify ("Have you found the Tasks Inbox? I can see it's open — great, let's continue")

---

## Architecture: Three Layers

### Layer 1 — TTS Narration (Quick Win)
Wire ElevenLabs TTS to fire on each step advance in `TeachModeContent` (NotionPanel.tsx).
The `narration` text already exists in every lesson step in `lessonContent.ts`.
Just needs a `speak(step.narration)` call when step index changes.

**Files to touch:**
- `src/components/jarvis/NotionPanel.tsx` — call speak on step advance
- Need access to VoicePipeline or a standalone TTS function from the panel

### Layer 2 — Tutorial Context Injection (Quick Win)
Inject the current lesson + step into Jarvis's system prompt so voice/text questions get contextual answers.

**What to inject:**
```
CURRENT TUTORIAL CONTEXT:
Lesson: "The Task Inbox" (Tasks & Action cluster)
Step 2 of 4: "The Task Inbox"
Narration: "Your task inbox captures everything that needs doing..."
User is currently looking at: Notion Tasks database
```

**Files to touch:**
- `src/lib/jarvis/stores/notionPanelStore.ts` — expose current tutorial step as readable state
- `src/lib/jarvis/intelligence/chatProcessor.ts` — read tutorial state and prepend to system prompt

### Layer 3 — MCP-B Semantic UI Map + Laser Pointer (The Foundation)

#### The Key Insight
If you register your UI elements as MCP-B tools ONCE, every agent (Jarvis, Agent Zero, any
future agent) inherits a structured semantic map of your UI forever. They don't need to
screenshot, scrape DOM, or guess — they call named tools and get back exact coordinates
and can trigger actions.

#### Why MCP-B first
Before building the laser pointer, register the UI's important elements as MCP-B tools.
This gives every agent a structured semantic map — not screenshots, not DOM scraping,
but named tools with known coordinates and actions.

#### How MCP-B works
```js
// Install: npm i @mcp-b/global
import '@mcp-b/global';

navigator.modelContext.registerTool({
  name: 'highlight_tasks_section',
  description: 'Points laser at the Tasks section in the Jarvis dashboard',
  inputSchema: {},
  execute: async () => {
    const el = document.querySelector('[data-tutorial="tasks-section"]');
    const rect = el.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, label: 'Tasks' };
  }
});
```

Once registered on `jarvis.whatamiappreciatingnow.com`, any compliant agent can call
`highlight_tasks_section` and get back exact coordinates to drive the laser pointer.

#### The Laser Pointer Component
```tsx
// LaserPointer.tsx — position: fixed, pointer-events: none, z-index: 9999
// Driven by (x, y) coordinates from MCP-B tool responses or direct agent calls
// CSS: 15px red circle, box-shadow glow, transition: transform 0.15s ease-out
// Pulse animation (@keyframes scale) when it reaches its destination
```

#### What gets registered (Jarvis UI)
| Tool Name | Target Element | Purpose |
|---|---|---|
| `highlight_dashboard_tasks` | Dashboard tasks card | Tutorial step 1 guidance |
| `highlight_dashboard_habits` | Dashboard habits card | Tutorial habits lesson |
| `highlight_orb` | JarvisOrb component | "Tap here to speak" onboarding |
| `highlight_learn_section` | CurriculumCard | "This is where tutorials live" |
| `highlight_notion_panel` | NotionPanel | "This panel opens your Notion" |
| `navigate_to_step` | Tutorial Next button | Agent can advance steps |
| `get_current_tutorial_state` | notionPanelStore | Agent reads current lesson/step |

#### What gets registered (Visualizer — whatamiappreciatingnow.com)
| Tool Name | Target | Purpose |
|---|---|---|
| `highlight_audio_upload` | Audio upload area | Demo onboarding |
| `highlight_preset_selector` | Preset dropdown | Agent demos presets |
| `highlight_render_button` | Render dialog trigger | "Click here to render" |

---

## Agent Zero Integration

Once MCP-B is registered on both apps, Agent Zero can:
- Navigate the Jarvis UI on the user's behalf ("show me how to add a habit")
- Demo the visualizer ("show me what the Mist preset looks like")
- Run tutorials autonomously for onboarding new users
- Verify user actions by querying registered tool state

The key: **you register the map once, all agents inherit it forever.**

---

## Build Order

### Phase A — Make tutorials feel alive (2-3 hours)
1. Wire TTS narration on step advance (NotionPanel.tsx → speak())
2. Inject tutorial context into Jarvis system prompt (chatProcessor.ts)
3. Voice-gated advancement: Jarvis asks "Ready? Say next to continue"

### Phase B — Laser pointer without MCP-B (1-2 hours)
4. Build `LaserPointer.tsx` component (CSS fixed div, pointer-events none)
5. Add `data-tutorial="*"` attributes to key Jarvis UI elements
6. Wire tutorial steps to emit target element name → laser glides to it

### Phase C — MCP-B semantic map (2-3 hours)
7. Install `@mcp-b/global`
8. Create `src/lib/jarvis/mcpTools.ts` — register all UI tools on app init
9. Replace hardcoded laser coordinates with MCP-B tool responses
10. Expose `get_current_tutorial_state` so Agent Zero can read tutorial context

### Phase D — Agent Zero tutorial control (future)
11. Agent Zero can call registered tools to navigate Jarvis UI
12. Full autonomous tutorial run: Agent Zero guides, user follows

---

## Key Files

| File | Role |
|---|---|
| `src/components/jarvis/NotionPanel.tsx` | Tutorial UI — add TTS call on step advance |
| `src/lib/jarvis/stores/notionPanelStore.ts` | Tutorial state — expose for context injection |
| `src/lib/jarvis/intelligence/chatProcessor.ts` | System prompt — inject tutorial context |
| `src/components/jarvis/LaserPointer.tsx` | New component — the visual pointer |
| `src/lib/jarvis/mcpTools.ts` | New file — all MCP-B tool registrations |
| `src/lib/jarvis/curriculum/lessonContent.ts` | Lesson data — narration text already written |

---

## References

- MCP-B docs: https://docs.mcp-b.ai/
- MCP-B concepts: https://docs.mcp-b.ai/concepts/overview
- WebMCP W3C spec: https://webmachinelearning.github.io/webmcp/
- npm package: https://www.npmjs.com/package/@mcp-b/global
- WebMCP-org examples: https://github.com/WebMCP-org/examples
- Install: `npm i @mcp-b/global`
- React hooks package: `@mcp-b/react-webmcp`
- Chrome 146+ has native `navigator.modelContext` support (no polyfill needed)
- Other browsers need the `@mcp-b/global` polyfill

---

## Current Tutorial State (as of 2026-02-24)

- Static text walkthrough only — no TTS, no AI context, no laser
- Tutorial UI bugs FIXED: overlapping chat FAB hidden when panel open, decorative pulsing indicator removed
- Lesson content fully written in `lessonContent.ts` — narration text ready to speak
- `notionPanelStore.ts` holds current lesson/step state — ready to be read for context injection
