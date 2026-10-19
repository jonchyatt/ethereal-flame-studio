# Test purchase receipt, 2026-10-18

Result: **PASS** (12/12 checks)

- Run: `npx tsx scripts/store/purchase-test.ts` at 2026-10-19T05:46:54.702Z, commit daa9e2b
- Stripe: stubbed in-process. No call reached Stripe; this proves our checkout, webhook and access code, not Stripe itself. Run with `--real` and a test key for that.
- Payments switch: WAIA_PAYMENTS_LIVE unset (test mode). Storage: a fresh temp folder, not production.
- Product: Advanced hypnosis sessions (`advanced-hypnosis-sessions`), subscription, charged 500 cents USD a month (test price: no real price is set yet)
- Checkout session: `cs_test_stub_ef7a4f638592854d`; webhook event: `evt_test_b2a8d88eed9a30ac`; customer: `cus_57ef26ee...`

| Check | Result | Detail |
|---|---|---|
| locked before purchase | PASS | content without a cookie answers 402 |
| checkout opens | PASS | 200, https://checkout.stripe.com/c/pay/cs_test_stub_ef7a4f638592854d |
| customer cookie set | PASS | waia_customer=cus_57ef26ee... (signed) |
| Stripe asked for the right thing | PASS | subscription, 500 cents USD a month, client_reference_id and programId match |
| still locked before payment confirms | PASS | cookie alone opens nothing |
| Stripe reports paid | PASS | cs_test_stub_ef7a4f638592854d, payment_status=paid, livemode=false |
| forged webhook refused | PASS | wrong signature answers 400 |
| signed webhook grants access | PASS | 200, action=grant |
| unlocked after purchase | PASS | 200, program content served to the buyer |
| replayed webhook is harmless | PASS | same event id twice, access unchanged |
| live-mode event ignored in test mode | PASS | action=ignore |
| a live key is refused in test mode | PASS | checkout answers 503 "Not yet on sale" |
