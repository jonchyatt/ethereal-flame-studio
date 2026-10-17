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
