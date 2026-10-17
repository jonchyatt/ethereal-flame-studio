# Brand art: how Jonathan picks

Nothing here is published. Candidates are looked at, one is chosen, and only the chosen file moves into the repo's public assets.

## 1. Make candidates

```
node scripts/brand/guide.mjs                       # writes brand/guide.png (exact infinity guide)
export GEMINI_API_KEY=...                          # your machine only, never committed
node scripts/brand/generate.mjs --prompt vortex-ribbon --n 4
```

Prompts live in `brand/prompts/*.md` (`vortex-ribbon`, `carved-wood-relief`, `icon`, `shirt-print`). Add a file to add a prompt. `--dry-run` prints the request without calling the API. Images appear in `brand/candidates/<prompt>/`, each with a `.json` recipe (model, prompt hash, references).

## 2. Add the words

```
node scripts/brand/compose.mjs --art brand/candidates/vortex-ribbon/<file>.png --out brand/composed.svg
```

"What Am I" sits upright on the left lobe's top arc, "Appreciating" on the right lobe's, and gold "Now" at the crossing. Add `--png` to also render a PNG (needs Playwright Chromium).

## 3. Pick

Measure each one against the sentence: the circular What Am I Appreciating Now is a symbol of joy, appreciation and life. Keep one; discard the rest. Check that the loop crosses once, the words read left to right and upright, and the art carries no letters of its own.

## 4. Where picks land

- Art without words: `public/brand/art/<prompt>-<short-name>.png`
- Composed with words: `public/brand/art/<prompt>-<short-name>-lettered.svg` (and `.png`)
- Keep the candidate's `.json` recipe next to the pick, renamed to match (every mix and asset stores its recipe).

Print use of anything generated needs Jonathan's go and an ownership check on the reference logo first.
