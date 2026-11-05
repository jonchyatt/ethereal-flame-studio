# Source and offer inventory — 5 November 2026

This rebuild implements the November 4 build ticket against origin/master d6c3787. The controlling reference is C:/hal-jobs/WAIA-REVIEW/SPEC-SHEET.md; ticket exceptions supersede its earlier publishing labels.

| ID | Production path / source | Actual state and use |
|---|---|---|
| A19 | public/media/appreciation/19.mp4 and 19.png | Exact final and cover from review/assets. 41.333333 s; welcome and first listening choice. |
| A12 | public/media/appreciation/12.mp4 and 12.png | Exact final and cover. 59.266667 s; second choice. |
| A04 | public/media/appreciation/04.mp4 and 04.png | Exact final and cover. 65.533333 s; third choice, comfort instruction preserved. |
| L1 | public/media/reading/serenity.mp3 and serenity.txt | James Allen, As a Man Thinketh, Serenity. Mark Cawley/LibriVox. 237.982896 s. Public domain in the US. The full text/provenance accompanies the reading; this is not the planned 20-minute session. |
| H1 | public/samples/gentle-reset-listen.m4a | Existing master audio sample, 635.716009 s. Latest master intentionally removed the old video/poster. This rebuild preserves audio-only playback with clearly decorative carving art, and restores its original VTT from 540b1c0 for the readable transcript. |
| H2 | jarvis/data/tts-render/masters/INDEX.md and master text files, referenced in the spec | Text masters, not evidence of 29 finished products. None is advertised as ready or sold. |
| P2 | Existing entitlement/catalog/content/guided records | Belief Lock-In name and legacy redirect retained. Preview and exact materials still in preparation. Existing entitled access stays intact. No checkout shown or enabled. |
| B1 | public/brand/carving/04.png, 05.png | Exact supplied carving files. Header 04; wide artwork 05. Icons are direct resized exports, no redrawing/recolouring/masking. |
| Hero | components/site/AudioAtmosphere.tsx, HeroArt | No passing living-orb round-three verdict found at rank 5. Ticket-authorized fallback: 05 plus a Web Audio analyser-driven glow. Single swap point. All same-origin media feed the analyser; silence breathes gently. Motion can be paused and reduced-motion disables it. |
| M1–M4 | public/brand/concepts/image1.jpg, image3.jpg, image2.jpg, image4.jpg | Exact doc2 renders, in tee / infinity tee / wood mug / cosmic mug order. Concept gallery only; generated-lettering issues annotated, no print-art approval, price, SKU or ordering. Optional fifth slot stays absent. |
| V1–V4 | public/media/360/[video-id].png; YouTube links in lib/site/content.ts | Actual posters, durations and Abraham Hicks credit. Four YouTube oEmbed checks returned 200 on November 5; no recordings downloaded or hosted. No claim of stereoscopic compatibility. |
| Legacy marks | docs/brand/retired/*.svg | All eight flat SVGs moved out of public. Catalog validation still checks archived source existence. |
| October mockups | docs/merch/retired/ and web/ | Already retired on current master; 14 PNGs and WebP versions stay outside public and all new pages. |
| Routes | Existing programs branch inspected | Its VR page was flag-gated and empty, already present on master. Replaced with actual V1–V4 directory rather than blindly merging. |
| Utilities | Existing shelf, access, legal, patron request/removal | Existing functional mechanisms retained within the shared shell. No new affiliate items, price changes, paid tiers, policy contracts or payment enabling. |

## Exact credits

Original clips: Voice: Jonathan Hyatt, generated from his own recordings with an AI voice clone. Words and visuals: original project work. Music: “Calm Pill 1 — Still Habitat, curated and mixed by Alaeddin Hallak. Source: CalmPills on Internet Archive; item labelled CC0.” Source: https://archive.org/details/CalmPills . The source record makes an item-level CC0 declaration; it does not independently audit each underlying recording in the curated mix. That limitation is retained for the lead's release review.

Reading: James Allen, As a Man Thinketh, “Serenity,” read by Mark Cawley. Source: https://www.archive.org/download/as_a_man_thinketh_mc_librivox/asamanthinketh_7_allen_64kb.mp3 . LibriVox public-domain statement: https://librivox.org/pages/public-domain/ . Full selected chapter, original supplied normalization and one-second fades. No claim of territorial clearance outside the US.

## Limits separate from implementation

No new voice synthesis, third-party recordings, op-art reference images, generated human photo, new paid service or public channel change. The three clips are the exact finals ordered by the ticket. Automated playback/decode/reactivity checks are not a human acoustic audition. The item-level music-rights uncertainty and headset claims are not certified by screenshots. The lead reviews and merges the draft PR.
