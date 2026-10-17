# Memory

## 2026-10-17 digest: State of the ring

- Full inventory is in `docs/WAIA-STATE-OF-THE-RING-2026-10.md`.
- GitHub `master` is `7db9cdf` (2026-07-08). The binaural mixer, curation gate, render contracts and local-agent path exist only on unmerged branches; `t_9edb8eb7` contains `t_815835d0` and `t_b66d45d3` and trial-merges clean.
- The Master Goal Spec was not readable from the jarvis repo, so the stage and phase labels in that doc are inferred.
- Open gaps: publish does not consult the review gate; the WAIA channel id is a constant and a manifest check but is not asserted against the authenticated channel; no performance read-back; Shorts cuts, peak selection and caption burn-in not built.
- Jonathan's facts, not verified here: Phase 4d not done, Phases 5 to 7 not built, thumbnail planner never verified, Unity `-batchmode` fails on the Personal license (only `--headed` works), OAuth slot lives on an unpushed branch `t_3dc0160f`.
