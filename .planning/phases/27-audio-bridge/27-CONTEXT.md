# Phase 27: Audio Bridge - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase builds the complete audio-to-Blender pipeline: expand browser audio analysis to 37 features (8 frequency bands x 3 features + 4 global + 3 stereo + 4 musical + 2 dynamics), export as self-documenting JSON, and create a Python keyframe generator that reads that JSON + a mapping preset to insert keyframes into Blender scenes. The preset system is fully CRUD-capable (create, load, edit, save, delete). 3 example presets shipped as starting points.

</domain>

<decisions>
## Implementation Decisions

### Audio Analysis Architecture
- 8 frequency bands: Sub-bass (20-60Hz), Bass (60-250Hz), Low-mid (250-500Hz), Mid (500-2kHz), Upper-mid (2-4kHz), Presence (4-6kHz), Brilliance (6-12kHz), Air (12-20kHz)
- Per-band features (x3 each): amplitude, envelope follower (exponential decay, configurable attack/release), onset detection (spectral flux with adaptive threshold)
- 4 global spectral descriptors: spectral centroid, spectral flatness, RMS energy, zero-crossing rate
- 3 stereo features: L/R balance, stereo width, mid/side energy
- 4 musical features: chromagram (12-note pitch class), BPM + beat phase (0-1 cycle), spectral contrast
- 2 dynamics features: LUFS (perceptual loudness), crest factor (peak/RMS ratio)
- Total: 37 audio features
- New `AudioExporter.ts` module wrapping PreAnalyzer — keeps real-time PreAnalyzer clean
- Envelope follower: attack 5ms, release configurable per preset (100ms tight for EDM, 300ms smooth for meditation)

### Export Format
- Self-documenting nested JSON: `{metadata, band_definitions[], feature_descriptions[], frames[], summary}`
- Each feature includes name, range, description, and typical use case in the metadata
- Auto-classification hints in metadata (BPM + centroid + crest factor → suggested preset)
- Export button in AudioControls component (appears after analysis completes)
- Claude-first design: JSON format optimized for programmatic reading/modification

### Keyframe Generator
- Single `keyframe_generator.py` reads audio JSON + mapping preset JSON
- Inserts keyframes via `bpy.keyframe_insert()` on any target objects/properties
- Bezier interpolation with auto-handle smoothing for envelopes, constant for onsets/beats
- Supports batch mode: apply all mappings in one pass across all frames
- 10 visual parameters controllable: domain flame intensity, Flow fuel_amount, Flow temperature, material density, material color temp, light energy, light color, camera focal length, particle emission rate, world background

### Preset System (CRUD)
- JSON files in `blender/presets/` directory
- Fully CRUD: create, load, edit, save, delete presets
- Schema: `{name, description, audio_style, auto_classify_hints, mappings: [{source_feature, target_property, target_object, curve_type, scale, offset, clamp_min, clamp_max}]}`
- 3 example presets shipped: Meditation (slow envelopes, sub-bass/centroid driven), EDM (fast onsets, bass/stereo driven), Cinematic (dynamics-driven, crest factor/chromagram)
- Auto-classification: analyze BPM + spectral centroid + crest factor to auto-suggest preset
- Claude creates/edits presets programmatically — not manual human editing

### Claude's Discretion
- Internal FFT implementation details (window function, hop size, overlap)
- Exact spectral flux threshold values and adaptive threshold parameters
- JSON schema field naming conventions
- Python script internal structure (classes vs functions)
- Error handling approach for malformed JSON input

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PreAnalyzer.ts` (24.6KB) — FFT, 3-band analysis, beat detection, caching, normalization. Core to wrap.
- `AudioAnalyzer.ts` (8.5KB) — Real-time analysis, same band definitions. Shares beat detection logic.
- `FrameAudioData` type — frame, time, amplitude, bass, mid, high, isBeat. Must expand to 37 features.
- `AudioControls.tsx` — Audio upload/playback UI. Export button placement target.
- `ExportPanel.tsx` — Video export UI pattern to follow for audio export button.

### Established Patterns
- FFT: Pure Cooley-Tukey (no external library), 512 samples, Hanning window
- Beat detection: Rising edge on bass + cooldown (80ms)
- Normalization: Peak detection + 0.95 target scaling
- Caching: IndexedDB with hash-based keys, 7-day TTL
- Audio processing: Web Audio API (OfflineAudioContext for PreAnalyzer)

### Integration Points
- PreAnalyzer.analyze() returns PreAnalysisResult — AudioExporter wraps this
- AudioControls has the analysisResult in state after user uploads audio
- blender/scripts/ directory has the Python patterns from Phase 26
- scene_utils.py provides save_before_operate, get_or_create_object

</code_context>

<specifics>
## Specific Ideas

- Jonathan's audio range: binaural frequencies, meditation music, EDM, funk, motivational speakers, fireside chats — all must be captured distinctly
- The operator is Claude Code (via Jarvis) — system must be optimized for programmatic reading/modification, not manual human editing
- "More control is better" — don't simplify, maximize granularity
- Preset system is about CRUD capability, not about shipping many presets — Claude creates custom presets per project
- Auto-classification helps Claude pick the right starting preset without user input

</specifics>

<deferred>
## Deferred Ideas

- MIDI export (beat frames → MIDI note events) — useful but not Phase 27 scope
- Real-time audio → Blender keyframe streaming (live performance mode) — Phase 31+ scope
- Voice activity detection (VAD) for speech-specific mapping — could be a preset
- Harmonic analysis beyond chromagram (chord detection, key estimation)

</deferred>
