# Unity Reference: Original Audio-Reactive Orb Implementation

**Source Files:**
- `addrain_trim.prefab` — Additive rainbow particles
- `simprain_trim.prefab` — Simple rainbow particles
- `AudioSyncer.cs` — Beat detection base class
- `AudioSpectrum.cs` — FFT analysis
- `AudioSyncScale.cs` — Scale response to beats
- `AudioSyncColor.cs` — Color response to beats

---

## Key Insight: The "Look" Comes From Size-Over-Lifetime

The ethereal quality is NOT from having millions of particles. The Unity prefabs only use **1000 particles max**.

The magic is in the **size-over-lifetime curve**:

```
Time  | Size (% of base)
------|------------------
0.00  | 37%   ← Birth: small
0.20  | 100%  ← Peak at 20% lifetime
1.00  | 50%   ← Death: gentle shrink
```

This creates the organic "bloom and fade" effect — particles quickly grow to full size, then gradually shrink.

---

## Particle System Settings

### Additive Rainbow (`addrain_trim.prefab`)

| Parameter | Value |
|-----------|-------|
| Lifetime | 2 seconds |
| Start Speed | Random 0-1 |
| Start Size | 2 units |
| Max Particles | 1000 |
| Shape | Cone (type 10), radius 0.01 |
| Emission Rate | 40/second |
| Render Mode | Billboard |
| Sort Mode | By Distance |

### Simple Rainbow (`simprain_trim.prefab`)

| Parameter | Value |
|-----------|-------|
| Lifetime | 2 seconds |
| Start Speed | Random 0-1 |
| Start Size | 0.8 units (smaller) |
| Max Particles | 1000 |
| Shape | Sphere (type 0), radius 0.5 |
| Emission Rate | 20/second |

### Rainbow Gradient (both prefabs)

8 color keys creating smooth spectrum:
```
Position | Color
---------|-------
0%       | Red (#FF0000)
12.6%    | Orange (#FF6F00)
27.6%    | Yellow (#FFD800)
43.8%    | Green (#23FF11)
60.3%    | Cyan (#02C0FF)
76.5%    | Blue (#4E209B)
90.6%    | Purple (#AB00D0)
100%     | Red (#FF0000) — loops back
```

---

## Beat Detection (AudioSyncer.cs)

The beat detection is simple but effective:

```csharp
// Bias = threshold value (e.g., 1.5)
// Beat triggers when audio CROSSES the bias (up or down)

if (m_previousAudioValue > bias && m_audioValue <= bias) {
    if (m_timer > timeStep)  // Minimum interval check
        OnBeat();
}

if (m_previousAudioValue <= bias && m_audioValue > bias) {
    if (m_timer > timeStep)
        OnBeat();
}
```

**Key parameters:**
- `bias`: Threshold for beat detection (higher = less sensitive)
- `timeStep`: Minimum time between beats (prevents rapid-fire triggers)
- `timeToBeat`: Duration of the "attack" animation
- `restSmoothTime`: How fast to return to rest state

---

## FFT Analysis (AudioSpectrum.cs)

Very simple — just uses the first FFT bin:

```csharp
AudioListener.GetSpectrumData(m_audioSpectrum, 0, FFTWindow.Hamming);
spectrumValue = m_audioSpectrum[0] * 100;  // Scale up for visibility
```

- 128 bins
- Hamming window (good for music)
- Only uses bin 0 (lowest frequencies)

**For better frequency separation, expand to use more bins:**
- Bass: bins 0-3
- Mids: bins 4-15
- Treble: bins 16-63

---

## Animation Responses

### Scale (AudioSyncScale.cs)

```csharp
// On beat: Lerp to beatScale
StartCoroutine("MoveToScale", beatScale);

// Rest: Lerp back to restScale
transform.localScale = Vector3.Lerp(
    transform.localScale,
    restScale,
    restSmoothTime * Time.deltaTime
);
```

### Color (AudioSyncColor.cs)

```csharp
// On beat: Pick random color from array, lerp to it
Color _c = RandomColor();
StartCoroutine("MoveToColor", _c);

// Rest: Lerp back to restColor
m_img.color = Color.Lerp(
    m_img.color,
    restColor,
    restSmoothTime * Time.deltaTime
);
```

---

## Implementation Recommendations for Three.js

### 1. Size-Over-Lifetime in GLSL

Use a lifetime-based size curve in the vertex shader:

```glsl
float life = age / lifetime;  // 0 to 1
float size;

if (life < 0.2) {
    // Grow phase: 37% to 100%
    size = mix(0.37, 1.0, life / 0.2);
} else {
    // Shrink phase: 100% to 50%
    size = mix(1.0, 0.5, (life - 0.2) / 0.8);
}

gl_PointSize = baseSize * size;
```

### 2. Beat Detection in JavaScript

```typescript
const BIAS = 1.5;
const TIME_STEP = 0.15; // 150ms minimum between beats

let prevValue = 0;
let timeSinceBeat = 0;

function update(audioValue: number, deltaTime: number) {
    timeSinceBeat += deltaTime;

    const crossedUp = prevValue <= BIAS && audioValue > BIAS;
    const crossedDown = prevValue > BIAS && audioValue <= BIAS;

    if ((crossedUp || crossedDown) && timeSinceBeat > TIME_STEP) {
        onBeat();
        timeSinceBeat = 0;
    }

    prevValue = audioValue;
}
```

### 3. Smooth Transitions

Always lerp, never snap:

```typescript
const REST_SMOOTH_TIME = 5.0;

// In animation loop
scale = THREE.MathUtils.lerp(
    scale,
    targetScale,
    REST_SMOOTH_TIME * deltaTime
);
```

---

## Files to Port

1. **Size-over-lifetime curve** → GLSL shader attribute
2. **Rainbow gradient** → Color interpolation in shader
3. **Beat detection algorithm** → TypeScript class
4. **Lerp animations** → Use Three.js MathUtils.lerp

---

*Last updated: 2026-01-26 after reviewing original Unity source files*
