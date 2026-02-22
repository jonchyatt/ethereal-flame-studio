# Research: Audio Analysis Expansion for Blender VFX

**Project:** Ethereal Flame Studio - Phase 7
**Researched:** 2026-01-30
**Focus:** Extended audio analysis features for richer visual mapping
**Confidence:** HIGH

---

## Overview

The current `AudioAnalyzer.ts` provides basic FFT analysis:
```typescript
{ bass, mid, high, amplitude, isBeat, currentScale }
```

Phase 7 requires additional audio features for nuanced VFX control in Blender simulations.

---

## New Audio Features

### 1. Envelope Follower

**Purpose:** Smooth amplitude curve that follows the overall energy without rapid fluctuations.

**Algorithm:**
```typescript
class EnvelopeFollower {
  private envelope: number = 0;
  private attackTime: number = 0.01;  // 10ms attack
  private releaseTime: number = 0.1;  // 100ms release

  process(amplitude: number, deltaTime: number): number {
    const attackCoef = Math.exp(-deltaTime / this.attackTime);
    const releaseCoef = Math.exp(-deltaTime / this.releaseTime);

    if (amplitude > this.envelope) {
      // Attack - rising edge
      this.envelope = attackCoef * this.envelope + (1 - attackCoef) * amplitude;
    } else {
      // Release - falling edge
      this.envelope = releaseCoef * this.envelope + (1 - releaseCoef) * amplitude;
    }

    return this.envelope;
  }
}
```

**Blender Mapping:**
- Fire intensity (fuel_amount)
- Water calm/turbulence level
- Overall effect opacity

---

### 2. Onset Detection

**Purpose:** Detect when notes, hits, or transients start (more precise than beat detection).

**Algorithm (Spectral Flux):**
```typescript
class OnsetDetector {
  private previousSpectrum: Float32Array | null = null;
  private threshold: number = 0.15;
  private adaptiveThreshold: number = 0;
  private decayRate: number = 0.95;

  process(spectrum: Float32Array): boolean {
    if (!this.previousSpectrum) {
      this.previousSpectrum = new Float32Array(spectrum);
      return false;
    }

    // Calculate spectral flux (sum of positive differences)
    let flux = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const diff = spectrum[i] - this.previousSpectrum[i];
      if (diff > 0) flux += diff;
    }

    // Adaptive threshold
    this.adaptiveThreshold = Math.max(
      this.adaptiveThreshold * this.decayRate,
      flux * 0.5
    );

    // Store for next frame
    this.previousSpectrum.set(spectrum);

    // Detect onset
    return flux > this.threshold + this.adaptiveThreshold;
  }
}
```

**Blender Mapping:**
- Particle burst triggers
- Strobe flash triggers
- Splash/explosion events

---

### 3. BPM Detection

**Purpose:** Detect beats per minute for tempo-synced effects.

**Algorithm (Autocorrelation):**
```typescript
class BPMDetector {
  private beatHistory: number[] = [];
  private lastBeatTime: number = 0;
  private bpm: number = 120; // Default

  onBeat(timestamp: number): void {
    if (this.lastBeatTime > 0) {
      const interval = timestamp - this.lastBeatTime;
      this.beatHistory.push(interval);

      // Keep last 8 beats
      if (this.beatHistory.length > 8) {
        this.beatHistory.shift();
      }

      // Calculate average BPM
      if (this.beatHistory.length >= 4) {
        const avgInterval = this.beatHistory.reduce((a, b) => a + b) / this.beatHistory.length;
        this.bpm = 60000 / avgInterval; // Convert ms to BPM

        // Clamp to reasonable range
        this.bpm = Math.min(200, Math.max(60, this.bpm));
      }
    }

    this.lastBeatTime = timestamp;
  }

  getBPM(): number {
    return this.bpm;
  }

  getBeatDuration(): number {
    return 60000 / this.bpm; // ms per beat
  }
}
```

**Blender Mapping:**
- Rotation sync speed
- Pattern cycling rate
- Keyframe spacing

---

### 4. Frequency Centroid (Spectral Brightness)

**Purpose:** Measure the "brightness" or "warmth" of the sound - higher centroid = brighter sound.

**Algorithm:**
```typescript
class SpectralCentroid {
  process(spectrum: Float32Array, sampleRate: number, fftSize: number): number {
    let weightedSum = 0;
    let sum = 0;

    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i * sampleRate) / fftSize;
      const magnitude = spectrum[i];

      weightedSum += frequency * magnitude;
      sum += magnitude;
    }

    if (sum === 0) return 0;

    const centroid = weightedSum / sum;

    // Normalize to 0-1 range (assuming max useful frequency is 10kHz)
    return Math.min(1, centroid / 10000);
  }
}
```

**Blender Mapping:**
- Fire temperature (blackbody color)
- Color warmth/coolness
- Effect "sharpness"

---

### 5. Spectral Flux (Rate of Change)

**Purpose:** Measure how rapidly the spectrum is changing - high flux = chaotic/energetic.

**Algorithm:**
```typescript
class SpectralFlux {
  private previousSpectrum: Float32Array | null = null;

  process(spectrum: Float32Array): number {
    if (!this.previousSpectrum) {
      this.previousSpectrum = new Float32Array(spectrum);
      return 0;
    }

    // Calculate total absolute difference
    let flux = 0;
    for (let i = 0; i < spectrum.length; i++) {
      flux += Math.abs(spectrum[i] - this.previousSpectrum[i]);
    }

    // Normalize by spectrum length
    flux /= spectrum.length;

    // Store for next frame
    this.previousSpectrum.set(spectrum);

    return flux;
  }
}
```

**Blender Mapping:**
- Turbulence/vorticity level
- Chaos amount
- Particle spread randomness

---

## JSON Export Format

```typescript
interface AudioAnalysisJSON {
  // Metadata
  filename: string;
  duration: number;
  sampleRate: number;
  frameRate: number;
  totalFrames: number;

  // Per-frame data
  frames: Array<{
    frame: number;
    time: number;

    // Basic (existing)
    bass: number;
    mid: number;
    high: number;
    amplitude: number;
    isBeat: boolean;

    // Extended (new)
    envelope: number;
    isOnset: boolean;
    bpm: number;
    centroid: number;
    flux: number;
  }>;

  // Summary statistics
  summary: {
    averageBPM: number;
    peakAmplitude: number;
    totalBeats: number;
    totalOnsets: number;
  };
}
```

---

## Blender Python Integration

```python
import json
import bpy

def load_audio_analysis(filepath: str) -> dict:
    """Load audio analysis JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def apply_audio_keyframes(
    analysis: dict,
    obj: bpy.types.Object,
    parameter_path: str,
    audio_feature: str,
    multiplier: float = 1.0,
    offset: float = 0.0
):
    """Apply audio analysis as keyframes to a Blender object property."""
    for frame_data in analysis['frames']:
        frame = frame_data['frame']
        value = frame_data[audio_feature] * multiplier + offset

        # Set property value
        exec(f"obj.{parameter_path} = {value}")

        # Insert keyframe
        obj.keyframe_insert(data_path=parameter_path, frame=frame)

# Example: Map bass to fire fuel amount
analysis = load_audio_analysis('audio-analysis.json')
flow_obj = bpy.data.objects['FireEmitter']

apply_audio_keyframes(
    analysis,
    flow_obj,
    'modifiers["Fluid"].flow_settings.fuel_amount',
    'bass',
    multiplier=2.0,
    offset=0.5
)
```

---

## Audio Feature to VFX Mapping Table

| Audio Feature | Fire | Water | EDM Effects |
|---------------|------|-------|-------------|
| **bass** | Fuel amount | Wave height | Laser intensity |
| **mid** | Density | Surface turbulence | Grid ripple speed |
| **high** | Temperature | Foam/spray | Strobe frequency |
| **envelope** | Overall intensity | Calm/storm | Effect opacity |
| **onset** | Burst trigger | Splash trigger | Flash trigger |
| **bpm** | - | - | Rotation sync |
| **centroid** | Color temperature | - | Color warmth |
| **flux** | Turbulence/vorticity | Chaos level | Randomness |

---

## Implementation Notes

### Performance Considerations

- All new analyzers are O(n) where n = FFT size
- Maintain 60fps during real-time preview
- Export to JSON for Blender (no real-time requirement)

### Frame Rate Alignment

- Audio analysis at 60fps (matching render preview)
- Blender keyframes at 30fps (standard video)
- Interpolation handled by Blender's keyframe system

### Memory Management

- Float32Array for spectrum data (reused)
- Circular buffer for beat history
- Clear previous frame data after processing

---

## Sources

### Academic References
- [Onset Detection Revisited (Bello 2005)](http://www.eecs.qmul.ac.uk/~markp/2005/BelloBockLemstroemLaneyDAFX2005.pdf)
- [Spectral Flux for Onset Detection](https://www.dafx.de/paper-archive/2003/pdfs/dafx03_proceedings.pdf)

### Libraries (Reference Only)
- [Meyda.js](https://meyda.js.org/) - Audio feature extraction
- [Essentia.js](https://mtg.github.io/essentia.js/) - Music analysis
- [aubio](https://aubio.org/) - Audio analysis tools

### Implementation Guides
- [Web Audio API Analyser](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [DSP.js FFT](https://github.com/corbanbrook/dsp.js)

---

*Last updated: 2026-01-30*
