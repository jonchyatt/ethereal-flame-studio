# Visuals Change Log

All changes in the ethereal-flame-studio copy for skybox/orb controls are tracked here.

## 2026-01-31
- Added this log file for tracking skybox/orb control changes.
- Added skybox audio reactivity and drift settings to visual store.
- Added skybox audio reactivity and drift controls to StarNestSkybox rendering logic.
- Wired skybox audio/drift settings from visual store into the main page canvas.
- Added Skybox controls (audio reactivity toggle/strength + drift speed) to Advanced Editor UI.
- Added skybox video/mask state fields and actions to visual store.
- Added VideoSkybox component with optional luma/chroma key masking.
- Wired video skybox + mask settings into the main canvas scene (conditional StarNest overlay).
- Updated AdvancedEditor to prepare for video skybox controls (useState import).
- Added video skybox/mask selectors and local state hooks in AdvancedEditor.
- Added video skybox handlers and StarNest overlay visibility logic in AdvancedEditor.
- Adjusted AdvancedEditor skybox fallback logic and reset skybox mode when clearing videos.
- Updated main canvas skybox fallback to show StarNest when no video is loaded.
- Hid the Skybox Preset selector when the video skybox is active without a StarNest overlay.
- Added skybox mask preview state to the visual store.
- Added a mask preview shader mode to the video skybox (keyed areas tint magenta).
- Wired mask preview state into the main canvas video skybox.
- Added mask preview state hooks to the Advanced Editor.
- Added a mask preview toggle and a Video Skybox Quickstart helper block in the Advanced Editor.
- Added orb placement state (anchor mode + offsets) to the visual store.
- Added OrbAnchor component to position the particle orb in viewer or world space.
- Routed the particle system through OrbAnchor in the main canvas.
- Added orb placement controls (viewer/world anchor + offsets) to the Advanced Editor.
