# Reset Biology reverse-link kit

Backlog item 13. Everything to hand over so resetbiology.com can link here with plain outbound links. This site takes no money for it; resetbiology.com takes none either. The copy lives in `src/lib/store/resetBiologyKit.ts` and a test keeps this file in step with it.

Applying any of this on resetbiology.com changes a live public site, so it stays on the existing approval card (`approvals/2026-10-17-reset-biology-footer-link.md`, red 3, in PR #30). This kit adds only new files on this side and does not touch the #30 edits.

## 1. Footer snippet

Paste into the resetbiology.com footer:

```html
<a href="https://www.whatamiappreciatingnow.com/from-reset-biology" rel="noopener">What Am I Appreciating Now</a>
```

## 2. About copy

> What Am I Appreciating Now is a companion to Reset Biology: guided hypnosis, appreciation sessions and visual meditations made to help people find joy. The Reset Biology tools stay free here. What Am I Appreciating Now is where the sessions and programs live.

## 3. Landing page

`/from-reset-biology` on this site (`src/app/from-reset-biology/page.tsx`). It welcomes visitors, says the free Reset Biology tools stay free, links to `/programs` and back to Reset Biology. No prices, no checkout, no tracking parameters. It is `noindex` until the footer link is placed; remove the `robots` line in the page then.

## Not verified

The landing page was built and unit-tested here; the resetbiology.com footer and About page were not seen, so placement and styling there are for whoever applies it.
