# Visuals TODO (Research → Plan → Execute)

## 1) Video Masking Improvements
- Research (done)
  - Review current masking modes (luma/chroma + patch masks) and shader inputs.
  - Identify gaps (rect/feather masks, alpha-only preview, matte inversion).
- Plan (done)
  - Define new mask types and UI controls.
  - Decide shader changes + UX for mask preview modes.
- Execute (done)
  - Implement new mask types/preview modes.
  - Wire UI + defaults + template persistence.

## 2) Seam & Pole Handling
- Research (done)
  - Review pole fade/hole fix + current video skybox rendering.
  - Identify seam artifacts and possible blends.
- Plan (done)
  - Add seam blend controls and optional horizon offset.
- Execute (done)
  - Implement shader blending + UI controls + defaults.

## 3) Export Workflow Polish
- Research (done)
  - Review render pipeline and UI (RenderDialog, batch page, template storage).
  - Identify missing features (template import/export, batch access).
- Plan (done)
  - Add template import/export in the Templates gallery.
  - Add a visible path to batch rendering from the Render dialog.
- Execute (done)
  - Implement template import/export controls.
  - Add batch render quick link in Render dialog.

## 4) VR Comfort + UX
- Research (done)
  - Review VR mode UI handling and comfort toggles.
  - Identify remaining discomfort sources (debug overlay always on).
- Plan (done)
  - Add a VR debug overlay toggle, keep default off.
  - Update VR comfort copy to reflect drift + rotation freeze.
- Execute (done)
  - Implement VR debug overlay toggle + template persistence.
  - Gate VR debug overlay visibility and update comfort description.
