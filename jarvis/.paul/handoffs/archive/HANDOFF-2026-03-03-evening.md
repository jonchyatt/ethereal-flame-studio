# PAUL Handoff

**Date:** 2026-03-03 evening
**Status:** Mid-session — L-02 second pass bug fixes applied, two major redesigns queued

---

## READ THIS FIRST

**Project:** Jarvis — Self-Improving Life Manager
**Core value:** One system that knows everything, surfaces what matters, keeps Jonathan on track.
**Production:** https://jarvis.whatamiappreciatingnow.com/

---

## Current State

**Version:** v4.4 — Guided Onboarding (Academy-Driven)
**Phase:** L-02 of 4 — Live Walkthrough Pass 1
**Plan:** L-02-03 APPLIED — additional bugs from second device walk fixed

**Loop Position:**
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     ← Jonathan is currently device-testing, UNIFY after
```

---

## What Was Done This Session

Second device walkthrough revealed new bugs. All fixed in commit `f933e87`:

1. **Mute button blocked Settings** — moved from `top-4` to `top-16` (below header)
2. **No voice / Jarvis said "I don't have a voice"** — three-part fix:
   - SpotlightOverlay was calling `/api/jarvis/tts` without auth headers → silent 401 every time. Fixed to use `postJarvisAPI`.
   - System prompt now tells Claude it HAS a voice (was hallucinating text-only)
   - ChatOverlay now triggers TTS on completed assistant messages
3. **Calendar was a blank black page** — added 7-day week strip + empty state
4. **"Continue tutorial" required typing** — added "Continue →" tap chip that auto-appears

## CRITICAL: ElevenLabs Voice
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` are in Vercel — added 11 hours ago
- Voice ID = `MIepW0jee0xBaRFcpwSk` — Jonathan's OWN cloned voice
- **DO NOT ask Jonathan to add these again. They are configured.**

---

## Two Redesigns Queued (Jonathan explicitly requested, NOT started)

### Redesign A: Tutorial Coaching Strip
**Problem:** When spotlight is active, chat covers 45vh and obscures the element being spotlighted. Current 2.5s auto-close is a bandaid causing open/close/open/close UX.

**Solution:** When `engine.isActive && spotlight !== null && !isChatStep`:
- Show compact coaching strip (~100px) instead of full chat overlay
- Strip shows: current step instruction + "Continue →" chip
- Full spotlight target always visible above it
- No more auto-close juggling

**Files to change:**
- `src/components/jarvis/layout/ChatOverlay.tsx` — add TutorialCoachingStrip component, conditionally render instead of full overlay when spotlight active + tutorial active
- `src/lib/jarvis/hooks/useTutorialEngine.ts` — remove or reduce the 2.5s auto-close timer (not needed once strip is in place)

### Redesign B: Full Calendar Month Grid
**Problem:** Single week strip is inadequate. Jonathan wants a real calendar.

**Data shape available:**
```typescript
interface CalendarEvent {
  id, title, startTime (ISO or "10:00 AM"), endTime, isToday, allDay?, location?, source?
}
```
Upcoming events have ISO startTime — can parse day/date from them.

**Solution:**
- Month grid: 7 columns × 4-6 rows, each day a cell
- Today highlighted violet
- Events shown as colored pills/dots in day cells
- Mobile: compact grid with dots, tap cell for event list
- Desktop: full grid with event text in cells
- Prev/next month navigation + "Today" button
- File: `src/components/jarvis/personal/CalendarView.tsx` — full rewrite

---

## What's Next

**Immediate:** Jonathan finishes device testing f933e87 and reports results
**After testing:** UNIFY L-02-03 if voice/spotlight verified working
**Then:** Implement Redesign A (coaching strip) + Redesign B (month calendar) — both are L-02-04

---

## Key Files

| File | Purpose |
|------|---------|
| `jarvis/.paul/STATE.md` | Live project state |
| `src/components/jarvis/layout/ChatOverlay.tsx` | Chat overlay + coaching strip target |
| `src/components/jarvis/onboarding/SpotlightOverlay.tsx` | Spotlight + mute toggle |
| `src/components/jarvis/personal/CalendarView.tsx` | Calendar — needs month grid rewrite |
| `src/lib/jarvis/hooks/useTutorialEngine.ts` | Tutorial engine — 2.5s timer to remove |

---

## Resume Instructions

1. Read `jarvis/.paul/STATE.md`
2. Ask Jonathan what the device test found
3. If voice + spotlight working → `/paul:unify` L-02-03
4. Then implement the two redesigns (coaching strip + month calendar)

---

*Handoff created: 2026-03-03 evening — context limit pause*
