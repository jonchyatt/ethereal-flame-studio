# Sales copy v2: Voss and NEPQ voice (2026-10-19)

Jonathan's ruling, 2026-10-19: every sales surface uses the house sales sources. Chris Voss labels and calibrated questions, NEPQ problem and consequence questions, a no-oriented close, and three-tier anchor/decoy pricing. Generic feature-list copy is a defect.

Sources (in the jarvis repo, `data/content/sales-sources/`): `voss-ch3-label-it.txt` (labels, accusation audit), `voss-ch-beware-yes-master-no.txt` and `voss-no-questions.txt` (no-oriented questions), `nepq-is-and-how-it-works.txt` (situation, problem-awareness, solution-awareness and consequence questions), cheat sheets in `INDEX.md` there.

Rules kept on every block: no new facts, no prices, no health claims, the whole name (never the short one), "not yet on sale" wherever it was, no ask to like or subscribe (HB-8).

The site does not render markdown, so v2 replaces v1 in the page source and v1 is kept here. The one place the site can show both is the sales-page previews: v2 is **variant D**, beside A, B and C, at `/programs/advanced-hypnosis-sessions/preview/d` and `/programs/yale-inversion-protocol/preview/d` (noindex; the preview shows a technique note under each block).

## 1. Front door (`public/waia-front-door.html`)

| Block | v1 | v2 | Technique |
|---|---|---|---|
| Hero premise | A curated loop of appreciation — immersive 360°/VR meditations built from the voices of teachers and wisdom traditions we admire, layered into something new. No host, no vlog, no narration — just presence, curated one piece at a time. | When did you last stop long enough to notice what is already good? It seems like most days move too fast for that question. This is a place built around it: immersive 360°/VR meditations made from the voices of teachers and wisdom traditions we admire, layered into something new. No host, no vlog, no narration — just presence, one piece at a time. | NEPQ situation question opens on the reader; Voss label; the collection is the quiet answer. |
| Ring close | New pieces drop as they're ready. Follow along on YouTube, or leave your email — the answer to what you're appreciating now becomes the next one. | What would change if you asked yourself that question every day? New pieces arrive as they are ready, and your answer to what you are appreciating now becomes the next one. Would you be opposed to following along on YouTube? | NEPQ solution-awareness question; Voss no-oriented close in place of an instruction. |

## 2. Sales-page previews (`src/lib/entitlements/salespages.ts`, variant D)

### Advanced hypnosis sessions

| Block | v2 (variant D) | Technique |
|---|---|---|
| Headline | It seems like the free collection took you somewhere. What would it mean to go further? | Voss label, then NEPQ solution-awareness question. |
| Loop lead | You are somewhere on this circle right now. Where? | Calibrated "where" question: the reader places themselves first. |
| Where are you on the circle today? | Is it the pull of a new desire, the energy of passion, the quiet after something you finished, or the restlessness that comes when things have been calm a little too long? And what happens when that restlessness has nowhere to go? | NEPQ problem-awareness, then NEPQ consequence. No health framing. |
| It sounds like you want more than a quick listen | Each advanced session is made for one place on the circle, so you start from where you are, not from the beginning. Every session lists its script author, voice, music and rights basis before it can go on sale. | Voss label as heading; product as the quiet answer (facts from variant A). |
| What it is not | Not a cure, not a diagnosis, not a promise of any result. + the listening-safety line. | Voss accusation audit. |
| Before you decide | When the sessions open, would you be opposed to starting with the one made for where you are right now? | Voss no-oriented close; replaces "would it be useful?". |

v1 for comparison: variants A, B and C, unchanged in the same file.

### The inversion protocol: a guided process

| Block | v2 (variant D) | Technique |
|---|---|---|
| Headline | It seems like one contrast keeps coming back around. What has it been costing you? | Voss label, then NEPQ consequence question. |
| Loop lead | Contrast is part of the circle, not the end of it. | Reframe in the loop's own words (from variant A's headline). |
| What keeps coming back? | What is the one thing that returns, however many times you set it down? And if it stays exactly the same for another six months, what does that do to the rest of your days? | NEPQ problem-awareness, then the six-to-twelve-month consequence question. |
| It sounds like you want to move through it, not read about it | This is a guided process: one step at a time, an optional timer, and private notes that stay in your browser tab. The steps are handed over by Jonathan and are not summarised or rewritten on this page. | Voss label as heading; facts from variants A and C. |
| What it is not | Not therapy, not medical care, not a promise of any result. You can stop at any time. + the neutral-name note. | Voss accusation audit. |
| Before you decide | When it opens, would it be a bad idea to take the first step and see how it sits with you? | Voss no-oriented close. |

## 3. Patron wall (`src/app/patrons/page.tsx`, `src/app/patrons/join/page.tsx`)

| Block | v1 | v2 | Technique |
|---|---|---|---|
| Wall intro | Turn away from the orb in a What Am I Appreciating Now scene and you find the people who made it possible. Here they are. | Has a scene ever given you a quiet minute you did not expect? Turn away from the orb … Here they are. | NEPQ situation question. |
| Wall close (new line above the links) | (none) | Would you be opposed to seeing your own name behind the orb? | Voss no-oriented question before the link. |
| Join intro | Turn away from the orb … Pick a tier, choose how your name should appear, and say yes to showing it. | Which scene would you want your name in? Turn away from the orb … | Calibrated "which" question. |

## 4. Gifts and bundles (`src/app/store/bundles/page.tsx`, `src/lib/store/bundles.ts`)

| Block | v1 | v2 | Technique |
|---|---|---|---|
| Page intro | What Am I Appreciating Now, bundled to keep or to give. … | Who do you know who could use an hour that is all theirs? What Am I Appreciating Now, bundled to keep or to give. … | NEPQ situation question about the person being given to. |
| Deeper sessions bundle | The advanced hypnosis sessions paired with a custom hypnosis or VR session, quoted through the custom order flow: desire … Now bringing it back around. | It seems like the person you have in mind wants more than another playlist. The advanced hypnosis sessions, paired with one custom hypnosis or VR session made for them … | Voss label, then the facts. |
| Guided process bundle | The guided Yale inversion process paired with a custom session, where Now closes back into What. | It sounds like they keep circling back to the same contrast. The guided inversion process paired with a custom session made for them, where Now closes back into What. | Voss label; drops "Yale" from the summary to match the sales pages' neutral-name rule. |
| Both programs bundle | Both paid programs together, for someone ready to go further than the free collection. | … Would it be a bad idea to give them the whole circle at once? | Voss no-oriented close. |

## 5. Welcome from Reset Biology (`src/lib/store/resetBiologyKit.ts`, landing paragraphs only)

| v1 | v2 | Technique |
|---|---|---|
| Reset Biology and its free tools stay exactly where they are, and stay free. / Here you will find guided hypnosis sessions, appreciation sessions and visual meditations. Nothing here is on sale yet. | It seems like you came over from Reset Biology looking for something beyond the tools. / You might be wondering whether the free tools are about to cost something. They are not: Reset Biology and its free tools stay exactly where they are, and stay free. / Here you will find … Nothing here is on sale yet. Where would you like to start? | Voss label on why they clicked; accusation audit on the free tools; calibrated "where" question before the links. |

The About paragraph that goes on resetbiology.com (`ABOUT_COPY`) is unchanged: Reset Biology sells nothing, so it is not a sales surface.

## 6. Episode description (drafted first episode)

The only episode with a finished draft render is the manual-draft bundle `data/content/waia-episode-1-upload-draft/manifest.json` ("A Gentle Reset: Making Peace with Food | Guided Practice", 10 min 13 s). Its v1 description is an internal status note ("Publication is blocked pending …"), not viewer copy. v2, for a viewer:

> How does sitting down to eat feel for you right now? It seems like, for a lot of us, food has turned into one more thing to get right.
>
> This is a gentle guided practice, about ten minutes long, for making a little peace with it: arrive, let the struggle soften, breathe, and practise a kinder way back to the table.
>
> Would it be a bad idea to give yourself these ten minutes before your next meal?
>
> This is not medical advice, therapy, or a promise of any outcome.
>
> Words: Reset Biology, "Reset Your Relationship with Food" (owned). Visuals: Ethereal Flame Studio.

Technique: NEPQ situation question; Voss label; the practice as the quiet answer, chapter names reused as the one-line summary; Voss no-oriented close; the single disclaimer line kept. The episode link line is left off: the link kit's `ep01` slug belongs to the slate's "Thought and Character", so this episode needs its own slug before a link is added. The manifest itself is not edited.

## Not touched, and why

- `/store` (`public/waia-store.html`), program pages (`src/app/programs/page.tsx`, `ProgramView.tsx`, `BuyButton.tsx`) and `src/lib/hypnosis/catalog.ts`: all are in PR #59 (store go-live), which is held for Jonathan. They get the same pass after #59 is decided, so the two PRs never conflict.
- Pricing structure: the rule asks for three tiers with an anchor and a decoy. No price is set anywhere yet (every price is "not yet on sale"), and the patron ladder has four tiers, so a decoy cannot be shown honestly in copy. That belongs on the price-ladder card (`approvals/2026-10-17-price-ladder.md`).
- Front door title and footer still say "WAIAN", and the store link names merchandise that was taken off the site. Both are outside this copy pass and are flagged for the next one.
