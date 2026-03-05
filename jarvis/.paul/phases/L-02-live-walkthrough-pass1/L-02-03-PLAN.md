---
phase: L-02-live-walkthrough-pass1
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/jarvis/layout/ChatOverlay.tsx
  - src/app/api/jarvis/chat/route.ts
  - src/components/jarvis/onboarding/SpotlightOverlay.tsx
  - src/lib/jarvis/intelligence/systemPrompt.ts
  - src/lib/jarvis/tutorial/toolExecutor.ts
autonomous: true
---

<objective>
## Goal
Fix all 7 bugs found during the L-02 live iPhone walkthrough. The guided tour is architecturally sound — these are polish/UX issues blocking a usable experience.

## Purpose
The guided tour only works if:
1. The user can see and tap spotlighted elements (Bugs 1, 7)
2. Voice narration actually plays on iOS (Bug 2)
3. Errors show as human language, not raw JSON (Bug 3)
4. Tapping spotlighted elements gives clear confirmation (Bug 4)
5. Lesson tools fail gracefully, not silently (Bug 5)
6. Claude knows which curriculum system to call for which request (Bug 6)

## Output
5 files modified. All 7 bugs fixed. Push to GitHub → auto-deploy → re-walk affected checkpoints.
</objective>

<context>
## Project Context
@jarvis/.paul/PROJECT.md
@jarvis/.paul/STATE.md

## Source Files
@src/components/jarvis/layout/ChatOverlay.tsx
@src/app/api/jarvis/chat/route.ts
@src/components/jarvis/onboarding/SpotlightOverlay.tsx
@src/lib/jarvis/intelligence/systemPrompt.ts
@src/lib/jarvis/tutorial/toolExecutor.ts

## Prior Work
@jarvis/.paul/phases/L-02-live-walkthrough-pass1/L-02-01-SUMMARY.md
</context>

<acceptance_criteria>

## AC-1: Chat sheet height — spotlight targets visible in portrait
```gherkin
Given the user is in a guided tour on iPhone portrait
When Jarvis spotlights a UI element (e.g., Personal domain card)
Then the chat bottom sheet occupies ≤45vh so the upper half of the screen (where spotlights appear) is unobstructed and tappable
```

## AC-2: Pointer-events passthrough — tapping behind chat works
```gherkin
Given the chat overlay is open in mobile view
When the user taps on a spotlighted element that is ABOVE the chat panel (in the upper portion of the screen)
Then the tap reaches the underlying app element; the chat panel itself still captures taps on its own area
```

## AC-3: iOS audio — voice narration plays after first send
```gherkin
Given the user is on iOS Safari and the chat overlay is open
When the user taps the Send button (first time) to send a message
Then the iOS AudioContext is unlocked; subsequent TTS narration calls via audio.play() succeed and are audible
```

## AC-4: Error sanitization — no raw JSON shown to user
```gherkin
Given Anthropic API returns a 529 overloaded_error
When the SSE stream propagates that error to the chat UI
Then the user sees "Jarvis is a bit overwhelmed right now — try again in a moment." instead of raw JSON
```

## AC-5: Spotlight touch confirmation — green flash on tap
```gherkin
Given a spotlight ring is active on a UI element
When the user taps the spotlighted element
Then the spotlight ring briefly flashes green (border turns green, slight scale-up) for ~350ms before clearing
And the lesson flow continues naturally
```

## AC-6: Lesson tool graceful degradation — no silent failure
```gherkin
Given the user asks Claude to teach a topic that doesn't exist in the Notion Life OS lesson registry
When Claude calls start_lesson with an invalid/unavailable lesson ID
Then the error response clearly tells Claude to use get_curriculum_status to find available lessons
And Claude relays a coherent message to the user (not silent failure or hand-wavy explanation)
```

## AC-7: Curriculum clarity — Claude routes correctly between two systems
```gherkin
Given the system prompt is loaded
When the user asks "Teach me about Meet Jarvis in How to Use Jarvis"
Then Claude uses academy_get_topics / list_topics (the Jarvis Academy project curriculum), NOT get_curriculum_status (the Notion Life OS curriculum)
And when the user asks "Teach me about Tasks in Notion", Claude uses get_curriculum_status + start_lesson
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Fix ChatOverlay.tsx — height, pointer-events, and iOS audio unlock</name>
  <files>src/components/jarvis/layout/ChatOverlay.tsx</files>
  <action>
Three surgical changes to the mobile bottom sheet. Read the file first to confirm exact line numbers.

**Change A — Bug 1: h-[70vh] → h-[45vh]**
Find the outer mobile sheet wrapper div (the one with `h-[70vh] md:hidden`). Change `h-[70vh]` to `h-[45vh]`. This leaves the upper 55% of the screen visible for spotlight targets.

**Change B — Bug 7: pointer-events passthrough**
The outer mobile sheet wrapper div is `fixed inset-x-0 bottom-0 z-[55] h-[45vh] md:hidden`. It captures ALL pointer events in its bounding box, including the area above the chat panel that belongs to the app.

Add `pointer-events-none` to this outer wrapper div.
Then add `pointer-events-auto` to the INNER div (the immediate child — the one with `bg-zinc-900/95 backdrop-blur-xl ...`).

This way:
- Taps in the transparent space ABOVE the chat panel pass through to the app (outer = pointer-events-none)
- Taps ON the chat panel card itself still work (inner = pointer-events-auto)
- The drag-to-dismiss touch handlers on the drag handle inside the inner div still work

**Change C — Bug 2: iOS audio unlock on first send gesture**

Add `audioUnlockedRef` at the top of the component alongside existing refs:
```ts
const audioUnlockedRef = useRef(false);
```

Add a small unlock helper to call inside direct gesture handlers:
```ts
const unlockIOSAudio = () => {
  if (audioUnlockedRef.current) return;
  const unlock = new Audio();
  unlock.play().catch(() => {});
  audioUnlockedRef.current = true;
};
```

Call `unlockIOSAudio()` at the TOP of both:
- `handleSubmit` (the form onSubmit handler) — before calling sendMessage
- `handleQuickAction` — before calling sendMessage

This unlocks the iOS AudioContext in the gesture's call stack. All subsequent `audio.play()` calls in SpotlightOverlay's narration effect will succeed.

**Do NOT** put the unlock inside `sendMessage` itself (it may be called from a setTimeout/effect that is NOT a user gesture).

Avoid touching: the SSE logic, the desktop panel, or the tutorial header.
  </action>
  <verify>
- `h-[45vh]` present, `h-[70vh]` absent in the file
- Outer mobile sheet wrapper has `pointer-events-none`
- Inner bg-zinc-900 panel has `pointer-events-auto`
- `audioUnlockedRef` ref declared
- `unlockIOSAudio()` called in handleSubmit and handleQuickAction before sendMessage
- `npm run build` passes (no TypeScript errors)
  </verify>
  <done>AC-1, AC-2, AC-3 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Friendly error message in chat route + green flash in SpotlightOverlay</name>
  <files>src/app/api/jarvis/chat/route.ts, src/components/jarvis/onboarding/SpotlightOverlay.tsx</files>
  <action>

**A — Bug 3: Sanitize error text in chat route (route.ts)**

The problem: when `processChatMessage` returns `{ success: false, error: "529 {\"type\":\"error\",...}" }`, route.ts sends it verbatim as `{ type: 'text', text: errorText }` — so raw Anthropic JSON appears as a chat message.

At the top of route.ts, add a helper function (after the imports, before the route handler):
```ts
function friendlyErrorMessage(raw: string): string {
  if (raw.includes('overloaded_error') || raw.includes('529')) {
    return "Jarvis is a bit overwhelmed right now — try again in a moment.";
  }
  return raw;
}
```

In the SSE stream's `if (result.success) { ... } else { ... }` block, wrap the error text:
```ts
const errorText = result.error
  ? friendlyErrorMessage(result.error)
  : result.responseText || 'Something went wrong.';
```

Also apply the same sanitization in the outer catch block (line ~122), where `errorMessage` is sent as `{ type: 'error', error: errorMessage }` — wrap it: `friendlyErrorMessage(errorMessage)`.

**B — Bug 4: Green flash animation on spotlight tap (SpotlightOverlay.tsx)**

Add a `flashSuccess` state:
```ts
const [flashSuccess, setFlashSuccess] = useState(false);
```

Modify the click listener effect (currently just calls `clearSpotlight()` immediately):
```ts
const onClick = (e: MouseEvent) => {
  const target = e.target as Element | null;
  if (target?.closest(`[data-tutorial-id="${spotlight.elementId}"]`)) {
    setFlashSuccess(true);
    setTimeout(() => {
      clearSpotlight();
      setFlashSuccess(false);
    }, 350);
  }
};
```

Add `@keyframes spotlight-success-flash` to the existing `<style>` block:
```css
@keyframes spotlight-success-flash {
  0%   { transform: scale(1); border-color: rgba(255,78,78,0.95); }
  40%  { transform: scale(1.05); border-color: rgba(52,211,153,0.95); }
  100% { transform: scale(1); border-color: rgba(52,211,153,0.95); }
}
```

When `flashSuccess` is true, the spotlight ring div should:
- Use `border-color: rgba(52,211,153,0.95)` (emerald green)
- Use `animation: spotlight-success-flash 350ms ease-out forwards`
- Replace the existing pulse/ring animation

Use `flashSuccess` as a condition in the spotlight ring's `style` prop — when true, override border color and animation.

Avoid touching: the laser dot, laser line, or narration mute button.
  </action>
  <verify>
- `friendlyErrorMessage` function exists in route.ts
- Applied to both the success=false branch AND the outer catch
- `flashSuccess` state declared in SpotlightOverlay
- Click listener uses setTimeout + clearSpotlight after 350ms
- `spotlight-success-flash` keyframe defined
- When flashSuccess, spotlight ring renders with green border
- `npm run build` passes
  </verify>
  <done>AC-4, AC-5 satisfied</done>
</task>

<task type="auto">
  <name>Task 3: Clarify curriculum systems in systemPrompt + fix lesson error message</name>
  <files>src/lib/jarvis/intelligence/systemPrompt.ts, src/lib/jarvis/tutorial/toolExecutor.ts</files>
  <action>

**A — Bug 6: Curriculum system clarity in systemPrompt.ts**

Root cause: Claude sees two curriculum systems and confuses them:
1. **Notion Life OS curriculum** — `get_curriculum_status` → shows tasks/habits/bills lessons. `start_lesson` → plays step-by-step Notion tutorial.
2. **Jarvis Academy curriculum** — `academy_get_topics`/`list_topics` → shows "How to Use Jarvis" and Visopscreen topics. These are the topics in `projects.ts`.

When the user says "Teach me about Meet Jarvis in How to Use Jarvis", Claude should call `academy_get_topics` (system 2), not `get_curriculum_status` (system 1). But the system prompt didn't explain this.

In `systemPrompt.ts`, inside the `if (context.academyConfigured)` block where the `ACADEMY` section is built, append a `CURRICULUM ROUTING` subsection AFTER the existing `SAME-ORIGIN TEACHING` block. Add it as a new line in the big template string before the closing backtick:

```
CURRICULUM ROUTING — Two distinct systems, do not confuse them:

1. JARVIS ACADEMY ("How to Use Jarvis" + code projects):
   - Lists topics: use list_topics or academy_get_topics
   - Teaches a topic: use teach_topic with topic_id from the project curriculum
   - Curriculum lives in projects.ts — topic IDs like "meet-jarvis", "tasks-basics", "morning-briefing"
   - Spotlights work here (same-origin)
   - User phrases: "teach me about X in How to Use Jarvis", "start the Jarvis tutorial", "guided tour"

2. NOTION LIFE OS LESSONS (step-by-step database setup):
   - Lists lessons: use get_curriculum_status
   - Starts a lesson: use start_lesson with lesson_id from LESSON_REGISTRY
   - Lesson IDs: "tasks-overview", "habits-intro", "budgets-intro", etc.
   - These are Notion database walkthroughs, NOT Jarvis app UI teaching
   - User phrases: "teach me about budgets in Notion", "help me set up my habit tracker"

When in doubt: if the user says "How to Use Jarvis" → system 1. If the user says "my Notion Life OS" or a database name → system 2.
```

Place this text at the END of the ACADEMY section (inside the `sections.push(...)` call), just before the closing backtick of that string — after the CROSS-PROJECT AWARENESS paragraph.

**B — Bug 5: Fix stale error message in toolExecutor.ts**

In `src/lib/jarvis/tutorial/toolExecutor.ts`, the `start_lesson` case has this stale error message:
```ts
error: `Content for "${lessonId}" not yet available. Only Daily Action lessons are available so far.`,
```

This message is wrong — all 24 lessons now have content. Replace it with a message that helps Claude recover:
```ts
error: `Lesson "${lessonId}" has no step-by-step content. Use get_curriculum_status to see all available lesson IDs, then call start_lesson with a valid ID.`,
```

This message routes Claude to use the correct tool to recover rather than falling back to hand-explaining.
  </action>
  <verify>
- "CURRICULUM ROUTING" section present in the academyConfigured section of systemPrompt.ts
- Both curriculum systems listed with their tools and user phrases
- Stale error message in toolExecutor.ts case 'start_lesson' → content not found is updated
- New error message mentions get_curriculum_status as the recovery path
- `npm run build` passes (no TypeScript errors)
  </verify>
  <done>AC-6, AC-7 satisfied</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- The desktop chat panel (md:flex section in ChatOverlay.tsx) — only fix the mobile bottom sheet
- The SSE streaming logic in ChatOverlay.tsx (sendMessage function body)
- The laser dot, laser line rendering in SpotlightOverlay.tsx
- Any Notion tool executors, memory tools, or calendar tools
- The lessonRegistry.ts or lessonContent.ts arrays themselves (they are correct — all 24 lessons match)
- The ACADEMY teaching craft instructions in systemPrompt.ts — only ADD the routing section, don't edit existing text
- Any database migrations or environment variables

## SCOPE LIMITS
- Do not add new dependencies or npm packages
- Do not change the TTS route or ElevenLabs integration — the server-side is working correctly
- Do not fix the "voice commands" lesson that doesn't exist — it's out of scope for onboarding
- Do not attempt to fix the dual-render issue beyond the pointer-events fix already planned
- The UNIFY for L-02-02 is intentionally deferred — do not run it yet

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `h-[45vh]` in ChatOverlay.tsx (grep check)
- [ ] `pointer-events-none` on outer mobile wrapper, `pointer-events-auto` on inner panel (grep check)
- [ ] `audioUnlockedRef` present, `unlockIOSAudio()` called in handleSubmit and handleQuickAction
- [ ] `friendlyErrorMessage` helper in route.ts, applied in both error branches
- [ ] `flashSuccess` state + 350ms timeout in SpotlightOverlay click listener
- [ ] `spotlight-success-flash` keyframe defined
- [ ] "CURRICULUM ROUTING" text in systemPrompt.ts (grep check)
- [ ] Updated error message in toolExecutor.ts start_lesson content-not-found branch (grep check)
- [ ] All 5 files committed in ONE atomic commit with message starting "fix(onboarding):"
</verification>

<success_criteria>
- All 7 bugs addressed with surgical changes
- Zero regressions introduced (build passes, no new TypeScript errors)
- Single atomic commit pushed to GitHub
- After auto-deploy: re-walk checkpoints 1, 2, 4, 5 to verify fixes
</success_criteria>

<output>
After completion, create `jarvis/.paul/phases/L-02-live-walkthrough-pass1/L-02-03-SUMMARY.md` with:
- What was changed (file by file, bug by bug)
- Commit hash
- Which bugs are confirmed fixed vs need re-verification on device
- Any residual concerns for L-03
</output>
