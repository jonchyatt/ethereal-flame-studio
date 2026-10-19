# Rights rules for What Am I Appreciating Now

Written 2026-10-19 from Jonathan's ruling. This is not legal advice. It records what the channel does and the YouTube pages it rests on (checked 2026-10-19; re-read them before a launch, since help pages change).

## The rule

1. **No releases, ever.** We do not ask for, sign or hold licences, permissions or releases from rights holders. That retires the old "sign a clip licence" card, and the `licensed` and `permission` bases are no longer ways to clear a source.
2. **What we use:** public-domain material (text and the specific recording), CC0 material, material Jonathan owns, and our own recordings. A mix is allowed when it adds unique content of our own: a stored binaural recipe, new EFS visuals, Jonathan's own voice.
3. **Anything worrying goes to the re-record pile**, one list in `data/waia-rerecord-pile/PILE.md`, with its provenance (HB-6). Jonathan re-records the words in his own voice. "Worrying" means: the basis rests on someone else's grant (`licensed`, `permission`), the basis is not one we accept, or the evidence is blank.
4. Every source still carries rights basis, evidence and provenance, and every mix stores its recipe (HB-6). Nothing publishes without the curation gate (HB-3).

## What YouTube says

- **Public domain is allowed to be monetized, if you can prove it.** "If you prove that the content in your video is part of the public domain, you can monetize." Source: [What kind of content can I monetize?](https://support.google.com/youtube/answer/2490020). The same page says to create the elements yourself, and that content from others needs explicit written permission, which is why we avoid grant-based sources instead of collecting permissions.
- **Public domain means expired copyright.** "Public domain refers to content not protected by copyright because the copyright has expired", generally the author's life plus 50 to 70 years, varying by country. Source: [Copyright on YouTube](https://support.google.com/youtube/answer/2797466).
- **Reused content needs a meaningful difference.** YouTube allows reused content "if viewers can tell that there's a meaningful difference" from the original, and wants videos that are not "mass-produced, generic, repetitive, or manipulative"; clips edited together "with little or no narrative" are not allowed. Source: [YouTube channel monetization policies](https://support.google.com/youtube/answer/1311392). That page says this applies even with the original creator's permission, so a signed release would not have fixed reused-content risk anyway. The added content has to be real: the binaural bed, the visuals, Jonathan's voice.
- **Only a court decides exceptions.** Whether fair use, fair dealing or public domain applies is something "only a court of law can make"; credit lines and "no infringement intended" notes do not help. Source: [Common copyright myths](https://support.google.com/youtube/answer/2797449). So public domain is stored as evidence per source (the date, the edition, the recording's own licence), never assumed.

## Limits, said plainly

- A public-domain text is not a public-domain recording. A modern reading is its own copyrighted work unless its release says otherwise (see `docs/WAIA-LAUNCH-SLATE-2026-10.md`). If the recording is unclear, the text can be re-recorded by Jonathan.
- Automated claims (Content ID) can still arrive on material that is legally free. Keep the evidence so a dispute can be answered.
- Not verified: how YouTube treats any one video in practice. Only the help pages above were read.

## Re-record pile

Code: `src/lib/playlist-batch/rerecordPile.ts` (`buildRerecordPile`, `renderRerecordPile`), tested in `src/lib/playlist-batch/__tests__/rerecordPile.test.ts`. It takes provenance entries and returns one de-duplicated list with the source URL, id, rights basis and evidence on record, why it was pooled, and who recorded it and when.
