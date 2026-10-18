# Reset Biology cross-links

Plain outbound links only. resetbiology.com takes no money; the free Reset Biology tools (peptide tracker, self-help) are never paywalled.

## This site (done in this repo)

- `public/waia-store.html`, section `#free-tools`: two links to resetbiology.com, with a line saying they are free and earn nothing.
- `public/waia-front-door.html`: one link under the store link.
- `src/lib/store/__tests__/crosslinks.test.ts` checks links are https, go only to resetbiology.com, and that the section has no form, button, price or payment words.

## The other site (written here, placed there)

`resetbiology-crosslinks.patch` is made against `jonchyatt/resetbiology` at `a3a4d8f` and `git apply --check` passes. It adds one footer link, "What Am I Appreciating Now", in the Explore list of `src/components/Navigation/Footer.tsx`, pointing at https://whatamiappreciatingnow.com/. Apply with `git apply docs/reset-biology/resetbiology-crosslinks.patch` from that repo.

Optional About-page copy to place by hand:

> The channel What Am I Appreciating Now carries the same spirit in sound and light: guided sessions and mixes that help people find joy. Visit https://whatamiappreciatingnow.com/.

Nothing was pushed to resetbiology: placing it publishes on a live site under the business name, which is on an approval card.
