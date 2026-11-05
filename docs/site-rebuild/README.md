# What Am I Appreciating Now rebuild

The November 4 ticket's ranks1–15 and four design concepts are implemented in `waia/spec-rebuild`. The branch targets master as a draft; the lead reviews and merges.

- [Source/offer inventory and exact credits](INVENTORY.md)
- [Every section4 criterion with PASS/FAIL and evidence](ACCEPTANCE.md)
- [Raw judge verdicts, boards and machine-readable checks](review/)
- Full local proof index: `C:/hal-jobs/WAIA-BUILD/proof/index.html`
- Handoff report: `C:/hal-jobs/WAIA-BUILD/REPORT.md`

The site uses actual04 in the shared shell and authorized05 with an audio analyser glow as the hero fallback. A19, A12 and A04 are the supplied exact finals. Serenity is3:58; the food sample is10:35 and remains audio-only as on current master. VR links to the four attributed existing videos without hosting teacher recordings. Merch remains a four-image concept gallery, with defects disclosed.

## Verification

`npx tsc --noEmit`, `npx next build`, and subscribe ESLint pass. Do not use `npm run build`, which pushes the database schema.

| Existing check | Result |
|---|---|
| `npm test -- --runInBand` | 64 suites,481 tests passed,0 skipped |
| `npm run test:subscribe:e2e` | 2 passed; local storage and operator CSV checked |
| `npm run test:brand` | 15 passed |
| `npm run test:merch` | 26 passed |
| `npm run test:a11y` | 14 passed |
| `npm run test:glow` | 5 passed |
| `npm run test:backlog` | 8 passed |

No existing test was edited, disabled or deleted. The optional ignored `audio/SirAnthony.mp3` test input was supplied locally as a generated four-second sine fixture so the existing audio test also ran. That synthetic fixture is not a production recording or committed asset. Existing Windows failures were fixed in FFmpeg path escaping, equal-energy cut ordering and generated-text line endings; assertions remained unchanged.

The production candidate also passed31 route/variant captures at both sizes,62 state captures, nine-route live axe WCAG A/AA scans with0 violations, all-five-recording playback/seek/duration checks, actual local signup/unsubscribe/custom persistence, and redirect/focus/reduced-motion checks. The proof scripts are under `scripts/site/` and use the local production server on3137. For forms, use an isolated local storage directory, `CUSTOM_ORDERS_OPEN=1`, empty notification credentials, and example.com addresses. Runtime production gates/configuration were not changed.

Argus round2 passed all four families, with seven scores each at least8. Round1 timed out/incomplete and was not treated as a pass. The seven scores and first-view limitations are in the acceptance document. All eight remote one-shot jobs were deleted after their round; the local production server was stopped after evidence capture.

The later commercial release still needs its own human acoustic/caption audition, any specific headset certification, merch print proofs/SKU facts, access/transaction validation and approved offers. Item-level CC0 labelling for the supplied curated music is recorded exactly; it is not an independent rights audit of each constituent track. No purchase, payment enabling, contract, public channel change, deployment or merge was performed.
