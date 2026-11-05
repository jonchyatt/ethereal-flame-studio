# Section 4 acceptance evidence

Candidate: `waia/spec-rebuild`, built from master `d6c3787`. Evidence captured from a local production server, Chrome at 100% zoom, **1280×900 and 390×844**. Full proof: `C:/hal-jobs/WAIA-BUILD/proof/`. The four round-two boards and raw Argus verdicts are in [review](review/). This table distinguishes implemented checks from human or commercial certification that was not performed.

Filename convention: `home` means `/`; other route slashes become hyphens. Each route has `-1280-first.png`, `-1280-full.png`, `-390-first.png`, and `-390-full.png`. State captures use `state-<state>-<width>-first/full.png`. [route-audit.json](review/route-audit.json) records all 31 routes/variants at both sizes; no horizontal overflow, page-script errors, missing header/footer, or unloaded images were found. First-view boards are visual verdict evidence only, not substitutes for full-page or functional checks.

## Shared criteria

| Section 4 criterion | Result | Evidence and practical limit |
|---|---|---|
| Required sizes, first view and full page for every public route/state in scope | PASS | 124 route PNGs across 31 routes/variants; `route-audit.json`; state pairs below. Private tools and preview workspaces are deliberately outside the public shell. |
| Actual carved logo and complete readable name before scrolling; no acronym or flat spiral | PASS | Every route capture and `logo` audit field: `/brand/carving/04.png`. Source scan found no public acronym. Eight SVGs archived outside `public`. |
| Same ink, Georgia headings, Segoe UI body | PASS | All route computed-style records and four round-two boards. |
| No sideways clipping; readable phone body and controls at least 48px | PASS | All 62 viewport audits: no overflow; visible buttons ≥48px. Main phone body is 16px; auxiliary metadata uses the separate 14px spec token. |
| Visible keyboard focus | PASS | `state-keyboard-focus-{1280,390}-first.png`; lime focus outline. |
| Footer Home/Listen, support and legal destinations | PASS | Every `*-full.png`; shared footer includes all destinations, access recovery and external channel/Reset links. |
| Play identifies actual title/duration | PASS | Player headings, visible durations and accessible button labels; `media-playback.json` verifies all five local recordings. Utility pages without media do not acquire unrelated players. |
| No source placeholders, sales-technique labels, fake prices/sessions/customer names | PASS | Rendered route/source audit; real empty states; no checkout or tier promotion. Existing genuine patron records remain storage-driven. |
| Open phone menu without `/scenes`; keyboard open/close/recovery | PASS | `state-menu-open-390-first/full.png`; `interaction-audit.json`: focus enters first link, Escape returns to Menu. |

## Route criteria

| Page and size | Section 4 criterion | Result | Capture / supporting evidence |
|---|---|---|---|
| Home, 1280 | Identity, invitation, substantial art and Begin · 0:41 together; A12 then A04; Reading excerpt · 3:58 | PASS | `home-1280-first/full.png`. **Ticket-authorized 05 + reactive glow replaces the unapproved orb scene.** |
| Home, 390 | Identity, invitation, art and Begin before y=844; opens A19, no blank band | PASS | `home-390-first/full.png`; Begin bottom y=668; `state-selected-a19-playing-390-first.png`. |
| Programs, 1280 | Two visual cards, Advanced real sample + separate Explore; honest Belief demo-absent state | PASS | `programs-1280-first/full.png`; round-two programs board. |
| Programs, 390 | First title, food topic and preview before y=844; second card below; no internal source note | PASS | `programs-390-first/full.png`; Play bottom y=644; explicit 10:35 food label. |
| Advanced, 1280 | Representative food-related sample before contents; inventory matches finished files | PASS | `programs-advanced-hypnosis-sessions-1280-first/full.png`; one finished sample, no 29-product claim. |
| Advanced, 390 | Play precedes long offer/safety copy; titles/times/formats fit | PASS | `programs-advanced-hypnosis-sessions-390-first/full.png`; Play bottom y=714. |
| Store, 1280 | Actual offer imagery first; custom and all four concepts below; useful per-offer actions | PASS | `store-1280-first/full.png`; no repeated proposal stamps. |
| Store, 390 | Useful card/action before y=844; all four November concepts labelled, no rejected mockups | PASS | `store-390-first/full.png`; Explore and Play (bottom y=764) visible. |
| Bundles, 1280 | Three distinct intended compositions; named constituents, one availability note and real sample | PASS | `store-bundles-1280-first/full.png`; no gift redemption or price promises. |
| Bundles, 390 | Stacked compositions, individual program/custom links; no unsupported hour/saving/disabled primary | PASS | `store-bundles-390-first/full.png`. |
| Custom, 1280 | Labelled original example and Describe / Check paths first; separate lookup | PASS | `store-custom-order-1280-first/full.png`. Sample is explicitly original studio work, not a client commission. |
| Custom, 390 | Identity, example/title, both paths before y=844; useful error/result/recovery; brief has shell | PASS | `store-custom-order-390-first/full.png`; both paths bottom y=721; `state-lookup-error/result-390-*`; `store-custom-order-brief-390-*`, submit bottom y=713. |
| Listen, 1280 | A19, 0:41 and real player immediately; A12/A04 next; honest 3:58 reading | PASS | `listen-1280-first/full.png`; `state-selected-a12/a04-1280-*`. |
| Listen, 390 | Contained portrait video/title/play before y=844; default19, choices12/04; no food default | PASS | `listen-390-first/full.png`; play bottom y=783; `state-selected-a19-playing-390-*`. |
| Merch, 1280 | Two columns, M1/M2 first and M3/M4 below; actual doc2 mapping and concept labels | PASS | `merch-1280-first/full.png`; round-two labels now precede art. |
| Merch, 390 | M1 art/status first; tee/infinity tee/wood mug/cosmic mug order; inspect lettering, no Buy/price | PASS | `merch-390-first/full.png`; four `merch-<slug>-390-first/full.png` detail pairs. |
| VR, 1280 | Real V1–V4 directory/posters/times/Abraham Hicks attribution/links; first card before y=900 | PASS | `vr-1280-first/full.png`; `video-availability.json` has four successful oEmbed checks. No teacher recording hosted. |
| VR, 390 | V1 poster/title/action before y=844; remaining videos stack; honest screen/headset instructions | PASS | `vr-390-first/full.png`; watch action bottom y=712; ordinary directory explicitly distinguished from playback. |
| Reset handoff, 1280 | Identity, free-tools reassurance, default A19 and return route together; food variant labelled | PASS | `from-reset-biology-1280-*`, `from-reset-biology-topic-food-1280-*`. |
| Reset handoff, 390 | Reassurance, sample and return before y=844; default19; selected food practice clearly named | PASS | Both corresponding phone pairs. Food return bottom y=422, play y=601; default play y=672. |

## Visual identity and detail criteria

| Criterion | Result | Evidence and limit |
|---|---|---|
| Hero uses actual wide05 until living scene passes; one swap point | PASS | `HeroArt` in `AudioAtmosphere.tsx`, home captures, Argus imagery 8. No passing living-orb round-three verdict was available. |
| Exact reference10 gold orb/cyan rim/level horizon/nebula/dark waves/aligned broken reflection, including phone crop | FAIL | **Not certified or claimed.** The explicitly authorized carving fallback ships instead of a new scene. The mandated original video finals and real archive posters remain unmodified; they are not evidence that a replacement renderer meets reference10. |
| No rejected renderer still or third-party op-art substituted into the hero | PASS | Actual05 asset hash/source inventory; home captures; no 01/03/07/08/09 assets shipped. Reference10 appears only on review boards. |
| Header04, wide05, continuous inward ring and approved infinity crossover rule | PASS | Exact carving sources plus `merch-*-full.png`; ring explanation on gallery. |
| Production lettering corrected/print ready | FAIL | **Concept status only**, as ordered. The four doc2 images retain generated lettering defects, explicitly annotated in gallery/detail copy. No SKU, price or print-art approval is asserted. |
| Detail permits examining lower inverted lettering, documents generated defects; no doc1 arcs | PASS | All four detail routes at both sizes, full uncropped concept images and per-design notes. |
| Motion reacts to actual sound and breathes at rest; pause and reduced motion | PASS | `interaction-audit.json`: non-zero varying RMS values during playback; shared analyser drives scene frames; `state-reduced-motion-*`; CSS disables overlay for device preference. Product mockups and the identity mark are static product/brand artwork, not replacement animated scenes. |

## Checks beyond screenshots

| Criterion | Result | Evidence and limit |
|---|---|---|
| Actual local sources/durations, play/pause/seek | PASS | `media-inventory.json` hashes/ffprobe; `media-playback.json` exercises A19/A12/A04/L1/H1. |
| No autoplay sound or simultaneous playback | PASS | `interaction-audit.json` at both sizes: silent initial/selected media; starting Serenity pauses A19. |
| Keyboard/menu/detail navigation and focus | PASS | Focus/menu state captures; Escape return; selected title focus; merch uses ordinary detail routes with explicit return links, not a modal requiring a trap. |
| Reduced motion | PASS | Both viewport interaction records and state PNGs; device preference disables the decorative overlay. User-started native media retains its own pause controls. |
| Complete readable scripts/transcripts and credits | PASS | Selected original scripts/credits, full Serenity text link, preserved complete food VTT-derived transcript. Original scripts explicitly say they are not timed captions. |
| Caption timestamps mechanically valid | PASS | `media-playback.json`: 91 preserved food cues, ordered and ending at635.3s within635.716s. |
| Human caption synchronization/acoustic audition of exact finals | FAIL | No new human listening/timing certification was performed. Native decode/playback and source identity do not establish an acoustic or timing review. |
| Real signup persistence; error/success/retry and unsubscribe | PASS | Existing subscribe e2e2/2 plus `state-signup-invalid/service-error/success-*`, `state-unsubscribe-success-*`, local stored JSON and `interaction-audit.json`. Only example.com/example.test addresses. |
| Custom request, persistence, retrieval and reference recovery | PASS | `state-brief-service-error/saved-*`, `state-lookup-result/error-*`; real local intake with `CUSTOM_ORDERS_OPEN=1`, reference survives reload; inputs survive service failure. Production runtime gate was not changed. |
| Links/redirects | PASS | Four YouTube oEmbed200 results; legal Programs href followed/checked; static HTML and refunds aliases verified in interaction audit; route captures all successful or deliberate404. |
| Access recovery entry and fail-closed behavior | PASS | `state-access-recovery-*`, `programs-belief-lock-in-session-*`; existing entitlement/recovery tests remain passing. No access granted by the public shell. |
| Live cross-device recovery, checkout/gift/cancellation transaction | FAIL | Not executed: no paid offer/checkout/gifting was enabled, and no charge or contract authorized. Existing support/manual recovery remains. These are prerequisites for a later commercial release. |
| Headset certification of specific VR claims | FAIL | No physical headset test. Directory gives conditional viewer guidance and external original links; no stereo/device guarantee. |
| Favicon and family1200×630 metadata | PASS | [share-image-audit.json](review/share-image-audit.json); route metadata records; exact64px carving PNG/180px Apple icon and conventional ICO fallback. Five share families decode at1200×630. |

## External judge

All four **round-two** verdicts explicitly attest opening the corresponding board and return **PASS**. Scores are ordered: brand, five-second clarity, typography, both-size layout, imagery, next action, trust.

| Family | Scores | Result |
|---|---|---|
| [Home/listen](review/home-listen-verdict-2.md) | 9,9,9,9,8,9,9 | PASS |
| [Programs](review/programs-verdict-2.md) | 9,9,9,9,8,9,9 | PASS |
| [Store/merch/custom](review/store-merch-custom-verdict-2.md) | 9,9,9,9,8,9,9 | PASS |
| [VR/about/handoff](review/vr-about-handoff-verdict-2.md) | 9,9,9,9,9,8,9 | PASS |

Round one did not pass: three calls timed out without image attestation; the store family returned an incomplete report with clarity/layout7. Labels, audio controls and the brief layout were corrected before round two. Raw verdicts retain non-blocking suggestions. Some suggestions concern natural viewport continuation rather than document clipping; the alleged double-dash in the handoff is absent from source/DOM. No edits to judged page content followed round two. The conventional ICO fallback was subsequently made identical to the declared icon; this does not affect page captures.

The judge's first-view assessment is not proof of behavior, legal rights, acoustic quality, print readiness or headset support. In particular, the originals are portrait **videos**, despite the judge's occasional shorthand “audio-only”; that phrase accurately applies only to the food sample.
