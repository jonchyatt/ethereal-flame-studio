# Merchandise catalog and print-on-demand feed

Psychedelic T-shirts, hats and mugs carrying the What Am I Appreciating Now marks (see `docs/BRAND-MARK.md`).

- Catalog: `scripts/merch/catalog.json` (14 products, each with a mark, a rights basis and a mockup in `public/brand/mockups/`).
- Feed: `docs/merch/wix-products.csv`, built by `npm run merch:csv`, checked by `npm run test:merch`.
- Print files: `docs/merch/print/` (outlined SVGs, four ink sets, star-field disc) and `docs/merch/print/SPEC.md` (size and placement per product), built by `npm run merch:print`.
- Every row is `visible=FALSE` and `price` is blank. Prices and going live are Jonathan's, inside his own Wix store.

## Import steps (Jonathan, in Wix)

1. Store Products, Import, upload `wix-products.csv`.
2. Connect a print-on-demand app and attach the print files to each product.
3. Set prices, then turn visibility on. Nothing here does that for you.

## Before anything prints

- The web mark SVGs in `public/brand/` use live text; the files in `docs/merch/print/` are the outlined ones to send to print. Mockups are illustrative only.
- The two `psychedelic-spiral` products use `public/overlays/WAIANCircle.png`. Confirm full ownership before print. No print file is made for them; the spec sheet marks them BLOCKED.
- Print-area sizes in `SPEC.md` are typical placeholders; the provider's real template sizes are unknown until a provider is chosen.

## Public pages

`/merch` and `/merch/<slug>` are generated from `scripts/merch/catalog.json` (code in `src/lib/merch/`). They show mockups, sizes and "Not yet on sale", with no prices. Only products whose `rights` is `repo-drawn` appear; `overlay-unconfirmed` artwork (the spiral products) stays off the site until ownership is confirmed. Colours are not in the catalog, so the pages say they are set in the store.

The "I would buy this" button posts to `/api/merch/notify`, which only increments `merch/notify/<slug>.json` in private storage (`{ total, sizes }`). No email, name, IP or cookie is stored. Read the counts with the storage adapter; buying will route to the Wix store later.
