# Site conversion counters

Code: `src/lib/counters/`, `src/app/api/counters/`, `public/waia-counters.js`, `src/components/CounterBeacon.tsx`. Counts how many people look at the store, program and merch pages and how many tap "notify me", so the next-slate ranking can see which ideas send people to the store.

## What is counted

An event is a day, a kind (`view` or `notify`), a page (`store`, `programs`, `program`, `merch`) and an optional item slug. Nothing else. No cookie is set or read, no IP, user agent or visitor/session id is stored, and the beacon is sent with `credentials: 'omit'`. The server drops anything outside the allowlist (so free text never reaches storage), requests carrying Do Not Track or Global Privacy Control, crawlers, and callers over 120 beacons an hour (in-memory limit, address never stored). Every answer is an empty 204, counted or not.

## Where it lives

Storage adapter, never this repo: `counters/events/<day>/<kind>/<page>/<slug|_>/<random>` is one empty marker per event (so simultaneous visitors cannot overwrite each other), and `counters/summaries/<weekEnd>.json` is the weekly summary.

## Weekly summary

`GET /api/counters/summary?end=YYYY-MM-DD&save=1` with the operator Bearer secret (same as the custom-orders operator routes) returns seven UTC days ending on `end` (default today): views per page, per-day views, notify taps, and per item `{views, notifyTaps, notifyRate, confident}`. `confident` needs 100 views, the same floor as `src/lib/analytics/rank.ts`; below it a rate is shown, never trusted. `save=1` also writes the file. `interestBySlug(summary)` turns it into a lookup keyed `page/slug` for the ranking to read. The summary is marked `proposal: true`; what to do with it is Jonathan's call (HB-4).

## Wiring a new page

- Static HTML: add `data-waia-page="merch"` (and `data-waia-slug`) to `<body>` and load `/waia-counters.js`. Any element with `data-waia-notify="<item-slug>"` counts a tap. Done for `/store`.
- React: `<CounterBeacon page="program" slug={id} />`; `sendCounter('notify', 'merch', slug)` for a tap. Done for `/programs` and `/programs/[id]`.

The notify button itself belongs to the merchandise pages (backlog item 4); it only needs the attribute above.

## Not verified

Run only against a mocked storage adapter and fixtures; no real traffic, production bucket or deployed page was touched. Note that the pages are `not yet on sale` and stay so.
