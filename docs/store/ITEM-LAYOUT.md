# Store item layout and shelf intake

Every item the store shows, whether an affiliate link, an item in our Wix store or (later) merchandise, is one `StoreItem` (`src/lib/store/items.ts`) drawn by one component (`src/components/store/StoreItemCard.tsx`): kind label, picture slot, name, "From <seller>", the seller's own description, one outbound link, provenance line. Style and build quality come first: one card, one grid, no per-item variations.

- **Shelf page:** `/store/shelf`, reading `src/lib/store/shelf-items.ts`. It shows only items with `status: 'live'` (a missing status means `draft`); with none live it says the shelf is being stocked. Nothing is invented.
- **Intake page:** `/store/intake`. Paste one item per line, see each rendered in the real card, fix errors on the spot, then copy the printed lines into `shelf-items.ts` (or hand them to Claude). Below the form it previews every item already in the shelf file, drafts included. The page sends and stores nothing.

## Disclosures on the card

Every `commission: true` card prints "Affiliate link: WAIA may earn a commission from <program> if you buy through this link, at no extra cost to you." beside its link (`program`, else the seller). Every `supplement: true` card prints the FDA line under the description. An optional `warning` (the seller's own safety text, e.g. pregnancy) prints as given. The page-top disclosure stays.

## Paste shapes

```
Name | Seller | https://link | One plain sentence the seller itself says
Name | https://link
Name - https://link - Description
https://link            (reported as "missing name": the name is never guessed)
```

Seller defaults to the link's domain. The description may be empty. Provenance ("where these came from") is required and printed on every card. Pick "These links earn a commission" for affiliate links: they get `rel="sponsored"` and the disclosure shows. Default is on, because disclosing a commission that is not there costs nothing and the reverse does.

## Rules (carried over from `docs/AFFILIATE-SHELF.md`)

https only; placeholder links (`{ID}`, `<id>`, `example.com`, `PLACEHOLDER`) never render; outbound links only, no cart or checkout; no health claims, only what the seller says; the disclosure comes before the items; signing up to an affiliate programme binds Jonathan to its terms (red 2), so a person does that and the issued link is what gets pasted.

## Merchandise

`kind: 'merch'` exists in the type so the merch thread can plug in, but nothing renders merchandise and the intake page does not offer it. Merch stays off the site until a design passes the merch design standard and print intake (owned by the merch thread); this layout does not define that.

## Not done here

`public/waia-store.html` still has its older static health shelf section, and the bare-apex `/store` rewrite still points at that file; moving the apex store onto `/store/shelf` is a follow-up once items exist.
