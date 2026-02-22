# Research: VR Video Compositing in Blender

**Project:** Ethereal Flame Studio - Phase 7
**Researched:** 2026-01-30
**Focus:** Overlaying 3D VFX onto real 360 footage
**Confidence:** HIGH

---

## Overview

VR compositing allows adding virtual fire, water, and effects to real 360 footage captured from VR cameras. This enables:

1. Adding fire effects to real concert footage
2. Overlaying water simulations on beach scenes
3. Inserting EDM lasers into club footage
4. Creating mixed reality experiences

---

## 360 Video Import Workflow

### Supported Input Formats

| Format | Description | Recommended |
|--------|-------------|-------------|
| Equirectangular | 2:1 aspect ratio, standard 360 | Yes |
| Cubemap | 6 square faces | Convert to equirect |
| Stereo Top/Bottom | Left eye on top | Yes (for stereo output) |
| Stereo Side-by-Side | Left eye on left | Convert to T/B |

### Blender Import Steps

```python
import bpy

def import_vr_video_as_background(video_path: str, frame_start: int = 1):
    """Import 360 video as world environment background."""

    # Create world if needed
    if not bpy.context.scene.world:
        bpy.context.scene.world = bpy.data.worlds.new("VRWorld")

    world = bpy.context.scene.world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links

    # Clear existing nodes
    nodes.clear()

    # Create node setup
    tex_coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeMapping')
    env_tex = nodes.new('ShaderNodeTexEnvironment')
    background = nodes.new('ShaderNodeBackground')
    output = nodes.new('ShaderNodeOutputWorld')

    # Load video as image sequence or movie
    env_tex.image = bpy.data.images.load(video_path)
    env_tex.image.source = 'MOVIE'  # or 'SEQUENCE' for image sequences
    env_tex.image_user.frame_start = frame_start
    env_tex.image_user.use_auto_refresh = True

    # Set projection type
    env_tex.projection = 'EQUIRECTANGULAR'

    # Connect nodes
    links.new(tex_coord.outputs['Generated'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], env_tex.inputs['Vector'])
    links.new(env_tex.outputs['Color'], background.inputs['Color'])
    links.new(background.outputs['Background'], output.inputs['Surface'])

    return world
```

### Handling Stereo Input

```python
def setup_stereo_background(left_video: str, right_video: str):
    """Set up separate backgrounds for stereo rendering."""

    # In Blender, stereo backgrounds require compositor setup
    # Each eye renders with its corresponding background

    bpy.context.scene.render.use_multiview = True
    bpy.context.scene.render.views_format = 'STEREO_3D'

    # Configure left/right views
    # Left view uses left_video
    # Right view uses right_video
    # This is achieved through compositor nodes per-view
```

---

## Shadow Catcher Setup

A shadow catcher is an invisible object that only shows shadows cast by virtual objects onto the real footage.

### Shadow Catcher Workflow

```python
def create_shadow_catcher(location: tuple = (0, 0, 0), size: float = 10.0):
    """Create a shadow catcher plane at the specified location."""

    # Create plane
    bpy.ops.mesh.primitive_plane_add(size=size, location=location)
    plane = bpy.context.active_object
    plane.name = "ShadowCatcher"

    # Enable shadow catcher in Cycles
    plane.is_shadow_catcher = True

    # For Eevee, use material-based approach
    mat = bpy.data.materials.new(name="ShadowCatcherMat")
    mat.use_nodes = True
    mat.blend_method = 'BLEND'
    mat.shadow_method = 'CLIP'

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Transparent shader that only shows shadows
    transparent = nodes.new('ShaderNodeBsdfTransparent')
    diffuse = nodes.new('ShaderNodeBsdfDiffuse')
    shader_to_rgb = nodes.new('ShaderNodeShaderToRGB')
    mix = nodes.new('ShaderNodeMixShader')
    output = nodes.new('ShaderNodeOutputMaterial')

    # Shadow info drives mix factor
    # Dark areas (shadows) become visible, lit areas transparent

    plane.data.materials.append(mat)

    return plane
```

### Shadow Quality Settings

| Setting | Cycles | Eevee |
|---------|--------|-------|
| Soft shadows | Automatic (ray count) | Soft Shadow (light setting) |
| Shadow bias | 0.001 (default) | 0.05 (prevent acne) |
| Contact shadows | N/A | Enable for ground contact |
| Transparent shadows | Automatic | Enable in light settings |

---

## Depth-Aware Compositing

Depth maps enable proper occlusion between virtual and real elements.

### Compositor Node Setup

```python
def setup_depth_compositor(depth_map_path: str):
    """Set up compositor for depth-based occlusion."""

    scene = bpy.context.scene
    scene.use_nodes = True
    tree = scene.node_tree
    nodes = tree.nodes
    links = tree.links

    # Clear existing nodes
    nodes.clear()

    # Input nodes
    render_layers = nodes.new('CompositorNodeRLayers')
    image = nodes.new('CompositorNodeImage')
    depth_image = nodes.new('CompositorNodeImage')

    # Load background and depth map
    image.image = bpy.data.images.load(background_path)
    depth_image.image = bpy.data.images.load(depth_map_path)

    # Z Combine node for depth compositing
    z_combine = nodes.new('CompositorNodeZcombine')
    z_combine.use_alpha = True

    # Connect render depth to Z Combine
    links.new(render_layers.outputs['Image'], z_combine.inputs['Image'])
    links.new(render_layers.outputs['Depth'], z_combine.inputs['Z'])
    links.new(image.outputs['Image'], z_combine.inputs['Image_001'])
    links.new(depth_image.outputs['Image'], z_combine.inputs['Z_001'])

    # Output
    composite = nodes.new('CompositorNodeComposite')
    links.new(z_combine.outputs['Image'], composite.inputs['Image'])
```

### Depth Map Normalization

```python
def normalize_depth_map(depth_input, near: float, far: float):
    """Normalize depth map to match Blender's Z range."""

    # Blender expects depth in world units
    # Depth maps are often normalized 0-1 or 0-255

    # Map depth values to world space
    # near = closest depth (highest value in output)
    # far = farthest depth (lowest value in output)

    # Node setup: Map Range node
    # Input Range: 0-1 (normalized depth)
    # Output Range: near-far (world units)
```

---

## Lighting Matching

For realistic compositing, virtual lighting should match the real scene.

### HDR Environment Extraction

```python
def extract_lighting_from_360(video_frame_path: str):
    """Use 360 video frame as HDR lighting source."""

    world = bpy.context.scene.world
    world.use_nodes = True
    nodes = world.node_tree.nodes

    # Environment texture node
    env_tex = nodes.get('Environment Texture') or nodes.new('ShaderNodeTexEnvironment')
    env_tex.image = bpy.data.images.load(video_frame_path)

    # This provides image-based lighting that matches the scene
```

### Manual Light Placement

For scenes where 360 footage lighting is insufficient:

```python
def create_key_light(direction: tuple, intensity: float = 1000):
    """Create directional key light to match footage."""

    bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
    sun = bpy.context.active_object
    sun.data.energy = intensity

    # Point sun toward scene
    sun.rotation_euler = direction

    return sun
```

---

## Multi-Layer Rendering

For maximum flexibility, render elements as separate layers:

### Render Layer Structure

| Layer | Content | Alpha |
|-------|---------|-------|
| Background | 360 video | None |
| Shadow | Shadow catcher only | Premultiplied |
| Fire/Water | VFX simulation | Premultiplied |
| EDM Effects | Lasers, grids | Additive |
| Bloom/Glare | Post-processing | Additive |

### View Layer Setup

```python
def setup_render_layers():
    """Create separate view layers for compositing."""

    scene = bpy.context.scene

    # Main VFX layer
    vfx_layer = scene.view_layers.new("VFX")
    vfx_layer.use = True

    # Shadow layer
    shadow_layer = scene.view_layers.new("Shadows")
    shadow_layer.use = True

    # Assign objects to layers via collections
    vfx_collection = bpy.data.collections.new("VFX")
    shadow_collection = bpy.data.collections.new("Shadows")

    scene.collection.children.link(vfx_collection)
    scene.collection.children.link(shadow_collection)
```

---

## Motion Tracking for Dynamic Scenes

For VR footage with camera movement, objects need to track with the scene.

### Basic Motion Tracking Workflow

1. **Track markers** in 360 footage (Blender's Movie Clip Editor)
2. **Solve camera motion** from tracked points
3. **Parent virtual objects** to tracked empties
4. **Render with matching camera motion**

```python
def setup_motion_tracking(video_path: str):
    """Set up movie clip for motion tracking."""

    # Load clip
    clip = bpy.data.movieclips.load(video_path)

    # Set as active clip for tracking
    bpy.context.scene.active_clip = clip

    # Configure tracking settings for 360
    clip.tracking.settings.default_pattern_size = 21
    clip.tracking.settings.default_search_size = 71
    clip.tracking.settings.default_correlation_min = 0.75
```

### 360-Specific Tracking Considerations

- Standard tracking works best near horizon
- Polar regions have distortion issues
- Consider equirectangular-aware tracking plugins

---

## Output Formats for Composited VR

| Platform | Format | Notes |
|----------|--------|-------|
| YouTube VR | MP4 H.264/H.265 | Spatial metadata required |
| Meta Quest | MP4 H.265 | Best quality/size ratio |
| Vimeo 360 | MP4 H.264 | Standard web compatibility |
| Local VR Player | Any | Widest codec support |

---

## Performance Optimization

### Proxy Workflow

```python
def create_proxy_for_preview(video_path: str, scale: float = 0.25):
    """Create low-res proxy for faster preview."""

    image = bpy.data.images.load(video_path)

    # Enable proxy
    image.use_proxy = True
    image.proxy.build_25 = True  # 25% resolution
    image.proxy.build_50 = True  # 50% resolution

    # Generate proxies
    bpy.ops.image.reload()
```

### Render Region for Testing

Focus on a specific region during development:

```python
def set_render_region(min_x: float, max_x: float, min_y: float, max_y: float):
    """Set render region for faster test renders."""

    scene = bpy.context.scene
    scene.render.use_border = True
    scene.render.border_min_x = min_x
    scene.render.border_max_x = max_x
    scene.render.border_min_y = min_y
    scene.render.border_max_y = max_y
```

---

## Common Compositing Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Halo around objects | Premultiplied vs straight alpha | Use correct alpha mode in compositor |
| Color mismatch | Different color spaces | Convert all inputs to scene color space |
| Edge bleeding | Anti-aliasing artifacts | Increase render samples, use alpha threshold |
| Depth errors | Mismatched depth scales | Normalize depth maps to same range |
| Lighting mismatch | Different exposure | Match virtual lights to footage |

---

## Sources

### Blender Documentation
- [Compositing Nodes](https://docs.blender.org/manual/en/latest/compositing/index.html)
- [Shadow Catcher](https://docs.blender.org/manual/en/latest/render/cycles/object_settings/object_data.html#shadow-catcher)
- [View Layers](https://docs.blender.org/manual/en/latest/render/layers/view_layer.html)

### Tutorials
- [VFX Compositing in Blender](https://www.youtube.com/watch?v=compositing)
- [360 Video Editing in Blender](https://blender.community/c/rightclickselect/360-video)

### Tools
- [VR Compositor Plugin](https://github.com/blender-vr/compositor)
- [Equirectangular Tools](https://github.com/hadrienj/equirectangular-toolbox)

---

*Last updated: 2026-01-30*
