# 02-03 Summary: Voice Pipeline Orchestration

## Completed
- VoicePipeline state machine orchestrates STT → TTS flow
- Store extended with voice pipeline state (pipelineState, transcripts, etc.)
- Jarvis page integrated with VoicePipeline for PTT handling
- Full echo test working: speak → transcribe → echo response

## Key Fix (Debug Session)
**Issue:** Deepgram returned no transcripts despite connection opening
**Root Cause:** Audio format mismatch - MediaRecorder sent webm/opus chunks, server expected linear16 PCM
**Solution:** Replaced MediaRecorder with Web Audio API (ScriptProcessorNode) for raw PCM capture:
- Downsample from browser's native rate (48kHz) to 16kHz
- Convert Float32 samples to 16-bit signed integers
- Server specifies `encoding: 'linear16', sample_rate: 16000`

## Files Modified
- `src/lib/jarvis/voice/DeepgramClient.ts` - Switched to raw PCM audio capture
- `src/app/api/jarvis/stt/route.ts` - Added linear16 encoding config + cleanup error handling
- `src/lib/jarvis/stores/jarvisStore.ts` - Extended with voice pipeline state
- `src/lib/jarvis/voice/VoicePipeline.ts` - State machine orchestration
- `src/app/jarvis/page.tsx` - Integrated VoicePipeline

## Verification
- PTT press → orb cyan (listening) ✓
- Speak → real-time transcript appears ✓
- PTT release → orb amber (thinking) ✓
- Echo response → orb orange (speaking) + TTS audio ✓
- Audio ends → orb blue (idle) ✓

## Duration
~45 min (including debug session for STT fix)

## Next Phase
Phase 3: Intelligence Layer - Replace echo with Claude API for real conversations
