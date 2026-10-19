# Merchandise design standard

Why this exists: on 2026-10-19 Jonathan declined every existing merchandise design (the repo-drawn marks, the star-field disc, the spiral overlay and the mockups). Nothing from that artwork goes on any product, and no designs are imported from Wix or Google. Jonathan will probably design the new ones himself. This page is the bar a new design has to clear, and `docs/merch/DESIGN-TOOLS.md` is the tool comparison.

## The test, in order

1. **The brand sentence.** The circular What Am I Appreciating Now is a symbol of joy, appreciation and life (`docs/BRAND-MARK.md`). Hold the design up and ask: does it say joy, appreciation or life, to a stranger, in a second? If the honest answer is "it is a logo on a shirt", it fails.
2. **The loop.** The infinity loop is desire, passion, achievement, peace (boring on its own), contrast, new desire, and "Now" brings it back around. A design should carry movement and return, not sit still. A closed ring of text that merely repeats the name does not meet this.
3. **Both readings.** "Now, what am I appreciating?" (come to the centre) and "What am I appreciating now?" (moving forward). Either may lead; neither may be lost.
4. **Would someone choose to wear it without the name on it?** If it only works as an advert, it fails. A person should pick it because it is beautiful or it means something to them.
5. **Reads at three distances.** Across a room (one shape), at arm's length (the idea), up close (craft: clean edges, deliberate detail). Check by shrinking to 1 inch wide and by viewing at full print size.
6. **Survives its product.** A shirt is fabric (soft edges, no hairlines), a mug curves around, a hat is thread (flat colours, thick shapes). The same artwork is rarely right for all three; adapt it per product, do not stretch it.

## Craft rules

- Drawn by a human or generated and then art-directed by one. A raw generator output is never final; the maker refines it and owns the choices.
- No stock clip art, no template filler, no trend-chasing swirls added to look "psychedelic". Psychedelic is allowed when each element earns its place under tests 1 to 4.
- Lettering: the whole name, "What Am I Appreciating Now", wherever a person reads it. "WAIA" never appears on a product. Letters are converted to outlines before print.
- Colour: at most five on a shirt, at most six thread colours on a hat. Provide a one-colour version for screen print and for dark or light garments.
- Nothing semi-transparent, no hairlines under about 0.25 pt, no gradients on embroidery.
- Rights: every source element carries a rights basis in the PR (drawn by the maker, licensed with the licence kept, or generated with the tool's commercial terms kept). Unknown provenance is rejected. The earlier spiral overlay stays excluded.

## Print-spec intake (the machine gate)

`npm run merch:intake -- <shirt|hat|mug> <file> [--size WxH]` rejects a file that is below spec and says what is needed. It checks file headers only, so it needs no image software. Its rules, from `scripts/merch/print-intake.mjs`:

| Product | Print area (placeholder until the provider is chosen) | Formats | Notes |
|---|---|---|---|
| T-shirt front | 12 x 16 in | SVG, PNG | PNG must be transparent, 3600 x 4800 px at full size |
| Hat front panel | 4 x 1.75 in | SVG only | Embroidery is digitised from vector art: flat colours, no gradients, six colours at most |
| Mug wrap, 11 oz | 9 x 3.75 in | SVG, PNG, JPEG | 2700 x 1125 px at full size |

Rules for every file:

- **Resolution:** raster art must reach 300 dpi at the intended print size (`--size` lowers the pixels needed for a smaller placement). The file's dpi tag is ignored; pixels divided by inches is what counts.
- **Proportions:** must match the placement within 2 percent, so nothing is stretched or padded.
- **Vector files:** pure outlined paths with a viewBox. Live text, embedded rasters, filters, masks and foreignObject are rejected. Semi-transparency and hairlines give a warning.
- **Colour:** sRGB. A CMYK JPEG or a non-sRGB profile is rejected; a missing profile passes with a warning. The print provider does the CMYK conversion.
- **Size:** 25 MB at most.

Print areas are typical print-on-demand maxima. When a provider is chosen inside Jonathan's own Wix store, replace the numbers in `SPECS` with its real templates and flip `providerTemplateConfirmed`.

## How a design becomes public

1. The maker exports the file; `npm run merch:intake` accepts it.
2. A PR adds an entry to `approvedDesigns` in `scripts/merch/catalog.json` (`design` file path, `preview` image path under `public/`, `approvedOn` date). `npm run test:merch` re-runs the intake on that file, so a failing file cannot be listed.
3. Jonathan looks at the preview on his phone and desktop and approves.
4. Only then does the product appear on `/merch`. With no approved designs the route returns 404 and the store page has no merchandise section: unfinished pages are never public.

Taking money and going live stay Jonathan's click.
