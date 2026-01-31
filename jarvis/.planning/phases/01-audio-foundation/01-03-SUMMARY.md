---
phase: 01-audio-foundation
plan: 03
subsystem: audio
tags: [web-audio-api, microphone, push-to-talk, permission-ux, rms-amplitude]

# Dependency graph
requires:
  - phase: 01-01
    provides: Jarvis store with audioLevel and isCapturing state
provides:
  - MicrophoneCapture class with RMS amplitude analysis
  - VoiceActivityDetector for amplitude-based VAD
  - PermissionPrompt component with explanatory UI
  - PushToTalk button with multi-input support
  - Integrated permission flow in Jarvis page
affects: [02-speech-to-text, voice-pipeline, mobile-experience]

# Tech tracking
tech-stack:
  added: [web-audio-api, mediadevices-api]
  patterns: [singleton-audio-capture, permission-explanation-first]

key-files:
  created:
    - src/lib/jarvis/audio/MicrophoneCapture.ts
    - src/lib/jarvis/audio/VoiceActivityDetector.ts
    - src/lib/jarvis/audio/index.ts
    - src/components/jarvis/PermissionPrompt.tsx
    - src/components/jarvis/PushToTalk.tsx
  modified:
    - src/app/jarvis/page.tsx

key-decisions:
  - "RMS amplitude calculation for accurate voice level"
  - "256 FFT size for fast response time"
  - "Singleton pattern for MicrophoneCapture"
  - "Permission explanation BEFORE browser prompt"
  - "Spacebar support for desktop push-to-talk"

patterns-established:
  - "Permission UX: Explain why before prompting"
  - "Latency instrumentation: Log timing data for optimization"
  - "Store-driven reactivity: Audio level flows through zustand"

# Metrics
duration: 12min
completed: 2026-01-31
---

# Plan 01-03: Audio Capture & Push-to-Talk Summary

**Browser microphone capture with RMS amplitude analysis, permission UX with explanation before prompt, and push-to-talk button supporting mouse/touch/keyboard**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-31T18:39:12Z
- **Completed:** 2026-01-31T18:51:xx
- **Tasks:** 4
- **Files created:** 5
- **Files modified:** 1

## Accomplishments

- MicrophoneCapture singleton with RMS amplitude analysis and latency instrumentation
- Permission explanation UI shown BEFORE browser permission prompt
- Denial recovery instructions with step-by-step re-enable guide
- Push-to-talk button with mouse, touch, and spacebar support
- Visual feedback on button (glow, scale) responding to audio level
- Orb state changes to "listening" (cyan) when button held
- Debug overlay for audio level monitoring

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MicrophoneCapture class** - `22bfdb1` (feat)
2. **Task 2: Create permission prompt component** - `47b7d9c` (feat)
3. **Task 3: Create PushToTalk button component** - `9621420` (feat)
4. **Task 4: Integrate audio capture into Jarvis page** - `b17aa8a` (feat)

## Files Created/Modified

### Created
- `src/lib/jarvis/audio/MicrophoneCapture.ts` - Singleton class for microphone capture with RMS amplitude analysis and latency instrumentation
- `src/lib/jarvis/audio/VoiceActivityDetector.ts` - Simple VAD using amplitude threshold with hysteresis
- `src/lib/jarvis/audio/index.ts` - Barrel export for audio module
- `src/components/jarvis/PermissionPrompt.tsx` - Explanatory permission UI with denial recovery instructions
- `src/components/jarvis/PushToTalk.tsx` - Hold-to-speak button with multi-input support and visual feedback

### Modified
- `src/app/jarvis/page.tsx` - Integrated permission flow and push-to-talk, replaced debug controls

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| RMS amplitude vs peak detection | RMS gives more accurate perceived loudness |
| 256 FFT size | Smaller than default 2048, faster response for real-time |
| Singleton pattern for MicrophoneCapture | App-wide access to single microphone stream |
| Permission explanation before prompt | Users must understand WHY before browser asks |
| 0.3 smoothingTimeConstant | Moderate smoothing prevents jitter without lag |
| touch-action: none on button | Prevents scroll/zoom on mobile during hold |
| Spacebar support | Desktop users expect keyboard shortcuts |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

### TypeScript Float32Array Generic
- **Issue:** TypeScript 5.x strict mode requires `Float32Array<ArrayBuffer>` explicit type
- **Solution:** Changed timingData type declaration to include ArrayBuffer generic
- **Impact:** Minor, build passes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 02 (Speech-to-Text):**
- MicrophoneCapture provides MediaStream for Deepgram SDK
- VoiceActivityDetector can gate when to send audio to STT
- Store already has `isCapturing` flag for pipeline state

**Audio pipeline state flow:**
1. User holds push-to-talk -> MicrophoneCapture.start()
2. Audio amplitude updates jarvisStore.audioLevel
3. Orb responds to audioLevel in real-time
4. User releases -> MicrophoneCapture.stop()

**Latency instrumentation ready:**
- Capture start time logged
- First sample time logged
- Total latency calculated and logged to console

---
*Phase: 01-audio-foundation*
*Completed: 2026-01-31*
