# Merchandise catalog and print-on-demand feed

Psychedelic T-shirts, hats and mugs carrying the What Am I Appreciating Now marks (see `docs/BRAND-MARK.md`).

- Catalog: `scripts/merch/catalog.json` (14 products, each with a mark, a rights basis and a mockup in `public/brand/mockups/`).
- Feed: `docs/merch/wix-products.csv`, built by `npm run merch:csv`, checked by `npm run test:merch`.
- Every row is `visible=FALSE` and `price` is blank. Prices and going live are Jonathan's, inside his own Wix store.

## Import steps (Jonathan, in Wix)

1. Store Products, Import, upload `wix-products.csv`.
2. Connect a print-on-demand app and attach the print files to each product.
3. Set prices, then turn visibility on. Nothing here does that for you.

## Before anything prints

- The mark SVGs use live text; outline them first (`docs/BRAND-MARK.md`). No print files exist yet; mockups are illustrative.
- The two `psychedelic-spiral` products use `public/overlays/WAIANCircle.png`. Confirm full ownership before print.
- Hat and mug print areas and the provider's template sizes are unknown until a provider is chosen.
