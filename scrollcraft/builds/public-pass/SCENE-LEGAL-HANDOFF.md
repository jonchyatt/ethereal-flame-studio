# Group 4 scene and legal handoff

Base: `ebd535e`. Branch: `waia/scrollcraft-scene-draft`; isolated worktree `C:/hal-jobs/waia-scene-worktree`.
Routes: `/legal/terms`, `/legal/privacy`, `/legal/refunds`, `/mist`, `/scenes/orb-ocean`, `/scenes/rainbow-falls`.

## Composition and preservation

- Legal documents use `ScrollPage` with `legal-terms`, `legal-privacy`, or `legal-refunds`; `legal.css` scopes only those names. The title/date/support column stays beside readable policy text on desktop and precedes it on phone. Existing Support wording/link is the primary action. All legal BODY text is identical after line-ending normalization; metadata, date, legal constants, section order, and prior links are preserved.
- Mist exposes its existing metadata title as h1 and its existing Open/Close mist controls label as button text. Palette, Style, presets, URL initialization, and `ThinkingGlow` props are unchanged.
- Orb Ocean and Rainbow Falls opt into `LivingScene` public controls with their existing metadata title words. Quality and Pause/Resume motion are now discoverable without `?controls=1`. Existing Begin, Start sound, and waterfall mute controls have readable opaque backplates and at least 44px targets. Existing credits now use readable 14px text.
- `public-scene.css` applies only to the three `data-scene-ui` values. No renderer, shader, simulation, audio module, shared scene CSS module, HomeHero, shared ScrollExperience, engine, or commerce file changed.
- Scene control keyboard events stop before reaching the waterfall stage's Enter/Space sound shortcut, matching the controls' existing pointer-event isolation. Clicking or pressing the explicit sound control still calls the original callback. The original stage gesture remains available.
- Legal text stays static. Scenes stay full-screen working environments. These six routes do not claim a four-device story, dimensional marketing hero, or narrative peak. Additional scene narrative would need approved content; no filler or new public wording/media was authored.

## Local verification and limits

- Five TSX files passed syntax diagnostics; both new CSS files parsed successfully. Legal BODY and metadata/function contracts were compared with the base; `startSound` and `toggleMute` callback ASTs are unchanged.
- Inspected 24 static React-markup screenshots: all six routes, Mist open, and waterfall started at 390×844, 1440×900, and 360×640. No horizontal overflow; complete visible titles; all main links/buttons/selects measured at least 44×44; scene controls remain within the viewport.
- This fixture deliberately did not run effects, renderers, audio, or the action dock. It establishes layout only. It used no app build, install, external writes, or user Chrome.
- Scratch proof: `C:/hal-jobs/waia-scene-proof/metrics.json` and PNGs. Harnesses: `C:/hal-jobs/waia-scene-fixture.cjs`, `waia-scene-check.cjs`.
- Parent owns integrated build, actual renderer/audio interactions, live screenshots, release, and durable evidence. All isolated browser resources are closed.

## Flow selectors for integrated/live verification

| Route | Selectors and expected behavior |
| --- | --- |
| All legal | `main[data-scroll-page^='legal-'] h1`, `.legal-body`, and `a[href='/support'][data-sc-primary]`. Scroll below the source action on phone: shared dock should retain Support. Back to programs stays `/programs`. Compare `.legal-body` text and links against baseline; no form or write operation. |
| Privacy | Existing Stripe privacy URL, `/patrons/remove`, and mailto support remain in the body. In plain language remains intact. |
| Refunds | Existing Manage my access link remains `/programs/manage`; no billing action is invoked on the legal page. |
| Mist | `[data-scene-ui='mist'] h1` = Mist. Button name Open mist controls toggles `aria-expanded` and `#mist-controls`, then becomes Close mist controls. Selects by labels Palette and Style. Style values `mist`, `vortex`, `blend`; preset choices come unchanged from MIST_PRESETS. Query `?controls=1&style=blend` still initializes those states. Check `.thinking-glow-root`/canvas still fills the viewport and renderer remains active after changing selections. |
| Orb Ocean | `[data-scene-ui='orb-ocean'] h1`, `getByLabel('Quality')` values auto/low/medium/high; button Pause motion toggles Resume motion and calls renderer `setPaused`. Begin uses the original sound callback; after success it disappears and credits remain. Reduced-motion still changes Begin to disabled Motion reduced; that existing policy is preserved. Pause motion controls visuals, not audio. |
| Rainbow Falls | Same Quality and Pause/Resume controls. Start sound uses existing waterfall audio; after success it disappears and `getByRole('button',{name:'Mute waterfall'})` appears. Mute toggles `aria-pressed` and visible Unmute waterfall. Main-stage click/Enter/Space still starts audio. Quality/pause keyboard actions should not accidentally trigger the stage sound shortcut. |

For scene diagnostics, the existing `?capture=1` hook `window.__livingScene` provides renderer stats and audio state; no new diagnostics were added. Test normal/reduced motion, 390/1440, and compact 360×640. Preserve audio-source attribution. Do not mistake static fixture backgrounds for actual renderer evidence.

Existing relevant tests: `src/lib/waia/__tests__/withdrawn-reading.test.ts`; `e2e/glow-presets.test.ts`; `e2e/glow-vortex.spec.ts`; `e2e/glow-layered.spec.ts`. No dedicated legal-page or LivingScene UI Jest suite was found. The isolated worker did not edit tests; parent verification below records the later contract update.

## Integrated review

Parent ran the production build under bash and TypeScript checks successfully. Three withdrawn-reading tests and five glow-preset tests pass. Eleven existing browser cases covering URL selection, every palette, approved layered-field pixel equality, and control round trips pass. Their three old empty-Mist-stage assertions now require the exact visible title and Open mist controls text, closed aria-expanded state and absent Style panel; the lab's old empty-stage assertion and every renderer/pixel assertion remain intact. Native pointer lock/capture is disabled for all test contexts.

Actual renderer/audio interactions pass at 390, 1440 and reduced-motion 360: Quality, Pause/Resume, keyboard isolation from the stage sound shortcut, Begin, waterfall sound/mute, all Mist styles, palette selection and query initialization. Static fixtures are not being substituted for this evidence. Header overlays get their own compositor layer above the continuously redrawn WebGL canvas. Primary-action markers identify the existing Mist toggle and Pause motion controls. Home's adjacent parallax is removed as recommended, with Begin source and all three clips unchanged; home interactions and normal scroll samples pass again.

## Home sequencing recommendation (not implemented here)

In `src/app/page.tsx`, remove the clip12 `data-sc-parallax` attribute from its poster wrapper and put `data-sc-in={clip.id === '12' || undefined}` on that clip's article. Keep clip04's existing reveal. This gives hero depth → first clip flow/entry → second clip reveal → hinge → destination flow/entry, without consecutive parallax. The existing settle and reduced-motion guards already support it. No HomeHero, copy, media, or CSS change is necessary.
