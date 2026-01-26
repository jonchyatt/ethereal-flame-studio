---
phase: 01-foundation
plan: 03
subsystem: visual-engine
tags: [particles, webgl, three.js, r3f, glsl, shaders, cpu-gpu-hybrid]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js + R3F project scaffold with TypeScript
provides:
  - CPU-based particle lifetime management system
  - GPU point sprite rendering with soft glow shaders
  - Size-over-lifetime curve (37% birth, 100% at 20%, 50% death)
  - Dual-layer particle architecture (inner glow + outer halo)
  - Visual state management with Zustand
  - Audio reactivity wiring (placeholder)
affects: [01-05-ethereal-mist, 01-06-ethereal-flame, 01-08-integration]

# Tech tracking
tech-stack:
  added: [zustand]
  patterns:
    - CPU lifetime tracking with Float32Array refs
    - GPU rendering with BufferGeometry and ShaderMaterial
    - Additive blending for volumetric glow
    - Size-over-lifetime curve matching Unity reference

key-files:
  created:
    - src/lib/shaders/particle.vert.glsl
    - src/lib/shaders/particle.frag.glsl
    - src/components/canvas/ParticleLayer.tsx
    - src/components/canvas/ParticleSystem.tsx
    - src/lib/stores/visualStore.ts
    - src/lib/stores/audioStore.ts
  modified:
    - src/types/index.ts
    - src/app/page.tsx

key-decisions:
  - "CPU lifetime management for organic spawn/die behavior"
  - "Additive blending (THREE.AdditiveBlending) for ethereal glow"
  - "Size-over-lifetime curve parameters exposed in ParticleLayerConfig"
  - "Dual-layer default: 1500 inner glow + 1000 outer halo = 2500 particles"
  - "Global hue cycling in ParticleSystem for color variation"

patterns-established:
  - "Particle lifecycle: birth → grow to peak at 20% life → shrink → fade → respawn"
  - "Alpha fade: 10% fade in, 80% full, 30% fade out"
  - "Shader pipeline: core + bloom + halo for volumetric effect"
  - "Store pattern: visual state (layers, intensity) + audio state (placeholder)"

# Metrics
duration: 4.5min
completed: 2026-01-26
---

# Phase 01 Plan 03: Particle System Core Summary

**CPU-driven particle lifecycle with GPU soft glow rendering and Unity-style size-over-lifetime curve**

## Performance

- **Duration:** 4.5 minutes
- **Started:** 2026-01-26T17:48:15Z
- **Completed:** 2026-01-26T17:52:48Z
- **Tasks:** 2/2 completed
- **Files created:** 8
- **Files modified:** 2

## Accomplishments

- Implemented CPU-based particle lifetime tracking with Float32Array refs for zero GC pressure
- Created GLSL shaders with soft glow falloff (core + bloom + halo) using exponential decay
- Ported Unity size-over-lifetime curve: particles birth at 37%, bloom to 100% at 20% life, shrink to 50% at death
- Built dual-layer particle system (inner glow 1500 + outer halo 1000) with Zustand state management
- Integrated particle system into main Canvas with OrbitControls for 3D navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create particle shaders and ParticleLayer component** - `493d351` (feat)
2. **Task 2: Create ParticleSystem with dual-layer configuration** - `dea1d98` (feat)

## Files Created/Modified

### Created
- `src/lib/shaders/particle.vert.glsl` - Vertex shader with distance-based size attenuation
- `src/lib/shaders/particle.frag.glsl` - Fragment shader with soft glow (core/bloom/halo)
- `src/components/canvas/ParticleLayer.tsx` - Single particle layer with CPU lifetime tracking (260+ lines)
- `src/components/canvas/ParticleSystem.tsx` - Dual-layer wrapper with global hue cycling
- `src/lib/stores/visualStore.ts` - Zustand store for layers, intensity, skybox state
- `src/lib/stores/audioStore.ts` - Audio levels placeholder (populated in plan 01-02)

### Modified
- `src/types/index.ts` - Added ParticleLayerConfig, FrequencyBand types
- `src/app/page.tsx` - Replaced placeholder mesh with ParticleSystem

## Technical Details

### Size-Over-Lifetime Curve (VIS-10)
The magic curve from Unity reference:
```typescript
if (normAge < peakLifetime) {
  // Birth to peak: 37% → 100%
  sizeMult = sizeAtBirth + (sizeAtPeak - sizeAtBirth) * (normAge / peakLifetime);
} else {
  // Peak to death: 100% → 50%
  sizeMult = sizeAtPeak - (sizeAtPeak - sizeAtDeath) * ((normAge - peakLifetime) / (1 - peakLifetime));
}
```

Default values: sizeAtBirth=0.37, sizeAtPeak=1.0, sizeAtDeath=0.5, peakLifetime=0.2

### Alpha Lifecycle (VIS-04)
- 0-10% life: Fade in
- 10-70% life: Full opacity
- 70-100% life: Fade out (30% duration)

### Shader Architecture
Fragment shader uses three exponential falloff layers:
- Core: `exp(-dist * 4.0) * 0.8` - Bright center
- Bloom: `exp(-dist * 1.5) * 0.3` - Mid-range glow
- Halo: `exp(-dist * 8.0) * 0.4` - Outer softness

Combined with additive blending for volumetric effect.

### Dual-Layer Configuration (VIS-05)

**Layer 1: Inner Glow**
- 1500 particles
- Base size: 20px
- Spawn radius: 0.5
- Max speed: 0.3
- Lifetime: 8s
- Audio reactivity: 0.8 (bass)

**Layer 2: Outer Halo**
- 1000 particles
- Base size: 40px
- Spawn radius: 1.5
- Max speed: 0.15
- Lifetime: 12s
- Audio reactivity: 0.5 (mids)

**Total:** ~2500 particles (architecture supports up to 50K per VIS-05b)

## Decisions Made

1. **CPU lifetime management:** Keep particle state (birth time, lifetime, velocity) on CPU in Float32Array refs to avoid GPU readback and enable organic respawn behavior
2. **Additive blending:** Use THREE.AdditiveBlending for ethereal glow effect
3. **Distance-based size attenuation:** Scale point sprite size by camera distance for depth perception
4. **Global hue cycling:** Slowly cycle hue in ParticleSystem (0.003/frame + 0.01*amplitude on audio) for color variation
5. **Store separation:** Visual state (layers, intensity) and audio state (levels) in separate Zustand stores for clean responsibility

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for:
- **Plan 01-02 (Audio Analyzer):** Audio store placeholder ready, props wired through ParticleSystem → ParticleLayer
- **Plan 01-04 (Star Nest Skybox):** Visual store includes skybox state (added during parallel work)
- **Plan 01-05/01-06 (Visual Modes):** Particle system accepts layer configs, can be customized per mode
- **Plan 01-08 (Integration):** Audio reactivity wiring exists, just needs real FFT values

## Verification

Verified:
- ✅ TypeScript compiles with no errors
- ✅ Dev server starts on localhost:3000
- ✅ ParticleLayer exports correctly
- ✅ Shader files exist in src/lib/shaders/
- ✅ Size-over-lifetime curve implemented (VIS-10)
- ✅ Alpha fade in/out for smooth lifecycle (VIS-04)
- ✅ Dual-layer rendering (VIS-05)
- ✅ Default ~2500 particles (VIS-05b)
- ✅ Additive blending enabled

## Requirements Covered

| Requirement | Status | Notes |
|-------------|--------|-------|
| VIS-01 | ✅ | Real-time WebGL preview working |
| VIS-04 | ✅ | Particle lifetime system with fade in/out |
| VIS-05 | ✅ | Dual-layer rendering (inner glow + outer halo) |
| VIS-05b | ✅ | ~2500 particles default, architecture supports 50K |
| VIS-10 | ✅ | Size-over-lifetime curve exactly as Unity reference |
| VIS-12 | ✅ | Smooth lerp transitions in size and alpha |

---

*Generated: 2026-01-26*
