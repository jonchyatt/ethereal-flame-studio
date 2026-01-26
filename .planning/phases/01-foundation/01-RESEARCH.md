# Phase 1: Foundation - Web UI + Visual Engine - Research

**Researched:** 2026-01-26
**Domain:** WebGL Particle Systems, Audio Visualization, React Three Fiber
**Confidence:** HIGH

## Summary

This phase establishes the core visual engine: a real-time WebGL particle system that responds to audio input. The research confirms that the existing reference code from reset-biology-website provides a solid foundation that can be ported and restructured.

**Key findings:**
1. **React Three Fiber v9 + Next.js 15** is the correct stack pairing (R3F v9 pairs with React 19, which Next.js 15 uses)
2. **CPU-based particle lifetime management** (as in the reference UnityOrb) is the right approach for 2K-50K particles with size-over-lifetime curves
3. **Web Audio API's AnalyserNode** with frequency band separation is well-documented and the reference implementation follows best practices
4. **Mobile performance** requires careful attention to particle count, devicePixelRatio, and shader complexity

**Primary recommendation:** Port the existing UnityOrb and AudioAnalyzerSingleton from the reference code as the foundation, restructuring for cleaner architecture and adding the missing Ethereal Mist/Flame modes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | App framework | Server components, file routing, Vercel deploy |
| React | 19.x | UI framework | Required by Next.js 15 App Router |
| @react-three/fiber | 9.x | React renderer for Three.js | R3F v9 pairs with React 19 |
| three | 0.181+ | WebGL abstraction | Industry standard 3D library |
| @react-three/drei | 10.x | R3F helpers | OrbitControls, shaderMaterial utilities |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript | 5.x | Type safety | Always - strict mode enabled |
| tailwindcss | 4.x | Styling | UI components, control panels |
| zustand | 5.x | State management | Cross-component state (audio, presets) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| R3F | Raw Three.js | Less React integration, more boilerplate |
| CPU particles | GPGPU/FBO particles | GPGPU is overkill for <50K particles, more complex |
| Zustand | React Context | Context re-renders entire tree, Zustand is selective |

**Installation:**
```bash
npm install next@latest react@latest react-dom@latest three @react-three/fiber @react-three/drei zustand typescript tailwindcss
npm install -D @types/three @types/react @types/react-dom
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main studio page
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── canvas/            # R3F components (render inside Canvas)
│   │   ├── ParticleSystem.tsx
│   │   ├── ParticleLayer.tsx
│   │   ├── StarNestSkybox.tsx
│   │   └── VisualCanvas.tsx
│   └── ui/                # React DOM components (control panels)
│       ├── ControlPanel.tsx
│       ├── AudioControls.tsx
│       └── PresetSelector.tsx
├── lib/
│   ├── audio/             # Audio analysis (runs outside R3F)
│   │   └── AudioAnalyzer.ts
│   ├── shaders/           # GLSL shader code
│   │   ├── particle.vert
│   │   └── particle.frag
│   └── stores/            # Zustand stores
│       ├── audioStore.ts
│       └── visualStore.ts
└── types/
    └── index.ts           # TypeScript interfaces
```

### Pattern 1: Singleton Audio Analyzer
**What:** Single AudioAnalyzer instance managing Web Audio API connection
**When to use:** Always - prevents multiple AudioContext conflicts
**Example:**
```typescript
// Source: Reference code BreathingOrb.tsx lines 99-271
class AudioAnalyzerSingleton {
  private static instance: AudioAnalyzerSingleton | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  // Frequency bands
  public bass = 0;
  public mid = 0;
  public high = 0;
  public amplitude = 0;

  // Beat detection
  public isBeat = false;
  public currentScale = 1.0;

  static getInstance(): AudioAnalyzerSingleton {
    if (!AudioAnalyzerSingleton.instance) {
      AudioAnalyzerSingleton.instance = new AudioAnalyzerSingleton();
    }
    return AudioAnalyzerSingleton.instance;
  }

  update(deltaTime: number): void {
    // FFT analysis and beat detection
  }
}
```

### Pattern 2: CPU Particle Lifetime with GPU Rendering
**What:** Track particle birth times, lifetimes, velocities in Float32Arrays; update positions/sizes in useFrame; render with Points/ShaderMaterial
**When to use:** For 2K-50K particles with size-over-lifetime curves
**Example:**
```typescript
// Source: Reference code UnityParticleLayer lines 748-1034
function ParticleLayer({ config }: { config: ParticleLayerConfig }) {
  const stateRef = useRef<{
    birthTimes: Float32Array;
    lifetimes: Float32Array;
    velocities: Float32Array;
    baseSizes: Float32Array;
  } | null>(null);

  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const posAttr = geometryRef.current.attributes.position;
    const sizeAttr = geometryRef.current.attributes.aSize;

    for (let i = 0; i < particleCount; i++) {
      const age = t - stateRef.current.birthTimes[i];
      const normAge = age / stateRef.current.lifetimes[i];

      // Size over lifetime curve
      let sizeMult = evaluateSizeCurve(normAge, config);
      sizeAttr.setX(i, stateRef.current.baseSizes[i] * sizeMult);

      // Respawn if dead
      if (age > stateRef.current.lifetimes[i]) {
        respawnParticle(i, t);
      }
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial ... />
    </points>
  );
}
```

### Pattern 3: Size Over Lifetime Curve
**What:** The magic curve from Unity: 37% at birth -> 100% at 20% life -> 50% at death
**When to use:** All particle effects for ethereal quality
**Example:**
```typescript
// Source: Unity reference, ported in VIS-10 requirement
function evaluateSizeCurve(normAge: number, config: {
  sizeAtBirth: number;    // 0.37
  sizeAtPeak: number;     // 1.0
  sizeAtDeath: number;    // 0.5
  peakLifetime: number;   // 0.2
}): number {
  const { sizeAtBirth, sizeAtPeak, sizeAtDeath, peakLifetime } = config;

  if (normAge < peakLifetime) {
    // Birth to peak: grow
    return sizeAtBirth + (sizeAtPeak - sizeAtBirth) * (normAge / peakLifetime);
  } else {
    // Peak to death: shrink
    return sizeAtPeak - (sizeAtPeak - sizeAtDeath) *
           ((normAge - peakLifetime) / (1 - peakLifetime));
  }
}
```

### Pattern 4: Frequency Band Separation
**What:** Split FFT data into bass (0-250Hz), mids (250Hz-4kHz), treble (4kHz+)
**When to use:** Per-layer audio reactivity
**Example:**
```typescript
// Source: MDN AnalyserNode docs, reference code lines 173-213
update(deltaTime: number): void {
  this.analyser.getByteFrequencyData(this.dataArray);
  const len = this.dataArray.length;

  // Frequency bin boundaries (for 44.1kHz sample rate, 512 FFT)
  const bassEnd = Math.floor(len * 0.1);     // ~250Hz
  const midEnd = Math.floor(len * 0.5);      // ~4kHz

  let bassSum = 0, midSum = 0, highSum = 0;

  for (let i = 0; i < len; i++) {
    const val = this.dataArray[i];
    if (i < bassEnd) bassSum += val;
    else if (i < midEnd) midSum += val;
    else highSum += val;
  }

  this.bass = (bassSum / bassEnd) / 255;
  this.mid = (midSum / (midEnd - bassEnd)) / 255;
  this.high = (highSum / (len - midEnd)) / 255;
}
```

### Anti-Patterns to Avoid
- **Creating objects in useFrame:** Allocate vectors/arrays once in useMemo, reuse in loop
- **Using setState for animation:** Mutate refs directly, avoid React re-renders
- **Conditional mounting of meshes:** Use `visible` prop instead to preserve GPU resources
- **Multiple AudioContext instances:** Use singleton pattern, browsers limit contexts

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Orbit camera controls | Custom mouse handlers | drei's OrbitControls | Edge cases, momentum, touch |
| Shader material boilerplate | Raw THREE.ShaderMaterial | drei's shaderMaterial | Auto-uniforms, extend support |
| Audio context management | Multiple contexts | Singleton pattern | Browser limits, conflict |
| Particle sprite textures | PNG loading | Procedural in shader | Fewer assets, better quality |
| Beat detection | Custom algorithm | Threshold crossing | Well-documented, proven |
| State management | Prop drilling | Zustand store | Performance, clean API |

**Key insight:** The reference code already implements most of these correctly. Port and restructure rather than rewrite.

## Common Pitfalls

### Pitfall 1: React Three Fiber v9 + Next.js 15 Compatibility
**What goes wrong:** "Cannot read properties of undefined (reading 'ReactCurrentOwner')" error
**Why it happens:** Version mismatch between R3F, React, and Next.js bundling
**How to avoid:**
- Use R3F v9 with React 19 (Next.js 15 default)
- Add `transpilePackages: ['three']` to next.config.ts
- Ensure all @react-three/* packages are same major version
**Warning signs:** Hydration errors, undefined errors in reconciler

### Pitfall 2: Creating Objects in useFrame
**What goes wrong:** Memory leaks, garbage collection stutters
**Why it happens:** `new THREE.Vector3()` allocates memory every frame at 60fps
**How to avoid:**
```typescript
// Bad
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1);
});

// Good
const vec = useMemo(() => new THREE.Vector3(), []);
useFrame(() => {
  ref.current.position.lerp(vec.set(x, y, z), 0.1);
});
```
**Warning signs:** Increasing memory, periodic frame drops

### Pitfall 3: Stale Closures in Animation Loops
**What goes wrong:** Animation references old values
**Why it happens:** useFrame callback captures values at creation time
**How to avoid:** Use refs for values that change frequently
```typescript
// Bad
const [amplitude, setAmplitude] = useState(0);
useFrame(() => {
  // amplitude is stale!
  ref.current.scale.setScalar(1 + amplitude);
});

// Good
const amplitudeRef = useRef(0);
useFrame(() => {
  ref.current.scale.setScalar(1 + amplitudeRef.current);
});
```
**Warning signs:** Animation doesn't respond to state changes

### Pitfall 4: Mobile devicePixelRatio Performance
**What goes wrong:** Extremely slow rendering on high-DPI mobile devices
**Why it happens:** Retina displays multiply pixel count by 4x or 9x
**How to avoid:**
```typescript
<Canvas
  dpr={[1, 2]} // Cap at 2x, never use full devicePixelRatio
  gl={{ powerPreference: 'high-performance' }}
>
```
**Warning signs:** Good desktop performance, terrible mobile performance

### Pitfall 5: Audio Context Not Resuming
**What goes wrong:** No audio analysis, amplitude stays at 0
**Why it happens:** Browsers require user gesture to start AudioContext
**How to avoid:** Resume context on user interaction (play button click)
```typescript
async function togglePlayback() {
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  await audioElement.play();
}
```
**Warning signs:** Audio plays but visualization doesn't respond

## Code Examples

Verified patterns from official sources and reference code:

### Next.js 15 + R3F Setup
```typescript
// Source: R3F docs, Next.js 15 docs
// next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['three'],
};

export default config;
```

### Canvas Configuration for Mobile
```typescript
// Source: R3F scaling-performance docs, MDN WebGL best practices
<Canvas
  camera={{ position: [0, 0.5, 3], fov: 60 }}
  dpr={[1, 2]} // Limit pixel ratio for mobile
  gl={{
    antialias: true,
    powerPreference: 'high-performance',
    toneMapping: THREE.ACESFilmicToneMapping,
  }}
  frameloop="always" // Or "demand" for battery savings
>
```

### Particle Shader with Size Over Lifetime
```glsl
// Source: Reference code, three.js particle tutorials
// particle.vert
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;

void main() {
  vAlpha = aAlpha;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Distance-based size attenuation
  float distanceScale = 100.0 / length(mvPosition.xyz);
  gl_PointSize = aSize * distanceScale;
}

// particle.frag
uniform float uIntensity;
varying float vAlpha;

void main() {
  // Soft circular gradient
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

  gl_FragColor = vec4(vec3(1.0), alpha * vAlpha * uIntensity);
}
```

### Zustand Audio Store Pattern
```typescript
// Source: Zustand docs, best practice for R3F integration
import { create } from 'zustand';

interface AudioState {
  amplitude: number;
  bass: number;
  mids: number;
  treble: number;
  isBeat: boolean;
  setAmplitude: (v: number) => void;
  setBands: (bass: number, mids: number, treble: number) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  amplitude: 0,
  bass: 0,
  mids: 0,
  treble: 0,
  isBeat: false,
  setAmplitude: (amplitude) => set({ amplitude }),
  setBands: (bass, mids, treble) => set({ bass, mids, treble }),
}));

// In useFrame, read directly without subscribing
useFrame(() => {
  const { bass } = useAudioStore.getState();
  // Use bass value...
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| R3F v8 | R3F v9 | 2024 | Required for React 19/Next.js 15 |
| drei v9 | drei v10 | 2024 | Breaking changes, new APIs |
| WebGL 1 | WebGL 2 (default) | Standard now | More features, better performance |
| CSS pixel sizing | ResizeObserver device-pixel-content-box | 2023 | Accurate high-DPI handling |
| Multiple particle meshes | Instanced/batched Points | Always | Critical for performance |

**Deprecated/outdated:**
- `next-transpile-modules` package: Use `transpilePackages` in next.config.ts instead
- `@react-three/fiber@8`: Use v9 for React 19 compatibility
- `AudioContext.createScriptProcessor`: Use AnalyserNode instead

## Open Questions

Things that couldn't be fully resolved:

1. **R3F v9 + Next.js 15 ReactCurrentOwner Error**
   - What we know: There's a known GitHub issue (#71836) about this error
   - What's unclear: Whether it's fully resolved in latest versions
   - Recommendation: Test early, monitor issue, have fallback plan

2. **WebGPU Migration Path**
   - What we know: WebGPU offers 150x performance for particles via compute shaders
   - What's unclear: Browser support timeline for production use
   - Recommendation: Architect for easy future migration but use WebGL for now

3. **Optimal Particle Count for Mobile**
   - What we know: 36K particles at 30fps tested on older Samsung devices
   - What's unclear: Exact thresholds for different device classes
   - Recommendation: Implement adaptive quality based on FPS monitoring

## Sources

### Primary (HIGH confidence)
- React Three Fiber docs (r3f.docs.pmnd.rs) - Installation, scaling-performance, pitfalls
- MDN Web Docs - AnalyserNode, WebGL best practices
- Reference code: reset-biology-website/src/components/visuals/BreathingOrb.tsx (2133 lines)
- Reference code: reset-biology-website/app/visuals/breathing/page.tsx (1489 lines)

### Secondary (MEDIUM confidence)
- [React Three Fiber GitHub](https://github.com/pmndrs/react-three-fiber) - Issue tracking
- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15) - React 19 compatibility
- [Maxime Heckel's Particle Tutorial](https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/)
- [Codrops GPGPU Particle Tutorial](https://tympanus.net/codrops/2024/12/19/crafting-a-dreamy-particle-effect-with-three-js-and-gpgpu/)

### Tertiary (LOW confidence)
- [wawa-vfx particle library](https://wawasensei.dev/blog/wawa-vfx-open-source-particle-system-for-react-three-fiber-projects) - Alternative approach
- [three.quarks](https://github.com/Alchemist0823/three.quarks) - Unity-like particle system for Three.js

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions verified against reference code and official docs
- Architecture: HIGH - Reference code provides working implementation
- Pitfalls: HIGH - Documented in official sources and verified in reference code
- Mobile optimization: MEDIUM - General guidelines known, specific thresholds need testing

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable domain, versions may update)

## Reference Code Analysis

The existing reset-biology-website provides a mature implementation:

### What to Port Directly
1. **AudioAnalyzerSingleton** (lines 99-271) - Well-structured, handles all edge cases
2. **UnityParticleLayer** (lines 748-1034) - CPU lifetime with GPU rendering pattern
3. **StarNestSkybox** (lines 1091-1793) - Complete shader with presets
4. **Size over lifetime curve** - Verified against Unity reference

### What to Restructure
1. **Component organization** - Move from single 2133-line file to modular structure
2. **State management** - Extract to Zustand stores for cleaner cross-component access
3. **Shader code** - Move inline GLSL to separate files for maintainability
4. **Type definitions** - Extract to dedicated types file

### What to Add
1. **Ethereal Mist mode** - Soft cloud-like particle effect (VIS-02)
2. **Ethereal Flame mode** - Organic upward drift (VIS-03)
3. **Dual-layer system** - Inner glow + outer halo running together (VIS-05)
4. **Mobile-specific optimizations** - Adaptive quality, lower particle counts
