# PAUL Handoff

**Date:** 2026-03-03
**Status:** L-02-02 live walkthrough COMPLETE — 7 bugs found, none fixed yet, ready for L-02-03 fix pass

---

## READ THIS FIRST

**Project:** Jarvis v4.4 — Guided Onboarding (Academy-Driven)
**Phase:** L-02 of 4 — Live Walkthrough Pass 1
**Plan:** L-02-02 walkthrough done. Next: L-02-03 — fix all bugs found.

**Loop Position:**
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [L-02-02 code applied + walkthrough done, unify pending after L-02-03 fixes]
```

---

## What Was Done This Session

- Built ElevenLabs TTS + narration (7 files, commit 05ba124) — deployed
- Jonathan walked the full L-02 live walkthrough on iPhone
- 7 bugs found and documented below

---

## Bugs Found — Ordered by Severity

### BUG 1 — CRITICAL: Chat sheet covers spotlight targets (portrait mode)
**What:** The mobile chat bottom sheet is `h-[70vh]`. In portrait, this covers 70% of the screen including the Personal dashboard cards. When Claude says "tap the Personal card," the card is BEHIND the chat sheet — invisible and unreachable without closing chat first.
**File:** `src/components/jarvis/layout/ChatOverlay.tsx` line ~293
**Fix:** Change `h-[70vh]` to `h-[45vh]` on the mobile bottom sheet. 45vh shows enough messages (3-4) while leaving the top half of the screen visible for spotlights.

### BUG 2 — CRITICAL: No voice on iOS (autoplay blocked)
**What:** iOS Safari requires a direct user gesture in the same call stack to allow audio playback. The TTS fetch+play fires asynchronously from a Claude tool_use SSE event — no user gesture in that frame. `audio.play()` silently fails every time.
**File:** `src/components/jarvis/onboarding/SpotlightOverlay.tsx` (narration effect) + `src/components/jarvis/layout/ChatOverlay.tsx` (send button)
**Fix:** On the FIRST time the user taps the send button (direct user gesture), call `new Audio().play()` with a silent blob OR create and immediately resume an `AudioContext`. This "unlocks" iOS audio for the session. Store `audioUnlocked` in a module-level ref. After unlock, all subsequent `audio.play()` calls will work even without a gesture.
**Pattern:**
```ts
// In ChatOverlay, in the send handler (direct gesture path):
if (!audioUnlockedRef.current) {
  const unlock = new Audio();
  unlock.play().catch(() => {});
  audioUnlockedRef.current = true;
}
```

### BUG 3 — HIGH: Raw `529 overloaded_error` JSON shown to user
**What:** When Anthropic API is overloaded (HTTP 529), the raw JSON error leaks into the chat as a user-visible message: `529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"},"request_i...`
**Screenshot:** IMG_6806, IMG_6807, IMG_6809 — happened 3 times
**File:** `src/app/api/jarvis/chat/route.ts` — the SSE error event is sending raw Anthropic error JSON
**Fix:** In the chat route's error handler, check for `overloaded_error` and return a human message: `"Jarvis is a bit overwhelmed right now — try again in a moment."` In ChatOverlay, also sanitize any `event.type === 'error'` content before displaying.

### BUG 4 — HIGH: No touch confirmation feedback on spotlight
**What:** When the user taps a spotlighted element (red laser + ring), nothing confirms they hit the right thing. They had to type "Did" to tell Jarvis they completed the action. The feedback loop is broken — feels like dead air.
**File:** `src/components/jarvis/onboarding/SpotlightOverlay.tsx`
**Fix:** When the spotlighted element is clicked (in the existing click listener that calls `clearSpotlight()`), show a brief success animation BEFORE clearing: flash the spotlight border green + expand briefly (scale 1.0 → 1.05 → 1.0 in ~300ms). This closes the loop visually without any Claude message needed.

### BUG 5 — HIGH: Lesson system tools failing / timing out
**What:** Claude says "The lesson system isn't quite responding" and falls back to explaining by hand. This happened when user asked about voice commands module and when starting Academy lessons. The `start_lesson` and `get_curriculum_status` tools appear to fail silently.
**Screenshot:** IMG_6812
**Root cause unknown** — need to check Vercel function logs. Likely: lesson content for "voice commands" doesn't exist in lessonContent.ts (no content = error), OR the Notion URL lookups in `findNotionDatabase` throw when key not found.
**Fix:** Read `src/lib/jarvis/curriculum/lessonContent.ts` and `src/lib/jarvis/curriculum/lessonRegistry.ts` — confirm which lesson IDs have content vs don't. Add graceful "lesson not yet available" message instead of silent failure.

### BUG 6 — MEDIUM: Three curriculum systems causing Claude confusion
**What:** Three separate tutorial systems exist and Claude (+ user) gets confused:
1. `tutorialLessons.ts` — step-by-step lessons (tasks-basics, habits-basics, bills-basics, morning-briefing)
2. `lessonRegistry.ts` — Notion Life OS Academy topics (40 topics, 6 clusters)
3. `projects.ts` — Jarvis project curriculum topics (shown on Academy page as "How to Use Jarvis")

When user said "Teach me about Meet Jarvis in How to Use Jarvis" (a valid topic from system 3), Claude said "I don't see a 'Meet Jarvis' lesson" — because it's looking in system 2.
**Screenshot:** IMG_6810, IMG_6811
**Fix:** This is a systemPrompt issue. Claude needs to know the "How to Use Jarvis" project has topics accessible via `get_curriculum_status` but that those topics are DIFFERENT from the Notion Life OS lessons. Probably just needs clearer documentation in systemPrompt.ts about which tool surfaces which curriculum.

### BUG 7 — MEDIUM: Chat open = can't see or tap the app behind it
**What:** Related to Bug 1 but distinct: the ENTIRE guided tour happens with chat open. The spotlight points at something through the chat overlay. This is architecturally broken — you can't click a spotlighted element when the chat is covering it with pointer-events intercepting taps.
**File:** `src/components/jarvis/layout/ChatOverlay.tsx`
**Fix:** The chat bottom sheet needs `pointer-events-none` on the scrim/backdrop area above the chat panel itself, so taps on the upper portion of the screen (where spotlights are) pass through to the app. Currently the entire overlay area intercepts all taps. Only the actual chat panel (the white/dark card) should capture pointer events.

---

## What's Next

**Plan L-02-03:** Fix all 7 bugs. Priority order:
1. Bug 1 (chat height) — 2 lines, instant win
2. Bug 7 (pointer-events passthrough) — 1 line, instant win
3. Bug 3 (raw error display) — fix chat route + ChatOverlay
4. Bug 2 (iOS audio unlock) — add gesture unlock in send handler
5. Bug 4 (touch confirmation) — add success flash animation in SpotlightOverlay
6. Bug 5 (lesson tools) — audit lessonContent.ts for missing content
7. Bug 6 (curriculum confusion) — systemPrompt clarification

After L-02-03 fixes deploy → re-walk checkpoints 1, 2, 4, 5 to verify.

---

## Key Files for L-02-03

| File | Bug |
|------|-----|
| `src/components/jarvis/layout/ChatOverlay.tsx` | Bug 1 (height), Bug 2 (audio unlock), Bug 7 (pointer-events) |
| `src/app/api/jarvis/chat/route.ts` | Bug 3 (raw error) |
| `src/components/jarvis/onboarding/SpotlightOverlay.tsx` | Bug 4 (touch confirmation) |
| `src/lib/jarvis/curriculum/lessonContent.ts` | Bug 5 (missing lesson content) |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | Bug 6 (curriculum confusion) |

---

## Key Context

- ElevenLabs route is deployed and working server-side — the voice issue is 100% iOS autoplay, not the API
- The speaker mute button IS appearing (top-right corner, seen in screenshots) — that part works
- `h-[70vh]` is the single biggest UX problem — fix this first
- Overloaded errors happened 3x in one session — Anthropic Claude is legitimately overloaded, but we must not show raw JSON
- The app itself (Personal dashboard, data) looks excellent — real data showing, layout clean

---

*Handoff created: 2026-03-03 — L-02 walkthrough bugs*
