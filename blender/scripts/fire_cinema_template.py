"""
EFS Fire Cinema Template -- production-quality Mantaflow fire scene builder.

Supersedes fire_orb_poc.py with multi-scale fire detail, Principled Volume
material with Blackbody temperature coloring, three-point lighting, camera
depth of field, and configurable quality presets (Draft/Preview/Production/Ultra).

The create_fire_scene() function produces a complete Mantaflow fire scene
ready for audio keyframes (via keyframe_generator.py) and compositor effects.

Multi-scale detail improvements over fire_orb_poc.py:
  - Higher vorticity (1.0 vs 0.5) for turbulent large-scale motion
  - Slower dissolve (15 vs 25) for longer flame trails
  - Noise upres from quality preset for fine detail
  - flame_max_temp, flame_smoke, flame_vorticity for flame-specific detail
  - burning_rate for fuel consumption tuning
  - Denser Principled Volume (8.0 vs 5.0) with stronger Blackbody (1.5 vs 1.0)
  - Taller domain (2.5x2.5x4 vs 2x2x3) for fuller flame column
  - Three-point lighting (key + rim + ground bounce) vs single key light
  - Camera DOF at f/2.8 for cinematic shallow depth of field

Four-function API:
  create_fire_scene() -> apply_audio() -> bake_fire() -> render_fire()

Usage (via MCP execute_blender_code calls):

  Call 1 -- Create scene (includes compositor setup):
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from fire_cinema_template import create_fire_scene
    create_fire_scene(quality="preview")

  Call 2 -- Apply audio keyframes (optional, requires audio JSON):
    from fire_cinema_template import apply_audio
    apply_audio('C:/.../audio-analysis.json')

  Call 3 -- Start bake (returns immediately):
    from fire_cinema_template import bake_fire
    bake_fire()

  Call 4 -- Poll bake status:
    from poll_status import poll_status
    poll_status()

  Call 5 -- Render single frame (returns immediately):
    from fire_cinema_template import render_fire
    render_fire(output_name="fire_cinema", frame=45)

  Call 6 -- Render full animation:
    from fire_cinema_template import render_fire
    render_fire(output_name="fire_cinema")

  Call 7 -- Poll render status:
    from poll_status import is_render_active
    is_render_active()

Pitfall compliance:
  - Pitfall 2: Async bake/render via timer + INVOKE_DEFAULT (never blocks MCP)
  - Pitfall 3: save_before_operate() called before scene creation
  - Pitfall 4: Cache directory set to blender/cache/fire_cinema/
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
    full_scene_info,
    RENDERS_DIR,
)

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
PRESETS_DIR = REPO_ROOT / "blender" / "presets"

# -- Quality presets (loaded from JSON) --
QUALITY_PRESETS = None  # Lazy-loaded cache


def load_quality_preset(name="preview"):
    """Load a quality preset by name from quality_presets.json.

    Available presets: draft, preview, production, ultra.

    Args:
        name: Preset key (lowercase). Default is "preview" for a reasonable
              balance of quality and speed.

    Returns:
        Dict with keys: name, description, resolution_max, noise_scale,
        cycles_samples, frame_count, resolution_x, resolution_y,
        use_denoiser, motion_blur_shutter.

    Raises:
        FileNotFoundError: If quality_presets.json does not exist.
        KeyError: If the named preset is not found (lists available presets).
    """
    global QUALITY_PRESETS

    preset_path = PRESETS_DIR / "quality_presets.json"
    if not preset_path.exists():
        raise FileNotFoundError(
            f"Quality presets not found at {preset_path}. "
            f"Expected file: blender/presets/quality_presets.json"
        )

    if QUALITY_PRESETS is None:
        with open(preset_path, "r", encoding="utf-8") as f:
            QUALITY_PRESETS = json.load(f)

    name_lower = name.lower()
    if name_lower not in QUALITY_PRESETS:
        available = list(QUALITY_PRESETS.keys())
        raise KeyError(
            f"Quality preset '{name}' not found. "
            f"Available presets: {available}"
        )

    preset = QUALITY_PRESETS[name_lower]
    print(f"[fire_cinema] Loaded quality preset: {preset['name']} "
          f"(res={preset['resolution_max']}, samples={preset['cycles_samples']}, "
          f"frames={preset['frame_count']})")
    return preset


def _clear_default_scene():
    """Remove all default objects (Cube, Light, Camera) for a clean start."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def _setup_scene(preset):
    """Configure scene-level settings from a quality preset.

    Sets frame range, render engine (Cycles), resolution, samples,
    denoiser, motion blur, and world background.

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

    # Motion blur for cinematic fire trails
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = preset["motion_blur_shutter"]

    # Film: opaque black background for fire contrast
    scene.render.film_transparent = False

    # World background: pure black
    world = bpy.data.worlds.get("World")
    if world is None:
        world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
        bg_node.inputs["Strength"].default_value = 1.0

    print(f"[fire_cinema] Scene configured: {preset['resolution_x']}x{preset['resolution_y']}, "
          f"{preset['cycles_samples']} samples, frames 1-{preset['frame_count']}, "
          f"motion blur={preset['motion_blur_shutter']}")


def _create_fire_domain(preset):
    """Create the Mantaflow gas domain with multi-scale fire parameters.

    Key differences from fire_orb_poc.py:
      - resolution_max from quality preset (not hardcoded 64)
      - Higher vorticity (1.0 vs 0.5) for turbulent large-scale motion
      - Slower dissolve (15 vs 25) for longer flame trails
      - Noise upres from quality preset for fine detail
      - Flame-specific parameters: max_temp, smoke, vorticity, burning_rate
      - Taller domain (2.5x2.5x4) for fuller flame column

    Args:
        preset: Quality preset dict.

    Returns:
        The domain bpy.types.Object.
    """
    def _make_domain():
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 2.0))

    domain = get_or_create_object("efs_fire_domain", _make_domain)
    domain.scale = (2.5, 2.5, 4)
    domain.location = (0, 0, 2.0)
    bpy.context.view_layer.objects.active = domain

    # Add Fluid modifier if not present
    fluid_mod = domain.modifiers.get("Fluid")
    if fluid_mod is None:
        fluid_mod = domain.modifiers.new(name="Fluid", type='FLUID')

    # Configure as gas domain
    fluid_mod.fluid_type = 'DOMAIN'
    ds = fluid_mod.domain_settings
    ds.domain_type = 'GAS'

    # Resolution from quality preset (64 draft -> 512 ultra)
    ds.resolution_max = preset["resolution_max"]

    # Cache: modular (data and noise baked separately)
    ds.cache_type = 'MODULAR'

    # Cache directory: separate from POC to avoid conflicts
    set_cache_directory(domain, "fire_cinema")

    # -- Multi-scale fire parameters (core improvement over POC) --

    # Large-scale turbulence: higher vorticity = more swirling motion
    ds.vorticity = 1.0  # Was 0.5 in POC

    # Dissolve: slower = longer flame trails that look more organic
    ds.use_dissolve_smoke = True
    ds.dissolve_speed = 15  # Was 25 in POC

    # Noise upres: adds fine detail on top of base simulation
    ds.use_noise = True
    ds.noise_scale = preset["noise_scale"]  # 2 for draft/preview, 4 for production/ultra
    ds.noise_strength = 1.0  # Detail amplification

    # Flame-specific parameters for richer fire behavior
    ds.flame_max_temp = 3.0    # Peak flame brightness temperature
    ds.flame_smoke = 0.5       # Smoke mixed in for realism (fire + wispy smoke)
    ds.flame_vorticity = 1.5   # Additional vortex detail in flames specifically
    ds.burning_rate = 0.8      # Fuel consumption speed

    # Display as wireframe so fire is not obscured by the domain box
    domain.display_type = 'WIRE'

    print(f"[fire_cinema] Domain created: res={ds.resolution_max}, "
          f"vorticity={ds.vorticity}, dissolve={ds.dissolve_speed}, "
          f"noise_scale={ds.noise_scale}, flame_vorticity={ds.flame_vorticity}")

    return domain


def _create_fire_flow():
    """Create the fire emitter (Flow object) as an icosphere.

    Enhanced over POC with larger emitter, more fuel, and higher temperature.

    Pitfall 6: fuel_amount on the Flow object is the parameter to keyframe
    for audio-reactive fire. NEVER keyframe Domain parameters.

    Returns:
        The flow bpy.types.Object.
    """
    def _make_flow():
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=3, radius=0.4, location=(0, 0, 0.3)
        )

    flow = get_or_create_object("efs_fire_flow", _make_flow)
    flow.location = (0, 0, 0.3)
    bpy.context.view_layer.objects.active = flow

    # Add Fluid modifier if not present
    fluid_mod = flow.modifiers.get("Fluid")
    if fluid_mod is None:
        fluid_mod = flow.modifiers.new(name="Fluid", type='FLUID')

    # Configure as flow source
    fluid_mod.fluid_type = 'FLOW'
    fs = fluid_mod.flow_settings

    # Flow type: FIRE only (smoke comes from flame_smoke on domain)
    fs.flow_type = 'FIRE'

    # Flow behavior: continuous inflow
    fs.flow_behavior = 'INFLOW'

    # Enhanced fire parameters (Pitfall 6: these are the keyframeable params)
    fs.fuel_amount = 1.5     # Was 1.0 in POC -- more baseline fuel
    fs.temperature = 2.5     # Was 2.0 in POC -- hotter base temperature

    # Surface emission distance
    fs.surface_distance = 1.5

    # Hide flow object from render (only the domain's volume is rendered)
    flow.hide_render = True

    print(f"[fire_cinema] Flow emitter created: fuel={fs.fuel_amount}, "
          f"temp={fs.temperature}, radius=0.4")

    return flow


def _create_fire_material(domain):
    """Create and assign a Principled Volume material with Blackbody coloring.

    Enhanced over POC with:
      - Denser volume (8.0 vs 5.0) for more visible detail
      - Stronger Blackbody (1.5 vs 1.0) for more pronounced temperature coloring
      - Warm Blackbody tint for consistent color character
      - Deeper warm orange base color

    The material goes on the Domain object, NOT the Flow object.
    Blackbody produces temperature-based coloring automatically:
      ~1000K = deep red (edges)
      ~2000K = orange (body)
      ~4000-6500K = yellow-white (core)

    Args:
        domain: The fire domain bpy.types.Object.

    Returns:
        The created bpy.types.Material.
    """
    mat_name = "efs_fire_material"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear existing nodes
    nodes.clear()

    # Create Principled Volume node
    vol_node = nodes.new(type='ShaderNodeVolumePrincipled')
    vol_node.location = (0, 0)

    # Deeper warm orange base color
    vol_node.inputs["Color"].default_value = (1.0, 0.35, 0.03, 1.0)

    # Denser volume for more visible detail in the fire
    vol_node.inputs["Density"].default_value = 8.0  # Was 5.0 in POC

    # Stronger Blackbody for more pronounced temperature-based coloring
    vol_node.inputs["Blackbody Intensity"].default_value = 1.5  # Was 1.0 in POC

    # Warm tint to ensure consistent color character across temperatures
    vol_node.inputs["Blackbody Tint"].default_value = (1.0, 0.85, 0.7, 1.0)

    # Create Material Output node
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (300, 0)

    # Connect Volume output to Material Output Volume input
    links.new(vol_node.outputs["Volume"], output_node.inputs["Volume"])

    # Assign material to domain
    if domain.data.materials:
        domain.data.materials[0] = mat
    else:
        domain.data.materials.append(mat)

    print(f"[fire_cinema] Material created: density=8.0, "
          f"blackbody_intensity=1.5, blackbody_tint=(1.0, 0.85, 0.7)")

    return mat


def _create_camera():
    """Create a camera with Track To constraint and cinematic depth of field.

    Improvements over POC:
      - Further back (6, -6, 3.5) to frame taller flame column
      - Track target higher (0, 0, 2.0) matching domain center
      - 65mm focal length for tighter framing (was 50mm)
      - Depth of field enabled: f/2.8 for cinematic shallow DOF

    Returns:
        The camera bpy.types.Object.
    """
    # Create an Empty at the flame center as a tracking target
    def _make_target():
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 2.0))

    target = get_or_create_object("efs_fire_target", _make_target)
    target.location = (0, 0, 2.0)

    # Create the camera
    def _make_camera():
        bpy.ops.object.camera_add(location=(6, -6, 3.5))

    camera = get_or_create_object("efs_fire_camera", _make_camera)
    camera.location = (6, -6, 3.5)

    # Set focal length: 65mm for tighter framing (was 50mm in POC)
    camera.data.lens = 65

    # Depth of field: cinematic shallow DOF
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 8.5
    camera.data.dof.aperture_fstop = 2.8

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

    print(f"[fire_cinema] Camera created: pos=(6, -6, 3.5), "
          f"lens=65mm, DOF f/2.8, focus=8.5m")

    return camera


def _create_lighting():
    """Create enhanced three-point lighting for the fire scene.

    Improvements over POC (which had a single key light):
      - Key light: warm point light for primary illumination
      - Rim light: cool blue fill for depth separation
      - Ground light: subtle area light for ground bounce

    Returns:
        Tuple of (key_light, rim_light, ground_light) objects.
    """
    # -- Key light: warm primary illumination --
    def _make_key():
        bpy.ops.object.light_add(type='POINT', location=(4, -3, 6))

    key_light = get_or_create_object("efs_fire_key_light", _make_key)
    key_light.location = (4, -3, 6)
    key_light.data.energy = 150  # 150 watts (was 100 in POC)
    key_light.data.color = (1.0, 0.95, 0.85)  # Warm tint

    # -- Rim light: cool blue for depth separation --
    def _make_rim():
        bpy.ops.object.light_add(type='POINT', location=(-3, 4, 5))

    rim_light = get_or_create_object("efs_fire_rim_light", _make_rim)
    rim_light.location = (-3, 4, 5)
    rim_light.data.energy = 50  # 50 watts -- subtle fill
    rim_light.data.color = (0.7, 0.8, 1.0)  # Cool blue

    # -- Ground bounce: subtle upward area light --
    def _make_ground():
        bpy.ops.object.light_add(type='AREA', location=(0, 0, -0.5))

    ground_light = get_or_create_object("efs_fire_ground_light", _make_ground)
    ground_light.location = (0, 0, -0.5)
    ground_light.data.energy = 30  # 30 watts -- subtle bounce
    ground_light.data.size = 3.0   # Spread the light over a wide area

    # Point ground light upward (rotate -180 degrees on X so it faces up)
    ground_light.rotation_euler = (math.pi, 0, 0)

    print(f"[fire_cinema] Three-point lighting created: "
          f"key=150W warm, rim=50W cool, ground=30W bounce")

    return key_light, rim_light, ground_light


def setup_compositor():
    """Create compositor node tree for cinema fire: bloom + warm color grading.

    Builds a node chain:
      Render Layers -> Glare (FOG_GLOW bloom) -> Color Balance (ASC CDL warm grade) -> Composite
                                                                                    -> Viewer

    The Glare node adds a soft bloom glow to bright fire areas (threshold 0.8
    ensures only the hottest parts bloom). The Color Balance uses ASC CDL
    (Offset/Power/Slope) for a warm cinematic grade -- slightly warm shadows,
    neutral midtones, warm highlights with cooled blues.

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

    # Glare: FOG_GLOW bloom on bright fire areas
    glare = tree.nodes.new(type='CompositorNodeGlare')
    glare.location = (200, 100)
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.mix = 0.0          # Additive blend (glow added on top of original)
    glare.threshold = 0.8    # Only bright fire areas bloom
    glare.size = 7           # Moderate glow radius

    # Color Balance: ASC CDL warm color grading
    color_balance = tree.nodes.new(type='CompositorNodeColorBalance')
    color_balance.location = (500, 0)
    color_balance.correction_method = 'OFFSET_POWER_SLOPE'
    # Offset: slight warm tint in shadows
    color_balance.offset = (1.0, 0.95, 0.88)
    # Power: neutral midtones (gamma)
    color_balance.power = (1.0, 1.0, 1.0)
    # Slope: warm highlights, cooler blues
    color_balance.slope = (1.05, 1.0, 0.95)

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

    print("[fire_cinema] Compositor created: "
          "Render Layers -> Glare (FOG_GLOW, threshold=0.8) -> "
          "Color Balance (ASC CDL warm grade) -> Composite + Viewer")

    return {
        "bloom": {
            "type": "FOG_GLOW",
            "quality": "HIGH",
            "mix": 0.0,
            "threshold": 0.8,
            "size": 7,
        },
        "color_grading": {
            "method": "OFFSET_POWER_SLOPE",
            "offset": [1.0, 0.95, 0.88],
            "power": [1.0, 1.0, 1.0],
            "slope": [1.05, 1.0, 0.95],
        },
    }


def apply_audio(audio_json_path, preset_name="fire_cinema"):
    """Apply audio-driven keyframes to the fire scene using a mapping preset.

    Convenience wrapper around keyframe_generator.apply_audio_keyframes()
    that defaults to the fire_cinema preset. Provides a clean four-function API:
        create_fire_scene -> apply_audio -> bake_fire -> render_fire

    Args:
        audio_json_path: Absolute path to the audio analysis JSON file.
        preset_name: Mapping preset name (default "fire_cinema").

    Returns:
        Dict summary from apply_audio_keyframes().
    """
    from keyframe_generator import apply_audio_keyframes
    return apply_audio_keyframes(audio_json_path, preset_name=preset_name)


def create_fire_scene(quality="preview"):
    """Create the complete production Mantaflow fire scene.

    This is the main entry point. Produces a scene with:
      - Multi-scale Mantaflow fire domain (quality-driven resolution)
      - Enhanced fire flow emitter
      - Principled Volume material with Blackbody temperature coloring
      - Camera with depth of field
      - Three-point lighting (key, rim, ground bounce)
      - Compositor with bloom (Glare) and warm color grading (Color Balance)

    Args:
        quality: Quality preset name -- "draft", "preview", "production", or "ultra".
                 Default is "preview" for a reasonable quality/speed balance.

    Returns:
        Dict summary of created scene (also printed as JSON).
    """
    # Load quality preset
    preset = load_quality_preset(quality)

    # Pitfall 3: Save before destructive operations
    save_before_operate(tag="fire_cinema_scene_creation")

    # Step 1: Clean slate
    _clear_default_scene()

    # Step 2: Scene-level configuration from quality preset
    _setup_scene(preset)

    # Step 3: Multi-scale Mantaflow gas domain
    domain = _create_fire_domain(preset)

    # Step 4: Enhanced fire flow emitter
    flow = _create_fire_flow()

    # Step 5: Principled Volume material with Blackbody
    material = _create_fire_material(domain)

    # Step 6: Camera with DOF
    camera = _create_camera()

    # Step 7: Three-point lighting
    key_light, rim_light, ground_light = _create_lighting()

    # Step 8: Compositor (bloom + color grading)
    compositor_info = setup_compositor()

    # Build JSON summary (same pattern as fire_orb_poc.py)
    result = {
        "status": "scene_created",
        "quality_preset": preset["name"],
        "objects": {
            "domain": {
                "name": domain.name,
                "location": list(domain.location),
                "scale": list(domain.scale),
                "resolution_max": preset["resolution_max"],
                "cache_type": "MODULAR",
                "vorticity": 1.0,
                "dissolve_speed": 15,
                "noise_scale": preset["noise_scale"],
                "flame_max_temp": 3.0,
                "flame_smoke": 0.5,
                "flame_vorticity": 1.5,
                "burning_rate": 0.8,
            },
            "flow": {
                "name": flow.name,
                "location": list(flow.location),
                "flow_type": "FIRE",
                "fuel_amount": 1.5,
                "temperature": 2.5,
            },
            "material": {
                "name": material.name,
                "type": "Principled Volume",
                "density": 8.0,
                "blackbody_intensity": 1.5,
                "blackbody_tint": [1.0, 0.85, 0.7],
            },
            "camera": {
                "name": camera.name,
                "location": list(camera.location),
                "focal_length_mm": 65,
                "dof_enabled": True,
                "dof_fstop": 2.8,
                "dof_focus_distance": 8.5,
            },
            "key_light": {
                "name": key_light.name,
                "location": list(key_light.location),
                "energy_watts": 150,
                "color": [1.0, 0.95, 0.85],
            },
            "rim_light": {
                "name": rim_light.name,
                "location": list(rim_light.location),
                "energy_watts": 50,
                "color": [0.7, 0.8, 1.0],
            },
            "ground_light": {
                "name": ground_light.name,
                "location": list(ground_light.location),
                "energy_watts": 30,
                "size": 3.0,
            },
        },
        "scene": {
            "engine": "CYCLES",
            "samples": preset["cycles_samples"],
            "denoiser": "OPENIMAGEDENOISE" if preset["use_denoiser"] else "NONE",
            "resolution": f"{preset['resolution_x']}x{preset['resolution_y']}",
            "frame_range": f"1-{preset['frame_count']}",
            "motion_blur": preset["motion_blur_shutter"],
        },
        "compositor": {
            "bloom": compositor_info["bloom"],
            "color_grading": compositor_info["color_grading"],
            "motion_blur": {
                "enabled": True,
                "shutter": preset["motion_blur_shutter"],
            },
        },
    }

    print(json.dumps(result, indent=2))
    return result


def bake_fire(clean_first=True):
    """Start async Mantaflow bake. Run after create_fire_scene().

    Uses the async timer pattern from async_bake.py so the MCP call
    returns immediately (Pitfall 2: 180s timeout protection).

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


def render_fire(output_name="fire_cinema", frame=None):
    """Start async Cycles render. Run after bake completes.

    Uses the scene's Cycles settings (configured by _setup_scene from the
    quality preset used in create_fire_scene).

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
