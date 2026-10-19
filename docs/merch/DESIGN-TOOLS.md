# Design tools Jonathan could use to self-design

Scope: making original merchandise art (T-shirt, hat, mug) that clears `docs/merch/DESIGN-STANDARD.md` and passes `npm run merch:intake`.

What I could not check: the "Photoshop clean-room repo" Jonathan named is not in this repository (searched for "clean-room" and "nano banana"), and I did not identify which project it is. Tool prices and plan limits change often; verify on each vendor's page before paying. Nothing below was bought or signed up for.

## Recommendation

**Start with a two-tool loop: Nano Banana to explore, Inkscape to finish.**

1. Explore with Nano Banana (Google's Gemini image model) in the Gemini app or AI Studio. Prompt from the brand sentence and the loop, make dozens of directions in minutes, and keep only what feels like joy, appreciation and life. Free-tier credits are enough to start.
2. Finish in Inkscape (free, open source). Redraw or trace the chosen direction into clean vector paths, convert lettering to outlines, reduce to the colour limits, and export SVG. This is what makes it print-clean and is where the maker's taste shows.
3. Gate it with `npm run merch:intake`, then preview on a mockup.

Why: generated images alone are low-resolution rasters with unclear provenance and weak edges, which is the failure the print-spec intake exists to catch. Vector finishing fixes resolution for good, gives one-colour and embroidery versions, and makes the artwork his.

## Comparison

| Tool | Best for | Output | Cost | Print fit | Main risk |
|---|---|---|---|---|---|
| Nano Banana (Gemini image) | Fast exploration, restyling a sketch, mockups | Raster, around 1 to 2 MP | Free tier, paid plans | Needs upscale or retrace to reach 300 dpi | Resolution, odd lettering, commercial-terms and provenance to keep on file |
| Inkscape | Finishing, outlining text, tracing, colour-limited art | SVG, PDF, PNG | Free | Excellent: vector, outlines, screen print and embroidery ready | Learning curve |
| Affinity (Canva-owned suite) | One app for vector, raster and layout | SVG, PNG, PDF | Check current pricing; it has changed | Excellent, Photoshop-like | Pricing and licence changes since the Canva acquisition |
| Adobe Photoshop and Illustrator | Industry standard, generative fill, best colour control | Everything | Subscription | Excellent | Ongoing cost; generated parts follow Adobe's terms |
| Photoshop-style clean-room clone (the repo Jonathan named, unidentified) | Photoshop-like editing without the subscription | Depends | Free if open source | Unknown until I can see it | Maturity, missing colour management and CMYK, licence |
| Krita | Painting and illustration | PNG, JPEG | Free | Good for raster art at 300 dpi canvas | No real vector workflow |
| GIMP | Free raster editing | PNG, JPEG | Free | Good, with sRGB export set | Dated interface, no vector |
| Recraft | AI generation that outputs real SVG | SVG, PNG | Free tier, paid | Promising for vector logos and patterns | Output needs hand cleanup; check commercial terms |
| Midjourney, Ideogram, Flux and similar | Strong stylised art; Ideogram handles lettering well | Raster | Paid or limited free | Needs upscale and retrace | Provenance; Midjourney's terms depend on plan |
| Vectorizer tools (Vector Magic, Inkscape Trace Bitmap) | Turning a chosen raster into paths | SVG | Free to paid | Bridge from generated art to vector | Trace is only as clean as the source |
| Canva | Quick layouts and mockups | PNG, PDF, SVG on paid | Free and paid | Fine for simple type, weak for original art | Template look, which the standard rejects |
| Printify or Printful design editors | Placing finished art on a product | Provider mockups | Free | Uses the provider's real templates | Not for creating art |

## Notes on the "clean-room" idea

If the repo is an open-source Photoshop alternative, test it on one real job before relying on it: open a 3600 x 4800 PNG, edit on layers, export an sRGB PNG with transparency, and run `npm run merch:intake` on the result. If it cannot do that, use Krita or GIMP for raster and Inkscape for vector. Jonathan can share the link and I will evaluate it against this list.

## Generated art, rights and the gate

- Keep the tool's commercial-use terms (a screenshot or saved page) with the PR, as the rights basis.
- Do not prompt with another artist's name or a brand's artwork.
- Generated output is a sketch; the finished vector is the product, and it goes through the standard's tests.
