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
| 16 | Quote-clip line: permission from rights holders | **GREEN** to draft and track; **RED** to sign | R2 for any signed license | Build the clip ledger and permission-request drafts; sending and signing stay Jonathan's |
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

Lane key: **cloud** = thread in this repo; **PC** = heavy or credentialed work Codex runs on Jonathan's machine, stdin closed, max effort, with a thread planning and verifying.

1. **Programs paywall and entitlements (store, programs).** Build the entitlement model and gated content route for subscription and one-time programs, with a payment adapter in test mode only; free Reset Biology tools stay unpaywalled. Cloud. Live mode is R1.
2. **Yale inversion protocol guided process (programs).** Read `docs/reset-biology/sources/yale-attachment-protocol-doc.txt`, `data/pathways-corpus-content-distilled/mental-mastery-script-doctrine.md` and `tools/mental-mastery-workshop/` in the jarvis repo and build the guided-process page and session player behind the entitlement; never rewrite the protocol. Needs the three jarvis paths brought in. Cloud.
3. **Advanced hypnosis sessions catalog (programs).** Catalog schema and listing pages for the advanced sessions, each with a rights/provenance note and "not yet on sale"; content comes from what Jonathan has handed over, never invented. Cloud.
4. **Custom session order flow (store).** Replace the "coming soon" intake with a request queue stored outside the repo, an operator view, and a quote status; no payment taken. Cloud.
5. **Merchandise catalog and print-on-demand feed (merchandise).** Product schema for shirts, hats and mugs carrying the infinity-loop marks, mockups for each, and a Wix-import-ready CSV. Cloud; Jonathan's own Wix login does the import (R5 if anyone else holds it).
6. **Episode 1 end to end, manual-draft (channel).** Take the owned pilot through mix, render, thumbnail, pack contents and the gate to a folder of files ready to post; the receipt is someone actually running it. PC for the render, cloud thread to verify.
7. **First ten episodes render queue (channel).** Turn the launch slate into ten batch items with recipes, provenance and render packs, each waiting only at the approval gate; narration source chosen by building both a LibriVox and an AI-voice variant. PC + cloud.
8. **Approval queue screen (channel).** A single page listing pending items with source rights, recipe fingerprint, preview and approve/reject, fail-closed, so the gate stops being the slow step. Cloud.
9. **Analytics read-back and next-slate loop (analytics).** Reader for channel-scoped YouTube analytics and a ranking of what to make next from watch time and retention; first run local once OAuth read scope exists. Cloud + PC.
10. **Patron intake and tier signup page (patron wall).** Public form that collects display name, message and explicit display consent, writes the opaque `consentRef` outside the repo, and feeds the moderation gate; tiers from `docs/PATRON-WALL.md` as proposals. Cloud. Taking money is R1.
11. **Health affiliate shelf (store).** Section with disclosed affiliate items from Jonathan's list, FTC-style disclosure, outbound links only, each with a provenance note. Cloud.
12. **Reset Biology cross-links (site).** Plain outbound links from this site to resetbiology.com, and the reverse link copy for that site (written here, placed there); no money taken on the other site. Cloud.
13. **Short-form caption pack per platform (channel).** Per-platform caption text and file naming for each Short from #16, rights basis carried onto every cut, output folder ready to post. Cloud.
14. **Thumbnail planner verification and frame scoring (channel).** Run the planner on a real render, record the receipt, replace even spacing with scored frames, check titles against the HB-8 soul rules. PC + cloud.
15. **Phase 4d Unity 28 s proof and licence smoke test.** Headed Unity run on the PC, new receipt replacing the looped capture, plus the `.ulf` Linux licence attempt; the exact error becomes the receipt if it fails. PC.
16. **Make master's test suite green.** Fix or isolate the three failing suites so every later PR has a clean baseline. Cloud.

**First to start: Programs paywall and entitlements.** Greens that do not depend on it and can run beside it later: 16, 8, 13, 12.

## 4. What is believed red, and why

- Uploads and posting (R3). Everything else up to the file on disk is green.
- Live-mode payments and any paid Unity seat or cloud billing (R1).
- Signing any license or permission agreement for clip rights (R2).
- Handing a Wix, Google or hosting login to a tool or person other than Jonathan (R5).
- Nothing in this list is waiting on a question; each has a named next step above.
