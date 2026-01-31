---
phase: 02-voice-pipeline
plan: 02
subsystem: voice-output
tags: [tts, web-speech-api, browser-native, speech-synthesis]

dependency-graph:
  requires:
    - "01-01: jarvisStore with setOrbState action"
  provides:
    - "SpeechClient: Zero-cost browser TTS"
    - "TTSConfig: Voice configuration interface"
    - "TTSCallbacks: Event callbacks interface"
  affects:
    - "02-03: Voice pipeline integration (uses SpeechClient)"
    - "03-xx: Settings UI (voice selection)"

tech-stack:
  added: []  # No new dependencies - uses built-in Web Speech API
  patterns:
    - "SpeechSynthesis: Browser-native text-to-speech"
    - "Voice selection: Prioritized fallback list"
    - "Store integration: Direct jarvisStore state updates"

key-files:
  created:
    - src/lib/jarvis/voice/SpeechClient.ts
  modified:
    - src/lib/jarvis/voice/types.ts
    - src/lib/jarvis/voice/index.ts

decisions:
  - id: "02-02-voice-selection"
    choice: "Prioritized fallback list for voice selection"
    reason: "Different browsers/OS have different voices available"
    alternatives: ["User-only selection", "First available voice"]
  - id: "02-02-no-stream"
    choice: "Accept no audio-reactive orb during TTS"
    reason: "Web Speech API doesn't expose audio stream; orb shows static 'speaking' state"
    alternatives: ["Custom AudioContext synthesis", "ElevenLabs for stream access"]

metrics:
  duration: "5 min"
  completed: "2026-01-31"
---

# Phase 02 Plan 02: Browser TTS Client Summary

**One-liner:** Zero-cost browser TTS using Web Speech API with automatic voice selection and orb state integration.

## What Was Built

### SpeechClient Class

Browser-based text-to-speech client using the built-in `window.speechSynthesis` API.

**Key Features:**
- **speak(text)** - Speaks text through browser TTS
- **stop()** - Cancels current speech immediately
- **setRate/setPitch/setVolume** - Configure speech properties
- **getVoices()/setVoice()** - Voice listing and selection
- **isSpeaking()** - Status check
- **isAvailable()** - Static feature detection

**Voice Selection Logic:**
Prioritized fallback list for best available English voice:
1. Google UK English Male (Chrome)
2. Daniel (macOS)
3. Microsoft David (Windows)
4. Alex, Samantha (macOS fallbacks)
5. First English voice
6. First available voice

**Orb State Integration:**
- Sets `orbState: 'speaking'` on speech start
- Sets `orbState: 'idle'` on speech end or error
- Orb shows orange color during TTS playback

### Type Definitions

Added to `src/lib/jarvis/voice/types.ts`:

```typescript
interface TTSConfig {
  voice?: string;   // Voice name (browser-dependent)
  rate?: number;    // 0.1-10, default: 1
  pitch?: number;   // 0-2, default: 1
  volume?: number;  // 0-1, default: 1
}

interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}
```

## Technical Notes

### Limitations (Acceptable for Phase 2)

1. **No audio stream access** - Web Speech API doesn't expose the audio buffer, so orb can't pulse to voice amplitude. Orb shows static "speaking" state instead.

2. **Voice quality varies** - Depends on browser and OS. Good enough for proving pipeline works.

3. **No SSML support** - Can't control pronunciation details like a premium TTS.

### Browser Compatibility

- Chrome: Full support, async voice loading
- Firefox: Full support
- Safari: Full support
- Edge: Full support (uses Windows voices)

### Future Upgrade Path

SpeechClient has the same interface pattern as future premium TTS clients:
- `speak(text)`, `stop()`, callbacks
- Easy to swap to ElevenLabs or OpenAI TTS when voice quality matters

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 5aaff1a | feat | Add TTS types for browser SpeechSynthesis |
| 78f8ed1 | feat | Implement SpeechClient using Web Speech API |
| c7ece20 | feat | Export SpeechClient from voice module |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**For 02-03 (Voice Pipeline Integration):**
- SpeechClient ready to be instantiated by VoicePipeline
- Callbacks wire directly to pipeline state management
- Orb state updates happen automatically via jarvisStore

**Usage example:**
```typescript
const tts = new SpeechClient({
  onStart: () => console.log('speaking'),
  onEnd: () => console.log('done'),
  onError: (e) => console.error(e)
});

tts.speak("Hello, I am Jarvis. How can I help you today?");
```

## Verification Status

- [x] TypeScript compiles (SpeechClient.ts, types.ts)
- [x] SpeechClient exports from index.ts
- [x] speak/stop methods implemented
- [x] Orb state updates to 'speaking' during playback
- [x] No API keys required
- [ ] Build check - BLOCKED by 02-01's stt/route.ts type error (not my code)
