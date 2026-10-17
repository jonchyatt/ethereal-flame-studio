# Programs paywall and entitlements (test mode)

Backlog item 1. Paid programs on whatamiappreciatingnow.com: `/programs`, `/programs/<id>` (gated). The free Reset Biology tools are never in the catalog (`FREE_TOOLS` guard in `src/lib/entitlements/catalog.ts`).

- **Catalog**: advanced hypnosis sessions (subscription) and the Yale inversion protocol guided process (one-time). Prices are config: `priceCents: null` = not yet on sale. `testPriceCents` is used only against Stripe test keys. No program words are in the repo; they live in private storage at `programs/<id>.md`, handed over by Jonathan.
- **Identity**: anonymous signed cookie `waia_customer` (opaque `cus_...` id). No names, emails or card data stored here.
- **Entitlements**: one JSON record per customer in the storage adapter (`entitlements/<id>.json`). One-time never expires; subscriptions open only until a stored period end; revoked or unknown fails closed. Webhook replays are ignored by event id.
- **Payments**: Stripe REST, test mode only. `sk_live_` keys are refused in code and live-mode sessions/events are ignored. Live mode is red 1 (moves money) and stays Jonathan's click.

## Env (set locally or in Vercel by Jonathan; never committed)
`ENTITLEMENT_COOKIE_SECRET` (16+ chars), `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`. Point a Stripe test webhook at `/api/programs/webhook` for `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`. Without them checkout answers 503 "Not yet on sale".

## Checks
`npx jest src/lib/entitlements`. Also run end to end on a local dev server: no cookie 402, bad signature 400, signed test webhook grants, content opens for the granted program only.

Not done here: protocols Jonathan has not handed over (no entry, nothing invented); real prices; subscription grace logic beyond a 3-day window until `invoice.paid` arrives.

## Custom session order flow (backlog item 4)
The store's "Ask for custom work" form now sends requests to a queue instead of only echoing them. No payment is taken anywhere in this flow (red 1 stays Jonathan's click).

- **Intake**: `POST /api/custom-orders` (kind, details up to 1000, optional contact up to 200, hidden `website` honeypot). Closed with 503 "Not open yet" until `CUSTOM_ORDERS_OPEN=1`; while closed the form falls back to the old show-it-back preview.
- **Storage**: one JSON record per order at `custom-orders/<id>.json` in the storage adapter (R2 in production), never in the repo. Contact text lives only there and is never returned by the public status route.
- **Customer**: gets a reference `ord_….secret` once (only its sha256 is stored). `/store/custom-order#ref=…` shows status, and once quoted, the quote with Accept / Decline.
- **Operator**: `/operator/custom-orders` (noindex) with `WAIA_OPERATOR_SECRET` as a Bearer secret, the same as the playlist routes. Lists the queue, starts review, sets a quote (amount and note), marks declined or closed.
- **Statuses**: received, in_review, quoted (needs a quote), accepted, declined, closed. Skips are refused; the customer can only accept or decline a quoted order.

Check: `npx jest src/lib/custom-orders src/lib/store`. Also run on a local dev server: submit, operator quote, customer accept.
Not done here: taking payment for an accepted quote; emailing customers (the operator reads contact in the view and replies themselves); rate limiting beyond the honeypot.

## Audio player (backlog item 15)
A gated audio player on `/programs/<id>`, shown only to customers with access and only when a manifest exists. The audio itself is whatever Jonathan hands over; nothing is invented or stored in the repo.

- **Storage (private)**: `programs/<id>/audio.json` = `{ "tracks": [{ "id", "title", "file", "contentType" }] }` and the bytes at `programs/<id>/audio/<file>`. `contentType` is audio/mpeg, audio/mp4, audio/ogg or audio/wav. A manifest with a path in `file` or bad JSON shows nothing.
- **Route**: `GET /api/programs/<id>/audio/<track>` checks the signed cookie and the entitlement on every request (402 otherwise, fail-closed), answers `Range` requests (206/416) so seeking works, and sends `Cache-Control: private, no-store`. No storage URL ever reaches the browser. The file is read whole per request, fine for session-length audio; move to a ranged storage read if files get very large.
- **Player**: play/pause, seek, buffering message, resume where you left off (per program, kept in the browser only, skips the first 5 s and last 10 s), sleep timer of 10 to 60 minutes with a 20 s fade then pause.
- **Fixture**: `npx tsx scripts/programs/seed-fixture-audio.ts [programId]` writes a 3 s quiet tone and manifest into local storage for a preview. Local only; never run against production storage.

Check: `npx jest src/lib/entitlements`. Also run on a local dev server with Chromium: no cookie 402; granted cookie 200 and 206 ranges; page shows the player only when granted; play advances time, pause stores the resume point, the timer opens.
Not done here: real recordings; download protection beyond not exposing a URL (a paying listener can still record playback); offline/background-play controls.
