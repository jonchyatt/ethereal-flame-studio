# PAUL Handoff — L-02 UI Redesigns Queued

**Date:** 2026-03-03 evening
**Status:** Research complete, implementation NOT started — context reset interrupted

---

## What Was Just Fixed (commit f933e87)
1. Mute button moved below header (no longer blocks Settings)
2. SpotlightOverlay now uses postJarvisAPI for TTS auth (was getting silent 401)
3. System prompt tells Claude it HAS a voice
4. Chat TTS wired for completed assistant messages
5. Calendar: week strip + empty state added
6. Tutorial: "Continue →" tap chip when Claude asks for "continue tutorial"

## IMPORTANT: ElevenLabs Is Fully Configured
- ELEVENLABS_API_KEY: in Vercel (added 11h ago)
- ELEVENLABS_VOICE_ID: `MIepW0jee0xBaRFcpwSk` (Jonathan's own cloned voice, confirmed in Vercel screenshot)
- DO NOT ask Jonathan to add these again

---

## Two Major Redesigns Queued (Jonathan asked for these)

### 1. Tutorial Coaching Strip — replace full-height chat during spotlight steps

**Problem:** When spotlight is active, chat covers 45vh and obscures the spotlighted element. 
Current bandaid: auto-close chat after 2.5s. This causes the open/close/open/close UX that Jonathan complained about.

**Solution:** During active tutorial step with spotlight, replace the full chat overlay with a compact "coaching strip" — small panel at bottom (~100-120px) showing:
- Just the current step instruction (no full chat history)
- "Continue →" or action chips
- Tap to expand for full chat if needed

**Key files:**
- `src/components/jarvis/layout/ChatOverlay.tsx` — add TutorialCoachingStrip component
- `src/lib/jarvis/hooks/useTutorialEngine.ts` — remove/reduce 2.5s auto-close timer
- `src/lib/jarvis/stores/shellStore.ts` — may need to expose isSpotlightActive

**Architecture:** When `engine.isActive && spotlight !== null && !isChatStep`:
- Render TutorialCoachingStrip (small) instead of full ChatOverlay
- Strip shows last instruction message + Continue chip
- Spotlight target is fully visible above it

### 2. Calendar — Full Month Grid View (not just a week strip)

**Problem:** Single week strip is inadequate. Jonathan wants real calendar with multiple weeks, especially on desktop where a full month grid makes sense.

**Data shape:**
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;  // ISO string OR "10:00 AM" pre-formatted
  endTime: string;
  isToday: boolean;
  allDay?: boolean;
  location?: string;
  source?: 'notion' | 'google';
}
```

**Key finding:** Upcoming events DO have ISO startTime strings — can parse day of week/date from them. The `formatDate()` function already attempts this. Events CAN be mapped to calendar days.

**Solution:**
- Month grid: 7 columns, 4-6 rows, each day is a cell
- Today highlighted with accent color
- Events shown as colored dots or short truncated text in day cells
- Navigation: prev/next month arrows + "Today" button
- Mobile: compact month grid (dots only, tap to expand)
- Desktop: full month grid with event text in cells
- Show 2 months or month + week list as toggle

**Key files:**
- `src/components/jarvis/personal/CalendarView.tsx` — full rewrite
- No API changes needed; data already available

---

## Next Session Instructions
1. Run /paul:resume to restore context
2. Implement TutorialCoachingStrip in ChatOverlay.tsx
3. Implement full month grid CalendarView.tsx
4. Build check + commit + push
