# Particle Orbs Progress Report

## Working Version Bookmark
**Commit: 83a1530** - "feat: convert particle spawn to true 3D spherical distribution"

This commit produces the PERFECT organic undulating orb effect on initial page load.

---

## Key Discovery: Why Initial Load Looks Perfect

### The Root Cause
On initial page load, the store uses `DEFAULT_LAYERS` (not `ETHEREAL_FLAME_CONFIG.layers`):

**DEFAULT_LAYERS** (produces good organic look):
- `inner-glow`: spawnRadius **0.35**, particleCount 35, baseSize 5.5
- `outer-halo`: spawnRadius **0.5**, particleCount 25, baseSize 7.0
- Layer IDs do NOT contain 'flame' → `isFlame = false` → uses **else branch**

**ETHEREAL_FLAME_CONFIG.layers** (produces spherical look):
- `flame-core`: spawnRadius **0.04**, particleCount 60
- `flame-mid`: spawnRadius **0.06**, particleCount 45
- `flame-outer`: spawnRadius **0.075**, particleCount 30
- Layer IDs contain 'flame' → `isFlame = true` → uses **flame branch**

### The Implications
1. The organic undulating effect works with **larger spawn radii** (0.35-0.5)
2. The effect uses the **else branch** code path (not the isFlame branch)
3. Switching to "Ethereal Flame" mode replaces layers with 10x smaller spawn radii
4. The isFlame branch has different spawn logic that produces spherical results

---

## Issues to Solve

### Issue 1: Mode Switching Breaks the Look
**Problem**: Clicking "Ethereal Mist" then back to "Ethereal Flame" loses the organic look.

**Root Cause**:
- Clicking any mode calls `setMode()` which replaces `layers` with that mode's config
- ETHEREAL_FLAME_CONFIG has different layer IDs and spawn radii than DEFAULT_LAYERS
- The component remounts with completely different config values

**Potential Solutions**:
1. Update ETHEREAL_FLAME_CONFIG to match DEFAULT_LAYERS settings
2. Or update DEFAULT_LAYERS IDs to contain 'flame' and adjust spawn logic
3. Or create a unified spawn approach that works at any scale

### Issue 2: Audio Reactivity Blows Out the Orb
**Problem**: Loading audio turns the orb into a white blown-out sphere.

**Root Cause**: Very aggressive audio multipliers:
- `audioSizeMultiplier = 1.0 + bandAmplitude * reactivity * 3.0`
- With amplitude=0.5, reactivity=2.0: **4x size increase**
- Plus beat pulse: additional 1.45x
- Plus position scale expansion: 1.5x

**Potential Solutions**:
1. Reduce audio reactivity values in config (currently 1.5-2.5)
2. Cap maximum size multiplier
3. Make audio affect other properties (like alpha/color) instead of size
4. Create a separate audio-reactive outer layer

### Issue 3: Mist Mode Looks Spherical
**Problem**: Ethereal Mist looks uniformly spherical, not organic.

**Root Cause**: Mist config has different spawn radii (0.15-0.2) and the blob/asymmetry
values were fixed at 0.06/0.08 which don't scale proportionally.

**Note**: We tried scale-relative values but it dispersed the flame too much.

---

## What Works (Commit 83a1530)

The ParticleLayer code at this commit:
1. Uses **3D spherical coordinates** for base positions (phi + theta)
2. Adds **3D blob effect** (blobPhi, blobTheta, blobStrength)
3. Adds **3D asymmetry** (asymX, asymY, asymZ)
4. Uses **random velocity directions** (velPhi, velTheta)
5. Has **wide size randomization** (0.15x to 2.0x)
6. Uses **Unity soft gradient texture** for seamless blending
7. Has **smoothed audio response** (lerp with fast attack/slow decay)

Combined with DEFAULT_LAYERS settings (larger spawn radii), this produces the
beautiful organic undulating effect.

---

## Strategies to Try Next

### Strategy 1: Match Configs to DEFAULT_LAYERS
Update ETHEREAL_FLAME_CONFIG and ETHEREAL_MIST_CONFIG to use similar spawn radii
and settings as DEFAULT_LAYERS.

### Strategy 2: Layered Approach
Create a static undulating base layer (always present) with an audio-reactive
outer layer on top. This preserves the organic look while adding audio response.

### Strategy 3: Gentler Audio Reactivity
Keep particles organic but make audio affect:
- Overall orb brightness/intensity
- Color hue shifting
- Very subtle size changes (cap at 1.2x instead of 4x)

### Strategy 4: New "Organic Orb" Mode
Create a new mode specifically tuned to match the DEFAULT_LAYERS organic behavior,
separate from the existing Flame/Mist modes.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/canvas/ParticleLayer.tsx` | 3D spawn, texture rendering, smoothed audio |
| `public/textures/circle_particle.png` | Unity soft gradient texture |
| `src/lib/stores/visualStore.ts` | Mode configs (unchanged for working version) |

---

## Git History (Key Commits)

1. **baa4c96** - Add Unity texture and organic effect (first working version)
2. **5ad643a** - Apply organic spawn to all modes
3. **83a1530** - Convert to true 3D spherical distribution ← **BOOKMARK THIS**

---

## Next Session To-Do

1. [ ] Decide on strategy (match configs vs layered approach vs new mode)
2. [ ] Fix ETHEREAL_FLAME_CONFIG to preserve organic look on mode switch
3. [ ] Reduce audio reactivity to prevent blowout
4. [ ] Test ETHEREAL_MIST_CONFIG with adjusted settings
5. [ ] Consider creating duplicate orb for audio layer
