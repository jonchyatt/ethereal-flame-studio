"""
EFS Fire Orb Proof-of-Concept -- Mantaflow fire scene created entirely via script.

Validates the complete Phase 26 tool chain:
  1. Scene creation via bpy (objects, materials, camera, lighting)
  2. Mantaflow gas domain + fire flow configuration
  3. Async simulation bake via timer pattern (async_bake.py)
  4. Async Cycles render via INVOKE_DEFAULT (async_render.py)

Usage (three separate execute_blender_code calls):

  Call 1 -- Create scene:
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from fire_orb_poc import create_fire_orb_scene
    create_fire_orb_scene()

  Call 2 -- Start bake (returns immediately):
    from fire_orb_poc import bake_fire_orb
    bake_fire_orb()

  Call 3 -- Poll bake status:
    from poll_status import poll_status
    poll_status()

  Call 4 -- Render frame 15 (returns immediately):
    from fire_orb_poc import render_fire_orb
    render_fire_orb(frame=15)

  Call 5 -- Poll render status:
    from poll_status import is_render_active
    is_render_active()

Pitfall compliance:
  - Pitfall 2: Async bake/render via timer + INVOKE_DEFAULT (never blocks MCP)
  - Pitfall 3: save_before_operate() called before scene creation
  - Pitfall 4: Cache directory set to blender/cache/fire_orb_poc/
  - Pitfall 6: Flow object (fuel_amount) is the keyframeable parameter, NOT Domain
  - Pitfall 7: Resolution 64 for prototype (do NOT increase for POC)
  - Pitfall 14: Single-frame render for manual inspection of Cycles+Mantaflow fire
"""
import bpy
import json
import math
import sys
import os

# Ensure our scripts directory is on sys.path for imports
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scene_utils import (
    save_before_operate,
    get_or_create_object,
    set_cache_directory,
    full_scene_info,
    RENDERS_DIR,
)


def _clear_default_scene():
    """Remove all default objects (Cube, Light, Camera) for a clean start."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def _setup_scene():
    """Configure scene-level settings: frame range, render engine, resolution."""
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 30
    scene.frame_current = 1

    # Render engine: Cycles
    scene.render.engine = 'CYCLES'
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100

    # Cycles settings: 128 samples with OpenImageDenoise (Pitfall 9: sufficient for preview)
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'

    # Film: opaque black background (not transparent) for fire contrast
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


def _create_fire_domain():
    """Create the Mantaflow gas domain cube for the fire simulation.

    Returns the domain object.
    """
    def _make_domain():
        bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 1.5))

    domain = get_or_create_object("efs_fire_domain", _make_domain)
    domain.scale = (2, 2, 3)
    bpy.context.view_layer.objects.active = domain

    # Add Fluid modifier if not present
    fluid_mod = domain.modifiers.get("Fluid")
    if fluid_mod is None:
        fluid_mod = domain.modifiers.new(name="Fluid", type='FLUID')

    # Configure as gas domain
    fluid_mod.fluid_type = 'DOMAIN'
    ds = fluid_mod.domain_settings
    ds.domain_type = 'GAS'

    # Resolution: 64 for prototype (Pitfall 7: memory wall)
    ds.resolution_max = 64

    # Cache: modular (data and noise baked separately)
    ds.cache_type = 'MODULAR'

    # Cache directory (Pitfall 4: dedicated cache to prevent explosion)
    set_cache_directory(domain, "fire_orb_poc")

    # Simulation parameters
    ds.vorticity = 0.5
    ds.use_dissolve_smoke = True
    ds.dissolve_speed = 25

    # Noise upres for detail
    ds.use_noise = True
    ds.noise_scale = 2

    # Display as wireframe so fire is not obscured by the domain box
    domain.display_type = 'WIRE'

    return domain


def _create_fire_flow():
    """Create the fire emitter (Flow object) as an icosphere.

    Returns the flow object.

    Pitfall 6: fuel_amount on the Flow object is the parameter to keyframe
    for audio-reactive fire. NEVER keyframe Domain parameters.
    """
    def _make_flow():
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.3, location=(0, 0, 0.5))

    flow = get_or_create_object("efs_fire_flow", _make_flow)
    bpy.context.view_layer.objects.active = flow

    # Add Fluid modifier if not present
    fluid_mod = flow.modifiers.get("Fluid")
    if fluid_mod is None:
        fluid_mod = flow.modifiers.new(name="Fluid", type='FLUID')

    # Configure as flow source
    fluid_mod.fluid_type = 'FLOW'
    fs = fluid_mod.flow_settings

    # Flow type: FIRE only (not SMOKE or BOTH for this POC)
    fs.flow_type = 'FIRE'

    # Flow behavior: continuous inflow
    fs.flow_behavior = 'INFLOW'

    # Fire parameters (Pitfall 6: these are the keyframeable params)
    fs.fuel_amount = 1.0
    fs.temperature = 2.0

    # Surface emission distance
    fs.surface_distance = 1.5

    # Hide flow object from render (only the domain's volume is rendered)
    flow.hide_render = True

    return flow


def _create_fire_material(domain):
    """Create and assign a Principled Volume material with Blackbody coloring.

    The material goes on the Domain object, NOT the Flow object.
    Blackbody produces temperature-based coloring automatically:
      ~1000K = deep red (edges)
      ~2000K = orange (body)
      ~4000-6500K = yellow-white (core)
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
    vol_node.inputs["Color"].default_value = (1.0, 0.4, 0.05, 1.0)  # Warm orange
    vol_node.inputs["Density"].default_value = 5.0
    vol_node.inputs["Blackbody Intensity"].default_value = 1.0

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

    return mat


def _create_camera():
    """Create a camera aimed at the fire orb center using Track To constraint.

    Returns the camera object.
    """
    # Create an Empty at the fire orb center as a tracking target
    def _make_target():
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 1.5))

    target = get_or_create_object("efs_fire_target", _make_target)

    # Create the camera
    def _make_camera():
        bpy.ops.object.camera_add(location=(5, -5, 3))

    camera = get_or_create_object("efs_fire_camera", _make_camera)
    camera.location = (5, -5, 3)

    # Set focal length
    camera.data.lens = 50  # 50mm

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

    return camera


def _create_lighting():
    """Create a key light and ensure black world background.

    Returns the light object.
    """
    def _make_light():
        bpy.ops.object.light_add(type='POINT', location=(3, -2, 5))

    light = get_or_create_object("efs_fire_key_light", _make_light)
    light.location = (3, -2, 5)
    light.data.energy = 100  # 100 watts

    return light


def create_fire_orb_scene():
    """Create the complete Mantaflow fire orb scene from an empty Blender file.

    This is the main entry point. Run via execute_blender_code:
        exec(open('.../fire_orb_poc.py').read()); create_fire_orb_scene()

    Returns JSON summary of created objects.
    """
    # Pitfall 3: Save before destructive operations
    save_before_operate(tag="fire_orb_poc_scene_creation")

    # Step 1: Clean slate
    _clear_default_scene()

    # Step 2: Scene-level configuration (engine, resolution, frame range)
    _setup_scene()

    # Step 3: Mantaflow gas domain
    domain = _create_fire_domain()

    # Step 4: Fire flow emitter
    flow = _create_fire_flow()

    # Step 5: Principled Volume material with Blackbody
    material = _create_fire_material(domain)

    # Step 6: Camera with Track To constraint
    camera = _create_camera()

    # Step 7: Key light
    light = _create_lighting()

    # Return full scene info as JSON for verification
    result = {
        "status": "scene_created",
        "objects": {
            "domain": {
                "name": domain.name,
                "location": list(domain.location),
                "scale": list(domain.scale),
                "resolution": 64,
                "cache_type": "MODULAR",
            },
            "flow": {
                "name": flow.name,
                "location": list(flow.location),
                "flow_type": "FIRE",
                "fuel_amount": 1.0,
                "temperature": 2.0,
            },
            "material": {
                "name": material.name,
                "type": "Principled Volume",
                "blackbody_intensity": 1.0,
                "density": 5.0,
            },
            "camera": {
                "name": camera.name,
                "location": list(camera.location),
                "focal_length_mm": 50,
            },
            "light": {
                "name": light.name,
                "location": list(light.location),
                "energy_watts": 100,
            },
        },
        "scene": {
            "engine": "CYCLES",
            "samples": 128,
            "denoiser": "OPENIMAGEDENOISE",
            "resolution": "1920x1080",
            "frame_range": "1-30",
        },
    }
    print(json.dumps(result, indent=2))
    return result


def bake_fire_orb():
    """Start async Mantaflow bake. Run after create_fire_orb_scene().

    Uses the async timer pattern from async_bake.py so the MCP call
    returns immediately (Pitfall 2: 180s timeout protection).

    Poll for completion with:
        from poll_status import poll_status; poll_status()
    """
    from async_bake import start_bake
    start_bake(domain_name="efs_fire_domain", bake_type="ALL", clean_first=True)


def render_fire_orb(frame=15):
    """Start async Cycles render of a single frame. Run after bake completes.

    Uses INVOKE_DEFAULT for non-blocking render (Pitfall 2).
    Frame 15 is mid-simulation where fire should be well-established.

    Args:
        frame: Frame number to render (default 15, mid-simulation).

    Poll for completion with:
        from poll_status import is_render_active; is_render_active()
    """
    from async_render import start_single_frame_render
    start_single_frame_render(
        output_name="fire_orb_poc",
        frame=frame,
        samples=128,
        engine="CYCLES",
    )
