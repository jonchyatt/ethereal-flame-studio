# WAIA owned-source pilot draft render receipt

Date: 2026-10-07
Kanban card: `t_b66d45d3`
Branch: `t_b66d45d3`
Evidence commit: `f97b4fe872fa55c8649b398ccbaab51eff9a03e4`
Remote branch: `origin/t_b66d45d3` (pushed with this receipt)
Mode: local `manual-draft` / `HOLD-MEDIA`; no upload or publication

## Delivered

- Draft MP4 (not committed due size): `D:/jarvis-data/renders/waia-owned-source-pilot/waia-owned-source-pilot-draft.mp4`
- MP4 SHA-256: `3e222ff9ed35c93564e4d22bb02bc4cc0654113bba3b0c6594cddbcded319608`
- Probe and frame evidence: `data/waia-owned-pilot-draft/ffprobe.json`
- Source provenance and release guard: `data/waia-owned-pilot-draft/source-provenance.json`
- Exact later-upload handoff: `data/waia-owned-pilot-draft/draft-only-handoff.md`
- Reproducible narration extractor: `scripts/prepare-waia-owned-pilot-draft-audio.mjs`
- Draft-render validator: `scripts/check-waia-owned-pilot-draft-render.mjs`

The final local MP4 is 583,406,000 bytes, 613.300 seconds, 1920x1080, 30 fps, and 18,399 decoded video frames. It contains H.264 video plus AAC audio.

## Source and render trail

The narration was generated from only the authored source index named by `docs/creator-packs/waia-owned-source-pilot-pack.json`; no third-party narration or music is in the final file. It is a local draft generated with Edge TTS from that recorded source, and the pack's `HOLD-MEDIA` rights and editorial gates remain unchanged.

The documented fresh Path B invocation was executed with the owned narration, `--preset meditation`, `--mode 360stereo`, 4096 resolution, 30 fps, and the `Example` scene. It reached Unity and was blocked by Unity's local batch-license gate (`BatchMode: Unity has not been activated with a valid License`). The first invocation also exposed the existing MSYS/Windows spectrum-bake path mismatch before Unity was reached; the retry used `--no-spectrum-bake` and reached the license gate.

A headed, same-scene/preset fallback was started without batch mode. It did not complete before the isolated worktree rebuilt its absent Unity Library and the command-time ceiling stopped it. To deliver an actual nonzero draft rather than another plan, the final file loops the existing local EFS Path-B `Example`-scene video capture while replacing its source audio entirely with the owned-source narration. This visual derivation and its SHA-256 are explicitly recorded in `data/waia-owned-pilot-draft/source-provenance.json`; it must not be represented as a fresh meditation-preset capture.

## Runnable verification

Run from the EFS repository root:

```text
node scripts/check-waia-pilot-pack.mjs
node scripts/check-waia-owned-pilot-draft-render.mjs
ffprobe -v error -show_entries format=duration,size:stream=codec_name,codec_type -of json D:/jarvis-data/renders/waia-owned-source-pilot/waia-owned-source-pilot-draft.mp4
```

Recorded result:

```text
PASS: WAIA owned-source pilot pack is a complete local manual draft; publication remains blocked.
PASS: local WAIA owned-source pilot draft is probeable, H.264/AAC, source-bound, and publication-blocked.
{"streams":[{"codec_name":"h264","codec_type":"video"},{"codec_name":"aac","codec_type":"audio"}],"format":{"duration":"613.300000","size":"583406000"}}
```

No credentials were entered. No channel defaults, upload state, schedule, provider URL, or public content changed.
