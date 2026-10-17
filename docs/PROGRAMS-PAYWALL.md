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

## Guided process (backlog item 2)
`/programs/<id>/session` plays a step-by-step session for any catalog program marked `guided` (today: the Yale inversion protocol). Behind the same entitlement check as the program page; `GET /api/programs/<id>/session` answers 402 without access, 404 when not handed over.

- **Shape only in the repo.** `src/lib/entitlements/guided.ts` defines a valid session (title, preface, steps with `read | prompt | silence`, optional seconds, closing). The steps themselves are one JSON file in private storage at `programs/<id>.session.json`. A malformed file fails closed (treated as not handed over).
- **Player.** One step at a time, optional timer, Back/Next, notes held in the browser tab only and never sent. No protocol words in code, tests or fixtures.
- **Hand-over.** Jonathan (or a local step) writes `programs/yale-inversion-protocol.session.json` to the storage bucket from the jarvis sources; nothing is published until priced and switched on.

### Receipt 2026-10-17 (reading the jarvis sources)
- `jonchyatt/jarvis` attached read-only and cloned. Present and read: `docs/reset-biology/sources/yale-attachment-protocol-doc.txt` (a JSON-wrapped chat export, ~55k chars), `docs/reset-biology/mmm-v4-three-layer-and-inverse-yale-spine.md`, `tools/mental-mastery-workshop/` (frameworks.json holds the encoded `inverse_yale`, `attachment-protocol`, `yale-gpt`).
- **Missing:** `data/pathways-corpus-content-distilled/mental-mastery-script-doctrine.md` is not in the jarvis repo (`find` finds no such file, no `data/pathways-corpus-content-distilled/` directory; `.claude/agents/content-specialist.md` still points at it, so it is probably local-only). Not substituted or guessed.
- Not done on purpose: converting the protocol into the session JSON. That is the protocol's words, so it goes to private storage, not this PR. See the approval card.
