# What Am I Appreciating Now: Launch Slate and Source Library, 2026-10

Written 2026-10-17. Documentation only: no code, nothing run, nothing published. The file name uses the slug `WAIA`; the channel is "What Am I Appreciating Now". Builds on `docs/WAIA-STATE-OF-THE-RING-2026-10.md` (its slate draft and its notes that no dated pre-1964 Neville recording was confirmed and that the archive.org Neville items carried no license tag).

I am not a lawyer. Nothing here is legal advice. Where I say a rights basis is "needed", that is what the repo's own rules (HB-6) require on the record, not a legal conclusion. Nothing in this file has been checked against a copyright registry, a license page or a recording's metadata today; where a fact was verified earlier, the source says so.

Content-shape decisions in this file (cadence, titles, which episodes, formats) are proposals for Jonathan (HB-4).

## 1. Source library

Every row needs: a rights basis, the transformation required before it can be used, and a stored mix recipe (HB-6). "Recording" matters as much as "text": a public-domain book read aloud in a 2015 recording is a new copyrighted work unless that recording carries its own free license.

| Source | Rights basis | Transformation required | In launch slate? |
|---|---|---|---|
| James Allen, *As a Man Thinketh* (1903) | Text: public domain (published 1903). Recording: the spike used a LibriVox reading whose archive.org metadata showed a public-domain license, checked 2026-07-09 (`data/waia-mixer-spike/recipe.json`). | Multi-source binaural mix with the recipe stored; EFS visuals. Re-check the specific recording's license on the day it is used. | Yes |
| James Allen, *The Way of Peace* (1907) | Text: public domain. Recording: not yet chosen; each candidate recording needs its own license check. | Same as above. | Yes |
| Wallace Wattles, *The Science of Getting Rich* (1910) | Text: public domain. Recording: LibriVox reading checked 2026-07-09 in the spike recipe. | Same as above. | Yes |
| Wallace Wattles, *The Science of Being Great* (1911) | Text: public domain. Recording: not yet chosen; license check per recording. | Same as above. | Yes |
| Neville Goddard, pre-1964 recordings | Rule: only recordings dated before 1964, verified one recording at a time. **No recording is named here** because no per-recording date evidence has been confirmed. The archive.org Neville items the spike looked at had no license tag, so they are not clean by default. | Named only when a catalog entry holds the exact recording, its date and the evidence for the date. Then the same mix treatment. | Slot open, no recording named |
| Seth Speaks (Jane Roberts) | In copyright. | Quotation and commentary only: short quotes, each attributed, each inside original commentary. No audio from recordings, no reading of passages at length. | No |
| Abraham Hicks | Actively enforced catalog. Jonathan's rule: allowed **only** as an augmented multi-source binaural remix with the recipe stored, never a straight re-upload. | As stated: augmented, multi-source, binaural, recipe stored. | No, see the risk note below |
| Jonathan's own mixtapes | Owned. Provenance and hashes recorded as in `data/waia-owned-pilot-draft/source-provenance.json`. | Mix recipe stored like any other; owned status recorded in the rights field. | Yes (owned) |

### Rights risks, plainly

- **Abraham Hicks.** The project rules exclude actively enforced catalogs from the launch slate, so I left it out. Jonathan's stated rule allows an augmented remix. The risk I see: the recordings are in copyright and actively enforced, and mixing them with other sources and processing them does not by itself change that. A remix still contains the copyrighted recording, and automated matching (YouTube Content ID) can still claim or strike it. Whether a given remix is a fair use or needs a license is a legal question I cannot answer. The recipe is the right thing to store (HB-6) but it documents the work; it does not clear it. If this row is ever used, a written license or advice from a lawyer should come first, and a channel strike is a risk to the whole channel, not only that video.
- **Seth Speaks.** In copyright. "Quotation and commentary" is a fair-use style approach whose safety depends on how much is quoted and whether the commentary is real. Keep quotes short, keep each inside original text, and do not let the video be a recital of the book. Commentary also has to fit the channel's soul (HB-8: no Jonathan narration, no vlog), so who or what voices the commentary is an open decision for Jonathan.
- **Neville Goddard.** The risk is date, not text. Without per-recording date evidence, even a recording that sounds old is not safe to name. The repo has no such evidence yet.
- **LibriVox and other public-domain readings.** The reader's recording is usually released free, but each file's license has to be read on the day, since hosting pages and tags change.
- **Public domain text is not public domain edition.** Use the original text or a verified old edition, not a modern edited or annotated one.

## 2. The quote-clip line

**What it is.** Short clips from successful inspirational channels, cut into quote moments: a few seconds of a speaker, then the quote shown over EFS visuals. The playlist is the unit of release, not the single video.

**The rights problem, plainly.** Someone else owns almost every such clip, and often the speaker owns a separate right in the speech. Taking a clip from another channel does not make it ours. A clip is usable only on one of these bases, and the clip's record must state which:

1. **Written permission or license** from the rights holder. The cleanest basis. Keep the message or contract reference.
2. **A free license on the source video** (for example a YouTube video marked Creative Commons attribution). Caveat: the uploader may not own what the video contains, so check what is in it, and keep the attribution the license requires.
3. **Public domain** (for example a pre-1964 recording verified under the Neville rule, or old government material). Needs the evidence for the date or status.
4. **Fair use / quotation** for commentary or criticism. This is a judgment case by case, not a status. Risks: Content ID claims, takedowns and strikes can come regardless of how the argument would end. YouTube's reused-content rules are also separate from copyright and can limit monetization. I would not rely on this basis for a launch slate without Jonathan's decision.

A clip with none of these recorded is not usable. Rights are checked per clip, not per channel.

**Per-clip fields** (record in the clip's manifest, same pattern as the recipe's per-source rights):

- `clipId`
- `sourceChannelName`, `sourceChannelUrl`, `sourceVideoUrl`, `sourceVideoId`
- `speaker`
- `startTime`, `endTime`, `durationSeconds`
- `quoteText` (exact words), `transcriptSource`
- `rightsBasis` (one of: `licensed`, `free-license`, `public-domain`, `fair-use-claim`)
- `rightsEvidence` (permission reference, license URL, date evidence, or the written fair-use reasoning)
- `rightsVerifiedAt`, `rightsVerifiedBy`
- `attributionRequired` and `attributionText`
- `transformation` (what was added: commentary, new visuals, a quote card, a binaural bed)
- `parentPlaylistId`, `mixRecipeId` and fingerprint if any audio is mixed
- `engine` and `target` as two separate fields (HB-7)
- `curationStatus` (pending, approved, rejected), with the review event (HB-3)
- `takedownRisk` (low, medium, high) and `notes`

**Playlist as the unit of release.** A playlist carries one theme, its ordered items, and a single approval pass. A playlist is not released unless every clip in it has a rights basis, evidence and an approved review. One rejected clip holds back the playlist, not just itself. This matches how `playlist-batches` already treats a batch.

**Channel soul.** Clips are chosen for joy and appreciation, not engagement bait, and not to carry a clip speaker's brand over the channel's (HB-8). The title and thumbnail stay Jonathan's (HB-4).

**No clip is proposed in the first ten episodes.** I cannot name a clip I have not seen with a rights basis I have not checked. This line starts after the first source library entries and a first clip's permission are recorded.

## 3. First ten episodes, for Jonathan

**For Jonathan.** All of this is proposal. Titles, order, lengths, the cadence and the formats are yours to change or reject (HB-4); I have not decided any of them.

**Cadence proposed: one uplifting release a day for ten days.** To keep that sustainable, each day's release is one of three formats: a long mix, a Short or a Reel. The Shorts and Reels are cuts from the long mixes (peak-based cuts, per the short-form plan in the State of the Ring doc), so a long episode feeds the next days' Shorts. Posting stays Jonathan's. Lengths are targets, not measurements: no mix has been made and none of these durations has been tested.

Every episode needs: the rights basis from section 1 re-checked on the day, the mix recipe stored, and an approved curation review before any render or upload (HB-3, HB-6). Uploading also needs the channel id check (HB-10) and Jonathan's explicit go (HB-5).

| # | Working title (proposal) | Source | Length | Format | Notes |
|---|---|---|---|---|---|
| 1 | Thought and Character | James Allen, *As a Man Thinketh* (1903) | about 20 min | Long | Opens the channel. Mix: narration plus a CC0 bed, binaural. |
| 2 | The Thoughts You Choose | cut from episode 1 | 45 sec | Short | Peak-based cut from episode 1. |
| 3 | A Quiet Mind | cut from episode 1 | 30 sec | Reel | Different span of episode 1, same parent rights. |
| 4 | The Science of Getting Rich, Part 1 | Wallace Wattles, *The Science of Getting Rich* (1910) | about 20 min | Long | Recording license re-checked. |
| 5 | The Right to Be Rich | cut from episode 4 | 50 sec | Short | |
| 6 | The Way of Peace | James Allen, *The Way of Peace* (1907) | about 15 min | Long | Recording to be chosen and its license checked. |
| 7 | Peace in a Single Thought | cut from episode 6 | 40 sec | Reel | |
| 8 | The Science of Being Great | Wallace Wattles, *The Science of Being Great* (1911) | about 15 min | Long | Recording to be chosen and its license checked. |
| 9 | Growing Into More | cut from episode 8 | 45 sec | Short | |
| 10 | Mixtape: Evening Loop | Jonathan's own mixtape (owned) | about 25 min | Long | Rights field records "owned". The Neville slot is **left open** until a recording is named with date evidence; if it stays open, *Above Life's Turmoil* (James Allen, 1910) can be added the same way. |

What is deliberately not in the first ten: Neville (no confirmed recording), Seth (needs a commentary voice decision and fair-use care), Abraham Hicks (excluded from the launch slate by the project rules), and quote clips (no cleared clip).

**Open questions for Jonathan.**
1. Narration source for each long mix: a LibriVox reading, or an AI voice (the AI-voice policy is yours, HB-4).
2. Is a daily release the right pace given that four of the ten days are long mixes?
3. Do you want the open Neville slot held or filled with the fallback?
4. Is the Abraham Hicks rule to stay on the channel's shelf for now? I recommend not shipping it without a license or advice from a lawyer.

## 4. Not verified here

- No copyright status, license, or recording date was checked today. Statuses above come from the earlier spike receipt (2026-07-09) or from the general rule as described, not from a fresh check.
- No recording was listened to, and no durations were measured.
- No clip, channel or recording was searched for; none is named.
- The Master Goal Spec was not readable (see the State of the Ring doc).
