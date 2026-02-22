# Local Render CLI - Implementation Plan

## Overview

Create a portable CLI tool for local video rendering that:
1. Takes a config file exported from the web UI
2. Renders directly without Redis/queue overhead
3. Can run from a thumb drive on any Windows PC with GPU

## Architecture

```
Web UI (Preview) ──export──> render-config.json ──> CLI Tool ──> video.mp4
```

## Config File Schema

```typescript
interface RenderConfig {
  // Version for compatibility
  version: "1.0";

  // Input
  audio: {
    path: string;           // Absolute or relative path
  };

  // Output
  output: {
    path: string;           // Output video path
    format: OutputFormat;   // flat-1080p-landscape, etc.
    fps: 30 | 60;
  };

  // Visual Settings
  visual: {
    mode: "flame" | "mist";
    skyboxPreset: string;
    skyboxRotationSpeed: number;
    waterEnabled: boolean;
    waterColor: string;
    waterReflectivity: number;
    layers: ParticleLayerConfig[];
  };

  // Optional
  options?: {
    quality?: "fast" | "balanced" | "quality";
    startFrame?: number;    // For resume
    endFrame?: number;      // For partial render
  };
}
```

## Implementation Tasks

### Phase 1: CLI Tool Core

- [ ] Create `scripts/render-cli.ts` - CLI entry point
- [ ] Create `src/lib/render/LocalRenderer.ts` - Direct render (no queue)
- [ ] Create `src/lib/render/renderConfig.ts` - Config types and validation
- [ ] Add npm script: `npm run render:local`

### Phase 2: Export Config Button

- [ ] Add "Export Config" button to RenderDialog
- [ ] Serialize current visualStore settings to config JSON
- [ ] File download or copy-to-clipboard

### Phase 3: Auto-Launch

- [ ] Detect if running in Electron/local environment
- [ ] Spawn CLI as child process
- [ ] Pipe progress back to UI

### Phase 4: Portable Package (Future)

- [ ] Bundle with pkg or nexe
- [ ] Include portable Chrome
- [ ] Include FFmpeg static binary
- [ ] Create installer/zip for distribution

## File Structure

```
scripts/
  render-cli.ts           # CLI entry point
src/lib/render/
  LocalRenderer.ts        # Direct render without queue
  renderConfig.ts         # Config types and validation
```

## CLI Usage

```bash
# Basic usage
npx tsx scripts/render-cli.ts --config render-job.json

# With npm script
npm run render:local -- --config render-job.json

# Future portable version
./ethereal-render.exe --config render-job.json
```

## Progress Display

```
Ethereal Flame Renderer v1.0
────────────────────────────
Audio:  PhonkShia.mp3 (3:24)
Output: PhonkShia_1080p.mp4
Format: 1080p Landscape @ 30fps

[1/3] Converting audio...     ✓
[2/3] Rendering frames...     ████████░░░░░░░░ 52% (2700/5100 frames)
      Speed: 45 fps | ETA: 53s
[3/3] Encoding video...       waiting

Press Ctrl+C to cancel (progress saved for resume)
```
