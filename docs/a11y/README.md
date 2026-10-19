# Accessibility and speed pass: receipt (2026-10-17)

Backlog item 12. Audit: `npm run audit:a11y -- --base http://localhost:3000 --out docs/a11y/after.json` (Chromium, axe-core 4.10 at WCAG 2.2 AA plus best practice, a keyboard walk, a 320 px reflow check, image and transfer weight). Static guard rails: `npm run test:a11y`. Raw results: `before.json`, `after.json` (both from `next dev` on this branch's container).

## What the audit found and what changed

| Finding | Before | After |
|---|---|---|
| Store page: all 12 merchandise images 404 (paths began `/public/brand/...`; Next serves `public/` at the root) | 12 broken images, blank cards | 0 broken |
| Store image weight if loaded | 14 PNGs at 1000 px, about 1.2 MB, shown at about 300 px | 640 px WebP copies, 100 KB for all 14 (62 KB measured on the page), PNG kept as fallback and for the Wix feed |
| Form field borders on patron join, removal, custom-order status and the store request form | about 1.4:1 to 1.6:1 against the page (WCAG 1.4.11 needs 3:1) | 5.5:1 to 5.9:1 |
| Page titles | custom-order status, patron removal and every program page showed "Ethereal Flame Studio" | each carries "What Am I Appreciating Now" |
| Status messages (buy button, custom-order lookup, removal confirmation) were inserted into the page already filled, which screen readers often skip | silent | live regions that stay mounted |
| Patron join submit button looked enabled while disabled | no visual cue | dimmed, not-allowed cursor |
| Front door: strings of `WAIANWAIAN...` and the arrows were read aloud | read aloud | hidden from screen readers |
| Front door: the two spiral canvases redraw every frame, even scrolled off-screen | always on | pause when off-screen |
| Store logo had no reserved size | layout shift | width and height set |
| `/brand/*` served with no cache lifetime | none | one day plus stale-while-revalidate |

axe-core reported 0 violations on all seven public pages both before and after, so the real fixes above are the ones axe cannot see (broken paths, border contrast, titles, live regions). Keyboard walk: every stop shows a focus ring, no horizontal scroll at 320 px, on all seven pages.

## Not done, and why

- Production transfer sizes for the Next pages: `next build` did not finish in this container within 25 minutes (exit 124), so the numbers in the JSON for `/programs`, `/patrons/*` and `/store/custom-order` are dev-server bundles (about 8 MB) and mean nothing. Run the audit against a production build or the Vercel preview for those.
- Front door: the four YouTube embeds are focusable frames and the heaviest thing on the page (the sandbox has no route to YouTube, so they could not be measured). A click-to-load poster would fix that but changes the look, so it is left for Jonathan.
- Front door `<title>` and description use "WAIAN", not the whole name; that is copy, not a fix, so left alone.
- `og:image` is still missing on the front door (existing note in the file).
