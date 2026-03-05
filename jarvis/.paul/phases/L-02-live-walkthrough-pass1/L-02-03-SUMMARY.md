# L-02-03 SUMMARY — Fix All 7 Walkthrough Bugs

**Phase:** L-02 — Live Walkthrough Pass 1
**Plan:** 03
**Status:** APPLIED
**Commit:** 25d8f9a
**Date:** 2026-03-03

---

## What Was Done

### 5 files modified, all 7 bugs addressed:

#### `src/components/jarvis/layout/ChatOverlay.tsx` — Bugs 1, 2, 7

**Bug 1 (CRITICAL):** `h-[70vh]` → `h-[45vh]` on mobile bottom sheet outer wrapper.
Upper 55% of the screen is now unobstructed during guided tour.

**Bug 7 (CRITICAL):** Three-part pointer-events fix:
- Outer wrapper: `pointer-events-none` (bounding box doesn't intercept taps)
- Inner panel: `pointer-events-auto` (chat UI still receives all taps)
- Mobile scrim: conditionally `pointer-events-none` when `spotlight` store state is non-null. This is the key fix — the scrim (z-[54], full screen) was intercepting ALL taps in the app above the chat panel. When a spotlight is active, the scrim steps aside, taps pass through to the spotlighted app element.

**Bug 2 (HIGH):** iOS audio unlock. Added `audioUnlockedRef` + `unlockIOSAudio()` helper. Called at the TOP of `handleSubmit` and `handleQuickAction` (direct user gesture handlers). Plays a silent `new Audio()` to unlock the iOS AudioContext in the gesture's call stack. All subsequent `audio.play()` calls from SpotlightOverlay's TTS narration will now succeed on iOS Safari.

#### `src/app/api/jarvis/chat/route.ts` — Bug 3

**Bug 3 (HIGH):** Added `friendlyErrorMessage(raw)` helper. Detects `overloaded_error` or `529` in the error string and replaces it with:
> "Jarvis is a bit overwhelmed right now — try again in a moment."

Applied in:
1. The `result.success === false` SSE branch (raw Anthropic error → human message)
2. The outer `catch` block (HTTP-level errors)

#### `src/components/jarvis/onboarding/SpotlightOverlay.tsx` — Bug 4

**Bug 4 (HIGH):** Green flash confirmation on spotlight tap.
- `flashSuccess` state added
- Click listener: sets `flashSuccess(true)` → 350ms timeout → `clearSpotlight()` + reset
- `spotlight-success-flash` keyframe: red border → emerald green + scale 1.05 → scale 1.0
- Spotlight ring: when `flashSuccess`, uses green border + success animation instead of pulse

#### `src/lib/jarvis/tutorial/toolExecutor.ts` — Bug 5

**Bug 5 (HIGH):** Stale error message on `start_lesson` content-not-found now reads:
> "Lesson '...' has no step-by-step content. Use get_curriculum_status to see all available lesson IDs, then call start_lesson with a valid ID."

Claude is now routed to the recovery path instead of a dead-end error message.

#### `src/lib/jarvis/intelligence/systemPrompt.ts` — Bug 6

**Bug 6 (MEDIUM):** Added `CURRICULUM ROUTING` section at the end of the ACADEMY block. Clearly distinguishes:
1. **JARVIS ACADEMY** — `list_topics` / `academy_get_topics` / `teach_topic` — for "How to Use Jarvis", guided tour, the Jarvis app itself
2. **NOTION LIFE OS LESSONS** — `get_curriculum_status` / `start_lesson` — for Notion database walkthroughs, "teach me about budgets"

Decision rule: "How to Use Jarvis" or "the app" → system 1. "Notion Life OS" or database name → system 2.

---

## Bugs Fixed vs Need Device Verification

| Bug | Fix Confidence | Needs Device Check |
|-----|---------------|-------------------|
| 1 (chat height) | High — 2-line change | Yes — confirm no overlap |
| 7 (pointer-events) | High — scrim fix is the real unlock | Yes — confirm tapping through works |
| 2 (iOS audio) | High — standard pattern | **Yes — critical** — needs iPhone test |
| 3 (raw error) | High — deterministic string match | Low priority (529 rare) |
| 4 (green flash) | High — self-contained | Yes — should be visible immediately |
| 5 (lesson error) | High — message only | Low priority (lesson routing) |
| 6 (curriculum routing) | Medium — Claude behavior | Yes — try "Teach me about Meet Jarvis" |

---

## Key Decision Made During Implementation

**Bug 7 root cause was the scrim, not just the outer wrapper.**
The plan said to add `pointer-events-none` to the outer wrapper. But the outer wrapper's bounding box is the same as the inner panel (both fill `h-[45vh]`), so pointer-events on the wrapper alone doesn't help. The ACTUAL blocker was the mobile scrim (`fixed inset-0 z-[54]`) covering the full screen, intercepting taps destined for spotlighted app elements at lower z-indexes.

Fix: read `spotlight` from `useTutorialStore` in `ChatOverlay`. When spotlight is active, add `pointer-events-none` to the scrim so taps pass through to the app. The pointer-events fix on the outer wrapper was also kept (defense in depth + plan compliance).

---

## Residual Concerns for L-03

- **Voice commands lesson** still doesn't exist in any curriculum — user could still ask about it, but `get_curriculum_status` graceful fallback now gives Claude a path
- **Dual-render querySelector** — the `findVisibleElement` approach handles this for spotlights, but the broader dual-render (mobile + desktop) still causes performance overhead
- **SpotlightOverlay click listener** uses `capture: true` which fires before React handlers. If a spotlighted button has its own click handler that also fires, both will run. In practice fine, but worth noting.
- **iOS audio unlock** — needs live device verification. The pattern is correct but there's an edge case: if the user sends a message before any audio plays, then the first narration will work. If something fires audio BEFORE the user sends (e.g., an auto-queued message), it won't unlock. Low risk for current flow.
