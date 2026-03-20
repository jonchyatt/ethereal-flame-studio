"""
EFS EDM Light Show Template -- concert-venue laser and LED scene builder.

Creates an EDM light show scene with volumetric laser beams, LED frequency
display grid, fog volume for laser visibility, concert camera, and compositor
with heavy bloom for laser/LED flare effects. The scene starts in total
darkness (no ambient light) -- all illumination comes from the lasers and
LED emission cubes, implementing the darkness/contrast principle.

Key design principles:
  - Total darkness: world background Strength=0.0, no ambient light
  - Volumetric lasers: Spot lights with visible beams through fog volume
  - LED frequency grid: 8 emission cubes in bass-to-treble color gradient
  - Concert venue composition: wide-angle camera framing both lasers and LEDs
  - Heavy bloom: lower threshold (0.5) than fire/water for laser/LED glow

Scene objects (efs_ naming convention):
  - efs_edm_laser_0..3: Spot lights (red, green, blue, magenta)
  - efs_edm_led_0..7: Emission cubes (bass=red left, treble=blue right)
  - efs_edm_led_mat_0..7: Per-column emission materials
  - efs_edm_camera: Wide-angle concert camera
  - efs_edm_target: Camera tracking empty
  - efs_edm_fog: Volume Scatter cube for laser beam visibility

No Mantaflow simulation needed -- all procedural geometry and lights.
No bake function needed (unlike fire_cinema_template).

Four-function API:
  create_edm_scene() -> apply_edm_audio() -> render_edm()

Usage (via MCP execute_blender_code calls):

  Call 1 -- Create scene (includes compositor setup):
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from edm_light_template import create_edm_scene
    create_edm_scene(quality="preview")

  Call 2 -- Apply audio keyframes (optional, requires audio JSON):
    from edm_light_template import apply_edm_audio
    apply_edm_audio('C:/.../audio-analysis.json')

  Call 3 -- Render single frame (returns immediately):
    from edm_light_template import render_edm
    render_edm(output_name="edm_lights", frame=45)

  Call 4 -- Render full animation:
    from edm_light_template import render_edm
    render_edm(output_name="edm_lights")

  Call 5 -- Poll render status:
    from poll_status import is_render_active
    is_render_active()

Pitfall compliance:
  - Pitfall 2: Async render via timer + INVOKE_DEFAULT (never blocks MCP)
  - Pitfall 3: save_before_operate() called before scene creation
  - Pitfall 14: Single-frame render option for manual inspection
  - No bake needed (all procedural geometry and lights)
"""
import bpy
import json
import math
import sys
import os
from pathlib import Path

# Ensure our scripts directory is on sys.path for imports
try:
    _SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    # __file__ not defined when run via exec(open(...).read())
    _SCRIPTS_DIR = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scene_utils import (
    save_before_operate,
    get_or_create_object,
    RENDERS_DIR,
)

from fire_cinema_template import load_quality_preset

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
PRESETS_DIR = REPO_ROOT / "blender" / "presets"


# ---------------------------------------------------------------------------
# Laser configuration constants
# ---------------------------------------------------------------------------

# Laser object names: efs_edm_laser_0 (red), efs_edm_laser_1 (green),
#                     efs_edm_laser_2 (blue), efs_edm_laser_3 (magenta)
LASER_NAMES = [
    "efs_edm_laser_0",
    "efs_edm_laser_1",
    "efs_edm_laser_2",
    "efs_edm_laser_3",
]

# Laser colors: red, green, blue, magenta
LASER_COLORS = [
    (1.0, 0.0, 0.0),   # Red   (efs_edm_laser_0)
    (0.0, 1.0, 0.0),   # Green (efs_edm_laser_1)
    (0.0, 0.5, 1.0),   # Blue  (efs_edm_laser_2)
    (1.0, 0.0, 1.0),   # Magenta (efs_edm_laser_3)
]

# Laser X positions: spread across the venue ceiling
LASER_X_POSITIONS = [-3.0, -1.0, 1.0, 3.0]

# Laser Z rotations: fan out across the venue floor
LASER_Z_ROTATIONS = [-0.3, -0.1, 0.1, 0.3]


# ---------------------------------------------------------------------------
# LED configuration constants
# ---------------------------------------------------------------------------

# LED object names: efs_edm_led_0 through efs_edm_led_7
LED_NAMES = [
    "efs_edm_led_0",
    "efs_edm_led_1",
    "efs_edm_led_2",
    "efs_edm_led_3",
    "efs_edm_led_4",
    "efs_edm_led_5",
    "efs_edm_led_6",
    "efs_edm_led_7",
]

# LED emission colors: bass (warm/red) left to treble (cool/blue) right
LED_COLORS = [
    (1.0, 0.2, 0.0),   # Deep orange (sub-bass)   -- efs_edm_led_0
    (1.0, 0.5, 0.0),   # Orange (bass)             -- efs_edm_led_1
    (1.0, 0.8, 0.0),   # Yellow-orange (low-mid)   -- efs_edm_led_2
    (0.5, 1.0, 0.0),   # Yellow-green (mid)         -- efs_edm_led_3
    (0.0, 1.0, 0.5),   # Green-cyan (upper-mid)     -- efs_edm_led_4
    (0.0, 0.5, 1.0),   # Cyan-blue (presence)       -- efs_edm_led_5
    (0.2, 0.2, 1.0),   # Blue (brilliance)          -- efs_edm_led_6
    (0.5, 0.0, 1.0),   # Violet (air)               -- efs_edm_led_7
]

# Number of LED columns in the frequency grid
LED_COUNT = 8

# LED cube size and spacing
LED_CUBE_SIZE = 0.8
LED_GAP = 0.2
LED_TOTAL_SPACING = LED_CUBE_SIZE + LED_GAP  # 1.0 per column


# ---------------------------------------------------------------------------
# Internal helper functions (all prefixed with underscore)
# ---------------------------------------------------------------------------

def _clear_default_scene():
    """Remove all default objects (Cube, Light, Camera) for a clean start."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def _setup_edm_scene(preset):
    """Configure scene-level settings for the EDM light show.

    Sets frame range, Cycles engine, resolution, samples, denoiser,
    motion blur, and world background. The world is set to TOTAL DARKNESS
    (Strength 0.0) so that lasers and LEDs are the only light sources.

    A Volume Scatter shader is added to the world material to make
    spotlight cones visible as volumetric beams throughout the scene.

    EDM-specific differences from fire_cinema_template._setup_scene():
      - film_transparent = False (opaque black background)
      - World Strength = 0.0 (total darkness -- effects are the only light)
      - Volume Scatter on world (density=0.02, anisotropy=0.3) for visible
        laser beams through atmospheric haze

    Args:
        preset: Quality preset dict from load_quality_preset().
    """
    scene = bpy.context.scene

    # Frame range from preset (overridden by audio JSON when applied)
    scene.frame_start = 1
    scene.frame_end = preset["frame_count"]
    scene.frame_current = 1

    # Render engine: Cycles (required for volumetric lighting)
    scene.render.engine = 'CYCLES'

    # Resolution from preset
    scene.render.resolution_x = preset["resolution_x"]
    scene.render.resolution_y = preset["resolution_y"]
    scene.render.resolution_percentage = 100

    # Cycles settings: samples + denoiser from preset
    scene.cycles.samples = preset["cycles_samples"]
    scene.cycles.use_denoising = preset["use_denoiser"]
    if preset["use_denoiser"]:
        scene.cycles.denoiser = 'OPENIMAGEDENOISE'

    # Motion blur for dynamic laser sweep trails
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = preset["motion_blur_shutter"]

    # Film: opaque black background (NOT transparent -- darkness is the aesthetic)
    scene.render.film_transparent = False

    # -- World: total darkness with volumetric atmosphere --

    world = bpy.data.worlds.get("World")
    if world is None:
        world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True

    nodes = world.node_tree.nodes
    links = world.node_tree.links

    # Clear existing world nodes to rebuild from scratch
    nodes.clear()

    # Background node: pure black, Strength 0.0 (total darkness)
    bg_node = nodes.new(type='ShaderNodeBackground')
    bg_node.location = (0, 300)
    bg_node.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    bg_node.inputs["Strength"].default_value = 0.0

    # Volume Scatter node: atmospheric haze for visible laser beams
    # Low density so it's subtle, anisotropy 0.3 for forward-scattering
    # (light scatters mostly forward, creating visible beam cones)
    vol_scatter = nodes.new(type='ShaderNodeVolumeScatter')
    vol_scatter.location = (0, 0)
    vol_scatter.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    vol_scatter.inputs["Density"].default_value = 0.02
    vol_scatter.inputs["Anisotropy"].default_value = 0.3

    # World Output node
    world_output = nodes.new(type='ShaderNodeOutputWorld')
    world_output.location = (300, 150)

    # Connect Background -> Surface, Volume Scatter -> Volume
    links.new(bg_node.outputs["Background"], world_output.inputs["Surface"])
    links.new(vol_scatter.outputs["Volume"], world_output.inputs["Volume"])

    # Enable volumetric scattering method for world
    world.cycles.volume_scatter_method = 'DISTANCE'

    print(f"[edm_light] Scene configured: {preset['resolution_x']}x{preset['resolution_y']}, "
          f"{preset['cycles_samples']} samples, frames 1-{preset['frame_count']}, "
          f"world=TOTAL DARKNESS (Strength 0.0), Volume Scatter density=0.02")


def _create_lasers(preset):
    """Create 4 volumetric laser beam spotlights (EDM-01).

    Each laser is a Spot light positioned at the venue ceiling, pointing
    downward at an angle to fan across the venue floor. High energy (500W)
    ensures visible volumetric beams through the fog/atmosphere.

    Laser Z rotation will be keyframed by audio for sweep animation
    (Plan 02 handles this -- here we set the base positions).

    Colors: red, green, blue, magenta (classic EDM laser palette).

    Args:
        preset: Quality preset dict.

    Returns:
        List of 4 laser Spot light bpy.types.Object instances.
    """
    lasers = []

    for i in range(4):
        laser_name = LASER_NAMES[i]

        def _make_laser(idx=i):
            bpy.ops.object.light_add(
                type='SPOT',
                location=(LASER_X_POSITIONS[idx], -5.0, 8.0),
            )

        laser = get_or_create_object(laser_name, _make_laser)
        laser.location = (LASER_X_POSITIONS[i], -5.0, 8.0)

        # Rotation: point downward at angle, fan out via Z rotation
        # X rotation ~0.8 radians (~45 degrees) points beam toward floor
        # Z rotation varies per laser for fan-out spread
        laser.rotation_euler = (0.8, 0.0, LASER_Z_ROTATIONS[i])

        # -- Spot light settings for tight laser beam look --
        light_data = laser.data

        # Energy: 500W -- bright enough for visible volumetric beams
        light_data.energy = 500

        # Spot cone: tight beam (~8.6 degrees)
        light_data.spot_size = 0.15  # Radians

        # Spot blend: sharp edge with slight falloff
        light_data.spot_blend = 0.1

        # Color: unique per laser
        light_data.color = LASER_COLORS[i]

        # Shadow: sharp shadows for laser-like appearance
        light_data.shadow_soft_size = 0.01
        light_data.use_shadow = True

        lasers.append(laser)

        color_names = ["red", "green", "blue", "magenta"]
        print(f"[edm_light] Laser {i} created: {color_names[i]}, "
              f"x={LASER_X_POSITIONS[i]}, energy=500W, "
              f"spot_size=0.15rad, z_rot={LASER_Z_ROTATIONS[i]}")

    print(f"[edm_light] {len(lasers)} laser spotlights created at y=-5, z=8 "
          f"(colors: red, green, blue, magenta)")

    return lasers


def _create_led_grid(preset):
    """Create 8-column LED frequency display (EDM-02).

    Each LED is an emission cube mesh with its own material. The 8 columns
    represent audio frequency bands from bass (warm/red, left) to treble
    (cool/blue, right). Emission Strength is set to 10.0 as default and
    will be keyframed per-column by audio analysis in Plan 02.

    The "LED wall" sits at the back of the venue (y=5, z=4), facing the
    camera/audience. Each cube is 0.8x0.8x0.8 with 0.2 gap between them.

    Args:
        preset: Quality preset dict.

    Returns:
        List of 8 LED cube bpy.types.Object instances.
    """
    leds = []

    # Calculate starting X position so the grid is centered at x=0
    # 8 cubes * 1.0 spacing = 8.0 total width, centered: start at -3.5
    start_x = -3.5

    for i in range(LED_COUNT):
        led_name = LED_NAMES[i]
        x_pos = start_x + (i * LED_TOTAL_SPACING)

        def _make_led(x=x_pos):
            bpy.ops.mesh.primitive_cube_add(
                size=LED_CUBE_SIZE,
                location=(x, 5.0, 4.0),
            )

        led = get_or_create_object(led_name, _make_led)
        led.location = (x_pos, 5.0, 4.0)

        # -- Create per-column emission material --
        mat_name = f"efs_edm_led_mat_{i}"
        mat = bpy.data.materials.get(mat_name)
        if mat is None:
            mat = bpy.data.materials.new(name=mat_name)

        mat.use_nodes = True
        mat_nodes = mat.node_tree.nodes
        mat_links = mat.node_tree.links

        # Clear existing nodes
        mat_nodes.clear()

        # Emission shader: colored by frequency band
        emission = mat_nodes.new(type='ShaderNodeEmission')
        emission.location = (0, 0)
        r, g, b = LED_COLORS[i]
        emission.inputs["Color"].default_value = (r, g, b, 1.0)
        emission.inputs["Strength"].default_value = 10.0  # Default, keyframed by audio

        # Material Output
        mat_output = mat_nodes.new(type='ShaderNodeOutputMaterial')
        mat_output.location = (300, 0)

        # Connect Emission -> Surface
        mat_links.new(emission.outputs["Emission"], mat_output.inputs["Surface"])

        # Assign material to LED cube
        if led.data.materials:
            led.data.materials[0] = mat
        else:
            led.data.materials.append(mat)

        leds.append(led)

        print(f"[edm_light] LED {i} created: x={x_pos:.1f}, "
              f"color=({r}, {g}, {b}), emission_strength=10.0")

    print(f"[edm_light] {len(leds)} LED cubes created at y=5, z=4 "
          f"(frequency gradient: bass=red left -> treble=blue right)")

    return leds


def _create_edm_camera():
    """Create a wide-angle concert venue camera (24mm).

    Positioned at front-of-house looking at the stage to frame both the
    laser beams above and the LED wall behind. Wide angle (24mm) captures
    the full venue feel. Track To constraint keeps it aimed at the center
    of the laser/LED action.

    Returns:
        The camera bpy.types.Object.
    """
    # Track target empty at center of laser/LED action
    def _make_target():
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 4))

    target = get_or_create_object("efs_edm_target", _make_target)
    target.location = (0, 0, 4)

    # Camera at front of house
    def _make_camera():
        bpy.ops.object.camera_add(location=(0, -10, 5))

    camera = get_or_create_object("efs_edm_camera", _make_camera)
    camera.location = (0, -10, 5)

    # Focal length: 24mm wide angle for venue feel
    camera.data.lens = 24

    # Depth of field: f/4.0, focus at 12m
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 12.0
    camera.data.dof.aperture_fstop = 4.0

    # Add Track To constraint pointing at the target empty
    track_constraint = None
    for c in camera.constraints:
        if c.type == 'TRACK_TO':
            track_constraint = c
            break
    if track_constraint is None:
        track_constraint = camera.constraints.new(type='TRACK_TO')
    track_constraint.target = target
    track_constraint.track_axis = 'TRACK_NEGATIVE_Z'
    track_constraint.up_axis = 'UP_Y'

    # Set as active scene camera
    bpy.context.scene.camera = camera

    print(f"[edm_light] Camera created: pos=(0, -10, 5), "
          f"lens=24mm, DOF f/4.0, focus=12.0m, "
          f"tracking target at (0, 0, 4)")

    return camera


def _create_fog_plane():
    """Create a ground fog volume for laser beam visibility.

    A large cube filled with Volume Scatter material that sits at floor
    level. This ensures laser beams have a medium to scatter through even
    if the world volume density is too thin at certain angles. Higher
    anisotropy (0.6) than the world volume for more pronounced forward-
    scattering, making beams appear brighter and more defined.

    The fog cube is displayed as wireframe so it does not obstruct the
    viewport.

    Returns:
        The fog volume bpy.types.Object.
    """
    def _make_fog():
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            location=(0, 0, 1.5),
        )

    fog = get_or_create_object("efs_edm_fog", _make_fog)
    fog.location = (0, 0, 1.5)

    # Scale to 20x20x3 ground fog volume
    fog.scale = (10.0, 10.0, 1.5)

    # Display as wireframe so it does not obscure the viewport
    fog.display_type = 'WIRE'

    # -- Volume Scatter material for fog --
    mat_name = "efs_edm_fog_material"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    mat_nodes = mat.node_tree.nodes
    mat_links = mat.node_tree.links

    # Clear existing nodes
    mat_nodes.clear()

    # Volume Scatter shader: ground fog for laser visibility
    # Higher density than world volume (0.03 vs 0.02) for denser ground haze
    # Higher anisotropy (0.6) for more pronounced forward-scattering
    vol_scatter = mat_nodes.new(type='ShaderNodeVolumeScatter')
    vol_scatter.location = (0, 0)
    vol_scatter.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    vol_scatter.inputs["Density"].default_value = 0.03
    vol_scatter.inputs["Anisotropy"].default_value = 0.6

    # Material Output
    mat_output = mat_nodes.new(type='ShaderNodeOutputMaterial')
    mat_output.location = (300, 0)

    # Connect Volume Scatter -> Volume output
    mat_links.new(vol_scatter.outputs["Volume"], mat_output.inputs["Volume"])

    # Assign material to fog cube
    if fog.data.materials:
        fog.data.materials[0] = mat
    else:
        fog.data.materials.append(mat)

    print(f"[edm_light] Fog volume created: 20x20x3 at (0, 0, 1.5), "
          f"Volume Scatter density=0.03, anisotropy=0.6, display=WIRE")

    return fog


def setup_edm_compositor():
    """Create compositor node tree for EDM: heavy bloom + cool tint.

    Builds a node chain:
      Render Layers -> Glare (FOG_GLOW bloom) -> Color Balance (neutral with
      slight cool tint) -> Composite + Viewer

    The Glare node uses a LOWER threshold (0.5) than fire (0.8) or water (0.9)
    because laser and LED emission points should bloom heavily -- this is the
    primary visual effect. The cool tint in Color Balance adds a subtle
    nightclub atmosphere without shifting colors too much.

    Returns:
        Dict describing the compositor setup.
    """
    scene = bpy.context.scene

    # Enable compositing
    scene.use_nodes = True
    tree = scene.node_tree

    # Clear existing compositor nodes
    tree.nodes.clear()

    # -- Create nodes --

    # Render Layers input
    render_layers = tree.nodes.new(type='CompositorNodeRLayers')
    render_layers.location = (-300, 0)

    # Glare: FOG_GLOW bloom on laser/LED emission points
    # Lower threshold than fire/water for heavier bloom on bright lights
    glare = tree.nodes.new(type='CompositorNodeGlare')
    glare.location = (200, 100)
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.mix = 0.0          # Additive blend (glow added on top of original)
    glare.threshold = 0.5    # Lower than fire (0.8) -- lasers/LEDs should bloom heavily
    glare.size = 8           # Large glow radius for dramatic laser flare

    # Color Balance: neutral with slight cool tint (nightclub atmosphere)
    color_balance = tree.nodes.new(type='CompositorNodeColorBalance')
    color_balance.location = (500, 0)
    color_balance.correction_method = 'OFFSET_POWER_SLOPE'
    # Offset: slight cool tint in shadows/overall
    color_balance.offset = (0.95, 0.97, 1.0)
    # Power: neutral midtones
    color_balance.power = (1.0, 1.0, 1.0)
    # Slope: neutral highlights
    color_balance.slope = (1.0, 1.0, 1.0)

    # Composite output
    composite = tree.nodes.new(type='CompositorNodeComposite')
    composite.location = (800, 0)

    # Viewer node for background preview
    viewer = tree.nodes.new(type='CompositorNodeViewer')
    viewer.location = (800, -200)

    # -- Wire the nodes --
    links = tree.links
    links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    links.new(glare.outputs["Image"], color_balance.inputs["Image"])
    links.new(color_balance.outputs["Image"], composite.inputs["Image"])
    links.new(color_balance.outputs["Image"], viewer.inputs["Image"])

    print("[edm_light] Compositor created: "
          "Render Layers -> Glare (FOG_GLOW, threshold=0.5, size=8) -> "
          "Color Balance (neutral, cool tint offset=(0.95, 0.97, 1.0)) -> "
          "Composite + Viewer")

    return {
        "bloom": {
            "type": "FOG_GLOW",
            "quality": "HIGH",
            "mix": 0.0,
            "threshold": 0.5,
            "size": 8,
        },
        "color_grading": {
            "method": "OFFSET_POWER_SLOPE",
            "offset": [0.95, 0.97, 1.0],
            "power": [1.0, 1.0, 1.0],
            "slope": [1.0, 1.0, 1.0],
        },
    }


# ---------------------------------------------------------------------------
# Public API functions
# ---------------------------------------------------------------------------

def create_edm_scene(quality="preview"):
    """Create the complete EDM light show scene.

    This is the main entry point. Produces a concert-venue scene with:
      - 4 colored volumetric laser spotlights (red, green, blue, magenta)
      - 8 LED emission cubes in a frequency-band color array
      - Ground fog volume for laser beam visibility
      - World Volume Scatter for atmospheric haze
      - Total darkness (world Strength 0.0) -- effects are the only light
      - Concert camera at 24mm wide angle with DOF
      - Compositor with heavy bloom (threshold 0.5) for laser/LED flare

    No bake is needed -- all geometry and lights are procedural. After
    create_edm_scene(), apply audio keyframes, then render directly.

    Args:
        quality: Quality preset name -- "draft", "preview", "production",
                 or "ultra". Default is "preview".

    Returns:
        Dict summary of created scene (also printed as JSON).
    """
    # Load quality preset (reused from fire_cinema_template)
    preset = load_quality_preset(quality)

    # Pitfall 3: Save before destructive operations
    save_before_operate(tag="edm_light_scene_creation")

    # Step 1: Clean slate
    _clear_default_scene()
    print("[edm_light] Default scene cleared")

    # Step 2: Scene-level configuration (total darkness + world volume)
    _setup_edm_scene(preset)

    # Step 3: Volumetric laser beams (EDM-01)
    lasers = _create_lasers(preset)

    # Step 4: LED frequency display grid (EDM-02)
    leds = _create_led_grid(preset)

    # Step 5: Concert venue camera
    camera = _create_edm_camera()

    # Step 6: Ground fog for laser visibility
    fog = _create_fog_plane()

    # Step 7: Compositor (heavy bloom + cool tint)
    compositor_info = setup_edm_compositor()

    # Build JSON summary (same pattern as fire_cinema_template)
    result = {
        "status": "scene_created",
        "quality_preset": preset["name"],
        "objects": {
            "lasers": [
                {
                    "name": laser.name,
                    "location": list(laser.location),
                    "color": list(laser.data.color),
                    "energy_watts": laser.data.energy,
                    "spot_size_rad": laser.data.spot_size,
                }
                for laser in lasers
            ],
            "leds": [
                {
                    "name": led.name,
                    "location": list(led.location),
                    "material": f"efs_edm_led_mat_{i}",
                    "emission_strength": 10.0,
                }
                for i, led in enumerate(leds)
            ],
            "fog": {
                "name": fog.name,
                "location": list(fog.location),
                "scale": list(fog.scale),
                "density": 0.03,
                "anisotropy": 0.6,
            },
            "camera": {
                "name": camera.name,
                "location": list(camera.location),
                "focal_length_mm": 24,
                "dof_enabled": True,
                "dof_fstop": 4.0,
                "dof_focus_distance": 12.0,
            },
        },
        "scene": {
            "engine": "CYCLES",
            "samples": preset["cycles_samples"],
            "denoiser": "OPENIMAGEDENOISE" if preset["use_denoiser"] else "NONE",
            "resolution": f"{preset['resolution_x']}x{preset['resolution_y']}",
            "frame_range": f"1-{preset['frame_count']}",
            "motion_blur": preset["motion_blur_shutter"],
            "world_darkness": True,
            "world_volume_scatter": {
                "density": 0.02,
                "anisotropy": 0.3,
            },
        },
        "compositor": {
            "bloom": compositor_info["bloom"],
            "color_grading": compositor_info["color_grading"],
        },
    }

    print(json.dumps(result, indent=2))
    return result


def apply_edm_audio(audio_json_path, preset_name="edm_lights"):
    """Apply audio-driven keyframes to the EDM scene using a mapping preset.

    Convenience wrapper around keyframe_generator.apply_audio_keyframes()
    that defaults to the edm_lights preset. Provides a clean API:
        create_edm_scene -> apply_edm_audio -> render_edm

    Audio keyframes will drive:
      - Laser Z rotation (sweep/scan animation)
      - LED emission strength per column (frequency visualization)
      - Potentially laser energy for beat-pulse effects

    Args:
        audio_json_path: Absolute path to the audio analysis JSON file.
        preset_name: Mapping preset name (default "edm_lights").

    Returns:
        Dict summary from apply_audio_keyframes().
    """
    from keyframe_generator import apply_audio_keyframes
    return apply_audio_keyframes(audio_json_path, preset_name=preset_name)


def render_edm(output_name="edm_lights", frame=None):
    """Start async Cycles render of the EDM light show.

    Uses the scene's Cycles settings (configured by _setup_edm_scene from
    the quality preset used in create_edm_scene).

    Args:
        output_name: Name prefix for output files/directory.
        frame: If specified, render a single frame (for test/preview).
               If None, render the full animation.

    Poll for completion with:
        from poll_status import is_render_active; is_render_active()
    """
    if frame is not None:
        # Single frame test render
        from async_render import start_single_frame_render
        start_single_frame_render(
            output_name=output_name,
            frame=frame,
        )
    else:
        # Full animation render (uses scene settings from quality preset)
        from async_render import start_render
        start_render(
            output_name=output_name,
        )
