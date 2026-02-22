# Research: Blender 360 and Stereoscopic Rendering for VR

**Project:** Ethereal Flame Studio - Phase 7
**Researched:** 2026-01-30
**Focus:** Blender panoramic camera, stereo rendering, VR metadata
**Confidence:** HIGH

---

## Overview

This document covers Blender-specific techniques for 360/VR rendering, complementing the existing Three.js guide at `.planning/research/THREEJS_360_STEREO_GUIDE.md`.

**Key Differences from Three.js:**

| Aspect | Three.js | Blender |
|--------|----------|---------|
| Camera | CubeCamera + shader conversion | Panoramic camera (native) |
| Stereo | Manual left/right offset | Built-in stereo 3D mode |
| Output | Convert cubemap to equirect | Direct equirectangular render |
| Quality | Limited by WebGL | GPU raytracing (Cycles) |
| Max resolution | 4K (texture limit) | 8K+ (VRAM limited) |

---

## Panoramic Camera Setup

### Camera Types in Blender

| Type | Description | Use Case |
|------|-------------|----------|
| **Equirectangular** | Full 360x180 spherical | VR video, YouTube 360 |
| **Fisheye Equidistant** | Dome projection | Planetarium, partial sphere |
| **Fisheye Equisolid** | Wide-angle lens simulation | Real lens matching |
| **Mirror Ball** | Chrome ball reflection | Environment capture |

### Equirectangular Camera Setup

```python
import bpy
import math

def setup_panoramic_camera(
    name: str = "VRCamera",
    location: tuple = (0, 0, 1.6),  # Human eye height
    stereo: bool = True
):
    """Set up panoramic camera for 360 VR rendering."""

    # Create camera
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.active_object
    camera.name = name

    # Set as active camera
    bpy.context.scene.camera = camera

    # Configure for panoramic equirectangular
    camera.data.type = 'PANO'
    camera.data.cycles.panorama_type = 'EQUIRECTANGULAR'

    # Full 360x180 field of view
    camera.data.cycles.latitude_min = math.radians(-90)
    camera.data.cycles.latitude_max = math.radians(90)
    camera.data.cycles.longitude_min = math.radians(-180)
    camera.data.cycles.longitude_max = math.radians(180)

    if stereo:
        setup_stereo_camera(camera)

    return camera

def setup_stereo_camera(camera, ipd: float = 0.064):
    """Configure camera for stereoscopic rendering."""

    # Enable stereo 3D
    camera.data.stereo.convergence_mode = 'PARALLEL'  # or 'OFFAXIS', 'TOE'
    camera.data.stereo.interocular_distance = ipd  # 64mm standard IPD
    camera.data.stereo.pivot = 'CENTER'  # Pivot point for stereo

    # Enable stereoscopic rendering in render settings
    scene = bpy.context.scene
    scene.render.use_multiview = True
    scene.render.views_format = 'STEREO_3D'

    # Configure left/right views
    for view in scene.render.views:
        view.use = True
```

### Render Resolution for VR

```python
def set_vr_resolution(width: int = 4096, stereo: bool = True):
    """Set render resolution for VR output."""

    scene = bpy.context.scene

    # Equirectangular is 2:1 aspect ratio
    scene.render.resolution_x = width
    scene.render.resolution_y = width // 2

    if stereo:
        # For top/bottom stereo, output is 1:1
        # Each eye is width x (width/2)
        # Combined: width x width
        scene.render.image_settings.views_format = 'STEREO_3D'
        scene.render.image_settings.stereo_3d_format.display_mode = 'TOPBOTTOM'

    # Recommended resolutions
    # 4K mono: 4096 x 2048
    # 4K stereo: 4096 x 4096 (2048 per eye)
    # 8K mono: 8192 x 4096
    # 8K stereo: 8192 x 8192 (4096 per eye)
```

---

## Stereo 3D Configuration

### Stereo Modes

| Mode | Description | YouTube VR |
|------|-------------|------------|
| **Top/Bottom** | Left eye on top, right on bottom | Supported (default) |
| **Side-by-Side** | Left on left, right on right | Supported |
| **Anaglyph** | Red/cyan glasses | Not for VR |

### Configure Top/Bottom Stereo

```python
def configure_stereo_output():
    """Configure stereo output for YouTube VR compatibility."""

    scene = bpy.context.scene

    # Enable multiview
    scene.render.use_multiview = True
    scene.render.views_format = 'STEREO_3D'

    # Configure stereo 3D format
    stereo = scene.render.image_settings.stereo_3d_format
    stereo.display_mode = 'TOPBOTTOM'  # or 'SIDEBYSIDE'
    stereo.use_squeezed_frame = False  # Full resolution per eye

    # Interlace mode (if using interlaced)
    # stereo.interlace_type = 'ROW_INTERLEAVED'

    # Output format
    scene.render.image_settings.file_format = 'PNG'  # For frame sequences
    # Or 'FFMPEG' for direct video output
```

### IPD (Interpupillary Distance)

```python
def set_ipd(camera, ipd_mm: float = 64):
    """Set interpupillary distance in millimeters."""

    # Convert mm to Blender units (meters by default)
    ipd_m = ipd_mm / 1000.0

    camera.data.stereo.interocular_distance = ipd_m

    # Adjust for scene scale if needed
    # If scene is 1 unit = 1 cm, multiply by 100
    # If scene is 1 unit = 1 ft, multiply by 3.28084
```

### Convergence Settings

```python
def set_convergence(camera, mode: str = 'PARALLEL', distance: float = 10.0):
    """Configure stereo convergence.

    Modes:
    - PARALLEL: Eyes look straight ahead (natural for distant objects)
    - OFFAXIS: Converge at a specific distance
    - TOE: Cameras toe-in toward each other
    """

    camera.data.stereo.convergence_mode = mode

    if mode == 'OFFAXIS':
        camera.data.stereo.convergence_distance = distance
```

---

## Cycles vs Eevee for 360

### Feature Comparison

| Feature | Cycles | Eevee |
|---------|--------|-------|
| Panoramic camera | Full support | Not supported |
| Equirectangular | Yes | Workaround only |
| Volumetrics | Physically accurate | Approximation |
| Render time | Hours | Minutes |
| Quality | Photorealistic | Real-time quality |

### Eevee 360 Workaround

Eevee doesn't support panoramic cameras directly. Workaround:

```python
def render_360_eevee_cubemap():
    """Render 6 cubemap faces in Eevee, combine to equirectangular."""

    scene = bpy.context.scene
    camera = scene.camera

    # Save original settings
    original_type = camera.data.type
    original_lens = camera.data.lens

    # Set to perspective with 90 FOV
    camera.data.type = 'PERSP'
    camera.data.lens_unit = 'FOV'
    camera.data.angle = math.radians(90)

    # Square output for cubemap faces
    scene.render.resolution_x = 2048
    scene.render.resolution_y = 2048

    # Render 6 faces
    rotations = [
        (0, 0, 0),          # Front (+Z)
        (0, 0, 180),        # Back (-Z)
        (0, 0, 90),         # Right (+X)
        (0, 0, -90),        # Left (-X)
        (-90, 0, 0),        # Top (+Y)
        (90, 0, 0),         # Bottom (-Y)
    ]

    faces = []
    for i, rot in enumerate(rotations):
        camera.rotation_euler = tuple(math.radians(r) for r in rot)
        scene.render.filepath = f"//cubemap_face_{i}.png"
        bpy.ops.render.render(write_still=True)
        faces.append(scene.render.filepath)

    # Restore settings
    camera.data.type = original_type
    camera.data.lens = original_lens

    # Convert cubemap to equirectangular (external tool or compositor)
    return faces
```

---

## VR Metadata Injection

### Using Google Spatial Media Tool

```bash
# After rendering video, inject VR metadata
pip install spatialmedia

# Mono 360
spatialmedia -i input.mp4 output_360.mp4

# Stereo 360 (top/bottom)
spatialmedia -i --stereo=top-bottom input.mp4 output_vr.mp4
```

### Using FFmpeg Metadata

```bash
# Add spherical metadata tags
ffmpeg -i input.mp4 \
  -c copy \
  -metadata:s:v:0 spherical=true \
  -metadata:s:v:0 stitched=true \
  -metadata:s:v:0 projection=equirectangular \
  -metadata:s:v:0 stereo_mode=top-bottom \
  output_vr.mp4
```

### Blender Python for Metadata

```python
def render_with_vr_metadata(output_path: str, stereo: bool = True):
    """Render and add VR metadata."""

    import subprocess

    # Render frames
    bpy.context.scene.render.filepath = output_path + "_frames/"
    bpy.ops.render.render(animation=True)

    # Encode with FFmpeg
    frame_pattern = output_path + "_frames/%04d.png"
    temp_video = output_path + "_temp.mp4"
    final_video = output_path + ".mp4"

    subprocess.run([
        'ffmpeg', '-y',
        '-framerate', '30',
        '-i', frame_pattern,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', '18',
        temp_video
    ])

    # Inject VR metadata
    stereo_flag = '--stereo=top-bottom' if stereo else ''
    subprocess.run([
        'python', '-m', 'spatialmedia',
        '-i', stereo_flag, temp_video, final_video
    ])

    # Clean up temp file
    import os
    os.remove(temp_video)

    return final_video
```

---

## Render Settings for VR Video

### Optimal Settings for Quality/Speed

```python
def configure_vr_render_settings(quality: str = 'standard'):
    """Configure render settings for VR video.

    Quality presets:
    - preview: Fast iteration (Eevee-like quality)
    - standard: Good balance (4K, medium samples)
    - cinema: Highest quality (8K, high samples)
    """

    scene = bpy.context.scene
    cycles = scene.cycles

    if quality == 'preview':
        scene.render.resolution_x = 2048
        scene.render.resolution_y = 1024
        cycles.samples = 32
        cycles.use_denoising = True

    elif quality == 'standard':
        scene.render.resolution_x = 4096
        scene.render.resolution_y = 2048
        cycles.samples = 128
        cycles.use_denoising = True
        cycles.denoiser = 'OPENIMAGEDENOISE'

    elif quality == 'cinema':
        scene.render.resolution_x = 8192
        scene.render.resolution_y = 4096
        cycles.samples = 512
        cycles.use_denoising = True
        cycles.denoiser = 'OPENIMAGEDENOISE'

    # Common settings for all presets
    cycles.device = 'GPU'
    cycles.tile_size = 256  # Good for GPU

    # Output format
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
```

### GPU Memory Management for 8K

```python
def optimize_for_8k_render():
    """Optimize settings for 8K rendering without running out of VRAM."""

    scene = bpy.context.scene
    cycles = scene.cycles

    # Reduce tile size for better memory usage
    cycles.tile_size = 128  # Smaller tiles = less VRAM per tile

    # Use persistent data to avoid reloading between frames
    cycles.use_persistent_data = True

    # Limit texture resolution if needed
    # cycles.texture_limit = '4096'

    # For very complex scenes, consider tiled rendering
    # scene.render.use_border = True
    # scene.render.use_crop_to_border = True
```

---

## Animation and Frame Capture

### Deterministic Rendering

```python
def setup_deterministic_animation(fps: int = 30, duration_seconds: float = 30):
    """Configure animation settings for deterministic frame capture."""

    scene = bpy.context.scene

    scene.render.fps = fps
    scene.frame_start = 1
    scene.frame_end = int(fps * duration_seconds)

    # Disable motion blur for determinism (optional)
    scene.render.use_motion_blur = False

    # Fixed seed for any procedural elements
    # This must be set per-object/material as needed
```

### Batch Frame Rendering

```python
def render_frame_sequence(output_dir: str, start: int = 1, end: int = 900):
    """Render animation as frame sequence."""

    scene = bpy.context.scene

    scene.frame_start = start
    scene.frame_end = end
    scene.render.filepath = f"{output_dir}/"
    scene.render.image_settings.file_format = 'PNG'

    # Render animation
    bpy.ops.render.render(animation=True)
```

---

## Headless Rendering

### Command Line Rendering

```bash
# Render single frame
blender -b scene.blend -f 1 -o //output/frame_####.png

# Render animation
blender -b scene.blend -a -o //output/frame_####.png

# Render with Python script
blender -b scene.blend --python render_script.py
```

### Headless Render Script

```python
# render_script.py
import bpy
import sys

def main():
    # Get arguments after "--"
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]

    # Parse arguments
    output_path = argv[0] if len(argv) > 0 else "//output/"
    quality = argv[1] if len(argv) > 1 else "standard"

    # Load and configure scene
    # (scene should already be loaded by -b flag)

    # Apply quality settings
    configure_vr_render_settings(quality)

    # Set output path
    bpy.context.scene.render.filepath = output_path

    # Render
    bpy.ops.render.render(animation=True)

if __name__ == "__main__":
    main()

# Usage:
# blender -b scene.blend --python render_script.py -- /path/to/output standard
```

---

## Multi-GPU Rendering

### Configure for Render Farm

```python
def setup_multi_gpu():
    """Enable all available GPUs for rendering."""

    # Get Cycles preferences
    prefs = bpy.context.preferences
    cycles_prefs = prefs.addons['cycles'].preferences

    # Enable CUDA or OptiX
    cycles_prefs.compute_device_type = 'CUDA'  # or 'OPTIX', 'HIP'

    # Enable all available devices
    for device in cycles_prefs.devices:
        device.use = True

    # Set device in scene
    bpy.context.scene.cycles.device = 'GPU'
```

### Frame Distribution

```python
def distribute_frames(total_frames: int, num_workers: int) -> list:
    """Distribute frames among render workers."""

    frames_per_worker = total_frames // num_workers
    remainder = total_frames % num_workers

    assignments = []
    current_frame = 1

    for i in range(num_workers):
        extra = 1 if i < remainder else 0
        end_frame = current_frame + frames_per_worker + extra - 1

        assignments.append({
            'worker': i,
            'start': current_frame,
            'end': end_frame
        })

        current_frame = end_frame + 1

    return assignments

# Example: Distribute 900 frames among 4 workers
# Worker 0: frames 1-225
# Worker 1: frames 226-450
# Worker 2: frames 451-675
# Worker 3: frames 676-900
```

---

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Seam at 180/-180 | Texture discontinuity | Use seamless textures or procedural |
| Stereo feels wrong | Incorrect IPD | Check scene scale, adjust IPD |
| Pole distortion | Equirectangular nature | Minimize detail at poles |
| Memory crash at 8K | VRAM exceeded | Reduce samples, tile size |
| Slow render | Too many samples | Use denoiser with fewer samples |
| Color banding | 8-bit output | Use 16-bit PNG or EXR |

---

## Platform Compatibility

| Platform | Format | Max Resolution | Stereo Layout |
|----------|--------|----------------|---------------|
| YouTube VR | MP4 H.264/H.265 | 8K stereo | Top/Bottom |
| Meta Quest | MP4 H.265 | 5760x5760 | Top/Bottom |
| Vimeo 360 | MP4 H.264 | 8K mono | N/A |
| Apple Vision Pro | HEVC Main 10 | 7680x3840 | Side-by-Side |

---

## Sources

### Blender Documentation
- [Panoramic Camera](https://docs.blender.org/manual/en/latest/render/cycles/object_settings/cameras.html#panoramic-cameras)
- [Stereoscopy](https://docs.blender.org/manual/en/latest/render/output/properties/stereoscopy/index.html)
- [Command Line Rendering](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html)

### VR Video Standards
- [YouTube VR Requirements](https://support.google.com/youtube/answer/6178631)
- [Google Spherical Video V2](https://github.com/google/spatial-media/blob/master/docs/spherical-video-v2-rfc.md)
- [Meta Quest Media Specs](https://developer.oculus.com/documentation/unity/unity-media/)

### Tools
- [Google Spatial Media](https://github.com/google/spatial-media)
- [FFmpeg VR Encoding](https://trac.ffmpeg.org/wiki/Encode/H.264)

### Related Project Research
- `.planning/research/THREEJS_360_STEREO_GUIDE.md` - Three.js equivalent techniques

---

*Last updated: 2026-01-30*
