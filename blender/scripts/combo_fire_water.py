"""
EFS Fire-Over-Water Combo Scene -- fire hovering above reflective water with
caustic reflections, HDRI environment, and combined audio-reactive keyframes.

This is the showcase scene combining all Phase 29 capabilities: fire simulation
(Phase 28 fire_cinema_template), water surface (Plan 01 water_template), and
world building (Plan 02 world_template) into one cinematic composition. Fire
floats above an ocean surface, its light reflecting in the water with visible
caustics under optional HDRI sky lighting.

NOTE: Combo scenes require significantly more rendering time than individual
fire or water scenes due to caustic computation (reflective + refractive
bounces through Glass BSDF water surface).

Four-function API:
  create_fire_water_scene() -> apply_combo_audio() -> bake_fire_water() -> render_fire_water()

Usage (via MCP execute_blender_code calls):

  Call 1 -- Create scene (fire + water + HDRI + compositor):
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from combo_fire_water import create_fire_water_scene
    create_fire_water_scene(quality="preview")

  Call 1b -- With HDRI environment:
    create_fire_water_scene(quality="preview", hdri_path="C:/.../my_hdri_2k.exr")

  Call 2 -- Apply combined audio keyframes (fire bass + water treble + combo lights):
    from combo_fire_water import apply_combo_audio
    apply_combo_audio('C:/.../audio-analysis.json')

  Call 3 -- Start fire bake (ocean is procedural, no bake needed):
    from combo_fire_water import bake_fire_water
    bake_fire_water()

  Call 4 -- Poll bake status:
    from poll_status import poll_status
    poll_status()

  Call 5 -- Render single frame:
    from combo_fire_water import render_fire_water
    render_fire_water(output_name="fire_water_combo", frame=45)

  Call 6 -- Render full animation:
    from combo_fire_water import render_fire_water
    render_fire_water(output_name="fire_water_combo")

Object naming convention:
  - Fire objects keep efs_fire_* names (from fire_cinema_template)
  - Water objects keep efs_water_* names (from water_template)
  - Combo-specific objects use efs_combo_* (camera, target, sun, rim)
  This allows fire_cinema and water_ocean audio presets to BOTH target their
  respective objects in the same scene without naming conflicts.

Pitfall compliance:
  - Pitfall 2: Async bake/render via timer + INVOKE_DEFAULT (never blocks MCP)
  - Pitfall 3: save_before_operate() called before scene creation
  - Pitfall 4: Cache directory set to blender/cache/fire_water_combo/
  - Pitfall 6: Flow object (fuel_amount) is the keyframeable parameter, NOT Domain
  - Pitfall 7: Resolution controlled by quality preset (64-512 ladder)
  - Pitfall 14: Single-frame render option for manual inspection
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
    set_cache_directory,
    RENDERS_DIR,
    CACHE_DIR,
)

from fire_cinema_template import (
    load_quality_preset,
    _create_fire_domain,
    _create_fire_flow,
    _create_fire_material,
    setup_compositor as _fire_setup_compositor,
)

from water_template import (
    _create_ocean,
    _create_water_material,
    _create_foam_particles,
)

from world_template import setup_hdri

from keyframe_generator import apply_audio_keyframes

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
HDRI_DIR = REPO_ROOT / "blender" / "hdris"


# ---------------------------------------------------------------------------
# Internal helper functions
# ---------------------------------------------------------------------------

def _clear_default_scene():
    """Remove all default objects (Cube, Light, Camera) for a clean start."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def _setup_combo_scene(preset):
    """Configure Cycles for the fire-over-water combo scene.

    Combines water_template's caustic settings with increased bounce limits
    for the complex light interactions between fire emission, water glass
    surface, and HDRI environment.

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

    # Motion blur for cinematic fire trails and fluid wave motion
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = preset["motion_blur_shutter"]

    # Film: opaque background (HDRI or fallback dark sky will fill it)
    scene.render.film_transparent = False

    # CRITICAL: Caustics enabled for fire reflections in water
    scene.cycles.caustics_reflective = True
    scene.cycles.caustics_refractive = True

    # Increased bounces for water+fire interaction (higher than standalone water)
    scene.cycles.max_bounces = 16
    scene.cycles.glossy_bounces = 6
    scene.cycles.transmission_bounces = 16
    scene.cycles.transparent_max_bounces = 8
    scene.cycles.volume_bounces = 4

    # Do NOT set world background here -- HDRI or fallback will handle it

    print(f"[combo_fire_water] Scene configured: {preset['resolution_x']}x{preset['resolution_y']}, "
          f"{preset['cycles_samples']} samples, frames 1-{preset['frame_count']}, "
          f"caustics=ON, max_bounces=16, transmission_bounces=16, volume_bounces=4")


def _create_combo_camera(preset):
    """Create camera optimized for fire-over-water framing.

    Further back than fire camera to show both water surface and fire column.
    Track target between water (0) and fire center (2.0) for balanced framing.
    50mm focal length for a balanced view of both elements.

    Args:
        preset: Quality preset dict.

    Returns:
        The camera bpy.types.Object.
    """
    # Track target: between water surface (0) and fire center (2.0)
    def _make_target():
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 1.5))

    target = get_or_create_object("efs_combo_target", _make_target)
    target.location = (0, 0, 1.5)

    # Camera: further back than fire camera to capture both water and fire
    def _make_camera():
        bpy.ops.object.camera_add(location=(10, -8, 3))

    camera = get_or_create_object("efs_combo_camera", _make_camera)
    camera.location = (10, -8, 3)

    # Focal length: 50mm balanced framing for fire and water
    camera.data.lens = 50

    # Depth of field: moderate for both fire and water in acceptable focus
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 12.8
    camera.data.dof.aperture_fstop = 3.5

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

    print(f"[combo_fire_water] Camera created: pos=(10, -8, 3), "
          f"lens=50mm, DOF f/3.5, focus=12.8m, target=(0, 0, 1.5)")

    return camera


def _create_combo_lighting():
    """Create lighting for the combined fire-over-water scene.

    Sun light: warm white angled to create long reflections on water surface.
    Rim light: cool blue point light for depth separation.
    NOTE: The fire itself is the primary warm light source. Its Mantaflow
    emission lights the water via Cycles path tracing, which is what creates
    the caustic reflections. No additional fire-specific lights needed.

    Returns:
        Tuple of (sun, rim) light objects.
    """
    # -- Sun light: warm white, angled for long water reflections --
    def _make_sun():
        bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))

    sun = get_or_create_object("efs_combo_sun", _make_sun)
    sun.location = (0, 0, 10)
    sun.data.energy = 2.5
    sun.data.color = (1.0, 0.97, 0.92)  # Warm white

    # Angled to create long reflections on water surface
    sun.rotation_euler = (math.radians(55), 0, math.radians(25))

    # -- Rim light: cool blue for depth separation --
    def _make_rim():
        bpy.ops.object.light_add(type='POINT', location=(-5, 6, 5))

    rim = get_or_create_object("efs_combo_rim", _make_rim)
    rim.location = (-5, 6, 5)
    rim.data.energy = 40
    rim.data.color = (0.7, 0.8, 1.0)  # Cool blue

    print(f"[combo_fire_water] Lighting created: "
          f"sun=2.5W warm white (55deg), rim=40W cool blue")

    return sun, rim


def _setup_combo_compositor():
    """Create compositor balancing fire warmth and water coolness.

    Node chain:
      Render Layers -> Glare (FOG_GLOW bloom) -> Color Balance (subtle warmth)
                                                -> Composite + Viewer

    Uses higher glare threshold (0.85) than fire (0.8) but lower than water
    (0.9) to bloom both fire hotspots and bright water specular highlights.
    Very subtle warm color grading that does not overpower water's cool tone.

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

    # Glare: FOG_GLOW bloom on fire and water specular highlights
    glare = tree.nodes.new(type='CompositorNodeGlare')
    glare.location = (200, 100)
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.mix = 0.0          # Additive blend (glow added on top)
    glare.threshold = 0.85   # Between fire (0.8) and water (0.9)
    glare.size = 7           # Moderate glow radius

    # Color Balance: very subtle warmth without overpowering water cool tone
    color_balance = tree.nodes.new(type='CompositorNodeColorBalance')
    color_balance.location = (500, 0)
    color_balance.correction_method = 'OFFSET_POWER_SLOPE'
    # Offset: extremely subtle warm tint in shadows
    color_balance.offset = (0.98, 0.97, 0.95)
    # Power: neutral midtones
    color_balance.power = (1.0, 1.0, 1.0)
    # Slope: very subtle warmth in highlights
    color_balance.slope = (1.02, 1.0, 0.98)

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

    print("[combo_fire_water] Compositor created: "
          "Render Layers -> Glare (FOG_GLOW, threshold=0.85) -> "
          "Color Balance (subtle warmth) -> Composite + Viewer")

    return {
        "bloom": {
            "type": "FOG_GLOW",
            "quality": "HIGH",
            "mix": 0.0,
            "threshold": 0.85,
            "size": 7,
        },
        "color_grading": {
            "method": "OFFSET_POWER_SLOPE",
            "offset": [0.98, 0.97, 0.95],
            "power": [1.0, 1.0, 1.0],
            "slope": [1.02, 1.0, 0.98],
        },
    }


# ---------------------------------------------------------------------------
# Public API functions
# ---------------------------------------------------------------------------

def create_fire_water_scene(quality="preview", hdri_path=None):
    """Create the complete fire-over-water combo scene.

    This is the main entry point. Positions fire above a reflective water
    surface with caustic reflections, optional HDRI environment, and combined
    audio-reactive keyframes. Composes functions from fire_cinema_template,
    water_template, and world_template into a single cohesive scene.

    Args:
        quality: Quality preset name -- "draft", "preview", "production", or "ultra".
                 Default is "preview" for a reasonable quality/speed balance.
        hdri_path: Optional absolute path to an HDRI .exr/.hdr file for
                   photorealistic sky lighting. If None, a dark blue-black
                   background is used. Download HDRIs first via blender-mcp
                   MCP tools (polyhaven_download).

    Returns:
        Dict summary of created scene (also printed as JSON).
    """
    # Load quality preset
    preset = load_quality_preset(quality)

    # Pitfall 3: Save before destructive operations
    save_before_operate(tag="fire_water_combo_creation")

    # Step 1: Clean slate
    _clear_default_scene()
    print("[combo_fire_water] Default scene cleared")

    # Step 2: Scene-level configuration (Cycles, caustics, bounces)
    _setup_combo_scene(preset)

    # Step 3: Create water surface (ocean at origin -- the "ground plane")
    ocean = _create_ocean(preset)
    print("[combo_fire_water] Water surface created at (0, 0, 0)")

    # Step 4: Create water material (Glass BSDF IOR 1.333)
    water_material = _create_water_material(ocean)
    print("[combo_fire_water] Water material applied (Glass BSDF IOR 1.333)")

    # Step 5: Create foam particles on wave crests
    foam_ps = _create_foam_particles(ocean, preset)
    print("[combo_fire_water] Foam particles created on wave crests")

    # Step 6: Create fire domain (raised above water surface)
    domain = _create_fire_domain(preset)
    # Adjust fire domain position for combo: raise slightly so fire base
    # is clearly above the water surface
    domain.location = (0, 0, 2.5)
    print("[combo_fire_water] Fire domain repositioned to (0, 0, 2.5) above water")

    # Step 7: Create fire flow emitter (raised above water surface)
    flow = _create_fire_flow()
    # Adjust flow position: above water surface
    flow.location = (0, 0, 0.8)
    print("[combo_fire_water] Fire flow repositioned to (0, 0, 0.8) above water")

    # Step 8: Create fire material (Principled Volume with Blackbody)
    fire_material = _create_fire_material(domain)
    print("[combo_fire_water] Fire material applied (Principled Volume + Blackbody)")

    # Step 9: Set fire cache directory (separate from standalone fire)
    cache_path = set_cache_directory(domain, "fire_water_combo")
    print(f"[combo_fire_water] Fire cache directory: {cache_path}")

    # Step 10: Create combo camera (optimized for fire-over-water framing)
    camera = _create_combo_camera(preset)

    # Step 11: Create combo lighting (sun + rim)
    sun, rim = _create_combo_lighting()

    # Step 12: Setup HDRI environment (if provided)
    hdri_status = "none"
    if hdri_path is not None:
        # Reduced strength (0.8) to avoid overpowering fire's self-illumination
        hdri_result = setup_hdri(hdri_path, strength=0.8, rotation_z=0)
        hdri_status = "loaded"
        print(f"[combo_fire_water] HDRI loaded: {hdri_path} (strength=0.8)")
    else:
        # Fallback: dark blue-black world background
        world = bpy.data.worlds.get("World")
        if world is None:
            world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
        world.use_nodes = True
        bg_node = world.node_tree.nodes.get("Background")
        if bg_node:
            bg_node.inputs["Color"].default_value = (0.002, 0.003, 0.008, 1.0)
            bg_node.inputs["Strength"].default_value = 0.5
        print("[combo_fire_water] No HDRI -- using dark blue-black background")

    # Step 13: Setup combo compositor (balanced fire warmth + water coolness)
    compositor_info = _setup_combo_compositor()

    # Build JSON summary
    result = {
        "status": "scene_created",
        "quality_preset": preset["name"],
        "objects": {
            "ocean": {
                "name": ocean.name,
                "location": list(ocean.location),
                "modifier": "Ocean",
                "wave_height": 1.0,
                "choppiness": 1.5,
                "foam_enabled": True,
            },
            "water_material": {
                "name": water_material.name,
                "type": "Glass BSDF",
                "ior": 1.333,
                "roughness": 0.05,
            },
            "fire_domain": {
                "name": domain.name,
                "location": list(domain.location),
                "scale": list(domain.scale),
                "resolution_max": preset["resolution_max"],
                "cache_directory": "fire_water_combo",
            },
            "fire_flow": {
                "name": flow.name,
                "location": list(flow.location),
                "fuel_amount": 1.5,
                "temperature": 2.5,
            },
            "fire_material": {
                "name": fire_material.name,
                "type": "Principled Volume",
                "blackbody_intensity": 1.5,
            },
            "camera": {
                "name": camera.name,
                "location": list(camera.location),
                "focal_length_mm": 50,
                "dof_fstop": 3.5,
                "dof_focus_distance": 12.8,
            },
            "sun": {
                "name": sun.name,
                "location": list(sun.location),
                "energy": 2.5,
                "color": [1.0, 0.97, 0.92],
            },
            "rim": {
                "name": rim.name,
                "location": list(rim.location),
                "energy": 40,
                "color": [0.7, 0.8, 1.0],
            },
        },
        "scene": {
            "engine": "CYCLES",
            "samples": preset["cycles_samples"],
            "denoiser": "OPENIMAGEDENOISE" if preset["use_denoiser"] else "NONE",
            "resolution": f"{preset['resolution_x']}x{preset['resolution_y']}",
            "frame_range": f"1-{preset['frame_count']}",
            "motion_blur": preset["motion_blur_shutter"],
            "caustics_reflective": True,
            "caustics_refractive": True,
            "max_bounces": 16,
            "transmission_bounces": 16,
            "volume_bounces": 4,
        },
        "hdri": {
            "status": hdri_status,
            "path": hdri_path,
            "strength": 0.8 if hdri_path else None,
        },
        "compositor": {
            "bloom": compositor_info["bloom"],
            "color_grading": compositor_info["color_grading"],
        },
    }

    print(json.dumps(result, indent=2))
    return result


def apply_combo_audio(audio_json_path, preset_name="fire_water_combo"):
    """Apply combined audio-driven keyframes to fire, water, and combo objects.

    Uses the fire_water_combo preset which drives 17 parameters simultaneously:
    fire bass/energy + water treble/brilliance + combo lights/camera. A single
    call keyframes ALL elements in the scene.

    Convenience wrapper around keyframe_generator.apply_audio_keyframes()
    that defaults to the fire_water_combo preset.

    Args:
        audio_json_path: Absolute path to the audio analysis JSON file.
        preset_name: Mapping preset name (default "fire_water_combo").

    Returns:
        Dict summary from apply_audio_keyframes().
    """
    print(f"[combo_fire_water] Applying combined audio keyframes "
          f"with preset '{preset_name}'")
    return apply_audio_keyframes(audio_json_path, preset_name=preset_name)


def bake_fire_water(clean_first=True):
    """Start async Mantaflow fire bake. Ocean is procedural (no bake needed).

    Only the Mantaflow fire domain needs baking. The Ocean Modifier generates
    its surface procedurally, so no bake step is required for the water.

    Args:
        clean_first: If True, free existing bake data before starting.
                     Recommended to avoid stale cache issues.

    Poll for completion with:
        from poll_status import poll_status; poll_status()
    """
    from async_bake import start_bake
    start_bake(
        domain_name="efs_fire_domain",
        bake_type="ALL",
        clean_first=clean_first,
    )
    print("[combo_fire_water] Fire bake started. "
          "Ocean is procedural (no bake needed).")


def render_fire_water(output_name="fire_water_combo", frame=None):
    """Start async Cycles render of the fire-over-water combo scene.

    Uses the scene's Cycles settings (configured by _setup_combo_scene
    from the quality preset used in create_fire_water_scene).

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
        print(f"[combo_fire_water] Single frame render started: "
              f"frame={frame}, output={output_name}")
    else:
        # Full animation render
        from async_render import start_render
        start_render(
            output_name=output_name,
        )
        print(f"[combo_fire_water] Full animation render started: "
              f"output={output_name}")
