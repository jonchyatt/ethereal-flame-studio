# Patron Wall for What Am I Appreciating Now

Supporters get their name, or a short message, inscribed in the 360 scene **behind the viewer**. Turning away from the audio-responsive orb shows the patrons. Higher tiers get fancier letters. Flat 16:9 renders end with a closing patron card built from the same list.

Scope: display only. No payments, no Patreon API. Who is on the list, and at which tier, is entered by hand in `patrons.json` after Jonathan's curation gate.

## Tier ladder (proposals only, Jonathan decides the real tiers and prices)

| Proposed price | Tier | Letters | Unity material |
|----------------|------|---------|----------------|
| $5 | `plain` | Soft white alias, steady | Plain |
| $10 | `glowing` | Gentle glow, slow breathing, soft halo | Glowing |
| $20 | `sparkly` | Restrained sparkle (warm gold, light flicker) | Sparkly |
| $35 | `ethereal` | Larger, slow hue drift, halo, gentle float, plus one moderated message | Ethereal |

One shared material per tier in Unity, so a tier looks identical across the wall. Prices are not in code; the schema only knows the tier name.

## patrons.json

Kept **outside this public repo** and passed by path (the code refuses paths inside the repo, and `patrons*.json` is gitignored). An array validated by `src/lib/patrons/schema.ts`:

```json
[{ "displayName": "Ada", "message": "Shine on", "tier": "glowing", "since": "2026-10-17", "approved": true, "consentRef": "consent_0001" }]
```

- `displayName`: 1 to 40 characters, an alias is fine. `message`: optional, up to 120 characters.
- `tier`: `plain | sparkly | glowing | ethereal`. `since`: ISO date. `approved`: must be `true` to ever render.
- `consentRef`: an opaque token (letters, digits, `_`, `-`, 8 to 64 characters) pointing at the explicit public-display consent record, which lives outside the repo. The schema is strict: emails, billing identities and any other extra key make the file invalid.

## Display and removal policy

- Names are optional aliases; a patron never has to use their real name.
- Not allowed: minors, impersonation of a real person or brand, URLs, and private information (addresses, phone numbers, emails, health details).
- Before anything is approved, the patron sees the exact text as it will appear and gives explicit consent to public display. That consent is what `consentRef` points to.
- Cancellation stops future inclusion after a cutoff stated at sign-up (proposal: the end of the paid period). The next snapshot simply omits them.
- Names already baked into a published video stay there unless that video is edited or withdrawn. Jonathan decides case by case; a withdrawn video is the remedy for a serious complaint.
- Complaints and removal requests go through the contact route on whatamiappreciatingnow.com (Jonathan to confirm the exact address before launch; none is stored in this repo). A removal request is handled before the next render.

## Moderation rules (`src/lib/patrons/moderation.ts`)

1. `approved: false` never renders, whatever else is true.
2. Length caps above (enforced by the schema; an over-long entry makes the whole file invalid so it is fixed, not silently clipped).
3. No URLs, domains, email addresses or link-shortener names in the name or message.
4. A blocklist of slurs, profanity and abuse phrases, matched on whole words after folding case, accents, leetspeak (`sh1t`), repeated letters and spaced-out letters (`f u c k`). Extend `BLOCKLIST` as needed. It is a safety net behind the approved flag, not a replacement for reading each entry.
5. Entries that fail rules 3 or 4 are dropped and reported by `loadRenderablePatrons`; the rest still render.

## Render contract: the approved snapshot is frozen

1. After Jonathan's curation gate, `writePatronRenderList(patronsJsonPath, outPath)` applies the moderation gate and writes the **frozen snapshot** (`efs-patron-wall-v1`: displayName, optional message, tier, consentRef; no approval flag, no dates) and returns its sha256. Both paths must be outside the repo.
2. The render plan carries `patronsFile` and `patronListHash` (both or neither). From here on, the renderer reads **only the frozen snapshot**, never the mutable patrons.json. `render.sh` receives `--patrons-file`, Unity receives `-patronsFile`.
3. `PatronWall` (`unity/Assets/Patrons/`) creates itself when `-patronsFile` is present, lays the names on the rear arc behind the default camera, and logs `[PatronWall] Placed N patrons hash=<sha256 of the file bytes>`.
4. `validateUnityArtifact` calls `verifyPatronSnapshotFile`: it rejects, with a reason, a snapshot whose bytes changed after approval, whose format is wrong, or whose frozen text no longer passes moderation. It also requires the Unity log hash to match. The receipt then records `patronListHash` and the full `patronSnapshot` (display text, tier, consentRef), which is what goes into the output manifest and release lineage. A changed or unapproved list can never silently reach a published video.
5. Flat renders: `renderPatronCardPng(list, outPath)` (`src/lib/patrons/card.ts`) screenshots a 1920x1080 closing card through Puppeteer from the same frozen list. Appending it to the video is up to the publishing step.

## Checks

- Automated: `npx jest src/lib/patrons src/lib/local-agent` covers the schema, moderation, hashing, card HTML and the render contract.
- Unity has no test assembly and was not run here. Manual check: open the project and run **Tools > EFS > Check Patron Wall Layout** (or batch `-executeMethod PatronWallSelfCheck.Run`), then render a short clip with `--patrons-file` and look behind the camera for the names and the `[PatronWall] Placed` log line.

## Patron intake and signup (backlog item 10)

Public pages: `/patrons/join` (tier, name or alias, one message on Ethereal only, an exact preview, consent and 18+ checkboxes) and `/patrons/remove` (removal by the patron's own code). No payment is taken and no contact detail is collected; the tiers are the proposals above with no price (`priceCents: null`, "not yet on sale"; `src/lib/patrons/tiers.ts`). Taking money is red 1 and stays Jonathan's click.

- **Storage** (storage adapter, private bucket or local storage, never the repo): `patrons/consent/<consentRef>.json` holds the exact consent wording and version, the text shown, and the time; `patrons/intake/<consentRef>.json` holds the submission and its status. The consent record is written first.
- **consentRef** is `consent_` plus 24 random hex characters. It is shown once to the patron after signup; it is their only handle for removal.
- **Moderation at the form**: the same URL and blocklist rules as the render gate, said plainly to the patron; over-long text is refused, not clipped. A honeypot field and a per-address limit slow bots.
- **Curation (operator, `Authorization: Bearer $WAIA_OPERATOR_SECRET`)**: `GET /api/patrons/intake` lists submissions; `PATCH` with `{consentRef, decision: approve|reject|withdraw}` decides (approve re-runs moderation and refuses if removal was requested); `GET /api/patrons/intake?format=patrons` returns the `patrons.json` content (approved, no removal request) to save outside the repo and pass to `writePatronRenderList`.
- **Removal**: `POST /api/patrons/removal {consentRef}` flags the record; the next export omits it. The answer is identical whether or not the code exists.
- Checks: `npx jest src/lib/patrons`.
