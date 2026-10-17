# Health affiliate shelf

Section `#shelf` on the store page (`public/waia-store.html`), data and renderer in `public/waia-affiliate-shelf.js`.

**State today:** the shelf ships empty and says "The shelf is being stocked". Jonathan's list of items has not been handed over, and no affiliate programme has approved him, so there is nothing true to list. Nothing is invented.

## Adding an item

Append an object to `ITEMS` in `public/waia-affiliate-shelf.js`. Every field is required:

| field | meaning |
|---|---|
| `id` | short slug |
| `name`, `merchant`, `blurb` | what a visitor reads; the blurb states only what the merchant itself states, no health claims |
| `url` | the real https link. If it is an affiliate link, it carries the ID the programme issued |
| `affiliate` | `true` if the link earns a commission, `false` for a plain outbound link |
| `listedBy` | must be `jonathan` (the item is on his list) |
| `listedOn` | date it was listed, `YYYY-MM-DD` |
| `provenance` | where the item came from and, for affiliate links, which programme issued the link |

An item that is missing a field, has a non-https URL, or a URL containing a placeholder (`PLACEHOLDER`, `{...}`, `<...>`, `example.com`, `your-id`) is not rendered. This is checked in `WaiaShelf.check` and covered by `src/lib/store/__tests__/affiliate-shelf.test.ts`.

## Rules

- Disclosure sits at the top of the section, before any item, in plain words (FTC-style: material connection, no extra cost, not medical advice).
- Affiliate links carry `rel="sponsored noopener noreferrer"`.
- Outbound links only: no cart, no checkout, no form, no script that sends or stores anything.
- Signing up for an affiliate programme binds Jonathan to the programme's terms (red 2). A person does that, then the issued link goes into `ITEMS`.
- The free Reset Biology tools stay free and are not listed here as affiliate items.
