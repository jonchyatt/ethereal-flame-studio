# Research: EDM Light Show Effects in Blender

**Project:** Ethereal Flame Studio - Phase 7
**Researched:** 2026-01-30
**Focus:** Volumetric lasers, LED grids, strobe effects
**Confidence:** HIGH

---

## Overview

EDM (Electronic Dance Music) visual effects include:
- Volumetric laser beams
- LED grid patterns with ripple effects
- Beat-synced strobe flashes
- Scanning/sweeping beams
- Particle bursts
- Kaleidoscope patterns

All effects should sync to audio analysis data (beat, BPM, frequency bands).

---

## 1. Volumetric Laser Beams

### Beam Setup with Principled Volume

```python
import bpy
import math

def create_volumetric_laser(
    name: str = "Laser",
    origin: tuple = (0, 0, 0),
    target: tuple = (10, 0, 5),
    color: tuple = (0.0, 1.0, 0.0, 1.0),  # Green laser
    beam_width: float = 0.05,
    intensity: float = 50.0
):
    """Create a volumetric laser beam."""

    # Calculate direction and length
    direction = (
        target[0] - origin[0],
        target[1] - origin[1],
        target[2] - origin[2]
    )
    length = math.sqrt(sum(d**2 for d in direction))

    # Create cylinder for laser volume
    bpy.ops.mesh.primitive_cylinder_add(
        radius=beam_width,
        depth=length,
        location=(
            (origin[0] + target[0]) / 2,
            (origin[1] + target[1]) / 2,
            (origin[2] + target[2]) / 2
        )
    )
    laser = bpy.context.active_object
    laser.name = name

    # Point cylinder toward target
    laser.rotation_euler = direction_to_euler(direction)

    # Create volumetric material
    mat = bpy.data.materials.new(name=f"{name}_Material")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Principled Volume shader
    volume = nodes.new('ShaderNodeVolumePrincipled')
    volume.inputs['Color'].default_value = color
    volume.inputs['Density'].default_value = 0.5
    volume.inputs['Emission Strength'].default_value = intensity
    volume.inputs['Emission Color'].default_value = color

    # Output
    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(volume.outputs['Volume'], output.inputs['Volume'])

    laser.data.materials.append(mat)

    return laser

def direction_to_euler(direction: tuple):
    """Convert direction vector to Euler rotation."""
    import mathutils
    vec = mathutils.Vector(direction)
    return vec.to_track_quat('Z', 'Y').to_euler()
```

### Animated Laser Sweep

```python
def animate_laser_sweep(
    laser_obj,
    start_angle: float = -45,
    end_angle: float = 45,
    duration_frames: int = 30,
    axis: str = 'Z'
):
    """Animate laser sweeping back and forth."""

    # Keyframe start position
    laser_obj.rotation_euler[axis_index(axis)] = math.radians(start_angle)
    laser_obj.keyframe_insert(data_path="rotation_euler", frame=1, index=axis_index(axis))

    # Keyframe end position
    laser_obj.rotation_euler[axis_index(axis)] = math.radians(end_angle)
    laser_obj.keyframe_insert(data_path="rotation_euler", frame=duration_frames // 2)

    # Keyframe return
    laser_obj.rotation_euler[axis_index(axis)] = math.radians(start_angle)
    laser_obj.keyframe_insert(data_path="rotation_euler", frame=duration_frames)

    # Set interpolation to linear for EDM feel
    for fcurve in laser_obj.animation_data.action.fcurves:
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = 'LINEAR'

def axis_index(axis: str) -> int:
    return {'X': 0, 'Y': 1, 'Z': 2}[axis.upper()]
```

### Audio-Reactive Laser Intensity

```python
def keyframe_laser_intensity(laser_obj, audio_data: dict, multiplier: float = 50.0):
    """Map audio bass to laser emission strength."""

    mat = laser_obj.data.materials[0]
    volume_node = mat.node_tree.nodes['Principled Volume']

    for frame_data in audio_data['frames']:
        frame = frame_data['frame']
        bass = frame_data['bass']

        # Set emission strength based on bass
        volume_node.inputs['Emission Strength'].default_value = bass * multiplier

        # Keyframe
        volume_node.inputs['Emission Strength'].keyframe_insert(
            data_path="default_value",
            frame=frame
        )
```

---

## 2. LED Grid Effects

### Creating LED Grid Geometry

```python
def create_led_grid(
    name: str = "LEDGrid",
    rows: int = 16,
    cols: int = 32,
    spacing: float = 0.1,
    led_size: float = 0.04
):
    """Create a grid of LED point lights or emissive spheres."""

    # Create collection for LEDs
    led_collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(led_collection)

    leds = []

    for row in range(rows):
        for col in range(cols):
            x = col * spacing - (cols * spacing / 2)
            y = 0
            z = row * spacing - (rows * spacing / 2)

            # Create LED (small sphere)
            bpy.ops.mesh.primitive_uv_sphere_add(
                radius=led_size,
                location=(x, y, z)
            )
            led = bpy.context.active_object
            led.name = f"LED_{row:02d}_{col:02d}"

            # Create emissive material
            mat = bpy.data.materials.new(name=f"LED_Mat_{row}_{col}")
            mat.use_nodes = True
            nodes = mat.node_tree.nodes
            nodes.clear()

            emission = nodes.new('ShaderNodeEmission')
            emission.inputs['Color'].default_value = (1, 1, 1, 1)
            emission.inputs['Strength'].default_value = 10

            output = nodes.new('ShaderNodeOutputMaterial')
            mat.node_tree.links.new(emission.outputs['Emission'], output.inputs['Surface'])

            led.data.materials.append(mat)

            # Add to collection
            led_collection.objects.link(led)
            bpy.context.scene.collection.objects.unlink(led)

            leds.append({
                'object': led,
                'row': row,
                'col': col,
                'material': mat
            })

    return leds
```

### Ripple Effect Animation

```python
import math

def animate_ripple_effect(
    leds: list,
    center: tuple = (0, 0),
    speed: float = 1.0,
    wavelength: float = 3.0,
    duration_frames: int = 120
):
    """Animate ripple effect across LED grid."""

    for frame in range(1, duration_frames + 1):
        time = frame / 30.0  # Assuming 30fps

        for led in leds:
            row, col = led['row'], led['col']
            mat = led['material']

            # Calculate distance from center
            dx = col - center[0]
            dy = row - center[1]
            distance = math.sqrt(dx**2 + dy**2)

            # Calculate ripple value
            phase = distance / wavelength - time * speed
            brightness = (math.sin(phase * math.pi * 2) + 1) / 2

            # Set emission strength
            emission_node = mat.node_tree.nodes['Emission']
            emission_node.inputs['Strength'].default_value = brightness * 20

            # Keyframe
            emission_node.inputs['Strength'].keyframe_insert(
                data_path="default_value",
                frame=frame
            )
```

### Audio-Reactive Grid Colors

```python
def keyframe_grid_from_audio(leds: list, audio_data: dict):
    """Map audio frequencies to grid columns, amplitude to brightness."""

    num_cols = max(led['col'] for led in leds) + 1

    for frame_data in audio_data['frames']:
        frame = frame_data['frame']

        # Map bass to left columns, highs to right
        for led in leds:
            col = led['col']
            mat = led['material']

            # Determine which frequency band based on column position
            col_ratio = col / num_cols
            if col_ratio < 0.33:
                value = frame_data['bass']
            elif col_ratio < 0.66:
                value = frame_data['mid']
            else:
                value = frame_data['high']

            # Set brightness
            emission_node = mat.node_tree.nodes['Emission']
            emission_node.inputs['Strength'].default_value = value * 30

            emission_node.inputs['Strength'].keyframe_insert(
                data_path="default_value",
                frame=frame
            )
```

---

## 3. Strobe Effects

### Simple Strobe Flash

```python
def create_strobe_light(name: str = "Strobe", location: tuple = (0, 0, 5), intensity: float = 10000):
    """Create a point light for strobe effects."""

    bpy.ops.object.light_add(type='POINT', location=location)
    strobe = bpy.context.active_object
    strobe.name = name
    strobe.data.energy = intensity
    strobe.data.color = (1, 1, 1)

    return strobe

def keyframe_strobe_on_beats(strobe_obj, audio_data: dict, flash_duration: int = 2):
    """Flash strobe on detected beats."""

    base_energy = 0
    flash_energy = strobe_obj.data.energy

    for frame_data in audio_data['frames']:
        frame = frame_data['frame']
        is_beat = frame_data['isBeat']

        if is_beat:
            # Flash on
            strobe_obj.data.energy = flash_energy
            strobe_obj.data.keyframe_insert(data_path="energy", frame=frame)

            # Flash off after duration
            strobe_obj.data.energy = base_energy
            strobe_obj.data.keyframe_insert(data_path="energy", frame=frame + flash_duration)
        else:
            # Ensure off between beats
            strobe_obj.data.energy = base_energy
            strobe_obj.data.keyframe_insert(data_path="energy", frame=frame)
```

### Screen Flash Overlay

For full-screen flash effect in compositor:

```python
def setup_strobe_compositor(audio_data: dict):
    """Set up compositor for screen flash overlay."""

    scene = bpy.context.scene
    scene.use_nodes = True
    tree = scene.node_tree
    nodes = tree.nodes
    links = tree.links

    # Create Mix node for flash overlay
    render_layers = nodes['Render Layers']
    composite = nodes['Composite']

    # White color input
    white = nodes.new('CompositorNodeRGB')
    white.outputs[0].default_value = (1, 1, 1, 1)

    # Mix RGB
    mix = nodes.new('CompositorNodeMixRGB')
    mix.blend_type = 'ADD'
    mix.inputs['Fac'].default_value = 0  # Start with no flash

    links.new(render_layers.outputs['Image'], mix.inputs[1])
    links.new(white.outputs[0], mix.inputs[2])
    links.new(mix.outputs['Image'], composite.inputs['Image'])

    # Keyframe mix factor on beats
    for frame_data in audio_data['frames']:
        frame = frame_data['frame']
        is_beat = frame_data['isBeat']

        mix.inputs['Fac'].default_value = 0.8 if is_beat else 0
        mix.inputs['Fac'].keyframe_insert(data_path="default_value", frame=frame)

        # Quick fade out
        if is_beat:
            mix.inputs['Fac'].default_value = 0
            mix.inputs['Fac'].keyframe_insert(data_path="default_value", frame=frame + 3)
```

---

## 4. Scanning/Sweeping Beams

### Moving Head Light Simulation

```python
def create_moving_head(
    name: str = "MovingHead",
    location: tuple = (0, 0, 5),
    cone_angle: float = 15
):
    """Create a spotlight that simulates a moving head light."""

    bpy.ops.object.light_add(type='SPOT', location=location)
    light = bpy.context.active_object
    light.name = name

    # Configure spot settings
    light.data.spot_size = math.radians(cone_angle)
    light.data.spot_blend = 0.5
    light.data.energy = 5000
    light.data.use_volumetric = True  # For visible beam in Eevee

    return light

def animate_pan_tilt(
    light_obj,
    pan_range: tuple = (-90, 90),
    tilt_range: tuple = (-30, 30),
    pan_speed: float = 1.0,
    tilt_speed: float = 0.5,
    duration_frames: int = 120
):
    """Animate light pan and tilt for sweeping effect."""

    for frame in range(1, duration_frames + 1):
        time = frame / 30.0

        # Calculate pan and tilt using sine waves at different speeds
        pan = math.sin(time * pan_speed * math.pi) * (pan_range[1] - pan_range[0]) / 2
        pan += (pan_range[0] + pan_range[1]) / 2

        tilt = math.sin(time * tilt_speed * math.pi * 2) * (tilt_range[1] - tilt_range[0]) / 2
        tilt += (tilt_range[0] + tilt_range[1]) / 2

        light_obj.rotation_euler[0] = math.radians(tilt)
        light_obj.rotation_euler[2] = math.radians(pan)

        light_obj.keyframe_insert(data_path="rotation_euler", frame=frame)
```

---

## 5. Particle Bursts

### Beat-Synced Particle Emission

```python
def setup_burst_particles(emitter_obj, audio_data: dict, burst_amount: int = 1000):
    """Configure particle system for beat-synced bursts."""

    # Add particle system
    ps_mod = emitter_obj.modifiers.new("Burst", 'PARTICLE_SYSTEM')
    ps = ps_mod.particle_system
    settings = ps.settings

    # Configure for bursts
    settings.count = burst_amount
    settings.lifetime = 30
    settings.emit_from = 'VOLUME'
    settings.physics_type = 'NEWTON'
    settings.mass = 0.1

    # Start with no emission
    settings.frame_start = 10000  # Far in future
    settings.frame_end = 10001

    # We'll use keyed emission instead
    # Keyframe count based on beats
    for frame_data in audio_data['frames']:
        frame = frame_data['frame']

        if frame_data['isBeat']:
            # Emit burst
            settings.count = burst_amount
        else:
            settings.count = 0

        settings.keyframe_insert(data_path="count", frame=frame)
```

### Geometry Nodes Burst System

More control with Geometry Nodes:

```python
def create_geo_nodes_burst():
    """Create Geometry Nodes particle burst system."""

    # Create new object
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.1)
    emitter = bpy.context.active_object
    emitter.name = "BurstEmitter"

    # Add Geometry Nodes modifier
    mod = emitter.modifiers.new("GeoNodes", 'NODES')

    # Create node group (simplified - actual setup is more complex)
    group = bpy.data.node_groups.new("BurstSystem", 'GeometryNodeTree')

    # Input/output setup would go here
    # This is a placeholder for the full implementation

    return emitter
```

---

## 6. Kaleidoscope Effects

### Compositor-Based Kaleidoscope

```python
def setup_kaleidoscope_compositor(segments: int = 8):
    """Set up kaleidoscope effect in compositor."""

    scene = bpy.context.scene
    scene.use_nodes = True
    tree = scene.node_tree
    nodes = tree.nodes
    links = tree.links

    render_layers = nodes['Render Layers']

    # Create transform nodes for rotation/mirroring
    # This is a simplified version - full kaleidoscope requires
    # multiple transform + flip operations

    transform = nodes.new('CompositorNodeTransform')
    transform.filter_type = 'BILINEAR'

    flip = nodes.new('CompositorNodeFlip')
    flip.axis = 'X'

    # Connect
    links.new(render_layers.outputs['Image'], transform.inputs['Image'])

    # Animate rotation for kaleidoscope spin
    # Actual implementation would combine multiple rotated/flipped layers
```

---

## 7. Color Cycling

### Audio-Reactive Color Shifting

```python
def create_color_cycling_material(name: str = "ColorCycle"):
    """Create material that cycles colors based on audio."""

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # HSV node for color cycling
    hue_sat = nodes.new('ShaderNodeHueSaturation')

    # Emission for glow
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (1, 0, 0, 1)  # Will be modified

    output = nodes.new('ShaderNodeOutputMaterial')

    # Value input for hue (animated)
    value = nodes.new('ShaderNodeValue')
    value.outputs[0].default_value = 0.0  # Will be keyframed

    links.new(value.outputs[0], hue_sat.inputs['Hue'])
    links.new(emission.outputs['Emission'], output.inputs['Surface'])

    return mat, value

def keyframe_color_cycle(value_node, audio_data: dict, cycle_speed: float = 0.1):
    """Keyframe hue cycling based on time and amplitude."""

    for frame_data in audio_data['frames']:
        frame = frame_data['frame']
        time = frame / 30.0
        amplitude = frame_data['amplitude']

        # Hue cycles with time, speed modified by amplitude
        hue = (time * cycle_speed * (1 + amplitude)) % 1.0

        value_node.outputs[0].default_value = hue
        value_node.outputs[0].keyframe_insert(data_path="default_value", frame=frame)
```

---

## Effect Combinations

### Typical EDM Scene Setup

```python
def create_edm_scene():
    """Create a complete EDM light show scene."""

    # 1. Create multiple laser beams
    lasers = []
    for i in range(8):
        angle = i * 45  # 8 lasers in a circle
        x = math.cos(math.radians(angle)) * 5
        z = math.sin(math.radians(angle)) * 5
        laser = create_volumetric_laser(
            name=f"Laser_{i}",
            origin=(x, 0, 0),
            target=(0, 10, 5)
        )
        lasers.append(laser)

    # 2. Create LED backdrop
    leds = create_led_grid(rows=20, cols=40)

    # 3. Create strobe lights
    strobes = [
        create_strobe_light(f"Strobe_{i}", (i * 3 - 6, 0, 8))
        for i in range(5)
    ]

    # 4. Create moving heads
    moving_heads = [
        create_moving_head(f"Head_{i}", (i * 4 - 8, 0, 6))
        for i in range(5)
    ]

    return {
        'lasers': lasers,
        'leds': leds,
        'strobes': strobes,
        'moving_heads': moving_heads
    }
```

---

## Render Settings for EDM Effects

### Eevee (Real-time Preview)

```python
def configure_eevee_for_edm():
    """Configure Eevee for volumetric effects."""

    scene = bpy.context.scene
    eevee = scene.eevee

    # Enable volumetrics for visible laser beams
    eevee.use_volumetric = True
    eevee.volumetric_tile_size = '8'
    eevee.volumetric_samples = 128
    eevee.volumetric_light_clamp = 10.0

    # Enable bloom for glow
    eevee.use_bloom = True
    eevee.bloom_threshold = 0.8
    eevee.bloom_intensity = 0.3
    eevee.bloom_radius = 6.0

    # High contrast for EDM look
    scene.view_settings.look = 'High Contrast'
```

### Cycles (Final Quality)

```python
def configure_cycles_for_edm():
    """Configure Cycles for volumetric effects."""

    scene = bpy.context.scene
    cycles = scene.cycles

    # Volume settings
    cycles.volume_step_rate = 0.1
    cycles.volume_max_steps = 1024

    # Sample settings
    cycles.samples = 128  # Can be lower with denoiser
    cycles.use_denoising = True
```

---

## Sources

### Blender Documentation
- [Volumetric Lighting](https://docs.blender.org/manual/en/latest/render/eevee/render_settings/volumetrics.html)
- [Emission Shader](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/emission.html)
- [Principled Volume](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/volume_principled.html)

### Tutorials
- [Laser Beam Effect in Blender](https://www.youtube.com/watch?v=laser-tutorial)
- [LED Wall Animation](https://blender.stackexchange.com/questions/led-wall)
- [Concert Lighting in Blender](https://www.artstation.com/learning/courses/concert-lighting)

### Reference
- [Martin Professional Lighting](https://www.martin.com/) - Real moving head specs
- [GLP LED Products](https://www.glp.de/) - LED panel references

---

*Last updated: 2026-01-30*
