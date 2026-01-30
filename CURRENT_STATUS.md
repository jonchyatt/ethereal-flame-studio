# Ethereal Flame Studio - Current Status

**Date:** 2026-01-30
**Dev Server:** http://localhost:3002

---

## What's Working

### Core Systems
- **Particle System**: Flame and Mist modes with audio reactivity
- **Star Nest Skybox**: Procedural space background with multiple presets
- **Audio Analyzer**: FFT analysis with bass/mids/high frequency bands
- **UI Controls**: Mode selector, preset selector, audio upload
- **VR Preview Mode**: Mobile gyroscope control for both portrait and landscape

### Recent Fixes (2026-01-30)
1. **VR Landscape Mode**: Fixed gimbal lock causing 1°→178° pitch jumps
   - Root cause: gamma axis limited to [-90°, 90°], was being used for pitch in landscape
   - Fix: Use same euler conversion for both orientations (beta for pitch, full range)
   - Also fixed quaternion multiplication order (xQuat before screenQuat)
2. **VR Controls**: Portrait and landscape both now have correct axis mapping

### Previous Fixes
1. **Skybox rotation**: Back to original speed (0.5), NOT tied to audio amplitude
2. **Particle sizes**: Reduced to match reference images (smaller, contained orb)
3. **Audio reactivity**: Tuned to be visible but not overwhelming
4. **Camera position**: Adjusted for better framing

---

## What Needs Testing

Please test at http://localhost:3002:
1. Upload `test-audio.mp3` (already in project root)
2. Verify skybox is rotating smoothly (not spinning wildly)
3. Verify particles start small and pulse with audio
4. Verify colors are visible (yellow → orange → red gradient, not whited out)
5. Switch between "Ethereal Flame" and "Ethereal Mist" modes

---

## Reference Images

Located in `/references/` folder:
- `Beginsmall.png` - How flame should look at rest (small orb)
- `skybox-with-flame.png` - Flame with visible starfield
- `mist-mode.png` - Ethereal Mist mode example
- `flame-over-water.png` - Target aesthetic (water optional for later)

---

## Remaining Work (Phase 1)

### Plan 01-08: Integration
- [ ] Add UI slider for manual skybox rotation speed control
- [ ] Add intensity/size controls for particles
- [ ] Fine-tune audio-to-visual mapping
- [ ] Verify all presets work correctly

### Future Phases
- Phase 2: Recording/Export pipeline
- Phase 3: Blender integration for 8K rendering
- Phase 4: Automation (n8n integration)
- Phase 5: Polish and mobile optimization

---

## Quick Commands

```bash
# Start dev server (if not running)
cd C:\Users\jonch\Projects\ethereal-flame-studio
npm run dev

# Server should start on port 3002 (3000 is in use)
```

---

## Files Modified This Session

- `src/app/page.tsx` - Camera position
- `src/components/canvas/StarNestSkybox.tsx` - Rotation speed, removed audio modulation
- `src/components/canvas/ParticleLayer.tsx` - Audio reactivity multipliers
- `src/lib/stores/visualStore.ts` - Particle sizes and counts
