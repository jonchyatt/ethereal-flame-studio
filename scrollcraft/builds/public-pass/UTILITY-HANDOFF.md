# Six utility routes: group 3 handoff

Scope: `/patrons`, `/patrons/join`, `/patrons/remove`, `/programs/manage`, `/support`, `/email-preferences`.
Base: `4864239`. Branch: `waia/scrollcraft-utility-draft`.

The six routes use `UtilityPage` → the existing `ScrollPage`. Their names are `patrons`, `patrons-join`, `patrons-remove`, `programs-manage`, `support`, and `email-preferences`.
All new CSS is confined to those six `data-scroll-page` values. No shared adapter, shared stylesheet, hero, merchandise, API, validation, or legal source changed.
Existing words and callbacks remain. The work adds readable vertical fields, full-label consent targets, warm selection states, compact working surfaces, and existing actions in the shared dock.
These are task pages, not four-act stories. Do not claim four device families, a dimensional hero, or a narrative peak for them. No content or empty scrolling stages were added to manufacture those scores.

## Local checks

- Nine TSX files passed TypeScript syntax diagnostics; PostCSS parsed the scoped stylesheet.
- Existing JSX text compared against the base commit is unchanged on all eight edited route/client files.
- Isolated React fixtures ran the actual page/client components and shared dock, with mocked storage, cookies, and APIs; no Next install/build or external service writes.
- Inspected all 18 screenshots at 390×844 and 1440×900: initial six routes, retry preferences, an active legacy record, and the populated join form.
- All 16 initial route/state/width samples had no horizontal overflow and the complete headline above the fold. Consent labels were at least 48px tall; text fields and submit controls at least 48px.
- Four intercepted join/removal submissions and support FormData passed; no browser page errors. The browser was isolated, headless, and closed afterward.
- Scratch evidence: `C:/hal-jobs/waia-utility-proof/`; harnesses: `C:/hal-jobs/waia-utility-fixture.cjs` and `waia-utility-check.cjs`.
- Root agent still owns integrated build, live verification, release, and durable evidence. Fixture checks do not verify live storage, cookies, billing, or mail clients.

## Interaction selectors and expected operations

| Route | Selectors and expectations |
| --- | --- |
| `/patrons` | `main a[href='/patrons/join']` = Request a name display; `main a[href='/patrons/remove']` = Remove my name. Empty wall still says no published names. Populated `.utility-wall-list` preserves display names and optional messages. No write action here. |
| `/patrons/join` | `input[name='tier'][value='plain|glowing|sparkly|ethereal']`; label Name or alias; conditional label One short message for ethereal; `.patron-consent input` indexes 0 and 1; `form button[type='submit']`. Submit stays disabled until both checks and trimmed name. Preview uses trimmed name/message. POST `/api/patrons/intake`, JSON `{displayName, tier, consent, adult, website, message?}`; message is trimmed and omitted unless nonempty and allowed by tier, honeypot `website` remains empty for a person. Mock `{ok:true,consentRef:'fixture-code'}` shows Thank you and the code; `{ok:false,errors:[...]}` preserves error list. Network failure and Sending… states remain. |
| `/patrons/remove` | Labels The code you were given when you signed up and Anything we should know; `form button[type='submit']`. Native required code, optional note max300. POST `/api/patrons/removal`, JSON `{consentRef:ref,note}`. 2xx replaces form with existing Received status. 429 shows rate limit text; other failures show existing error. |
| `/programs/manage` | Empty state has `main a[href='/support'][data-sc-primary]`. Active/cancelling/grace records retain Open program links; lapsed/revoked stay closed. Billing appears only with provider customer + subscription. `.utility-billing button[data-sc-primary]` keeps `go`: POST `/api/programs/manage/portal`, no request body; `{url}` with success navigates to URL. Intercept before clicking. 503 → Not yet on sale.; other response failure → Billing management is unavailable right now. Existing network rejection handling was not changed. |
| `/support` | `#support-topic` name subject, `#support-note` name body, `form button[type='submit']`. Form remains GET to `mailto:support@whatamiappreciatingnow.com`; it opens an email app and does not POST to the site. Attach a preventDefault submit listener and inspect `new FormData(form)` when verifying, to avoid opening or sending mail. All three reference sections and legal links remain. |
| `/email-preferences` | Default status and `status=retry` branches remain. Retry link exists only with retry + token, href `/api/unsubscribe?token=` + encodeURIComponent(token). Use an intercepted fake token link. No-token retry still offers Return to listening and Contact Support. The dock prefers Retry unsubscribe when present; otherwise Return to listening. |

Dock checks: `[data-sc-action-dock]` appears when the original candidate leaves the viewport, invokes the original button, and inherits disabled state. Join/Remove/Support are found by native submit selectors; billing has both `data-sc-primary` and the existing `.actions > .primary` selector shape. Successful join/removal removes the original submit, so its dock must disappear. Phone navigation should suppress the dock while the menu is open.

## Existing relevant test suites

- `src/lib/patrons/__tests__/intake.test.ts`: consent, adult, tier/message validation, pending moderation, removal, unknown refs, rate limits.
- `src/lib/patrons/__tests__/wall.test.ts`: empty/published wall, approved-only names, removal visibility, malformed snapshot.
- `src/lib/patrons/__tests__/patrons.test.ts`: schema, moderation, escaping, consent, frozen snapshots.
- `src/lib/entitlements/__tests__/entitlements.test.ts`: access states, signed cookies, subscription lifecycle, portal adapter.
- No dedicated JoinForm, removal page, support form, preferences page, or unsubscribe route Jest suite was found. `src/app/api/subscribe/__tests__/route.test.ts` covers signup, not unsubscribe; do not claim it verifies preferences.

## Integrated review

Full bash build passes. Existing patron/entitlement suites: 60/60 tests; brand/merch/accessibility: 55/55. The first accessibility run caught loss of the original #8c8c9e field border in the refactor; it is restored on the actual name/message/reference/note inputs, with no test changes. All sixteen 390/1440 local route captures pass overflow, continuous action, WCAG contrast and browser-error checks. Intercepted join consent/error/retry, removal required/error/retry, support mailto FormData and token-preserving unsubscribe retry pass at both widths. The two mug routes now opt into the already reviewed merchandise family.
