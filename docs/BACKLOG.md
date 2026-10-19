# What Am I Appreciating Now: backlog

Written 2026-10-17 under the SEAT CONTRACT (everything is GREEN unless it is one of five REDs). Covers the project's first 15 hours (2026-10-17 02:36 to 15:32 UTC), every thread and PR #1 to #17. Weekly refresh: what shipped, what is queued, what is believed red and why.

The five REDs: **R1** moves money. **R2** signs or binds. **R3** publishes publicly under Jonathan's or a business name. **R4** destroys or cannot be undone. **R5** hands Jonathan's credentials to a third party.

Not verified here: whether the jarvis repo files named below say what the notes assume (that repo was not readable from this session), and nothing in this file has been run against YouTube, OAuth, Vercel, env files or a production database.

## 1. What shipped (all merged on master)

| PR | What |
|---|---|
| #1 | State of the ring doc (inventory, gaps, branch table) |
| #2 | Base chain landed: binaural mixer, curation gate, render contracts, Unity adapter, pilot pack |
| #3 | Publish job refuses uncurated items; authenticated channel id asserted equal to UCyq4s4Nei7Q26tu7EIQY7xw before any insert |
| #4 | Render packs carry `curation`; queue copies it to publish jobs; end-to-end manual-draft tests |
| #5 | Launch slate, source library rights table, quote-clip line, first ten episodes (all "for Jonathan") |
| #6 | Brand marks, mockups, not-yet-on-sale store page |
| #7 | Patron wall: schema, moderation, frozen snapshot, Unity PatronWall, closing card, policy doc |
| #8 | Unity 360 off-box spike: go/no-go, Dockerfile, Modal stub |
| #9, #13 | Brand image workflow (guide, Gemini generator, lettering composer) and its 16:9 fix |
| #10 | Deploy workflow no longer fails on every push |
| #11 | "Support the channel" section on the store page |
| #12, #17 | Render pack created for each release-approved batch item, with contents (title, description, chapters, captions, thumbnail brief, patrons pointer) |
| #14, #15 | Three owned Reset Biology draft packs; note that `t_3dc0160f` has nothing left |
| #16 | Shorts: 9:16 cuts at audio peaks, burned-in captions, registered as gated child packs |

### Shipped from the first queue (2026-10-17, PRs #19 to #33)

Merged on master: #19, #22, #23, #24, #25, #26, #28. Open and ready for Jonathan's squash-merge (except #29, still a draft): #21, #29, #30, #31, #32, #33.

| Queue item | PR | State |
|---|---|---|
| 1 Programs paywall and entitlements (test mode) | #19 | merged |
| 2 Yale inversion guided process | #33 | open; steps live in private storage, not the repo |
| 3 Advanced hypnosis sessions catalog | #31 | open (replaces #20) |
| 4 Custom session order flow | #21 | open; intake stays closed until `CUSTOM_ORDERS_OPEN=1` |
| 5 Merchandise catalog and Wix CSV | #22 | merged |
| 8 Approval queue screen | #23 | merged |
| 9 Analytics read-back and ranking | #24 | merged; never run against YouTube |
| 10 Patron intake and tier signup | #25 | merged |
| 11 Health affiliate shelf | #26 | merged; ships empty |
| 12 Reset Biology cross-links | #30 | open (replaces #27) |
| 13 Short-form caption packs | #28 | merged |
| 14 Thumbnail options and scoring | #29 | open, draft; real-render run still on the PC |
| 16 Green test suite | #32 | open |

Still PC-only: **6** Episode 1 end to end, **7** first ten episodes render queue, **15** Phase 4d Unity 28 s proof and `.ulf` licence smoke test. They need a render session on Jonathan's PC (Codex, stdin closed, max effort), so no cloud thread picks them up.

## 2. Reclassification: everything treated as blocked, red, or waiting on Jonathan

| # | Item as it was treated | Verdict | Which red, or why green | Do now |
|---|---|---|---|---|
| 1 | Publishing/uploading any episode, Short, Reel | **RED** | R3 (public under the business name) | Build every file up to "ready to post"; Jonathan clicks. Already the manual-draft lane |
| 2 | "Merge PRs" (Jonathan merges each) | **GREEN** for docs, code, previews | Master auto-deploys the public site, so a merge that changes a public page is R3 for that page only; keep new public pages behind "not yet on sale" and ship via preview | Keep opening PRs with Vercel previews; no waiting on review for the next thread |
| 3 | OAuth on the WAIA channel (HB-5), including a read scope for the channel-id check | **GREEN** | Logging in to our own account is not R5; the upload itself is R3. Runs on Jonathan's PC only (project rule) | Thread plans it; Codex on the PC sets the scopes; no upload |
| 4 | Metrics read-back waiting on OAuth | **GREEN** | Reading our own analytics, no publish | Build the reader; run it locally once item 3 exists |
| 5 | Unity Personal licence on Linux (`.ulf` flow may be gone) | **GREEN** to try; buying a Plus/Pro seat is **RED** | R1 only if a seat is bought | Try the `.ulf` route on a throwaway Linux box or WSL first; name the exact error as a receipt if it fails |
| 6 | Modal / RunPod / Lambda for 360 renders | **GREEN** on free credits; a paid card on file is **RED** | R1 | Use free Modal credits for the 28 s smoke; stop at any billing prompt |
| 7 | Phase 4d: full 28 s Unity proof | **GREEN** | Heavy render, so Codex on the PC, `--headed` | Plan, place, verify; do not wait |
| 8 | Phases 5 to 7 "not built" | **GREEN** | Building code is never red | Slice into the threads below |
| 9 | Thumbnail planner "never verified" | **GREEN** | Someone has to run it | Run it on a real render; add frame scoring |
| 10 | Pilot render loops an older capture and "must not be called fresh" | **GREEN** | Re-render on the PC | Folded into item 7 |
| 11 | Master Goal Spec, jarvis receipts not readable | **GREEN** | Missing files are a receipt, not a stop | Path for the conductor: `data/waia-curation-pipeline/MASTER-GOAL-SPEC.md` in the jarvis repo. Work continues from this repo's docs |
| 12 | Neville Goddard slot: no recording with date evidence | **GREEN** | Research and a per-recording evidence record | Research thread builds the evidence table; the slate already falls back to James Allen, *Above Life's Turmoil* |
| 13 | Launch slate, cadence, titles, thumbnails, genre, AI-voice policy (HB-4) | **GREEN by building** | Propose by building the options, not by asking | Render three title/thumbnail/voice options per first-ten episode to a preview folder; Jonathan picks |
| 14 | Seth commentary voice | **GREEN by building** | Same | Build text-only and AI-voice variants of one commentary clip |
| 15 | Abraham Hicks excluded from launch slate | **Standing rule, not a block** | HB-3, rights; only the augmented remix with stored recipe is allowed and still goes through the gate | None |
| 16 | Quote-clip line: rights | **GREEN** | No releases are ever signed (Jonathan, 2026-10-19) | Worrying or licensed sources go to the re-record pile (`data/waia-rerecord-pile/PILE.md`); rules in `docs/WAIA-RIGHTS.md` |
| 17 | Short-form posting to YouTube Shorts, Reels, TikTok | **RED** | R3 | Per-platform caption files and 9:16 cuts on disk, ready to post |
| 18 | Curation gate approval of each item | **GREEN to build, the approval is Jonathan's word** | HB-3 | Build a one-screen approval queue; keep fail-closed |
| 19 | Real prices and tier ladder ($5/$10/$20/$35 proposals) | **GREEN** | Placeholders ship; prices are config | Prices live in one config file, "not yet on sale" |
| 20 | Taking money on the store | **RED** | R1 | Build checkout and subscription code in test mode; turning on live mode is the click |
| 21 | Wix store items, print-on-demand | **GREEN to build catalog and listings drafts**; handing a Wix login to a tool is **RED** | R5 | Product feed and drafts in the repo; Jonathan's own login does the Wix import |
| 22 | Removal/complaint contact address for the patron wall | **GREEN** | A contact address in the repo would leak private info | Route through a site form; address lives in config outside the repo |
| 23 | Patron consent records and billing identity | **GREEN** | Opaque `consentRef` only; data stays outside the public repo | Already the design (#7) |
| 24 | Brand picks (which generated mark/art) | **GREEN by building** | Taste is Jonathan's, work is not | Run generator locally on the PC key, ship contact sheet to a preview |
| 25 | Gemini image runs (never executed) | **GREEN** | Key is on the PC | Codex runs it locally with `GEMINI_API_KEY`; stop if a paid-tier prompt appears (R1) |
| 26 | Three failing jest suites on master (two need network, one imports a missing `retrieval.js`) | **GREEN** | Was left as "same as master" | Thread fixes or isolates them |
| 27 | Deploy workflow secrets never set | **Resolved** | #10 | None |
| 28 | Production database, Vercel settings, env files | **Out of seat by project rule, not a red** | Local lane | Say the path and the command; the conductor or the PC runs it |

## 3. Queued threads (ordered by revenue; each is one bounded task, one PR)

Every brief below builds in a cloud container from master, touches new files or its own area, and does not depend on any open PR. If a brief needs something an open PR adds, it says so and builds its own fixture instead. Live money, public posting and logins stay red as in section 4. "Not yet on sale" stays on every public page until Jonathan flips it. Priced items use the single price config, never numbers in page code.

Lane key: **cloud** = thread in this repo. **PC** = heavy or credentialed work for Codex on Jonathan's machine.

1. **Subscription lifecycle in test mode (programs).** Extend the entitlement model from #19 with renewal, cancellation, payment-failed grace period and a customer self-service "manage my access" page, all against Stripe test mode and fixtures. Lapsed access closes fail-closed. Cloud.
2. **Three sales pages per program, built as previews (programs).** For the hypnosis sessions and the Yale inversion protocol, build three alternative sales-page layouts and copy at `/programs/<id>/preview/a|b|c`, noindex, each leading with the loop of desire, passion, achievement, peace, contrast, new desire. Jonathan picks; never invent protocol content. Cloud.
3. **Price ladder config and comparison preview (store).** One config file holding every price (blank until set), with a preview page showing the $5/$10/$20/$35 proposal and two alternatives side by side, rendered with "not yet on sale". Prices are read by the store, programs and patron pages from this file only. Cloud.
4. **Merchandise pages on the site (merchandise).** Browse and product pages generated from `scripts/merch/catalog.json`, mockups, size/colour options and a "notify me" button that only counts (no email stored). Buying routes to the Wix store later; no prices. Cloud.
5. **Print-ready artwork exports (merchandise).** The open items from #22: outlined SVGs, flat one-colour and dark-garment variants of the infinity-loop marks, a print-spec sheet per product, and a check that no spiral overlay without confirmed ownership is used. Cloud.
6. **Custom hypnosis and VR session brief builder (store).** A structured questionnaire (goal, length, voice, music, VR scene, safety notes) that feeds the #21 request queue as a brief the operator can quote from, plus a quote calculator reading the price config. No payment. Builds against the model on master by adding fields in new files; rebase only if #21 has merged. Cloud.
7. **Episode links and click counts (channel to site).** Description and end-screen templates for each episode and Short that link to the site, plus a small redirect route that counts clicks per episode with no personal data, so the analytics loop can see which episodes send people to the store. Cloud.
8. **Public patron wall page and tier benefits (patron wall).** A `/patrons` page that renders the frozen approved snapshot, plus the tier ladder from `docs/PATRON-WALL.md` with benefits listed as proposals and "not yet on sale". Empty state when no one is approved. Cloud.
9. **Site conversion counters (analytics).** Privacy-first counters (no cookies, no IDs) for views of store, program and merch pages and "notify me" taps, stored outside the repo, feeding a weekly summary the next-slate ranking can read. Cloud.
10. **Transcript writer for pack contents (channel).** Use the repo's whisper-service adapter to write `assets/<assetId>/transcript.json`, so #17's captions and chapters stop reading `awaiting-transcript`. Fixture audio only in tests; real runs are local. Cloud.
11. **Gift and bundle catalog (store).** Bundles of sessions plus merchandise and gift-this-to-someone flow as a schema and listing page with "not yet on sale"; pricing from the config. Cloud.
12. **Store and programs accessibility and speed pass (site).** Run Chromium (installed in the container) over every public page, fix contrast, focus order, alt text and image weight, and record a before/after receipt. No design changes beyond fixes. Cloud.
13. **Reset Biology reverse-link kit (site).** Footer snippet, About copy and a one-page "from Reset Biology" landing here, ready to hand over; applying it on resetbiology.com stays on its approval card. Builds from master; skips the #30 edit and adds only new files. Cloud.
14. **Weekly backlog refresher (meta).** A script that reads merged PRs and `approvals/` and rewrites the "what shipped" and "waiting on Jonathan" tables of this file, so the weekly note stops being hand-written. Cloud.
15. **Hypnosis and Yale session audio preview player (programs).** A gated audio player shell (buffering, resume, sleep timer) that plays from private storage URLs, with a fixture track. The audio itself is whatever Jonathan hands over. Cloud.

**First to start: 1, then 2 and 3** (they unlock the money pages). 7 and 9 together close the loop from channel to site to ranking.

## 4. Waiting on Jonathan (approval cards)

On master in `approvals/`, all `WAITING_ON_JON`:

- Retired 2026-10-19 (rulings in `docs/PUBLISH-REVIEW-FIRST.md`): the publish-publicly card and the live-payments-or-Unity-seat card.
- `2026-10-17-health-affiliate-programs.md` (red 2): your health list and an affiliate sign-up.
- `2026-10-17-wix-google-login-handover.md` (red 5): hand a Wix or Google login to a tool or person.
- `2026-10-17-patron-consent-wording.md` (second look): patron consent wording and the 18+ rule.

Inside open PRs, not on master yet: the Reset Biology footer link card (`approvals/2026-10-17-reset-biology-footer-link.md`, red 3, in #30) and the Yale naming and consent-wording card (in #33).

## 5. What is believed red, and why

- Uploads and posting (R3). Everything else up to the file on disk is green.
- Live-mode payments and any paid Unity seat or cloud billing (R1).
- Handing a Wix, Google or hosting login to a tool or person other than Jonathan (R5).
- Nothing in this list is waiting on a question; each has a named next step above.

## 6. Third queue (written 2026-10-19 from Jonathan's approval-wall brief)

Rules that shape every item (Jonathan, 2026-10-17 to 2026-10-19). **A** Could I have known it: search the repo, the doctrine files and his prior answers before any card; logins, free credits, free API sign-ups and naming the operator are green. **B** Sourced: every plan, metric, weight or creative choice names its mentor or source; no source means not ready, and not a card. **C** One decision per card, comparable options only. **D** Never "publish publicly": upload private or unlisted, he reviews on phone and desktop, then it is scheduled. **E** No spend when an owned free lane exists (22 owned voice profiles, family voices, free AI music repos, his GPUs). **F** Quality first: build locally, make it excellent, then show it.

Standing rulings from the same brief: existing merch designs are never put on product or imported; the store stays in Stripe test mode until he says; Unity runs on his Windows GPUs through a local thread, no paid seat; mentor material (Kallaway, Shane Hummus replays, Earn With Content) is studied and cited, and he is bringing more.

Not verified here: the doctrine files named in memory (`data/content/doctrine/*.md`, `data/waia-curation-pipeline/store/CANDIDATE-PILE.md`) are not in the jarvis repo as cloned from this session (default branch, checked 2026-10-19). Threads that need them must say the path is missing and stop, not substitute.

### In progress (threads already running)

| Thread | What it builds | Source rule |
|---|---|---|
| One store layout and affiliate intake | One item layout for every store item, plus an affiliate intake that records each candidate with its source and disclosure | B, C |
| Mentor-grounded analytics weights | Replaces the blank weights card with weights that each cite a mentor or doctrine passage | B |
| Merch design standard and print intake | A design standard, a print-spec intake and a recommended design-tool list; no existing design goes on product | E, F |
| Private upload, review, then schedule | Shipped as #52: upload private or unlisted, Jonathan reviews, then schedule | D |
| Rights pile instead of licences | A pile of re-record candidates with rights basis, replacing signed clip licences | A, E |

### Queued after them (one bounded task, one PR each; each branches from master)

1. **Affiliate shelf fill from intake.** Render accepted intake entries onto the existing shelf with the disclosure line, empty when none are accepted. Starts when the intake PR merges.
2. **Weekly analytics digest.** A script that applies the sourced weights to the click and counter data and writes a plain-English weekly note for the next-slate ranking. Starts when the weights PR merges.
3. **Design standard checker.** Validates every file in the merch catalog against the design standard and print-spec intake and lists failures, so nothing unfinished reaches a product. Starts when the standard merges.
4. **Review queue screen.** On the operator screen, list private or unlisted uploads waiting for Jonathan's review and the schedule slot for each. Starts after #52.
5. **Rights pile coverage report.** For each launch-slate episode, show whether it has a source asset, a rights basis and a re-record candidate, and what is missing. Starts when the rights pile merges.

### Front door on www

www.whatamiappreciatingnow.com still showed the visualizer because the swap only ran on the bare domain. It is now behind `WAIA_WWW_FRONT_DOOR` (default off, set in Vercel by Jonathan), with a private `/preview/front-door` on www. Flipping the public homepage is one card: `approvals/2026-10-19-www-front-door.md`.
