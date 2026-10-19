# Free sample render: "A Gentle Reset: Making Peace with Food" in Jonathan's voice (2026-10-19)

Served at `/samples/gentle-reset-free-sample.mp4` (with `.vtt` captions and `.jpg` poster), embedded on
`/programs/advanced-hypnosis-sessions` under "Free sample". Jonathan approved the coming-soon route and the
free sample in chat on 2026-10-19.

## What changed from the first re-voice proof (jarvis `data/content/waia-revoice-proof-2026-10-19/`)

| | Proof (v1) | Free sample (v2) |
|---|---|---|
| Length | 670.0 s | 635.7 s |
| Longest silence (silencedetect, -50 dB, 1 s) | 22.0 s (542.9 to 564.9 s) | 3.08 s (the script's authored 3 s pause) |
| Words heard that are not in the script (whisper base.en) | 18 | 5 (mishearings, no paragraph-start syllables) |
| Script words heard in order | 1,577 of 1,582 | 1,577 of 1,582 |

## How

- Renderer: jarvis `scripts/tts/render.mjs --module 01 --voice-config data/tts-render/voice-inverse-yale.json
  --flat-paragraphs --no-timed-pad --trim-chunk-starts`, model `s2.1-pro-free` (free lane, $0).
- The 22 s gap: the renderer padded the 68 s "build" block (and the 30 s "seal") with silence up to its floor.
  `--no-timed-pad` keeps the takes at their natural length (46.5 s and 26.1 s).
- The stray syllables ("To freeze, first rule..."): a two-clip A/B through the same voice showed the free model
  voices a syllable at every blank-line paragraph break; `--flat-paragraphs` joins paragraphs with a space before
  sending. `--trim-chunk-starts` also removes breath/room tone before each take's first word
  (`silenceremove`, -40 dB, gentle).
- Video: the same episode visuals as the proof, trimmed to the new length, re-encoded for the web
  (1280x720, 24 fps, H.264 CRF 30 capped at 450 kb/s, AAC 96 kb/s mono, faststart). 43.5 MB.
- Captions: whisper base.en segments of the final audio.

The voice is a clone made from Jonathan's own recording ("Trance - Self Hypnosis - Lesson 1"); the page says so.
