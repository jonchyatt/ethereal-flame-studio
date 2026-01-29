# Water Reflection Effects Research: Blender & Three.js

**Project:** Ethereal Flame Studio
**Researched:** January 27, 2026
**Focus:** Water plane beneath particle orb with reflections matching reference images
**Overall Confidence:** HIGH

---

## Executive Summary

The project needs a water plane that:
1. Has subtle wave animation
2. Reflects the orb/particles above
3. Matches the reference aesthetic (dark blue-green reflective surface with ripples)

**Key Finding:** The project already has a basic `WaterPlane.tsx` component with shader-based wave animation. To achieve the reference look with particle reflections, there are two main approaches:

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Three.js Native (Reflector + Water)** | Real-time, stays in web stack | Planar reflections only, SSR has particle limitations | **Use for real-time preview** |
| **Blender Offline Render** | Full raytraced reflections, best quality | Requires export pipeline, offline only | **Use for 8K final renders** |

**Recommended Strategy:** Enhance the existing Three.js water shader for real-time preview, use Blender Ocean Modifier with Cycles for production 8K renders.

---

## Part 1: Blender Water Techniques

### 1.1 Ocean Modifier (Procedural Waves)

The Ocean Modifier generates realistic deep ocean waves procedurally without simulation caching.

**Key Parameters:**

| Parameter | Default | Description | Recommended Setting for Ethereal |
|-----------|---------|-------------|----------------------------------|
| **Geometry Mode** | Generate | "Generate" creates mesh; "Displace" uses existing geometry | Displace (for control) |
| **Wave Scale** | 1.0 | Overall amplitude of waves | 0.1-0.3 (subtle waves) |
| **Choppiness** | 0.0 | Lateral displacement for sharper peaks | 0.1 (minimal chop) |
| **Time** | 0.0 | Animate this for wave motion | Keyframe 0 to 10 over 300 frames |
| **Wind Velocity** | 10 m/s | Controls wave size | 5-10 m/s (gentle breeze) |
| **Damping** | 0.0 | Reduces inter-reflected waves | 0.5-1.0 (calmer surface) |
| **Spectrum** | Turbulent Ocean | Wave physics model | Shallow Water (for calm lake) |

**Wave Spectrum Selection:**
- **Shallow Water:** Best for calm, reflective surfaces like meditation visuals
- **Established Ocean:** For larger bodies of water
- **Turbulent Ocean:** For dynamic, active water (not recommended for ethereal aesthetic)

**Animation Workflow:**
```python
# Blender Python: Animate ocean modifier
import bpy

ocean_mod = bpy.context.object.modifiers["Ocean"]
ocean_mod.time = 0
ocean_mod.keyframe_insert(data_path="time", frame=1)
ocean_mod.time = 10
ocean_mod.keyframe_insert(data_path="time", frame=300)
```

**Sources:**
- [Ocean Modifier - Blender 5.0 Manual](https://docs.blender.org/manual/en/latest/modeling/modifiers/physics/ocean.html)
- [Blender Ocean Modifier Tutorial - Learn3D](https://www.learn3dtutorials.com/blog/blender-ocean-modifier-tutorial/)

---

### 1.2 Procedural Water Material (Shader Nodes)

For the reflective surface appearance without heavy simulation:

**Node Setup for Cycles/Eevee:**

```
Noise Texture (Detail: 6, Scale: 8, 4D Noise)
    |
    v (Factor output)
Bump Node (Strength: 0.2)
    |
    v (Normal output)
Principled BSDF
    - Base Color: #0a1828 (dark blue)
    - Metallic: 0.0
    - Roughness: 0.1-0.2
    - IOR: 1.33 (water)
    - Transmission: 0.0 (opaque water surface)
    - Alpha: 1.0
```

**Animation:**
- Connect the W input of 4D Noise Texture to a Value node
- Keyframe the Value: 0 at frame 1, 10 at frame 300
- This creates smooth, looping wave motion

**Eevee-Specific Settings:**
```
Render Properties > Screen Space Reflections:
  - Enable
  - Half Res Trace: Off (for quality)
  - Max Roughness: 0.5
  - Enable Refraction

Object > Visibility:
  - Screen Space Reflection: Enabled
```

**Sources:**
- [Waterial - Animated Water Material](https://superhivemarket.com/products/waterial---animated-water-material)
- [Dynamic Flow Add-on (January 2026)](https://www.cgchannel.com/2026/01/check-out-real-time-blender-water-simulation-add-on-dynamic-flow/)

---

### 1.3 Reflections in Blender

**Cycles (Raytraced - Best Quality):**
- Automatic true reflections via path tracing
- No setup required beyond material Roughness < 0.5
- Handles particle reflections correctly
- Recommended for 8K final renders

**Eevee (Real-time - Preview):**
- Requires Reflection Cubemap probes
- Screen Space Reflections for dynamic objects
- May not capture all particles accurately
- Use for viewport preview only

**Reflection Probe Setup:**
1. Add > Light Probe > Reflection Cubemap
2. Position at water surface level
3. Set Influence to cover water plane area
4. Bake with "Bake Indirect Lighting"

**Render Layers for Compositing:**
Enable `Glossy > Indirect` pass for separate reflection control in compositor.

---

## Part 2: Exporting Animated Water to Three.js

### 2.1 The Core Problem

**Blender material animations (procedural textures) do NOT export to glTF.**

The wave animation in Blender shader nodes cannot be directly exported. Options:

| Method | Works? | File Size | Quality |
|--------|--------|-----------|---------|
| Export as static mesh | Yes | Small | No animation |
| Shape keys / morph targets | Yes | Large (14MB+) | Good |
| MDD vertex cache | Yes (via import) | Large | Good |
| Recreate in Three.js | Yes | None | Best for real-time |

### 2.2 Shape Keys / Morph Targets Workflow

**Recommended for pre-baked water animation:**

1. **Bake Ocean Modifier to Shape Keys:**
   ```python
   # Apply modifier and create shape keys
   import bpy

   obj = bpy.context.object
   # Apply ocean modifier at each frame
   for frame in range(1, 301, 10):  # Every 10 frames
       bpy.context.scene.frame_set(frame)
       bpy.ops.object.modifier_apply(modifier="Ocean")
       bpy.ops.object.shape_key_add(from_mix=True)
   ```

2. **Export to glTF:**
   - File > Export > glTF 2.0
   - Enable "Shape Keys" in Data section
   - Enable "Animations"

3. **Load in Three.js:**
   ```typescript
   const gltf = await loader.loadAsync('water.glb');
   const mixer = new THREE.AnimationMixer(gltf.scene);
   const action = mixer.clipAction(gltf.animations[0]);
   action.play();
   ```

**Warning:** File sizes can be 14MB+ for complex animations.

### 2.3 MDD Vertex Cache Workflow

Alternative for physics-based animations:

1. Enable "NewTek MDD format" add-on in Blender
2. Export: File > Export > Lightwave Point Cache (.mdd)
3. Import MDD back: File > Import > Lightwave Point Cache
4. This creates shape keys automatically
5. Export as glTF with shape keys enabled

**Sources:**
- [Blender to Three.js Export Guide](https://github.com/funwithtriangles/blender-to-threejs-export-guide)
- [Exporting Cloth Simulation to Three.js (August 2025)](https://tympanus.net/codrops/2025/08/20/exporting-a-cloth-simulation-from-blender-to-an-interactive-three-js-scene/)

---

## Part 3: Three.js Water Reflection Techniques

### 3.1 Built-in Water Class (WebGL)

**Current Status:** The project has a custom shader-based water plane. The built-in Three.js Water class provides planar reflections.

**Three.js Water (WebGL):**
```typescript
import { Water } from 'three/addons/objects/Water.js';

const waterGeometry = new THREE.PlaneGeometry(60, 60, 64, 64);
const water = new Water(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: normalTexture, // Wave normal map
  sunDirection: new THREE.Vector3(0.707, 0.707, 0),
  sunColor: 0xffffff,
  waterColor: 0x0a1828,
  distortionScale: 3.7, // Lower = calmer water
  alpha: 1.0,
  fog: false
});
water.rotation.x = -Math.PI / 2;
water.position.y = -0.8;
```

**Key Parameters:**
- `textureWidth/Height`: Resolution of reflection render (512 is good balance)
- `distortionScale`: Wave intensity (3.7 default, use 1-5 for calm water)
- `waterNormals`: Must provide a normal map texture for wave appearance

**Sources:**
- [Three.js Water Documentation](https://threejs.org/docs/pages/Water.html)

### 3.2 WaterMesh (WebGPU)

For WebGPURenderer (project uses WebGPU):

```typescript
import { WaterMesh } from 'three/addons/objects/WaterMesh.js';

const waterMesh = new WaterMesh(geometry, {
  resolutionScale: 0.5,
  waterNormals: normalTexture,
  alpha: 1,
  size: 1,
  sunColor: 0xffffff,
  sunDirection: new THREE.Vector3(0.707, 0.707, 0),
  waterColor: 0x0a1828,
  distortionScale: 20
});
```

**Note:** WaterMesh is specifically for WebGPURenderer. Use Water for WebGLRenderer.

**Sources:**
- [Three.js WaterMesh Documentation](https://threejs.org/docs/pages/WaterMesh.html)

### 3.3 Reflector (Mirror Plane)

For pure mirror reflections without water effects:

```typescript
import { Reflector } from 'three/addons/objects/Reflector.js';

const reflector = new Reflector(geometry, {
  clipBias: 0.003,
  textureWidth: window.innerWidth * devicePixelRatio,
  textureHeight: window.innerHeight * devicePixelRatio,
  color: 0x0a1828,
  multisample: 4
});
```

**Excluding Objects from Reflection:**
Use the layers system:
```typescript
// Set particles to layer 1
particleSystem.layers.set(1);

// Configure reflector camera to not see layer 1
// (Requires modifying Reflector.js)
```

**Sources:**
- [Three.js Reflector Documentation](https://threejs.org/docs/pages/Reflector.html)

### 3.4 GPGPU Water Simulation

For interactive ripples (mouse/touch driven):

**Technique:** GPU-computed heightmap with wave equation simulation.

```typescript
// Core algorithm from Three.js GPGPU Water example
// Fragment shader computes wave propagation:
float newHeight = (
  (north.x + south.x + east.x + west.x) * 0.5
  - heightmapValue.y
) * viscosity;
```

**Key Parameters:**
- Texture resolution: 128x128 (performance) to 512x512 (quality)
- Viscosity: 0.93-0.98 (higher = slower decay)
- Mouse size: 0.1-1.0 (ripple radius)

**When to Use:** Interactive applications where user can disturb water.

**Sources:**
- [Three.js GPGPU Water Example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_water.html)

---

## Part 4: Screen Space Reflections for Particles

### 4.1 SSR Limitations with Particles

**Problem:** Screen Space Reflections (SSR) only reflect what's visible on screen. Particles that are:
- Behind the camera
- Outside the viewport
- Occluded by other objects

...will NOT appear in SSR.

**Particle-Specific Issues:**
- Point sprites may not render correctly to SSR buffer
- Transparent/additive particles can cause artifacts
- Very small particles may be missed by SSR tracing

### 4.2 WebGPU SSR in Three.js

Three.js r180+ has WebGPU SSR support:

```typescript
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';

const ssrPass = new SSRPass({
  renderer,
  scene,
  camera,
  width: window.innerWidth,
  height: window.innerHeight
});
composer.addPass(ssrPass);
```

**React Three Fiber Demo:**
- [R3F WebGPU Post Processing with SSR](https://r3f-webgpu-post-processing.vercel.app/)

### 4.3 Recommended Approach for Particle Reflections

**For real-time preview:**
1. Use planar reflections (Water/Reflector) - works with particles
2. Render particles to a separate render target
3. Composite into water reflection texture

**For final render:**
1. Use Blender Cycles - automatic raytraced reflections
2. Particles recreated in Blender or composited in post

**Sources:**
- [Three.js WebGPU SSR Example](https://threejs.org/examples/webgpu_postprocessing_ssr.html)
- [0beqz/screen-space-reflections](https://github.com/0beqz/screen-space-reflections)

---

## Part 5: Comparison - Blender vs Three.js Water

### 5.1 Feature Comparison

| Feature | Blender Cycles | Blender Eevee | Three.js Water | Three.js Custom Shader |
|---------|---------------|---------------|----------------|------------------------|
| **Reflection Quality** | Best (raytraced) | Good (probes) | Good (planar) | Manual implementation |
| **Particle Reflections** | Perfect | Limited | Works | Requires extra pass |
| **Real-time** | No | Yes | Yes | Yes |
| **Wave Animation** | Excellent | Excellent | Good | Full control |
| **Performance** | Slow | Fast | Fast | Fastest |
| **8K Support** | Yes | Yes | No (4K limit) | No (4K limit) |
| **Export to Web** | Bake required | Bake required | Native | Native |

### 5.2 Performance Comparison

| Technique | Frame Time (1080p) | Suitability |
|-----------|-------------------|-------------|
| Custom shader (current) | <1ms | Preview & final |
| Three.js Water | 2-4ms | Preview |
| Reflector | 4-8ms | Preview |
| GPGPU Water | 1-2ms | Interactive |
| Blender Eevee | 30-100ms | Preview |
| Blender Cycles | 1-10s per frame | Final render |

### 5.3 Recommendation

**Current Implementation (WaterPlane.tsx):** Keep for real-time preview. Enhances well with:
- Add normal map sampling for more realistic wave appearance
- Add Fresnel term for angle-dependent reflection intensity
- Optionally composite particle render target for reflections

**For 8K Final Renders:** Use Blender workflow:
1. Recreate particle system in Blender or render as separate pass
2. Use Ocean Modifier with Cycles
3. Composite in Blender
4. Export as video frames

---

## Part 6: Implementation Recommendations

### 6.1 Enhance Current WaterPlane.tsx

The existing shader is a good foundation. Add:

**1. Fresnel Effect (angle-based reflectivity):**
```glsl
// In fragment shader
vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
vec3 normal = normalize(vNormal);
float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.0);
float reflectivity = mix(0.1, 0.9, fresnel);
```

**2. Normal Map for Detailed Waves:**
```glsl
uniform sampler2D uNormalMap;
vec3 normalFromMap = texture2D(uNormalMap, vUv * 4.0 + uTime * 0.02).rgb;
normalFromMap = normalFromMap * 2.0 - 1.0;
```

**3. Environment Reflection (simplified):**
```glsl
uniform samplerCube uEnvMap;
vec3 reflectDir = reflect(-viewDirection, normal);
vec3 envColor = textureCube(uEnvMap, reflectDir).rgb;
finalColor = mix(baseColor, envColor, reflectivity * 0.3);
```

### 6.2 Water Normal Map Asset

Download or create a tileable water normal map:
- Resolution: 512x512 or 1024x1024
- Format: PNG (RGB)
- Source: [Three.js examples/textures/waternormals.jpg](https://github.com/mrdoob/three.js/blob/master/examples/textures/waternormals.jpg)

### 6.3 Blender Setup for Final Renders

**Scene Setup:**
1. Create plane at Y = -0.8 (matching Three.js position)
2. Add Ocean Modifier (Shallow Water spectrum, Scale 0.1-0.3)
3. Apply water material (Principled BSDF, Roughness 0.1, IOR 1.33)
4. Add Reflection Cubemap probe if using Eevee

**Particle Integration:**
- Option A: Import Three.js particle positions via Python script
- Option B: Recreate particle system in Blender Geometry Nodes
- Option C: Render particles separately, composite in post

---

## Part 7: Reference Image Analysis

Based on the reference screenshots (Screenshot 1717, 1722):

**Observed Characteristics:**
- Dark blue-green base color (#0a1828 matches well)
- Subtle wave displacement visible
- Bright reflection streak from the orb
- Reflection is distorted by wave motion
- Horizontal ripple lines visible
- Fades to darkness at horizon

**Matching These in Implementation:**

| Characteristic | Current Status | Enhancement Needed |
|---------------|----------------|-------------------|
| Base color | Matches | None |
| Wave displacement | Works | Reduce amplitude slightly |
| Orb reflection | Missing | Add planar reflection or fake with gradient |
| Wave distortion | Partial | Add normal map |
| Ripple lines | Visible | Increase wave frequency |
| Horizon fade | Works | Good |

---

## Sources Summary

### High Confidence (Official Documentation)
- [Three.js Water Documentation](https://threejs.org/docs/pages/Water.html)
- [Three.js WaterMesh Documentation](https://threejs.org/docs/pages/WaterMesh.html)
- [Three.js Reflector Documentation](https://threejs.org/docs/pages/Reflector.html)
- [Blender Ocean Modifier Manual](https://docs.blender.org/manual/en/latest/modeling/modifiers/physics/ocean.html)
- [Blender glTF Export Manual](https://docs.blender.org/manual/en/2.81/addons/import_export/io_scene_gltf2.html)

### Medium Confidence (Tutorials/Community)
- [Blender to Three.js Export Guide](https://github.com/funwithtriangles/blender-to-threejs-export-guide)
- [Three.js GPGPU Water Example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_water.html)
- [jbouny/ocean - Three.js Water Shader](https://github.com/jbouny/ocean)
- [Codrops: Cloth Simulation Export (2025)](https://tympanus.net/codrops/2025/08/20/exporting-a-cloth-simulation-from-blender-to-an-interactive-three-js-scene/)
- [Dynamic Flow Add-on (January 2026)](https://www.cgchannel.com/2026/01/check-out-real-time-blender-water-simulation-add-on-dynamic-flow/)

### Low Confidence (Single Source/Community Discussion)
- [Three.js Forum: Excluding Elements from Reflector](https://discourse.threejs.org/t/is-it-possible-to-exclude-elements-from-rendering-in-a-reflector/31262)
- [0beqz/screen-space-reflections](https://github.com/0beqz/screen-space-reflections)

---

## Next Steps

1. **Immediate (Current Sprint):**
   - Keep existing WaterPlane.tsx
   - Add water normal map texture
   - Implement Fresnel-based reflectivity

2. **Near-term (Phase 2):**
   - Evaluate Three.js Water class for better reflections
   - Test planar reflection performance with particles
   - Create Blender scene template for 8K renders

3. **Future (Phase 3+):**
   - Implement GPGPU water for interactive ripples (if needed)
   - Build Blender-to-FFmpeg 8K render pipeline
   - Composite particle passes in Blender

---

*Research completed: January 27, 2026*
