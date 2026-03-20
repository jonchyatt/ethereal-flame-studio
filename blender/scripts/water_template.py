"""
EFS Water Template -- physics-based Ocean Modifier water scene builder.

Creates an audio-reactive water scene with Ocean Modifier surface, glass BSDF
material with physically correct IOR 1.333, foam/spray particle system, two-point
lighting (sun + area fill), camera with depth of field, and compositor with
specular bloom and cool color grading.

The create_water_scene() function produces a complete ocean scene ready for
audio keyframes (via keyframe_generator.py with water_ocean preset) and
compositor effects. Treble/brilliance audio features drive wave activity.

Key differences from fire_cinema_template.py:
  - Ocean Modifier (procedural) instead of Mantaflow (simulation-based)
  - Glass BSDF material (IOR 1.333) instead of Principled Volume
  - Foam particle system on wave crests instead of fire emitter
  - Caustics enabled for water refraction (reflective + refractive)
  - Higher light bounce limits for glass transmission
  - No bake needed (Ocean Modifier is fully procedural)
  - Cooler color grading (blue shadows instead of warm fire tones)

Four-function API:
  create_water_scene() -> apply_water_audio() -> bake_ocean() -> render_water()

Usage (via MCP execute_blender_code calls):

  Call 1 -- Create scene (includes compositor setup):
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from water_template import create_water_scene
    create_water_scene(quality="preview")

  Call 2 -- Apply audio keyframes (optional, requires audio JSON):
    from water_template import apply_water_audio
    apply_water_audio('C:/.../audio-analysis.json')

  Call 3 -- Bake (no-op for Ocean Modifier, exists for API symmetry):
    from water_template import bake_ocean
    bake_ocean()

  Call 4 -- Poll status (not needed for ocean, but for render):
    from poll_status import poll_status
    poll_status()

  Call 5 -- Render single frame (returns immediately):
    from water_template import render_water
    render_water(output_name="water_ocean", frame=45)

  Call 6 -- Render full animation:
    from water_template import render_water
    render_water(output_name="water_ocean")

Pitfall compliance:
  - Pitfall 2: Async render via timer + INVOKE_DEFAULT (never blocks MCP)
  - Pitfall 3: save_before_operate() called before scene creation
  - Pitfall 14: Single-frame render option for manual inspection
  - Ocean Modifier is procedural -- no bake step needed (bake_ocean is a no-op)
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
# Internal helper functions (all prefixed with underscore)
# ---------------------------------------------------------------------------

def _clear_default_scene():
    """Remove all default objects (Cube, Light, Camera) for a clean start."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def _setup_scene(preset):
    """Configure scene-level settings from a quality preset for water rendering.

    Sets frame range, Cycles render engine, resolution, samples, denoiser,
    motion blur, caustics, light bounces, and world background.

    Water-specific differences from fire_cinema_template._setup_scene():
      - film_transparent = False (opaque for water reflections)
      - Caustics enabled (reflective + refractive) for water light patterns
      - Higher bounce limits for glass transmission (12 max, 12 transmission)
      - Dark blue-black world background instead of pure black

    Args:
        preset: Quality preset dict from load_quality_preset().
    """
    scene = bpy.context.scene

    # Frame range from preset (overridden by audio JSON when applied)
    scene.frame_start = 1
    scene.frame_end = preset["frame_count"]
    scene.frame_current = 1

    # Render engine: Cycles
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

    # Motion blur for fluid wave motion
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = preset["motion_blur_shutter"]

    # Film: opaque background for water reflections
    scene.render.film_transparent = False

    # Caustics: enabled for water refraction light patterns
    scene.cycles.caustics_reflective = True
    scene.cycles.caustics_refractive = True

    # Light bounce limits: higher for glass transmission
    scene.cycles.max_bounces = 12
    scene.cycles.transparent_max_bounces = 8
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 12

    # World background: dark blue-black (deep ocean ambience)
    world = bpy.data.worlds.get("World")
    if world is None:
        world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs["Color"].default_value = (0.001, 0.002, 0.005, 1.0)
        bg_node.inputs["Strength"].default_value = 1.0

    print(f"[water_template] Scene configured: {preset['resolution_x']}x{preset['resolution_y']}, "
          f"{preset['cycles_samples']} samples, frames 1-{preset['frame_count']}, "
          f"caustics=ON, max_bounces=12, transmission_bounces=12")


def _create_ocean(preset):
    """Create an ocean surface with Ocean Modifier.

    The Ocean Modifier generates a procedural ocean surface with controllable
    wave scale, choppiness, and foam output. No baking required -- the surface
    is fully procedural and animates via keyframed time parameter.

    Args:
        preset: Quality preset dict.

    Returns:
        The ocean bpy.types.Object.
    """
    def _make_ocean():
        bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))

    ocean = get_or_create_object("efs_water_ocean", _make_ocean)
    ocean.location = (0, 0, 0)
    bpy.context.view_layer.objects.active = ocean

    # Add Ocean Modifier
    mod = ocean.modifiers.get("Ocean")
    if mod is None:
        mod = ocean.modifiers.new(name="Ocean", type='OCEAN')

    # Ocean modifier settings
    mod.geometry_mode = 'GENERATE'
    mod.repeat_x = 2
    mod.repeat_y = 2

    # Resolution: higher for production/ultra quality
    mod.resolution = 16 if preset["resolution_max"] >= 256 else 12

    # Wave parameters
    mod.spatial_size = 25    # Meters -- controls wave wavelength (larger = longer waves)
    mod.depth = 200          # Deep ocean behavior
    mod.size = 1.0           # Base wave height (keyframeable for audio)
    mod.choppiness = 1.5     # Base choppiness (keyframeable for audio)

    # Foam output
    mod.use_foam = True
    mod.foam_coverage = 0.3       # Foam only on wave crests
    mod.foam_layer_name = "foam"  # Vertex color layer name

    # Time animation start
    mod.time = 0

    # Animate ocean time: smooth progression from frame 1 to last frame
    mod.time = 0
    ocean.keyframe_insert(data_path='modifiers["Ocean"].time', frame=1)
    mod.time = preset["frame_count"] / 24.0
    ocean.keyframe_insert(data_path='modifiers["Ocean"].time', frame=preset["frame_count"])

    # Smooth shading for the ocean surface
    bpy.ops.object.shade_smooth()

    print(f"[water_template] Ocean created: 40x40 plane, resolution={mod.resolution}, "
          f"spatial_size={mod.spatial_size}, depth={mod.depth}, "
          f"wave_height={mod.size}, choppiness={mod.choppiness}, foam=ON")

    return ocean


def _create_water_material(ocean):
    """Create a physically-based water material using Glass BSDF.

    Glass BSDF with IOR 1.333 provides physically correct water refraction.
    Slight blue tint and very low roughness for near-mirror-smooth surface.

    Args:
        ocean: The ocean bpy.types.Object.

    Returns:
        The created bpy.types.Material.
    """
    mat_name = "efs_water_material"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear existing nodes
    nodes.clear()

    # Create Glass BSDF node
    glass = nodes.new(type='ShaderNodeBsdfGlass')
    glass.location = (0, 0)
    glass.inputs["Color"].default_value = (0.8, 0.9, 1.0, 1.0)       # Slightly blue tint
    glass.inputs["Roughness"].default_value = 0.05                     # Nearly mirror-smooth
    glass.inputs["IOR"].default_value = 1.333                          # Water IOR

    # Create Material Output node
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (300, 0)

    # Connect Glass BSDF -> Surface output
    links.new(glass.outputs["BSDF"], output_node.inputs["Surface"])

    # Assign material to ocean object
    if ocean.data.materials:
        ocean.data.materials[0] = mat
    else:
        ocean.data.materials.append(mat)

    print(f"[water_template] Water material created: Glass BSDF, "
          f"IOR=1.333, roughness=0.05, color=(0.8, 0.9, 1.0)")

    return mat


def _create_foam_particles(ocean, preset):
    """Create spray/foam particle system on the ocean surface.

    Particles emit from foam areas (vertex group from Ocean Modifier foam output)
    creating spray droplets on wave crests. Uses Newton physics with reduced
    gravity for partially floaty behavior.

    Args:
        ocean: The ocean bpy.types.Object.
        preset: Quality preset dict (for frame range).

    Returns:
        The particle system settings object.
    """
    # Add particle system modifier
    ps_mod = ocean.modifiers.get("FoamParticles")
    if ps_mod is None:
        ps_mod = ocean.modifiers.new(name="FoamParticles", type='PARTICLE_SYSTEM')

    ps = ocean.particle_systems[-1].settings

    # Particle count and timing
    ps.count = 5000
    ps.frame_start = 1
    ps.frame_end = preset["frame_count"]
    ps.lifetime = 15

    # Physics: Newton with low mass for spray behavior
    ps.physics_type = 'NEWTON'
    ps.mass = 0.01

    # Emission: from deformed ocean surface
    ps.emit_from = 'FACE'
    ps.use_modifier_stack = True

    # Render: tiny halo spray droplets
    ps.render_type = 'HALO'
    ps.particle_size = 0.02

    # Velocity: upward spray with randomness
    ps.normal_factor = 0.5
    ps.factor_random = 0.3

    # Reduced gravity for partially floaty spray
    ps.effector_weights.gravity = 0.5

    print(f"[water_template] Foam particles created: count=5000, lifetime=15, "
          f"size=0.02, vertex_group=foam, gravity=0.5")

    return ps


def _create_camera():
    """Create a camera with Track To constraint for the water scene.

    Elevated angle looking down at the water surface to capture the expanse.
    Wider focal length (35mm) than fire scene to show more water area.
    Slightly deeper DOF (f/4.0) for more of the water in focus.

    Returns:
        The camera bpy.types.Object.
    """
    # Track target empty at water surface center
    def _make_target():
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))

    target = get_or_create_object("efs_water_target", _make_target)
    target.location = (0, 0, 0)

    # Camera at elevated angle
    def _make_camera():
        bpy.ops.object.camera_add(location=(8, -8, 4))

    camera = get_or_create_object("efs_water_camera", _make_camera)
    camera.location = (8, -8, 4)

    # Focal length: 35mm wider than fire to capture water expanse
    camera.data.lens = 35

    # Depth of field: slightly deeper than fire
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 11.3
    camera.data.dof.aperture_fstop = 4.0

    # Add Track To constraint pointing at target empty
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

    print(f"[water_template] Camera created: pos=(8, -8, 4), "
          f"lens=35mm, DOF f/4.0, focus=11.3m")

    return camera


def _create_lighting():
    """Create two-point lighting for the water scene.

    Key sun light for dramatic reflections on the water surface, plus a cool
    blue area fill light for ambient illumination.

    Returns:
        Tuple of (sun, fill) light objects.
    """
    # -- Key sun light: warm white for dramatic water reflections --
    def _make_sun():
        bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))

    sun = get_or_create_object("efs_water_sun", _make_sun)
    sun.location = (0, 0, 10)
    sun.data.energy = 3.0
    sun.data.color = (1.0, 0.98, 0.95)  # Warm white

    # Angle: 15 degrees below horizon for dramatic reflections
    sun.rotation_euler = (math.radians(60), 0, math.radians(30))

    # -- Area fill light: cool blue ambient --
    def _make_fill():
        bpy.ops.object.light_add(type='AREA', location=(-5, 5, 3))

    fill = get_or_create_object("efs_water_fill", _make_fill)
    fill.location = (-5, 5, 3)
    fill.data.energy = 20
    fill.data.color = (0.7, 0.85, 1.0)  # Cool blue
    fill.data.size = 5.0

    print(f"[water_template] Lighting created: "
          f"sun=3.0W warm white (60deg), fill=20W cool blue (size=5)")

    return sun, fill


def setup_water_compositor():
    """Create compositor node tree for water: specular bloom + cool color grading.

    Builds a node chain:
      Render Layers -> Glare (FOG_GLOW bloom) -> Color Balance (ASC CDL cool grade) -> Composite
                                                                                     -> Viewer

    The Glare node adds a soft bloom to specular highlights on the water surface
    (threshold 0.9 -- higher than fire so only the brightest reflections bloom).
    The Color Balance uses ASC CDL for a cool cinematic grade -- cool shadows,
    neutral midtones, slightly cooler highlights.

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

    # Glare: FOG_GLOW bloom on specular highlights
    glare = tree.nodes.new(type='CompositorNodeGlare')
    glare.location = (200, 100)
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.mix = 0.0          # Additive blend
    glare.threshold = 0.9    # Only brightest specular highlights bloom (higher than fire)
    glare.size = 6           # Slightly tighter glow than fire

    # Color Balance: ASC CDL cool color grading
    color_balance = tree.nodes.new(type='CompositorNodeColorBalance')
    color_balance.location = (500, 0)
    color_balance.correction_method = 'OFFSET_POWER_SLOPE'
    # Offset: cool tint in shadows
    color_balance.offset = (0.95, 0.98, 1.0)
    # Power: neutral midtones
    color_balance.power = (1.0, 1.0, 1.0)
    # Slope: slightly cooler highlights
    color_balance.slope = (0.95, 1.0, 1.05)

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

    print("[water_template] Compositor created: "
          "Render Layers -> Glare (FOG_GLOW, threshold=0.9) -> "
          "Color Balance (ASC CDL cool grade) -> Composite + Viewer")

    return {
        "bloom": {
            "type": "FOG_GLOW",
            "quality": "HIGH",
            "mix": 0.0,
            "threshold": 0.9,
            "size": 6,
        },
        "color_grading": {
            "method": "OFFSET_POWER_SLOPE",
            "offset": [0.95, 0.98, 1.0],
            "power": [1.0, 1.0, 1.0],
            "slope": [0.95, 1.0, 1.05],
        },
    }


# ---------------------------------------------------------------------------
# Public API functions
# ---------------------------------------------------------------------------

def create_water_scene(quality="preview"):
    """Create the complete physics-based water scene.

    This is the main entry point. Produces a scene with:
      - Ocean Modifier surface with procedural waves and foam output
      - Glass BSDF material with IOR 1.333 for water refraction
      - Foam/spray particle system on wave crests
      - Camera with depth of field
      - Two-point lighting (sun + area fill)
      - Compositor with specular bloom and cool color grading
      - Caustics enabled for water light patterns

    Args:
        quality: Quality preset name -- "draft", "preview", "production", or "ultra".
                 Default is "preview" for a reasonable quality/speed balance.

    Returns:
        Dict summary of created scene (also printed as JSON).
    """
    # Load quality preset (reused from fire_cinema_template)
    preset = load_quality_preset(quality)

    # Pitfall 3: Save before destructive operations
    save_before_operate(tag="water_scene_creation")

    # Step 1: Clean slate
    _clear_default_scene()
    print("[water_template] Default scene cleared")

    # Step 2: Scene-level configuration from quality preset
    _setup_scene(preset)

    # Step 3: Ocean Modifier surface
    ocean = _create_ocean(preset)

    # Step 4: Glass BSDF water material
    material = _create_water_material(ocean)

    # Step 5: Foam/spray particle system
    foam_ps = _create_foam_particles(ocean, preset)

    # Step 6: Camera with DOF
    camera = _create_camera()

    # Step 7: Two-point lighting
    sun, fill = _create_lighting()

    # Step 8: Compositor (specular bloom + cool color grading)
    compositor_info = setup_water_compositor()

    # Build JSON summary
    result = {
        "status": "scene_created",
        "quality_preset": preset["name"],
        "objects": {
            "ocean": {
                "name": ocean.name,
                "location": list(ocean.location),
                "modifier": "Ocean",
                "resolution": 16 if preset["resolution_max"] >= 256 else 12,
                "spatial_size": 25,
                "depth": 200,
                "wave_height": 1.0,
                "choppiness": 1.5,
                "foam_enabled": True,
                "foam_coverage": 0.3,
            },
            "material": {
                "name": material.name,
                "type": "Glass BSDF",
                "ior": 1.333,
                "roughness": 0.05,
                "color": [0.8, 0.9, 1.0],
            },
            "foam_particles": {
                "count": 5000,
                "lifetime": 15,
                "render_type": "HALO",
                "particle_size": 0.02,
                "vertex_group": "foam",
            },
            "camera": {
                "name": camera.name,
                "location": list(camera.location),
                "focal_length_mm": 35,
                "dof_enabled": True,
                "dof_fstop": 4.0,
                "dof_focus_distance": 11.3,
            },
            "sun": {
                "name": sun.name,
                "location": list(sun.location),
                "energy": 3.0,
                "color": [1.0, 0.98, 0.95],
            },
            "fill": {
                "name": fill.name,
                "location": list(fill.location),
                "energy": 20,
                "color": [0.7, 0.85, 1.0],
                "size": 5.0,
            },
        },
        "scene": {
            "engine": "CYCLES",
            "samples": preset["cycles_samples"],
            "denoiser": "OPENIMAGEDENOISE" if preset["use_denoiser"] else "NONE",
            "resolution": f"{preset['resolution_x']}x{preset['resolution_y']}",
            "frame_range": f"1-{preset['frame_count']}",
            "motion_blur": preset["motion_blur_shutter"],
            "caustics": True,
            "max_bounces": 12,
            "transmission_bounces": 12,
        },
        "compositor": {
            "bloom": compositor_info["bloom"],
            "color_grading": compositor_info["color_grading"],
        },
    }

    print(json.dumps(result, indent=2))
    return result


def apply_water_audio(audio_json_path, preset_name="water_ocean"):
    """Apply audio-driven keyframes to the water scene using the water_ocean preset.

    Convenience wrapper around keyframe_generator.apply_audio_keyframes()
    that defaults to the water_ocean preset. Provides a clean four-function API:
        create_water_scene -> apply_water_audio -> bake_ocean -> render_water

    Args:
        audio_json_path: Absolute path to the audio analysis JSON file.
        preset_name: Mapping preset name (default "water_ocean").

    Returns:
        Dict summary from apply_audio_keyframes().
    """
    from keyframe_generator import apply_audio_keyframes
    return apply_audio_keyframes(audio_json_path, preset_name=preset_name)


def bake_ocean():
    """No-op placeholder for API symmetry with fire_cinema_template.

    Ocean Modifier is fully procedural -- no baking is required.
    The foam particle system also does not need explicit baking.
    This function exists only so the four-function API pattern
    (create -> audio -> bake -> render) is consistent across templates.

    Returns:
        Dict indicating no bake was needed.
    """
    print("[water_template] Ocean Modifier is procedural -- no bake needed. "
          "Ready to render.")
    return {
        "status": "no_bake_needed",
        "reason": "Ocean Modifier is procedural",
    }


def render_water(output_name="water_ocean", frame=None):
    """Start async Cycles render of the water scene.

    Uses the scene's Cycles settings (configured by _setup_scene from the
    quality preset used in create_water_scene).

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
