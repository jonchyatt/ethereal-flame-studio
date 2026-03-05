# L-02-05-02 Summary — Chat/TTS Bug Fixes

**Status:** COMPLETE
**Commit:** ef76479
**Date:** 2026-03-05

## What Was Done

### Task 1: Close chat on spotlight + fix scroll-to-bottom

**ChatOverlay.tsx:**
- Added `useEffect` that calls `closeChat()` whenever `spotlight` becomes non-null — prevents overlapping UIs during tutorial
- Replaced 50ms timeout scroll-to-bottom with `requestAnimationFrame` for reliable DOM paint timing
- Added `isChatOpen` to auto-scroll deps so existing messages scroll when chat re-opens

### Task 2: Shared TTS audio manager

**SpotlightOverlay.tsx:**
- Exported `activeTTSAudio` (module-level singleton) and `stopActiveTTS()` function
- Narration useEffect now uses `activeTTSAudio.current` instead of `audioRef` (removed local `audioRef`)
- Removed `isNarrationEnabled` from narration effect deps — toggling mute/unmute no longer restarts narration (runtime check still gated by `!isNarrationEnabled`)
- Cleanup function calls `stopActiveTTS()` instead of manually managing `audioRef`

**ChatOverlay.tsx:**
- Imports `stopActiveTTS` and `activeTTSAudio` from SpotlightOverlay
- Calls `stopActiveTTS()` before new chat TTS starts — cancels any active spotlight narration
- Registers new chat audio with `activeTTSAudio.current` so spotlight can cancel it in return

## Acceptance Criteria Met
- [x] AC-1: Chat closes when spotlight fires
- [x] AC-2: Chat scrolled to bottom on open (rAF, isChatOpen dep)
- [x] AC-3: No double TTS — shared singleton, no restart-on-toggle

## Build
`npm run build` passes with zero errors.
