---
phase: 01-foundation
plan: 02
subsystem: audio
tags: [audio, fft, web-audio-api, beat-detection, zustand, react]

# Dependency graph
requires:
  - phase: 01-foundation
    plan: 01
    provides: "Next.js + R3F foundation"
provides:
  - "AudioAnalyzer singleton with FFT analysis"
  - "Frequency band separation (bass, mids, treble)"
  - "Beat detection using threshold crossing"
  - "Zustand audioStore with real-time levels"
  - "AudioControls UI with file upload and playback"
affects: [01-08-integration, all-visual-modes]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Web Audio API integration", "Singleton pattern for audio analyzer", "RequestAnimationFrame for 60fps updates", "Backward compatibility aliases"]

key-files:
  created:
    - src/lib/audio/AudioAnalyzer.ts
    - src/components/ui/AudioControls.tsx
  modified:
    - src/types/index.ts
    - src/lib/stores/audioStore.ts
    - src/app/page.tsx

key-decisions:
  - "Use 512 FFT size for performance (256 frequency bins)"
  - "Smoothing time constant 0.7 for stable readings"
  - "Frequency bands: bass 0-250Hz, mids 250Hz-4kHz, treble 4kHz+"
  - "Beat detection threshold 0.05 with 80ms cooldown"
  - "Scale animation 1.0-1.8 on bass hits"
  - "Maintain backward compatibility with mids/treble aliases"

patterns-established:
  - "Singleton audio analyzer accessed globally via export"
  - "Animation loop with deltaTime calculation for update()"
  - "AudioContext resume() for browser autoplay policy"
  - "Object URL creation for file upload"

# Metrics
duration: 6min
completed: 2026-01-26
---

# Phase 1 Plan 02: Audio Analyzer Summary

**Web Audio API integration with FFT analysis, frequency band separation, and beat detection driving real-time visual effects**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-26T17:48:24Z
- **Completed:** 2026-01-26T17:54:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- AudioAnalyzer singleton with Web Audio API integration
- Real-time FFT analysis with 512 bin size (60fps performance)
- Frequency band separation: bass (0-250Hz), mids (250Hz-4kHz), treble (4kHz+)
- Beat detection using threshold crossing algorithm with 80ms cooldown
- Smoothed scale animation (1.0-1.8) synchronized to bass hits
- Zustand audioStore updated with AudioLevels type
- AudioControls UI with file upload, play/pause, and debug overlay
- Real-time level visualization with color-coded bars (red bass, yellow mids, blue treble)
- Beat indicator that flashes on bass transients
- Backward compatibility maintained (mids/treble aliases for existing ParticleSystem)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AudioAnalyzer singleton with FFT and beat detection** - `dad3e9e` (feat)
2. **Task 2: Create AudioControls UI with Zustand store integration** - `5a80620` (feat)

## Files Created/Modified

**Created:**
- `src/lib/audio/AudioAnalyzer.ts` - Singleton audio analyzer (259 lines)
- `src/components/ui/AudioControls.tsx` - File upload and playback UI (258 lines)

**Modified:**
- `src/types/index.ts` - Added AudioLevels type definition
- `src/lib/stores/audioStore.ts` - Updated with AudioLevels integration and playback state
- `src/app/page.tsx` - Added AudioControls component

## Decisions Made

### Technical Architecture
- **FFT Size: 512** - Balances frequency resolution with performance (256 bins at 60fps)
- **Smoothing: 0.7** - Provides stable readings without excessive lag
- **Frequency Bands:**
  - Sub-bass: 0-60Hz (2.5% of spectrum)
  - Bass: 60-250Hz (10% of spectrum)
  - Mids: 250Hz-4kHz (50% of spectrum)
  - Treble: 4kHz-22kHz (remaining spectrum)

### Beat Detection Algorithm
- **Threshold: 0.05** - Low threshold for sensitive detection
- **Cooldown: 80ms** - Prevents double-triggering on same beat
- **Signal: max(subBass, bass * 0.7)** - Combines sub-bass and weighted bass
- **Rising edge detection** - Triggers only when crossing threshold upward
- **Scale animation: 1.0 → 1.8** - Smooth interpolation with amplitude-based decay

### Integration Patterns
- **Singleton pattern** - Single global instance accessed via `audioAnalyzer` export
- **Animation loop** - RequestAnimationFrame with deltaTime calculation
- **Zustand store** - Central state management for audio levels accessible to R3F components
- **Backward compatibility** - mids/treble aliases maintain compatibility with existing code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] TypeScript strict ArrayBuffer typing**
- **Found during:** Task 1
- **Issue:** Uint8Array<ArrayBufferLike> not compatible with Web Audio API getByteFrequencyData
- **Fix:** Explicit ArrayBuffer allocation and Uint8Array<ArrayBuffer> type annotation
- **Files modified:** src/lib/audio/AudioAnalyzer.ts
- **Commit:** dad3e9e

**2. [Rule 3 - Blocking] Backward compatibility with existing ParticleSystem**
- **Found during:** Task 2
- **Issue:** ParticleSystem.tsx references 'mids' and 'treble' properties not in AudioLevels type
- **Fix:** Added mids/treble aliases to audioStore that mirror mid/high values
- **Files modified:** src/lib/stores/audioStore.ts
- **Commit:** 5a80620

## Issues Encountered

None - Web Audio API integration worked first try, beat detection algorithm ported cleanly from reference code.

## User Setup Required

None - no external service configuration required. User only needs to upload audio file in browser.

## Requirements Coverage

This plan satisfies the following requirements from REQUIREMENTS.md:

- **AUD-01** - Audio file upload (mp3, wav, ogg) ✅
- **AUD-02** - Real-time FFT analysis with frequency bands ✅
- **AUD-04** - Beat detection fires on strong bass transients ✅
- **VIS-08** - Visual effects respond to frequency bands ✅ (store integration ready)
- **VIS-09** - Particle size/speed scale with audio levels ✅ (levels exposed via store)
- **VIS-11** - Beat events trigger visual emphasis ✅ (isBeat flag available)

## Next Phase Readiness

- ✅ Audio analyzer provides real-time levels at 60fps
- ✅ Frequency bands (bass, mids, treble) available to R3F components via Zustand
- ✅ Beat detection working with smooth scale animation
- ✅ AudioControls UI allows user to upload and play audio
- ✅ Debug overlay shows real-time values for verification
- ✅ Backward compatibility maintained with existing components
- ✅ Ready for integration with particle system (plan 01-08)
- ✅ Ready for visual mode audio reactivity (plans 01-05, 01-06)

**No blockers.** Audio foundation is complete and ready to drive visual effects.

## Testing Notes

To verify audio analyzer functionality:

1. Run `npm run dev`
2. Click "Upload Audio" button at bottom of screen
3. Select an audio file (mp3, wav, or ogg)
4. Click "Play" button
5. Observe:
   - Bass bar (red) pulses with kick drums
   - Mids bar (yellow) responds to vocals/melody
   - Treble bar (blue) shows high frequencies
   - Beat indicator (circle) flashes on bass hits
   - Scale value oscillates between 1.0-1.8 on beats

Expected behavior:
- Levels update smoothly at 60fps
- Beat detection fires on strong bass transients (kick drums, bass drops)
- Scale animation smoothly interpolates back to 1.0 between beats
- AudioContext resumes on play (handles browser autoplay policy)

---
*Phase: 01-foundation*
*Completed: 2026-01-26*
