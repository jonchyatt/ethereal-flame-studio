# WAIA: State of the Ring, 2026-10

Written 2026-10-17. Documentation only: no code changes, no merges, nothing run. Every "exists" comes from reading files; every "proven" is a receipt already committed. Where I could not verify something, it says so.

## Read this first

**1. GitHub `master` is far behind the work.** On GitHub, `master` is commit `7db9cdf` (2026-07-08, the WAIA front-door page). It contains no binaural mixer, no curation gate, no render contracts, no local-agent transport. All of that lives on **unmerged October branches** (table below). Jonathan's note says Phases 4a to 4c are "merged on master" and that the uploader has a `channelKey 'waia'` slot on branch `t_3dc0160f`. Neither is visible from GitHub: `master` there does not carry 4a to 4c, and `t_3dc0160f` does not exist on the remote. The likeliest explanation is a local `master` or a local branch that has not been pushed. I have not seen it, so everything below describes **GitHub `master` plus the pushed branches** and marks where Jonathan's facts go beyond that.

**2. I could not read the Master Goal Spec.** It should be at `data/waia-curation-pipeline/MASTER-GOAL-SPEC.md` in the jarvis repo. I attached and cloned that repo; the path is not on its `master`, and a code search and PR search found nothing. The eight stages and the phase labels below are my reading of the project topic, commit messages and code comments (for example "Phase 3 curation", "Phase 4 render contracts", "Phase 6 remains closed"), not the spec's own words. A follow-up can re-key this file when the spec is readable. The hard blockers (HB-1 to HB-10) come from the project instructions.

**3. Facts supplied by Jonathan** (taken as given, not re-verified): Phase 4d (the full 28 second Unity proof) is not done; Phases 5 to 7 are not built; the thumbnail planner has never been verified; Unity `-batchmode` fails on the Personal license and only `--headed` works. The branch receipts agree with the last one (see stage 5).

## Summary

The pieces exist on branches: a binaural mixer with per-source rights in its recipe, a review gate that records source-rights confirmation and mix fingerprint, engine and target as separate fields, a local-agent render path to Unity, a manual-draft episode-1 bundle that names the WAIA channel id. What does not exist anywhere I can see: a publish step that refuses unapproved items, a live check of the authenticated channel against the WAIA id, any performance read-back, peak-based Shorts cuts, caption burn-in. The ring is open at publish and at feedback, and wide open at merging what is already built.

## The eight stages

"master" below means GitHub `master`. "branches" means the chain ending at `t_9edb8eb7` unless another is named.

### 1. Source library and rights (HB-6)

- **master:** `rightsAttested: true` in `src/lib/playlist-batch/schema.ts`; `AssetProvenance` in `src/lib/audio-prep/types.ts` (source type, URL, video id, attested-at). No rights basis.
- **branches:** `PlaylistRightsBasisSchema` in `src/lib/playlist-batch/schema.ts`; every source in `data/waia-mixer-spike/recipe.json` carries `sourceUrl` and a `rightsBasis` string with the archive.org license URL and verification date; `src/lib/playlist-batch/mix-recipes.ts` only accepts `cc0` or `public-domain` and throws otherwise. `data/waia-owned-pilot-draft/source-provenance.json` records owned-source provenance with hashes.
- **Proven:** `recipe.json` states the rights were checked against archive.org metadata on 2026-07-09. Unit tests exist (`binauralFiltergraph.test.ts`); I did not run them.
- **Missing:** a source catalog and an exclusion list for actively enforced catalogs; per-recording date evidence for Neville Goddard (the mixer spike itself substituted James Allen and Wallace Wattles for the spec-named Neville collections because those archive.org items carry no explicit license tag).
- **Smallest next PR:** merge the branch chain (order below). Then add a `data/waia-sources/catalog.json` of vetted sources with evidence, read-only, with a checker script.

### 2. Ingest and audio-prep (HB-1: extend, never rebuild)

- **master:** `src/app/api/audio/{ingest,edit,assets,jobs}/`, `src/lib/ingest-pipeline.ts`, `worker/pipelines/ingest.ts`, `src/lib/audio-prep/` (`AudioAssetService.ts`, `ytdlp.ts`, `ffprobe.ts`, `peaksGenerator.ts`, `urlSecurity.ts`), UI `src/components/ui/AudioPrepEditor.tsx`, page `src/app/pipeline/page.tsx`. Docs `docs/AUDIO_PREP_QUICKSTART.md`, `docs/QUICKSTART_AUDIO_PREP_RENDER.md`.
- **Proven:** unit tests exist for nine audio-prep modules. No ingest end-to-end receipt in `master` history.
- **Missing:** nothing structural.
- **Smallest next PR:** none.

### 3. Mix (binaural, multi-source)

- **master:** `filterComplexBuilder.ts` concatenates clips of an `EditRecipe`; no layering, no pan, no binaural. A search for "binaural" finds nothing.
- **branches:** `src/lib/audio-prep/binauralFiltergraph.ts` (166 lines) and `binauralMixer.ts` (55 lines), test `binauralFiltergraph.test.ts`, `scripts/waia-mixer-spike.ts`, recipe `data/waia-mixer-spike/recipe.json` (two voices with opposite left and right weights, one CC0 music bed), resolver `src/lib/playlist-batch/mix-recipes.ts` (fingerprint is a sha256 of the recipe).
- **Proven:** `data/waia-mixer-spike/render-receipt.json` (2026-07-09): an independent ffprobe check of the final MP4, and a left-minus-right difference of -28.68 dB in the muxed audio against -28.64 dB in the source WAV, so the binaural separation survived the render and AAC mux.
- **Missing:** only one ratified recipe (the resolver is a static registry; its own comment says to replace it with a durable one); no `MixRecipe` schema separate from the spike's JSON shape.
- **Smallest next PR:** merge the chain; then a second recipe entry plus a registry test, so the registry is exercised with more than one item.

### 4. Visual dressing

- **master:** Three.js flame and mist, creator style presets (`src/lib/creator/presets.ts`, `orbAudioResponsePresets.ts`), `unity/Presets/*.json`, Blender templates (`blender/`). Blender verification `28-VERIFICATION.md` is 4 of 5 with two items awaiting a human look.
- **branches:** `src/lib/render/waiaRenderPlan.ts` (271 lines) with test; `public/overlays/WAIANCircle.png`; brand pack version `waian-circle-v1` in the review request.
- **Proven:** see stage 5.
- **Missing:** a mapping from a mix to a visual preset.
- **Smallest next PR:** a read-only data file mapping a mix tag to a creator style variant, with a test.

### 5. Render (Puppeteer and Unity; HB-7)

- **Puppeteer:** `src/lib/render/PuppeteerRenderer.ts`, `scripts/headless-render.ts`, `worker/pipelines/render.ts`. On master it was last touched 2026-03-20; the branches patch it (16 lines). **Last known state:** wired, with no completed-render receipt in history.
- **Unity:** `unity/render.sh`, `unity/Assets/Editor/AutoRecorder.cs`, `unity/Scripts/bake_spectrum.py`. Receipts on master: commit `769b05b` (2026-07-06) records a 4 second, 120 frame, 8192x4096 smoke render with spherical metadata round-trip; `7e4d3e6` records 146 beat triggers across a full 28.4 second render with an external vision verdict of SHIP (receipt files named in that commit message live in the jarvis repo, which I could not find on `master` there). Branch receipt: `data/waia-mixer-spike/render-receipt.json` (1920 frames, 2048x1024, 24 fps, 318 seconds, `--headed`). Branch receipt: `data/content/receipts/waia-owned-pilot-draft-render.md`, which reports `-batchmode` failing on the Personal license and a headed fallback that did not finish in time; the delivered 613 second MP4 loops an earlier capture under new narration, and the receipt says it must not be called a fresh capture.
- **Phase 4d (full 28 second Unity proof): not done** per Jonathan; consistent with the pilot receipt above.
- **Engine and target:** on master only `target` exists. On branches `PlaylistRenderEngineSchema = z.enum(['puppeteer','unity'])` sits beside `PlaylistRenderTargetSchema`, they are separate fields in the review request, and the spike receipt records `"engine": "unity", "target": "local-agent"` outside the recipe on purpose.
- **Local agent:** `scripts/local-render-agent.ts`, `src/lib/local-agent/{unityAdapter,jobCallbacks,callbackRoute}.ts` and tests, on branches only.
- **Missing:** the 4d proof; a Puppeteer receipt; a vertical 9:16 recipe.
- **Smallest next PR:** none new; it is the merge of the chain, then the 4d run on Jonathan's machine, which is local work.

### 6. Curation gate (HB-3)

- **master:** only `reviewStatus` on recut segments. Nothing gates publish.
- **branches:** `src/lib/playlist-batch/curation.ts` (344 lines) with `curation.test.ts`; route `src/app/api/playlist-batches/[id]/items/[index]/review/route.ts`; `src/lib/waia/operator-auth.ts` with test. The approve request requires confirmed source rights per asset, the mix recipe id and fingerprint, brand pack version, experiment id, and the outputs to render (engine and target each). Reject and requeue need a reason. Commit `5bdd7d6` binds render variants to approvals; `ed420cf` enforces motion render receipts.
- **Gap that remains:** a grep of `worker/pipelines/publish.ts` and `src/lib/creator/publishConnectors.ts` on the branches finds no check of approval. The gate governs rendering; publish does not consult it, so HB-3 is enforced at render time and not at upload time.
- **Smallest next PR:** after merging, make `worker/pipelines/publish.ts` refuse any item without an approved review event, with a test.

### 7. Packaging (metadata, thumbnail, Shorts)

- **master:** `src/lib/creator/{metadata,thumbnail,recut,ffmpegRecut}.ts`, `src/app/creator/thumbnail-planner/page.tsx`, `/api/creator/thumbnail-plan`. The planner spaces candidate timestamps evenly with a centre bias and says in its own comment that frame scoring is still to come. **Never verified** (per Jonathan; nothing in history shows a verification).
- **branches:** `data/content/waia-episode-1-upload-draft/` with `manifest.json` and a 1280x720 `thumbnail.jpg`, checker `scripts/check-waia-episode-1-upload-draft.mjs`, receipt `data/content/receipts/waia-episode-1-upload-draft-bundle.md`, and `docs/creator-packs/waia-owned-source-pilot-pack.json`. That thumbnail is generated from the owned local draft render with a text overlay, not by the planner's scoring. The receipt says the dynamic dry-run harness could not run in that worktree and records only the static check as verified.
- **Missing:** a verified thumbnail path; WAIA-soul checks on titles (HB-8). Titles and thumbnails are Jonathan's to decide (HB-4).
- **Smallest next PR:** a test that runs the planner on a real render's duration and checks the selected frame extracts, no scoring changes.

### 8. Publish and feedback (HB-5, HB-10)

- **master:** `src/lib/creator/publishConnectors.ts` (YouTube, TikTok, Instagram; `api` when env credentials exist, else `manual-draft`; YouTube privacy defaults to private). No channel check. A search for the WAIA channel id in master finds nothing.
- **branches:** `WAIA_YOUTUBE_CHANNEL_ID = 'UCyq4s4Nei7Q26tu7EIQY7xw'` in `src/lib/playlist-batch/schema.ts`, `expectedPublishChannelId` locked to it in batch metadata and shown on the playlist-batches page ("Phase 6 remains closed"), and the episode-1 checker asserts the manifest channel id equals it. **So the id exists in code as a constant and a manifest check. It is not asserted against the channel the OAuth token actually belongs to, and `publishConnectors.ts` has no `channelKey` on any pushed branch** (HB-10 requires the assertion before any upload call).
- **OAuth slot (`channelKey 'waia'`, branch `t_3dc0160f`):** not pushed, not seen. Per Jonathan, that is where the uploader's WAIA slot lives.
- **Proven:** nothing was uploaded; the episode-1 receipt states no upload was performed.
- **Feedback:** no code reads views, watch time or retention. The creator dashboard shows internal counts only.
- **Smallest next PR:** after the OAuth branch is pushed and reviewed, a function that fetches the authenticated channel id and throws unless it equals the WAIA id, called before the first upload call, with a mismatch test. Metrics read-back waits for Jonathan's explicit go on channel-scoped OAuth (HB-5).

## Phases 0 to 7 (inferred, not from the spec)

| Phase | Evidence for the label | State |
|---|---|---|
| 0 | `public/waia-front-door.html`, commit `7db9cdf` cites "Phase 0" | on master |
| 1 | no label found | unknown |
| 2 | "Phase 2 mixer spike" in `mix-recipes.ts` and the spike receipt | branches, receipt 2026-07-09 |
| 3 | "Phase 3 has one ratified mix artifact" in `mix-recipes.ts`; curation gate | branches |
| 4a to 4c | "define phase 4 render contracts", local-agent transport, Unity adapter | branches (Jonathan says merged on master; not on GitHub) |
| 4d | full 28 second Unity proof | not done (per Jonathan) |
| 5 | not found | not built (per Jonathan) |
| 6 | "Phase 6 remains closed" in the playlist-batches page | closed |
| 7 | not found | not built (per Jonathan) |

## Unmerged branches

Counts are against GitHub `master` (`7db9cdf`), all measured by `git rev-list` and `git merge-tree` on 2026-10-17. Nothing was merged.

| Branch | Ahead of master | Carries | Merges clean into master | Order |
|---|---|---|---|---|
| `t_815835d0` | 12 | The Phase 2 to 4 base: binaural mixer and spike receipt, curation gate and studio, render contracts, local-agent transport and Unity adapter, motion render receipts, owned-source pilot pack (62 files, about 5,900 added lines) | yes | 1 |
| `t_b66d45d3` | 14 | Everything in `t_815835d0` plus pilot draft render evidence and its receipt (2 commits) | yes | 2, or skip: it is contained in `t_9edb8eb7` |
| `t_9edb8eb7` | 16 | Everything in `t_b66d45d3` plus the episode-1 manual-draft upload bundle, thumbnail and receipt (2 commits) | yes | 3, and merging this alone brings in all three |
| `t_b0e55f67` | 1 | Three owned draft production packs and a checker script (4 files, 91 lines) | yes, and clean together with `t_9edb8eb7` | 4, independent |
| `t_3dc0160f` | not on GitHub | Per Jonathan: the OAuth slot (`channelKey 'waia'`) | cannot test | after it is pushed; it touches the uploader, so review it before anything else in this table that publishes |

Branches not in Jonathan's list but present on the remote: `t_821052f8` (12 ahead: the base chain plus a restored `SirAnthony.wav` smoke asset; it deletes the pilot pack files that `t_815835d0` adds, so it is a sibling, not a descendant), `t_537ecec6` (13: adds path normalization in `unity/render.sh`), `t_7721b44f` (14: adds a Unity worktree prewarm script). These three form their own chain, merge clean with `t_9edb8eb7` pairwise, and carry only render-path and asset changes. `feature/audio-prep-mvp` has no merge base with master (unrelated history, 475 commits) and should be left alone.

**Recommended order:** merge `t_9edb8eb7` first, because it contains `t_815835d0` and `t_b66d45d3` and merges clean, so the three Jonathan listed land as one review of 16 commits. Then `t_b0e55f67`. Then the OAuth branch once pushed. The `t_7721b44f` chain can go any time after, preferably with `unity/render.sh` reviewed by whoever owns the headed lane. The only reasons to land them separately are review size and a wish to read the pilot receipts apart from the code.

## Proposed launch slate: five public-domain sources, for Jonathan

A proposal only (HB-4). The text being in the public domain is a different question from whether a particular recording of it is clean; each entry needs its narration source decided, and the AI-voice policy is Jonathan's.

1. James Allen, *As a Man Thinketh* (1903). The spike already used a LibriVox recording with archive.org metadata showing a public-domain license, checked 2026-07-09.
2. Wallace Wattles, *The Science of Getting Rich* (1910). Same: LibriVox, checked 2026-07-09.
3. James Allen, *The Way of Peace* (1907).
4. Wallace Wattles, *The Science of Being Great* (1911).
5. Neville Goddard, one pre-1964 recording, **not named**. The rule is per-recording verification and the repo's own spike found the spec-named Neville archive.org items had no license tag. One web search from here returned only retail pages. I will not put a title or date on a recording from memory. Jonathan's archive listing, or a catalog entry naming the exact recording and its date, fills this slot. If it stays empty, *Above Life's Turmoil* (James Allen, 1910) can hold the fifth place.

Excluded by rule: Abraham-Hicks Publications and equivalents.

## Short-form reuse

Goal: for each long mix, files ready to post as YouTube Shorts, Instagram Reels and TikTok. The plan ends at files on disk plus caption text. Posting stays with Jonathan.

**Plan per long mix**

1. **Choose segments by audio peaks.** Compute a loudness or spectral-energy curve for the final mix, rank sustained high-energy windows, and keep 30 to 60 second spans spaced apart, with starts snapped to a pause. Jonathan accepts or rejects each span through the same pending, accepted, rejected states the recut review already uses.
2. **Cut a 9:16 vertical from the same render.** No second render: crop and scale the long render to 1080x1920 with the existing ffmpeg recut. Each cut records `engine` and `target` as two fields copied from the parent render (HB-7).
3. **Burn in captions.** From the narration transcript (whisper service in the repo), burn the spoken line with ffmpeg inside the safe zones the thumbnail presets define.
4. **Per-platform caption text.** One block each for Shorts, Reels and TikTok, with that platform's length and hashtag habits, no engagement bait (HB-8).
5. **Carry rights onto each cut.** Each cut stores its parent mix id, the mix recipe fingerprint, and the per-source rights basis and evidence from the recipe (HB-6). A cut also needs its parent's approved review (HB-3).
6. **Output.** A folder per cut with the MP4, an `.srt`, a `captions.json` with the three platform texts, and a `cut.json` (parent, time range, peak score, engine, target, rights). Nothing is uploaded.

**What already supports it**

- `src/lib/creator/recut.ts`: recut plan with segments, scores, duration cap, aspect ratio. Scoring is positional, not audio-based.
- `src/lib/creator/ffmpegRecut.ts`, `worker/pipelines/creator-recut.ts`: executes a centre-crop cut to a target size and fps; `CreatorRecutExecutionSchema` records it.
- `CreatorPublishPlatformSchema` already names `youtube-shorts`, `tiktok`, `instagram-reels`.
- `src/lib/audio-prep/peaksGenerator.ts`: waveform peaks.
- `src/lib/services/whisperClient.ts`, `whisper-service/`: transcription.
- The recut-review route: accept or reject a segment.
- On branches: the mix recipe with per-source rights and fingerprint, and `engine`/`target` fields.

**What is missing**

- Peak-based selection and pause snapping.
- Caption burn-in: no `subtitles` or `drawtext` in `src/lib/creator/`.
- Per-platform caption text.
- Rights, fingerprint and engine on recut records.
- A "files ready to post" export folder.

**Smallest next PRs, in order**

1. A pure function that turns peaks into 30 to 60 second `RecutPlan` segments, with tests.
2. An `.srt` burn-in option in `ffmpegRecut.ts`, with a test on the generated command.
3. A short-form cut schema wrapping the recut execution record with engine, target, parent mix fingerprint, rights and the three captions.

## Short-form cuts: built (PR "Shorts from peaks")

`src/lib/creator/shorts/`: `peaks.ts` (energy curve, 30 to 59 s spans snapped to a pause, pending review), `captions.ts` (transcript or lyric text to SRT and ASS in the channel lettering, whole-name guard), `cut.ts` (ffmpeg 1080x1920 cut with burn-in, `cut.json` schema, three platform captions), `childPack.ts` (each Short registered as a child render pack with the parent's curation reference, so it meets the same publish gate; manual-draft only). Still open: uploading the mp4 to storage, the recut-review route for accepting spans, and reading rights and the recipe fingerprint straight from the batch item.

## Not verified here

- No test, render or upload was run.
- The Master Goal Spec, the local `master`, `t_3dc0160f`, and the jarvis-side receipts named in commit messages were not readable.
- Branch contents were read from the pushed remote only. Merge-cleanliness is a trial merge computed in memory, not a build or test pass on the merged result.
- No copyright status or recording date was verified.
