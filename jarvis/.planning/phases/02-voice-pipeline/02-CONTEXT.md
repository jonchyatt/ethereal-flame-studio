# Phase 2: Voice Pipeline - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

User can speak and hear synthesized speech response. This phase establishes STT and TTS integration with streaming, sub-300ms latency, and turn-taking via push-to-talk. The intelligence, personality, and conversation context are Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Turn-Taking
- Push-to-talk defines turn boundary (user releases button = utterance complete)
- No silence detection in v1 — explicit control only
- Barge-in supported: pressing PTT during TTS interrupts playback and starts listening

### Latency Target
- Sub-300ms from speech completion to first TTS word (VOI-02)
- Streaming TTS required — start speaking before full response generated (VOI-05)

### Transcription Display
- Optional, toggleable, defaults off
- Voice-first experience — text log not central to UX
- Claude decides placement and styling if enabled

### TTS Voice
- Phase 2 uses browser SpeechSynthesis (free, no API key)
- Premium TTS (ElevenLabs, OpenAI) is easy swap later when voice quality matters
- Interface is identical: speak(), stop(), callbacks
- Actual personality/character is Phase 3 (prompt engineering)

### Error Handling
- Graceful "I didn't catch that" with retry option
- Connection drops should reconnect silently if possible
- User sees clear feedback when something fails

### Claude's Discretion
- STT provider choice (Deepgram mentioned, not locked)
- TTS provider choice (ElevenLabs mentioned, not locked)
- WebSocket vs REST for STT streaming
- Audio format and encoding details
- Reconnection strategy and retry logic

</decisions>

<specifics>
## Specific Ideas

- Phase 2 is plumbing — the voice works, the smarts come in Phase 3
- Orb already has states (idle, listening, thinking, speaking) from Phase 1
- TTS audio should drive orb's speaking animation (already wired in Phase 1)

</specifics>

<deferred>
## Deferred Ideas

- Wake word detection ("Jarvis") — v2 (VOI-ADV-01)
- Multiple voice persona options — v2 (VOI-ADV-03)
- Silence-based turn detection — not in current scope

</deferred>

---

*Phase: 02-voice-pipeline*
*Context gathered: 2026-01-31*
