# Memory

## 2026-10-17 digest: State of the ring

- Full inventory is in `docs/WAIA-STATE-OF-THE-RING-2026-10.md`.
- GitHub `master` is `7db9cdf` (2026-07-08). The binaural mixer, curation gate, render contracts and local-agent path exist only on unmerged branches; `t_9edb8eb7` contains `t_815835d0` and `t_b66d45d3` and trial-merges clean.
- The Master Goal Spec was not readable from the jarvis repo, so the stage and phase labels in that doc are inferred.
- Open gaps: publish does not consult the review gate; the WAIA channel id is a constant and a manifest check but is not asserted against the authenticated channel; no performance read-back; Shorts cuts, peak selection and caption burn-in not built.
- Jonathan's facts, not verified here: Phase 4d not done, Phases 5 to 7 not built, thumbnail planner never verified, Unity `-batchmode` fails on the Personal license (only `--headed` works), OAuth slot lives on an unpushed branch `t_3dc0160f`.

## 2026-10-17 digest: Land the base chain

- PR opened from `claude/project-thread-qnxyst` (`t_9edb8eb7` plus one merge of `master` at `fd3d3e6`; no rebase, squash or force-push). Merge was clean.
- On the merged tree: `npm install` ok; `tsc` has 1 error (`scripts/run-waia-manual-draft-dry-run.ts:28`, a `.ts` import extension) that master does not have; jest 161 passed, 3 suites fail identically on master (two need network, one imports a missing `retrieval.js`).
- Nothing was run against YouTube, OAuth, env or production databases.

## 2026-10-17 digest: Publish gate and channel check

- Publish job now refuses (logged, no connector call, job marked failed) unless the item it points to (`curation: {batchJobId, itemIndex}` in publish metadata) is in an approved state with a current approval, a rights basis and a mix recipe fingerprint. No reference means refusal.
- YouTube API path asks `channels.list(mine)` and aborts unless the one returned channel is `UCyq4s4Nei7Q26tu7EIQY7xw`, before `videos.insert`. The upload-only OAuth scope may not allow that call; if so the check fails closed and the credentials slot needs a read scope (not changed here).
- No-credentials path still writes the manual-draft manifest, now with channel id and curation evidence, and checks both before writing.
- Existing creator queue does not yet set `curation`, so queued publishes are refused until the curated-item-to-publish wiring lands.
- jest for `src/lib/creator` and `src/lib/playlist-batch`: 34 pass. Nothing run against YouTube, OAuth, env or production databases.

## 2026-10-17 digest: Wire curated items to publish

- Render packs now carry optional `curation: {batchJobId, itemIndex}`; `queueCreatorPackPublishJobs` copies it into the publish job metadata (null when absent, so a pack without it still queues and is refused by the gate as before).
- No playlist-batch code creates a render pack, so the smallest path added is `curation` accepted on `POST /api/creator/render-packs`. The route does not check the item; the gate checks it at publish time. Nothing yet creates packs automatically from approved batch items.
- New jest: queue copies curation; end-to-end manual-draft lane through `runPublishPipeline` (release-approved item writes the manifest with curation evidence and the WAIA channel id; pending item fails with the gate reason and writes nothing). `tsc` clean; creator and playlist-batch suites pass. `publishGate.ts` unchanged. Nothing run against YouTube, OAuth, env or production databases.

## 2026-10-17 digest: Brand image workflow

- `scripts/brand/`: `guide.mjs` (exact lemniscate guide PNG, no dependencies), `generate.mjs` (Gemini image models, default `gemini-3-pro-image`, key from `GEMINI_API_KEY` only, logo + guide as references, text-free rule appended, recipe `.json` beside each candidate), `compose.mjs` (upright "What Am I" / "Appreciating" on the lobes' top arcs, gold "Now" at the crossing, SVG out, optional PNG via Playwright). Prompts in `brand/prompts/` (vortex ribbon, carved-wood relief, icon, shirt print); pick process in `brand/review.md`.
- Built from the description: the jarvis reference scripts (`waia-brand-infinity.mjs`, `argus-imagine.mjs`) were not reachable from this session, so the geometry reuses the infinity curve in `generate-brand-marks.mjs`, not a port.
- `node --test scripts/brand/brand.test.mjs`: 9 pass (geometry, PNG, layout, request building, mocked fetch). Nothing run against the Gemini API; no image has been generated or judged.

## 2026-10-17 digest: Land owned RB draft packs (from t_b0e55f67)

- Cherry-picked the one commit on `t_b0e55f67` onto master: three owned Reset Biology draft packs (`waia-owned-rb-food-peace-v1`, `-hunger-noticing-v1`, `-evening-rest-v1`) plus `scripts/check-waia-three-owned-rb-packs.mjs`. Docs and a check script only; no runtime code touched.
- Gate review: all three are `private-draft-only`, `publication.blocked: true`, `connectorMode: manual-draft`, no upload id, URL or schedule, rights state `HOLD-MEDIA`, no third-party audio, and no credentials or channel id. They cannot reach upload without the curation gate.
- The check script passes every structural rule here but fails the file-readable checks, because the source masters and mp3s live on Jonathan's machine (same local-path pattern as the pilot pack). Run it there.

## 2026-10-17 digest: Branch t_3dc0160f has nothing left

- Its 11 commits are a strict subset of `t_9edb8eb7` (landed in PR #2); its files match the PR #2 merge exactly. No OAuth upload slot found in it. Note in `docs/WAIA-BRANCH-t_3dc0160f-NOTE.md`; no code changed.
