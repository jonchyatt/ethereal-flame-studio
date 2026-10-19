# Merge order for the open PRs (checked 2026-10-17)

**Applied 2026-10-18 (PR sweep):** merged in this order with the resolutions below. The price join went in inside #45. #51 then fixed one problem this check missed: the static hypnosis page from #31 hid the program view (buy button, access, audio player). #42 is still open, held on a red-3 wall card because it makes a public page of patron names; its conflict 4 is already resolved on its branch. `docs/BACKLOG-STATUS.md` was refreshed after the merges.

Open: #29 to #49 (21 PRs), each branched from master separately. #17 is already merged. Method: every PR was merged onto current master (937a4b9) alone, then all 21 in number order on a scratch branch, resolving each conflict as written below. Result of the fully merged tree: `npx jest` 56 suites / 423 tests pass (with `better-sqlite3` built), and `test:merch` 16, `test:brand` 15, `test:a11y` 14, `test:backlog` 8 pass. Not run: `next build`, a browser.

## Conflicts found

Nothing conflicts with anything outside this list. Every other PR merges clean in any order.

| # | PRs | File | Why | Resolution |
|---|-----|------|-----|------------|
| 1 | #31, #33, #35, #37 vs master (#21) | `docs/PROGRAMS-PAYWALL.md` | all append or edit at the end of the file, where #21 added its section | keep both sections |
| 2 | #31, #33, #35, #37 (and #49) against each other | `docs/PROGRAMS-PAYWALL.md` | same spot, so each merge makes the next one conflict again | keep both sections, every time |
| 3 | #38 and #39 | `docs/merch/README.md` | both rewrite the "Before anything prints" bullets | take #39's three bullets, then keep #38's "Public pages" section below them |
| 4 | #37 and #42 | `src/lib/patrons/tiers.ts` | both rewrite the four tier rows (#37 `priceCents: priceFor(...)`, #42 `benefits: [...]`) | every row gets both: `priceCents: priceFor('patron:<tier>'), benefits: [...]` |
| 5 | #46 and #48 | `package.json` | both add scripts after `test:merch` | keep all four: `test:a11y`, `audit:a11y`, `test:backlog`, `backlog:refresh` |
| 6 | #33 and #49 | `src/app/programs/[id]/page.tsx` | both insert a line after the provenance paragraph | keep both: the guided-process link, then `{allowed && tracks.length > 0 && <AudioPlayer .../>}` |

Rows 1, 3, 4, 5 and 6 only show up once the first PR of the pair has merged, so GitHub will flag the second one then.

## Safe order

1. Clean, any order: #32 (green jest), #29, #30, #34, #36, #38, #40, #41, #43, #44, #46, #47.
2. Docs group, one at a time (each needs conflict 1/2, keep both): #35, #33, #31, #37.
3. After their partner: #42 (after #37, conflict 4), #49 (after #33, conflict 6), #39 (after #38, conflict 3), #48 (after #46, conflict 5).
4. #45 any time (clean), then the price join below.
5. Last: `npm run backlog:refresh` (from #48) because its tables were generated before these merged.

A squash merge does not change any of this.

## Price join (#45 into #37)

#45 keeps bundle prices in a stand-in file, `src/lib/store/bundle-prices.json` (all null). #37 owns `src/lib/prices/config.ts`. The join adds `BUNDLE_PRICES` to `config.ts` (separate from `PRICES` on purpose: #37's ladder options propose program and patron prices only, so putting bundle keys in `PRICE_KEYS` would force invented bundle prices into all three ladders), points `bundlePriceCents` at it through `priceFor`, updates the bundle test and deletes the JSON file. Everything stays null.

Which PR carries it: none of the open ones can, because each needs the other merged first and PRs are not stacked. It is the patch `docs/merge-order/bundle-price-join.patch` in the docs PR that added this file. Apply it after #37 and #45 are both on master: `git apply docs/merge-order/bundle-price-join.patch`. Checked: it applies to master plus #37 plus #45, and `npx jest src/lib/store src/lib/prices` passes (40 tests).

## Not fixed on the PR branches

Pushing resolutions to the other PR branches was refused in this session, so rows 1 to 6 are still open on those branches. A cheap way to make most of them disappear on their own is to move each PR's `PROGRAMS-PAYWALL.md` section into its own file under `docs/programs/` and to move #48's two scripts and #49's player line away from where the sibling inserts.
