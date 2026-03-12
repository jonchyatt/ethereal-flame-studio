# PAUL Handoff

**Date:** 2026-03-03
**Status:** L-02-03 applied and deployed — awaiting device verification then UNIFY

---

## READ THIS FIRST

**Project:** Jarvis — Self-Improving Life Manager
**Core value:** One system that knows everything, surfaces what matters, keeps Jonathan on track, and gets smarter over time.
**Production:** https://jarvis.whatamiappreciatingnow.com/

---

## Current State

**Version:** v4.4 — Guided Onboarding (Academy-Driven)
**Phase:** L-02 of 4 — Live Walkthrough Pass 1
**Plan:** L-02-03 — APPLIED (commit 25d8f9a, deployed to production)

**Loop Position:**
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     ← needs device check, then UNIFY
```

---

## What Was Done This Session

All 7 bugs from the L-02 live iPhone walkthrough were fixed and deployed in a single atomic commit (`25d8f9a`):

1. **Bug 1 (CRITICAL):** `h-[70vh]` → `h-[45vh]` on mobile chat sheet. Spotlight targets in the upper half of the screen are now visible.
2. **Bug 7 (CRITICAL):** Three-layer pointer-events fix:
   - Scrim gets `pointer-events-none` when `spotlight` store is non-null (this was the real blocker — the z-54 scrim was eating all taps to the app)
   - Outer wrapper: `pointer-events-none`
   - Inner panel: `pointer-events-auto`
3. **Bug 2 (HIGH):** iOS audio unlock. `unlockIOSAudio()` called synchronously in `handleSubmit` and `handleQuickAction` (direct gesture handlers). TTS narration should now play on iPhone after the first send.
4. **Bug 3 (HIGH):** `friendlyErrorMessage()` helper in `chat/route.ts`. Catches `overloaded_error` / `529` in both error branches. User sees human text, not raw Anthropic JSON.
5. **Bug 4 (HIGH):** Green flash on spotlight tap. 350ms: red → emerald + scale 1.05 → `clearSpotlight()`. Closes the visual feedback loop.
6. **Bug 5 (HIGH):** `start_lesson` content-not-found error now tells Claude to use `get_curriculum_status` as recovery path.
7. **Bug 6 (MEDIUM):** `CURRICULUM ROUTING` section added to `systemPrompt.ts`. Claude now has a clear decision tree between Jarvis Academy (teach_topic) and Notion Life OS Lessons (start_lesson).

---

## What's Next

**Immediate (device check):** Open https://jarvis.whatamiappreciatingnow.com/ on iPhone and re-walk these checkpoints:
- Checkpoint 1: Ask Jarvis "Show me the Personal card" → spotlight should be visible and tappable
- Checkpoint 2: Tap a spotlighted element → tap should reach the app, green flash should show
- Checkpoint 4: Say "Teach me about Meet Jarvis in How to Use Jarvis" → Claude should use academy tools, not get_curriculum_status
- Checkpoint 5 (iOS-specific): Send a message → voice narration should play

**After device check:** Run `/paul:unify` to close the L-02-03 loop.

**After UNIFY:** L-02 phase is complete. L-03 begins — Pass 2 walkthrough to catch any remaining issues after Bug fixes.

---

## Key Files

| File | Purpose |
|------|---------|
| `jarvis/.paul/STATE.md` | Live project state |
| `jarvis/.paul/phases/L-02-live-walkthrough-pass1/L-02-03-PLAN.md` | The plan that was applied |
| `jarvis/.paul/phases/L-02-live-walkthrough-pass1/L-02-03-SUMMARY.md` | Full summary of what was changed + residual concerns |
| `src/components/jarvis/layout/ChatOverlay.tsx` | h-[45vh], pointer-events, iOS audio unlock |
| `src/app/api/jarvis/chat/route.ts` | friendlyErrorMessage helper |
| `src/components/jarvis/onboarding/SpotlightOverlay.tsx` | Green flash animation |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | CURRICULUM ROUTING section |
| `src/lib/jarvis/tutorial/toolExecutor.ts` | start_lesson graceful error |

---

## Context for Fresh Claude

- PAUL lives at `jarvis/.paul/` (not `.paul/` at repo root)
- Repo is `ethereal-flame-studio` — Jarvis is a sub-project at `jarvis/`
- No local test environments — test from live site only
- Deploy = `git push` → GitHub → auto-deploy to production (~30s)
- iOS audio Bug 2 is the highest-uncertainty fix — it uses the correct pattern but needs live iPhone verification
- The scrim pointer-events fix (Bug 7) is the architectural insight of this session — the bug was in the full-screen scrim, not the chat overlay itself

---

## Resume Instructions

1. Read `jarvis/.paul/STATE.md` — confirms loop position (PLAN ✓ APPLY ✓ UNIFY ○)
2. Do device verification on iPhone (checkpoints above)
3. Run `/paul:unify jarvis/.paul/phases/L-02-live-walkthrough-pass1/L-02-03-PLAN.md`

---

*Handoff created: 2026-03-03 — post L-02-03 apply*
