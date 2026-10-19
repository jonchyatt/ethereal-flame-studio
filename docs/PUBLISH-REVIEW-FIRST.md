# Publish flow: private, review, then schedule

Rulings from Jonathan, 2026-10-19. They replace the old "post publicly" and "turn on live payments / buy a Unity seat" approval cards, which are deleted.

## Publish flow

1. **Upload PRIVATE (or unlisted).** Every episode and every Short goes to the platform as private or unlisted. Nothing is ever uploaded public.
2. **Jonathan reviews on the platform**, on phone and desktop.
3. **Then it is SCHEDULED.** Scheduling is a later, separate step.

There is no "publish publicly" approval card and none is generated again. Cards for publishing are not needed; review happens on the platform itself.

What the code does (`src/lib/creator/publishConnectors.ts`):

- YouTube: `privacyStatus` is `private`, or `unlisted` if `YOUTUBE_PUBLISH_DEFAULT_PRIVACY=unlisted`. Any other value, including `public`, falls back to `private` (`resolveYoutubePrivacy`). Schedule mode uploads private with `publishAt`.
- TikTok: privacy is pinned to `SELF_ONLY`. `TIKTOK_PUBLISH_PRIVACY_LEVEL` is ignored.
- Instagram: no private upload state exists, so the Graph path writes a manual draft unless `INSTAGRAM_GRAPH_ALLOW_DIRECT_PUBLISH` is set on purpose.

Unchanged and still enforced: HB-3 (curation gate before any upload) and HB-10 (authenticated channel id must equal UCyq4s4Nei7Q26tu7EIQY7xw before any upload call). The uploader was not run and OAuth was not touched for this change.

## Payments

The store stays in **Stripe test mode** until Jonathan says otherwise. Building storefront and subscription code continues in test mode.

## Unity

Unity renders run on Jonathan's own Windows GPUs through a local thread on his PC. No paid Unity seat, no spend. The cloud sandbox being Linux is the project's constraint, not Jonathan's. This closes the licence question in `docs/UNITY-OFF-BOX-SPIKE.md`: the off-box lane is not pursued.
