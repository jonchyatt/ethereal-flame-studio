# What Am I Appreciating Now: brand mark

The name is always written in full, "What Am I Appreciating Now", wherever a person reads it (titles, descriptions, site copy, thumbnails, product text). "WAIA" is a file and branch slug only.

## Meaning, in Jonathan's words

The circular What Am I Appreciating Now is a symbol of joy, appreciation and life.

The "Now" closes the loop: desire, passion, achievement, peace, contrast, new desire. Peace is boring on its own; contrast starts the next desire, and "Now" brings it back around.

Both readings are intended and both are kept:

- "Now, what am I appreciating?" Come to the centre.
- "What am I appreciating now?" Transient, moving forward.

Wanting is the intake of energy, so work carrying this mark may take the audience into the next desire, not only into rest. Every thumbnail, design and opener is measured against the first sentence above.

## Files (`public/brand/`)

| Mark | Files | What it shows |
| --- | --- | --- |
| Circle | `what-am-i-appreciating-now-circle-{light,dark}.svg` | The full name set on a circle, starting at the top. "Now" ends where "What" begins, so it closes back into "What". |
| Infinity loop | `...-infinity-{light,dark}.svg` | The name running once around a lemniscate, closing at the crossing. |
| Circular loop | `...-loop-{light,dark}.svg` | The text ring around an inner arrow that closes on itself. |
| Wordmark | `...-wordmark-{light,dark}.svg` | Horizontal name, "Now" in the accent colour, with a line returning from "Now" to "What". |

`-light` is drawn for light backgrounds (dark ink). `-dark` is drawn for dark backgrounds (light ink). Backgrounds are transparent. "Now" always carries the accent colour.

The SVGs use live text with a serif stack (Iowan Old Style, Sitka Text, Georgia). They are not outlined, so letter shapes depend on the viewer's fonts. Outline them before sending to print.

## Regenerating

```
node scripts/generate-brand-marks.mjs
node scripts/render-brand-mockups.mjs   # needs Playwright Chromium; set CHROMIUM_PATH if the default is not installed
```

Mockups land in `public/brand/mockups/` (shirt and mug for every mark, plus psychedelic shirt, hat and mug variants). They are illustrative, not print files. The store page at `public/waia-store.html` (served at `/store` on the bare apex) shows them.

## Psychedelic backgrounds used

- `public/overlays/WAIANCircle.png`, the existing spiral artwork (confirm full ownership before print).
- Colours from the star-field presets in `src/components/canvas/StarNestSkybox.tsx`: Purple Nebula, Dark World 2, Crazy Fractal 2 (Teal), Purple 2 (Bright). These are CSS gradients that echo the presets, not renders of the shader.
