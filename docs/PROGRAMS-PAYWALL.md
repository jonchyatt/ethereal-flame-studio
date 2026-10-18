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
