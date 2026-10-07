# WAIA episode 1 manual-draft upload bundle receipt

Date: 2026-10-07
Kanban card: `t_9edb8eb7`
Branch: `t_9edb8eb7`
Mode: manual-draft only; no upload or publication performed

## Delivered

- `data/content/waia-episode-1-upload-draft/manifest.json`
- `data/content/waia-episode-1-upload-draft/thumbnail.jpg` — generated local 1280x720 JPEG from the owned local draft render, with reversible text overlay.
- `scripts/check-waia-episode-1-upload-draft.mjs`
- `scripts/run-waia-manual-draft-dry-run.ts` — dynamic harness for the existing `runPublishConnector()` path; it clears YouTube credential variables and installs a throwing `videos.insert()` sentinel.

The manifest resolves `@What_Am_I_Appreciating_Now` to channel ID `UCyq4s4Nei7Q26tu7EIQY7xw`, carries a title set, source-attributed description, six provisional chapters, tags, thumbnail brief, private/unpublished/manual-draft fields, and no credential material. The source/render rights state remains `HOLD-MEDIA`.

## Verification run

Existing checks:

```text
PASS: WAIA owned-source pilot pack is a complete local manual draft; publication remains blocked.
PASS: local WAIA owned-source pilot draft is probeable, H.264/AAC, source-bound, and publication-blocked.
```

Bundle checker:

```text
INFO: publish dry-run guard statically verified; dynamic TSX execution is available via scripts/run-waia-manual-draft-dry-run.ts.
PASS: WAIA episode-1 bundle has metadata, owned-source attribution, 1280x720 thumbnail, explicit private/manual-draft state, WAIA channel selection, no credentials, and zero YouTube insertion.
```

The checker validates the existing connector's no-credential manual-draft branch, the harness's zero-insertion sentinel, metadata, attribution, thumbnail dimensions, explicit publication state, channel ID, and credential-key absence.

## Runtime limitation

The dynamic harness was attempted, but this worktree's dependency checkout is incomplete and the shared EFS `tsx`/esbuild runtime repeatedly stopped or timed out before executing the script. The existing WAIA operator-auth Jest test was also not runnable from this worktree because `node_modules/jest/bin/jest.js` is absent in the worktree's partial dependency tree. No credentials were entered and no external API call was made. This receipt therefore records the static zero-insertion guard as verified, not a fabricated dynamic-pass claim.

## Repository proof

Commit: `e29c5e3ad8dde3503227089a6c0e18ab061955c0`
Pushed remote branch: `origin/t_9edb8eb7`
Pull request URL (not opened): `https://github.com/jonchyatt/ethereal-flame-studio/pull/new/t_9edb8eb7`
