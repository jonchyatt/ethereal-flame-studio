# Programs paywall and entitlements (test mode)

Backlog item 1. Paid programs on whatamiappreciatingnow.com: `/programs`, `/programs/<id>` (gated). The free Reset Biology tools are never in the catalog (`FREE_TOOLS` guard in `src/lib/entitlements/catalog.ts`).

- **Catalog**: advanced hypnosis sessions (subscription) and the Yale inversion protocol guided process (one-time). Prices are config: `priceCents: null` = not yet on sale. `testPriceCents` is used only against Stripe test keys. No program words are in the repo; they live in private storage at `programs/<id>.md`, handed over by Jonathan.
- **Identity**: anonymous signed cookie `waia_customer` (opaque `cus_...` id). No names, emails or card data stored here.
- **Entitlements**: one JSON record per customer in the storage adapter (`entitlements/<id>.json`). One-time never expires; subscriptions open only until a stored period end; revoked or unknown fails closed. Webhook replays are ignored by event id.
- **Payments**: Stripe REST, test mode only. `sk_live_` keys are refused in code and live-mode sessions/events are ignored. Live mode is red 1 (moves money) and stays Jonathan's click.

## Env (set locally or in Vercel by Jonathan; never committed)
`ENTITLEMENT_COOKIE_SECRET` (16+ chars), `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`. Point a Stripe test webhook at `/api/programs/webhook` for `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Enable the Stripe test-mode customer portal (Settings > Billing > Customer portal) for the manage page's button. Without them checkout answers 503 "Not yet on sale".

## Checks
`npx jest src/lib/entitlements`. Also run end to end on a local dev server: no cookie 402, bad signature 400, signed test webhook grants, content opens for the granted program only.

## Subscription lifecycle (backlog item 1 of the refreshed queue)
- **Renewal**: `invoice.paid` moves the stored period end forward and clears any past-due mark. Checkout's 3-day opening window never shortens an end that `invoice.paid` already set (events can arrive out of order).
- **Cancellation**: the portal sets `cancel_at_period_end`; the grant shows "cancelled, open until <date>" and closes at that date. `customer.subscription.deleted` or a status of canceled, unpaid or incomplete_expired closes it at once.
- **Payment failed**: `invoice.payment_failed` marks the grant past due and keeps it open `GRACE_DAYS` (7) from the first failure, then it fails closed. A later `invoice.paid` ends the grace.
- **Manage my access**: `/programs/manage` (noindex) lists this browser's programs with plain status words, from the same function the gate uses (`summarizeAccess`), and opens the Stripe billing portal (test key only; live-mode sessions refused) for cancel, card and invoices.
- Lapsed, revoked, unknown or unsigned always means closed. Checks: `npx jest src/lib/entitlements`.

Not done here: protocols Jonathan has not handed over (no entry, nothing invented); real prices.

## Custom session order flow (backlog item 4)
The store's "Ask for custom work" form now sends requests to a queue instead of only echoing them. No payment is taken anywhere in this flow (red 1 stays Jonathan's click).

- **Intake**: `POST /api/custom-orders` (kind, details up to 1000, optional contact up to 200, hidden `website` honeypot). Closed with 503 "Not open yet" until `CUSTOM_ORDERS_OPEN=1`; while closed the form falls back to the old show-it-back preview.
- **Storage**: one JSON record per order at `custom-orders/<id>.json` in the storage adapter (R2 in production), never in the repo. Contact text lives only there and is never returned by the public status route.
- **Customer**: gets a reference `ord_….secret` once (only its sha256 is stored). `/store/custom-order#ref=…` shows status, and once quoted, the quote with Accept / Decline.
- **Operator**: `/operator/custom-orders` (noindex) with `WAIA_OPERATOR_SECRET` as a Bearer secret, the same as the playlist routes. Lists the queue, starts review, sets a quote (amount and note), marks declined or closed.
- **Statuses**: received, in_review, quoted (needs a quote), accepted, declined, closed. Skips are refused; the customer can only accept or decline a quoted order.

Check: `npx jest src/lib/custom-orders src/lib/store`. Also run on a local dev server: submit, operator quote, customer accept.
Not done here: taking payment for an accepted quote; emailing customers (the operator reads contact in the view and replies themselves); rate limiting beyond the honeypot.

## Guided process (backlog item 2)
`/programs/<id>/session` plays a step-by-step session for any catalog program marked `guided` (today: the Yale inversion protocol). Behind the same entitlement check as the program page; `GET /api/programs/<id>/session` answers 402 without access, 404 when not handed over.

- **Shape only in the repo.** `src/lib/entitlements/guided.ts` defines a valid session (title, preface, steps with `read | prompt | silence`, optional seconds, closing). The steps themselves are one JSON file in private storage at `programs/<id>.session.json`. A malformed file fails closed (treated as not handed over).
- **Player.** One step at a time, optional timer, Back/Next, notes held in the browser tab only and never sent. No protocol words in code, tests or fixtures.
- **Hand-over.** Jonathan (or a local step) writes `programs/yale-inversion-protocol.session.json` to the storage bucket from the jarvis sources; nothing is published until priced and switched on.

### Receipt 2026-10-17 (reading the jarvis sources)
- `jonchyatt/jarvis` attached read-only and cloned. Present and read: `docs/reset-biology/sources/yale-attachment-protocol-doc.txt` (a JSON-wrapped chat export, ~55k chars), `docs/reset-biology/mmm-v4-three-layer-and-inverse-yale-spine.md`, `tools/mental-mastery-workshop/` (frameworks.json holds the encoded `inverse_yale`, `attachment-protocol`, `yale-gpt`).
- **Missing:** `data/pathways-corpus-content-distilled/mental-mastery-script-doctrine.md` is not in the jarvis repo (`find` finds no such file, no `data/pathways-corpus-content-distilled/` directory; `.claude/agents/content-specialist.md` still points at it, so it is probably local-only). Not substituted or guessed.
- Not done on purpose: converting the protocol into the session JSON. That is the protocol's words, so it goes to private storage, not this PR. See the approval card.

## Advanced hypnosis sessions catalog (backlog item 3)
`/programs/advanced-hypnosis-sessions` lists sessions; `/programs/advanced-hypnosis-sessions/<id>` shows one with its rights and provenance. Schema and validation: `src/lib/hypnosis/catalog.ts`. Entries are read from private storage at `hypnosis/catalog.json` (a JSON array handed over by Jonathan); none are in the repo. An entry missing script author, voice, music or rights basis is dropped (HB-6); `rightsVerified` is false unless set to `true`. Status reads "Not yet on sale" until the program has a price. Check: `npx jest src/lib/hypnosis`.
