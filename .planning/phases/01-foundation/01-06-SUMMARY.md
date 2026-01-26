---
phase: 01-foundation
plan: 06
subsystem: visuals
tags: [particles, flame, visual-modes, vfx]
requires: [01-03]
provides:
  - Ethereal Flame visual mode
  - Upward particle drift system
  - Age-based color interpolation
  - Organic turbulence effect
affects: [01-07, 01-08]
tech-stack:
  added: []
  patterns: [mode-specific-behavior, age-based-interpolation]
key-files:
  created: []
  modified:
    - src/lib/stores/visualStore.ts
    - src/components/canvas/ParticleLayer.tsx
decisions:
  - key: upward-velocity-bias
    choice: 70% upward, 30% lateral
    rationale: Creates convincing fire effect while maintaining organic spread
  - key: color-progression
    choice: Yellow → Orange → Red based on age
    rationale: Mimics natural fire temperature gradient
  - key: turbulence-pattern
    choice: Sin/cos with different frequencies for X/Z
    rationale: Creates organic flicker without disrupting upward motion
metrics:
  duration: ~5 minutes
  completed: 2026-01-26
---

# Phase 01 Plan 06: Ethereal Flame Mode Summary

**One-liner:** Organic upward-drifting fire particles with warm age-based colors (yellow→orange→red) and realistic turbulence

---

## What Was Built

Created the Ethereal Flame visual mode - the second distinct particle effect for the studio. Features warm, energetic fire-like particles that drift upward with organic flicker.

### Core Features

1. **Flame Mode Configuration** (visualStore.ts)
   - Three particle layers: Core (1800), Embers (1200), Heat Haze (800)
   - Fast upward drift speeds: 0.02-0.06 units/frame
   - Short lifetimes: 1.5-2.5 seconds for flickering effect
   - Warm color palette: Orange (#FF9919), Red-Orange (#FF4C00), Yellow-White (#FFE64C)
   - Strong audio reactivity: 0.3-0.7 on bass/mids/treble
   - Early peak lifetime: 0.25-0.4 for quick bloom

2. **Upward Velocity System** (ParticleLayer.tsx)
   - 70% velocity bias toward +Y axis
   - 30% lateral variation (X/Z) for organic spread
   - Applied at both initialization and respawn

3. **Age-Based Warm Color Interpolation**
   - Young particles (0-30% lifetime): Yellow-white → Orange
   - Old particles (30-100% lifetime): Orange → Deep red
   - Smooth linear interpolation using lerpColor helper
   - Updates every frame in animation loop

4. **Organic Turbulence**
   - Horizontal flicker: `sin(age * 15 + i) * 0.005`
   - Horizontal turbulence: `cos(age * 8 + i * 0.5) * 0.003`
   - No Y-axis turbulence (pure upward drift preserved)

5. **Sharp Alpha Curve**
   - 5% fade in (vs 10% for default)
   - Full opacity 5-50% lifetime
   - 50% fade out for quick flicker effect

### Technical Implementation

**Flame Detection Pattern:**
```typescript
const isFlame = config.id.includes('flame');
```

**Velocity Initialization:**
```typescript
if (isFlame) {
  const upwardBias = 0.7;
  velocities[i * 3] = dirX * speed * (1 - upwardBias) + (Math.random() - 0.5) * speed * 0.3;
  velocities[i * 3 + 1] = Math.abs(dirY) * speed * upwardBias + speed * 0.5; // Always positive Y
  velocities[i * 3 + 2] = dirZ * speed * (1 - upwardBias) + (Math.random() - 0.5) * speed * 0.3;
}
```

**Color Interpolation:**
```typescript
if (colorT < 0.3) {
  color = lerpColor(colorPalette.accent, colorPalette.primary, colorT / 0.3);
} else {
  color = lerpColor(colorPalette.primary, colorPalette.secondary, (colorT - 0.3) / 0.7);
}
```

---

## Decisions Made

### 1. Upward Velocity Bias (70/30 Split)

**Context:** Needed to balance realistic upward drift with organic lateral spread.

**Options Considered:**
- 90% upward: Too rigid, looks like straight columns
- 50% upward: Too diffuse, loses fire character
- 70% upward: ✅ **Chosen** - Strong upward motion with organic variation

**Rationale:** 70% provides convincing fire effect while maintaining natural spread. The 30% lateral component prevents rigid columns and creates realistic flame behavior.

### 2. Color Progression (Yellow → Orange → Red)

**Context:** Fire naturally transitions from hot (white/yellow) to cooler (red) as it ages.

**Options Considered:**
- Single color: Too monotone, unrealistic
- Random colors: Breaks fire illusion
- Temperature gradient: ✅ **Chosen** - Mimics natural fire

**Rationale:** Age-based color mimics real fire temperature gradients. Young particles are hottest (yellow-white), cooling to orange mid-life, and deep red at death.

### 3. Turbulence Pattern (Sin/Cos with Different Frequencies)

**Context:** Needed organic flicker without disrupting upward motion.

**Options Considered:**
- Perlin noise: Overkill, performance cost
- Random offsets: Too jittery, not organic
- Sin/cos waves: ✅ **Chosen** - Smooth, performant

**Rationale:** Sin/cos with different frequencies (15 vs 8) creates natural variation. Particle index offset prevents synchronization. No Y turbulence preserves clean upward drift.

---

## Requirements Covered

- **VIS-03:** Ethereal Flame mode implemented ✅
  - Organic upward-drifting particles
  - Warm color palette (orange, red, yellow-white)
  - Faster, more energetic than mist mode
  - Three-layer depth system
  - Strong audio reactivity

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Key Files Modified

### src/lib/stores/visualStore.ts
- Added `ETHEREAL_FLAME_CONFIG` with 3 layers
- Updated store initialization to default to 'etherealFlame' mode
- Integrated with existing mode switching system

### src/components/canvas/ParticleLayer.tsx
- Added flame detection: `config.id.includes('flame')`
- Implemented upward velocity bias in initialization
- Added upward velocity bias in respawn logic
- Implemented age-based warm color interpolation
- Added horizontal turbulence (flicker + turbulence)
- Implemented sharp alpha curve (5% fade in, 50% fade out)

---

## Performance Characteristics

- **Particle count:** 3,800 total (Core: 1800, Embers: 1200, Haze: 800)
- **Memory:** ~304KB for Float32Arrays (3800 × 20 values × 4 bytes)
- **CPU:** Age-based color interpolation adds ~2 conditional branches per particle per frame
- **GPU:** No change - same shader as existing modes

**Expected performance:** 60fps on modern hardware, 30-45fps on mid-range devices.

---

## Testing Notes

### Manual Verification Required

1. Switch to Ethereal Flame mode via store
2. Observe particles drifting predominantly upward
3. Verify warm color progression: yellow → orange → red
4. Check for organic horizontal flicker (subtle)
5. Compare to mist mode - should be visibly faster and warmer

### Known Limitations

- No audio integration yet (plan 01-08)
- No UI controls for mode switching (plan 01-07)
- Color palette only applied when `colorPalette` prop provided

---

## Next Phase Readiness

### Plan 01-07: Mobile-Friendly UI
- ✅ Mode configurations ready for UI
- ✅ Mode switching function (`setMode`) implemented
- 🔲 Need UI components to call `setMode('etherealFlame')`

### Plan 01-08: Integration
- ✅ Audio reactivity parameters defined (0.3-0.7)
- ✅ Frequency band mappings set (bass/mids/treble)
- 🔲 Need audio analyzer connected to particle layers

---

## Commits

| Hash | Message |
|------|---------|
| 9b990b6 | feat(01-06): define Ethereal Flame mode configuration |
| 8a2a2e3 | feat(01-06): implement flame-specific upward velocity and warm colors |

---

## Lessons Learned

1. **Mode detection pattern works well** - `config.id.includes('flame')` is simple and extensible
2. **Velocity bias creates convincing effects** - 70/30 split provides good balance
3. **Age-based interpolation is elegant** - Two-segment gradient (0-30%, 30-100%) handles complex color transitions
4. **Sin/cos turbulence is cheap** - No perlin noise needed for organic motion

---

*Summary completed: 2026-01-26*
