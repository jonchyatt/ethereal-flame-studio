# Store go-live: from test mode to the first real payment

The store sells one product end to end today, in **test mode**: "Advanced hypnosis sessions" (monthly subscription), through `/programs/advanced-hypnosis-sessions`, Stripe-hosted checkout, the signed webhook, and the access gate. Receipt of the scripted purchase: `docs/receipts/test-purchase-2026-10-18.md`.

## The one switch

```
WAIA_PAYMENTS_LIVE=on
```

That env var, set in Vercel (Project `ethereal-flame-studio` > Settings > Environment Variables > Production, then redeploy), is the only thing that turns live payments on. Anything else (unset, `off`, `true`, `1`) is test mode. It is read in one place, `paymentsLive()` in `src/lib/entitlements/stripe.ts`. Flipping it moves money (red 1), so it is Jonathan's click.

While it is off, the code never reads the live keys, refuses `sk_live_` keys, refuses live-mode Stripe sessions, and ignores live-mode webhook events. When it is on, the reverse: only `sk_live_`/`rk_live_` keys from `STRIPE_LIVE_SECRET_KEY`, only live sessions and events, webhooks checked against `STRIPE_LIVE_WEBHOOK_SECRET`, and **a program with no price is never sold** (checkout answers 503 "Not yet on sale"). Page copy follows the switch too: the "(test mode)" label and "Not yet on sale" go away only when it is on and a price is set.

To go back to test mode: delete the variable (or set `off`) and redeploy.

## Before flipping it (all inert while the switch is off)

1. **Operator line on the legal pages.** No business entity is recorded in this repo, so `OPERATOR` in `src/app/legal/LegalLinks.tsx` holds a marked placeholder for the entity name and a contact email. Fill both in. Which entity operates the site is Jonathan's answer (UNVERIFIED today).
2. **Read the legal pages** `/legal/terms`, `/legal/privacy`, `/legal/refunds`. Every statement matches what the code does. Two lines are defaults for Jonathan to confirm or change: refunds within 14 days for a charge in error or a program that did not work as described, and buyers must be 18 or over.
3. **Price.** Answer `approvals/2026-10-17-price-ladder.md` (ladder A proposes $15/month). Then set `'program:advanced-hypnosis-sessions'` in `src/lib/prices/config.ts` (cents). Test mode charges that price too once it is set, so run the test purchase again after setting it.
4. **Stripe account and live keys.** Which Stripe account WAIA uses is UNVERIFIED. In that account's live mode: create a webhook endpoint `https://www.whatamiappreciatingnow.com/api/programs/webhook` for `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`; turn on the customer portal (Settings > Billing > Customer portal). Put `STRIPE_LIVE_SECRET_KEY` and `STRIPE_LIVE_WEBHOOK_SECRET` in Vercel Production. They are ignored until the switch is on.
5. **Something to sell.** Hand over at least one session to private storage (`hypnosis/catalog.json` and the program files, see `docs/PROGRAMS-PAYWALL.md`). Without it a buyer gets access to an empty program.
6. **Test mode in production first.** Put `STRIPE_TEST_SECRET_KEY` and `STRIPE_TEST_WEBHOOK_SECRET` (same account, test mode, same webhook URL) in Vercel, redeploy, and buy once on the live site with card `4242 4242 4242 4242`.

## Operator key (closes the audit's "operator key missing" gap)

The operator key is `WAIA_OPERATOR_SECRET`. Without it, every operator screen and API (approval queue, custom-order queue, patron review, counter summary) answers 503, so nobody can review the patron sign-ups arriving on the live site. One was generated on 2026-10-18 and kept outside every repo, together with a cookie secret, in:

```
C:\Users\jonch\.jarvis\waia-store.env     (WAIA_OPERATOR_SECRET, WAIA_OPERATOR_ID, ENTITLEMENT_COOKIE_SECRET)
```

Set all three in Vercel Production (Settings > Environment Variables, or `vercel env add WAIA_OPERATOR_SECRET production` and paste), then redeploy. Check: `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer <key>" https://www.whatamiappreciatingnow.com/api/custom-orders` answers something other than 503. To make a new one: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Never commit it. `.env.example` documents every store variable.

Not done here: setting it in Vercel. This session had no working Vercel login (the saved CLI token is rejected), and setting env plus redeploying is a deploy.

## Scripted test purchase

```
npx tsx scripts/store/purchase-test.ts
```

Runs the real checkout, webhook and content route handlers in-process against a temp storage folder, with Stripe answered by an in-process stub. Twelve checks: locked before purchase, checkout opens, signed cookie set, Stripe is asked for the right subscription and amount, still locked before payment, paid, forged webhook refused, signed webhook grants, unlocked after, replay harmless, live-mode event ignored, live key refused. Writes `docs/receipts/test-purchase-<date>.md`, exits 1 on any failure, and refuses to run if `WAIA_PAYMENTS_LIVE` is on.

Against real Stripe test mode (needs a test key, none was available on 2026-10-18):

```
STRIPE_TEST_SECRET_KEY=sk_test_... npx tsx scripts/store/purchase-test.ts --real
```

It prints the Checkout URL; pay it with card `4242 4242 4242 4242`, any future expiry, any CVC. It polls Stripe until paid, then delivers that real session to the webhook. Receipt: `docs/receipts/test-purchase-<date>-real.md`.

## Bare domain: whatamiappreciatingnow.com shows the old visualizer

Finding (live, 2026-10-18): `https://whatamiappreciatingnow.com` answers `307` with `Location: https://www.whatamiappreciatingnow.com/` from Vercel, before this app's code runs. `www` then serves the Ethereal Flame Studio visualizer because `WAIA_WWW_FRONT_DOOR` is not set. The code side is already done (`src/lib/waia/front-door.ts`, `src/middleware.ts`): the bare domain always gets the front door, and `www` gets it when the flag is on. **It is a Vercel setting, not code.** Either step publishes the new homepage under the business name (red 3), so it is Jonathan's:

- **Option A (recommended, one variable, keeps www as the main address):** Vercel > Project `ethereal-flame-studio` > Settings > Environment Variables > Production: add `WAIA_WWW_FRONT_DOOR` = `on`, then Deployments > latest Production > Redeploy. The bare domain still redirects to www, and www now shows the front door at `/` and the store at `/store`. This is `approvals/2026-10-19-www-front-door.md`. Preview first, privately: `https://www.whatamiappreciatingnow.com/preview/front-door`.
- **Option B:** Vercel > Project > Settings > Domains > `whatamiappreciatingnow.com` > Edit: change "Redirect to www.whatamiappreciatingnow.com" to "Connect to an environment: Production", save. The bare domain then serves the front door itself; www keeps the visualizer unless option A is also done.

Check after either: `curl -sI https://whatamiappreciatingnow.com` and `curl -s https://www.whatamiappreciatingnow.com/ | grep -o "<title>[^<]*"` should no longer say "Ethereal Flame Studio".
