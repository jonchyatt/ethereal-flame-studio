# Pick the lettering for printed merchandise
status: MOOT
red: second-look
project: What Am I Appreciating Now
one_click: font ok
Print files need outlined letters, and the web marks' font stack (Iowan, Sitka, Georgia) cannot be bundled, so the outlines use Liberation Serif (open licence). Same words, same paths, slightly different letter shapes, so the printed shirt will not match the site mark exactly. Built: 16 outlined SVGs, the star-field disc and a spec sheet per product in `docs/merch/print/`. On "font ok" nothing changes. On no, type the font you own or prefer and a follow-up regenerates every file. The two spiral products stay blocked until you confirm you own that artwork.

Moot 2026-10-19: Jonathan declined all existing merchandise designs (see `docs/merch/DESIGN-STANDARD.md`). The Liberation Serif outlines will not be printed, so no font decision is needed. New designs choose their own lettering and pass `npm run merch:intake`.
