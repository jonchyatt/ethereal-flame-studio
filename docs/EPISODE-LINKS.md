# Episode links and click counts

Every episode, Short and Reel points viewers at the site through `https://www.whatamiappreciatingnow.com/e/<slug>?s=<surface>`. The route counts the click and redirects to the store page, so the analytics loop can see which episodes send people to the store (backlog: Episode links and click counts).

- **Slugs** `ep01` to `ep10` come from the launch slate (`src/lib/episode-links/episodes.ts`). Titles there are working titles; they stay Jonathan's call (HB-4).
- **Surface** `s` is one of `description`, `endscreen`, `short`, `reel`. Anything else is ignored, not stored.
- **What is stored:** per slug, per UTC day, a total and a count per surface, at `analytics/episode-clicks/<slug>/<day>.json` in private storage (not this repo). No address, user agent, cookie or id is read into the record. Bot-looking agents and storage failures never block or alter the redirect.
- **Counts are a floor.** Counters are read-modify-write, so two clicks in the same instant can count once.
- **No open redirect.** Only registered slugs redirect, and only to `/store`. Unknown slugs return 404.
- **Read it:** `GET /api/episode-links/summary?days=7` with the operator bearer secret returns totals per episode, per surface and per day.
- **Paste-ready text:** [`docs/episode-links/KIT.md`](episode-links/KIT.md) lists the description line and end-screen link for each of the ten. The text is one quiet line with the whole name and a link, no ask to like or subscribe (HB-8). Posting stays Jonathan's.

The store page still says "not yet on sale"; this change takes no money and publishes nothing.
