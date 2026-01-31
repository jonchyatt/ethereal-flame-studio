# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** One system that knows everything, surfaces what matters, and keeps you on track
**Current focus:** Phase 2 - Voice Pipeline

## Current Position

Phase: 2 of 6 (Voice Pipeline)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-01-31 - Completed 02-02-PLAN.md (Browser TTS Client)

Progress: [######....] 22% (1.67/6 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 8 min
- Total execution time: 32 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-audio-foundation | 3/3 | 27 min | 9 min |
| 02-voice-pipeline | 1/3 | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (6 min), 01-02 (9 min), 01-03 (12 min), 02-02 (5 min)
- Trend: Fast execution (browser-native features)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Use Deepgram for STT (not Web Speech API) for cross-browser support
- [Roadmap]: Use ElevenLabs Flash v2.5 for sub-75ms TTS latency
- [Roadmap]: Follow chained pipeline architecture (STT -> LLM -> TTS) for modularity
- [Roadmap]: 300ms total latency budget for conversational feel
- [Context]: Omnipresent guide personality (NOT butler)
- [Context]: Orb state colors: blue->cyan->amber->orange (cool->warm)
- [Context]: Intensity/reactivity increases with Jarvis's perceived importance
- [Context]: Dynamic transition speeds based on emotional intensity
- [Context]: Placeholder orb first, fancy animations after pipeline proven
- [Scope]: Bill tracking in v1 (same workspace, FIN-01/02/03 added)
- [01-01]: Use h-dvh for mobile viewport height handling
- [01-01]: Clamp audioLevel and importance to 0-1 in store actions
- [01-02]: 200 particles for mobile performance (vs 1000+ in main Ethereal Flame)
- [01-02]: OrbStateManager as pure logic component (returns null)
- [01-02]: Importance boosts both intensity (1.3x) and reactivity (1.5x)
- [01-02]: Animation state passed via callback to avoid re-renders
- [01-03]: RMS amplitude calculation for accurate voice level
- [01-03]: 256 FFT size for fast response time
- [01-03]: Singleton pattern for MicrophoneCapture
- [01-03]: Permission explanation BEFORE browser prompt
- [01-03]: Spacebar support for desktop push-to-talk
- [02-02]: Prioritized fallback list for voice selection (browser/OS dependent)
- [02-02]: Accept no audio-reactive orb during TTS (Web Speech API limitation)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-31 20:31 UTC
Stopped at: Completed 02-02-PLAN.md (Browser TTS Client)
Resume file: None

## Phase 1 Summary

**Audio Foundation complete.** All 3 plans executed:

1. **01-01**: Jarvis app setup (store, types, page structure)
2. **01-02**: JarvisOrb visualization with state-based colors and audio reactivity
3. **01-03**: MicrophoneCapture, push-to-talk, permission UX

**Key deliverables:**
- `/jarvis` route with full-screen orb visualization
- Push-to-talk interaction (mouse, touch, spacebar)
- Permission explanation UI before browser prompt
- Orb responds to voice amplitude in real-time
- State colors: idle (blue) -> listening (cyan) -> thinking (amber) -> speaking (orange)

**Ready for Phase 2 (Speech-to-Text):**
- MicrophoneCapture provides MediaStream for Deepgram SDK
- VoiceActivityDetector can gate when to send audio to STT
- Store has `isCapturing` flag for pipeline state management
