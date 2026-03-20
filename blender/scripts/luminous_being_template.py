"""
EFS Luminous Being Template -- crown jewel scene builder that transforms a
person's silhouette into a glowing being of light with four visual effect layers.

Takes mask sequences (produced by sam_segmenter.py -> mask_to_mesh.py) and wraps
the body mesh proxy in volumetric fill, surface particles, Mantaflow fire wisps,
and a Fresnel corona edge glow. Each effect layer lives in its own Collection for
compositor isolation via compositor_layers.py.

Four visual effect layers:
  1. Volumetric Fill: Principled Volume glow inside the body silhouette
     - Audio target: Density (bass), Emission Strength (rms_energy)
  2. Particles: Surface-emitted particles in 3 modes (flame/mist/solar_breath)
     - Audio target: emission strength (mid frequency)
  3. Fire Wisps: Small-scale Mantaflow fire using body mesh as flow source
     - Audio target: fuel_amount (onsets / bass hits)
  4. Corona: Fresnel-based edge glow on a slightly scaled-up body duplicate
     - Audio target: Emission Strength (treble)

Scene principles:
  - Total darkness: world Strength=0.0 -- the being IS the light source
  - film_transparent=True for compositor alpha-over between layers
  - Minimal rim light only for depth separation when effects are dim
  - Each layer in its own Collection for per-layer compositor control

Object naming convention (efs_lumi_* namespace):
  efs_lumi_body          -- body mesh proxy (from mask_to_mesh.py, hidden from render)
  efs_lumi_fill          -- volumetric fill domain cube
  efs_lumi_particles     -- particle render instance (icosphere)
  efs_lumi_fire_domain   -- Mantaflow fire wisp domain
  efs_lumi_fire_flow     -- alias for body mesh with Flow modifier
  efs_lumi_corona        -- corona edge glow mesh
  efs_lumi_camera        -- scene camera
  efs_lumi_target        -- camera tracking target
  efs_lumi_rim_light     -- subtle rim light for depth separation

Collections for compositor isolation:
  LumiBody       -- body mesh (hidden from render, serves as source)
  LumiVolFill    -- volumetric fill objects
  LumiParticles  -- particle system objects
  LumiFireWisps  -- Mantaflow fire domain + flow
  LumiCorona     -- corona edge glow objects

Four-function API:
  create_luminous_scene() -> apply_luminous_audio() -> bake_luminous() -> render_luminous()

Usage (via MCP execute_blender_code calls):

  Call 1 -- Create scene (includes compositor setup):
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from luminous_being_template import create_luminous_scene
    create_luminous_scene(mask_dir='C:/.../blender/masks/my_video/', quality='preview')

  Call 2 -- Apply audio keyframes (optional, requires audio JSON):
    from luminous_being_template import apply_luminous_audio
    apply_luminous_audio('C:/.../audio-analysis.json')

  Call 3 -- Start bake (returns immediately, bakes fire wisps):
    from luminous_being_template import bake_luminous
    bake_luminous()

  Call 4 -- Poll bake status:
    from poll_status import poll_status
    poll_status()

  Call 5 -- Render single frame (returns immediately):
    from luminous_being_template import render_luminous
    render_luminous(output_name="luminous_being", frame=45)

  Call 6 -- Render full animation:
    from luminous_being_template import render_luminous
    render_luminous(output_name="luminous_being")

  Call 7 -- Poll render status:
    from poll_status import is_render_active
    is_render_active()

Pitfall compliance:
  - Pitfall 2: Async bake/render via timer + INVOKE_DEFAULT (never blocks MCP)
  - Pitfall 3: save_before_operate() called before scene creation
  - Pitfall 4: Cache directory set to blender/cache/luminous_fire_wisps/
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
    MASKS_DIR,
)

from fire_cinema_template import load_quality_preset
from compositor_layers import create_layer_collection, setup_multi_layer
from mask_to_mesh import create_body_proxy

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
PRESETS_DIR = REPO_ROOT / "blender" / "presets"


# ---------------------------------------------------------------------------
# Internal helper functions (all prefixed with underscore)
# ---------------------------------------------------------------------------

def _setup_scene(preset):
    """Configure scene-level settings for the Luminous Being scene.

    Total darkness principle: world Strength=0.0 so the being IS the light
    source. film_transparent=True for compositor alpha-over between layers.

    Args:
        preset: Quality preset dict from load_quality_preset().
    """
    scene = bpy.context.scene

    # Frame range from preset (overridden by audio when applied)
    scene.frame_start = 1
    scene.frame_end = preset["frame_count"]
    scene.frame_current = 1

    # Render engine: Cycles (required for volumetric + Mantaflow)
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

    # Motion blur for dynamic particle/fire trails
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = preset["motion_blur_shutter"]

    # Film: TRANSPARENT for compositor alpha-over between layers
    scene.render.film_transparent = True

    # World background: total darkness -- the being IS the light source
    world = bpy.data.worlds.get("World")
    if world is None:
        world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True

    nodes = world.node_tree.nodes
    links = world.node_tree.links

    # Clear existing world nodes
    nodes.clear()

    # Background node: pure black, Strength 0.0 (total darkness)
    bg_node = nodes.new(type='ShaderNodeBackground')
    bg_node.location = (0, 300)
    bg_node.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    bg_node.inputs["Strength"].default_value = 0.0

    # World Output node
    world_output = nodes.new(type='ShaderNodeOutputWorld')
    world_output.location = (300, 150)

    # Connect Background -> Surface
    links.new(bg_node.outputs["Background"], world_output.inputs["Surface"])

    print(f"[luminous_being] Scene configured: {preset['resolution_x']}x{preset['resolution_y']}, "
          f"{preset['cycles_samples']} samples, frames 1-{preset['frame_count']}, "
          f"film_transparent=True, world=TOTAL DARKNESS (Strength 0.0)")


def _create_body(mask_dir, quality):
    """Create the body mesh proxy from mask sequence.

    Calls create_body_proxy() from mask_to_mesh.py which handles contour
    extraction, mesh creation, shape keys, and modifier setup.

    The body mesh is the source for all four effect layers but is itself
    hidden from render.

    Args:
        mask_dir: Path to mask PNG directory.
        quality: Quality preset name for body proxy resolution.

    Returns:
        The efs_lumi_body bpy.types.Object.
    """
    result = create_body_proxy(mask_dir, quality=quality)
    body = bpy.data.objects.get("efs_lumi_body")
    if body is None:
        raise RuntimeError(
            f"create_body_proxy() did not produce efs_lumi_body. "
            f"Result: {result}"
        )

    print(f"[luminous_being] Body proxy created: {result['vertex_count']} vertices, "
          f"{result['shape_keys']} shape keys")
    return body


def _create_volumetric_fill(body_obj):
    """Create the volumetric fill glow inside the body silhouette.

    A volume cube slightly larger than the body bounding box (1.1x scale)
    with Principled Volume material for self-illuminating glow.

    Audio-keyframeable targets:
      - Density (bass): breathes with low frequencies (range 1.0 to 8.0)
      - Emission Strength (rms_energy): overall glow intensity

    Args:
        body_obj: The efs_lumi_body mesh object.

    Returns:
        The efs_lumi_fill bpy.types.Object.
    """
    # Calculate bounding box dimensions from body mesh
    bbox = body_obj.bound_box
    xs = [v[0] for v in bbox]
    ys = [v[1] for v in bbox]
    zs = [v[2] for v in bbox]

    body_width = max(xs) - min(xs)
    body_depth = max(ys) - min(ys)
    body_height = max(zs) - min(zs)

    # Fill cube: slightly larger than body (1.1x on each axis)
    scale_factor = 1.1
    fill_scale_x = max(body_width * scale_factor / 2.0, 0.5)
    fill_scale_y = max(body_depth * scale_factor / 2.0, 0.3)
    fill_scale_z = max(body_height * scale_factor / 2.0, 1.0)

    # Center at body's location
    fill_location = (
        body_obj.location.x,
        body_obj.location.y,
        body_obj.location.z,
    )

    def _make_fill():
        bpy.ops.mesh.primitive_cube_add(size=2, location=fill_location)

    fill = get_or_create_object("efs_lumi_fill", _make_fill)
    fill.location = fill_location
    fill.scale = (fill_scale_x, fill_scale_y, fill_scale_z)
    fill.display_type = 'WIRE'

    # -- Principled Volume material --
    mat_name = "efs_lumi_fill_material"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear existing nodes
    nodes.clear()

    # Principled Volume shader
    vol_node = nodes.new(type='ShaderNodeVolumePrincipled')
    vol_node.location = (0, 0)

    # Warm white base color
    vol_node.inputs["Color"].default_value = (1.0, 0.95, 0.85, 1.0)

    # Moderate baseline density (audio modulates from 1.0 to 8.0)
    vol_node.inputs["Density"].default_value = 3.0

    # Self-illuminating glow
    vol_node.inputs["Emission Strength"].default_value = 5.0

    # Ethereal cyan-white emission color
    vol_node.inputs["Emission Color"].default_value = (0.85, 0.95, 1.0, 1.0)

    # Subtle temperature coloring via Blackbody
    vol_node.inputs["Blackbody Intensity"].default_value = 0.8

    # Material Output
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (300, 0)

    # Connect Volume -> Volume output
    links.new(vol_node.outputs["Volume"], output_node.inputs["Volume"])

    # Assign material to fill cube
    if fill.data.materials:
        fill.data.materials[0] = mat
    else:
        fill.data.materials.append(mat)

    print(f"[luminous_being] Volumetric fill created: scale=({fill_scale_x:.2f}, "
          f"{fill_scale_y:.2f}, {fill_scale_z:.2f}), Principled Volume "
          f"density=3.0, emission=5.0, blackbody=0.8")

    return fill


def _create_particle_system(body_obj, mode="flame"):
    """Create particle system on body mesh with mode-dependent behavior.

    Three modes matching the Three.js orb:
      a. "flame":        Hair particles drifting upward (warm glow)
      b. "mist":         Hair particles dispersing softly (cool float)
      c. "solar_breath": Hair particles pulsing radially (warm radiance)

    A small icosphere is created as the render instance object for particle
    display (Blender's OBJECT render type for hair particles).

    Audio-keyframeable: emission strength on the particle material (mid frequency).

    Args:
        body_obj: The efs_lumi_body mesh object (emitter surface).
        mode: Particle mode -- "flame", "mist", or "solar_breath".

    Returns:
        The particle system settings object (bpy.types.ParticleSettings).
    """
    # Mode configurations
    mode_configs = {
        "flame": {
            "count": 2000,
            "lifetime": 30,
            "normal_velocity": 0.3,
            "random_velocity": 0.1,
            "gravity_factor": -0.2,   # Negative = upward drift
            "size": 0.02,
            "size_random": 0.5,
            "physics_type": 'NEWTON',
            "damping": 0.0,
            "color": (1.0, 0.6, 0.1, 1.0),      # Orange-gold
            "color_name": "orange-gold",
        },
        "mist": {
            "count": 3000,
            "lifetime": 50,
            "normal_velocity": 0.1,
            "random_velocity": 0.5,
            "gravity_factor": 0.0,    # Floating, no gravity
            "size": 0.03,
            "size_random": 0.8,
            "physics_type": 'NEWTON',
            "damping": 0.0,
            "color": (0.8, 0.9, 1.0, 1.0),       # Cool white-blue
            "color_name": "cool white-blue",
        },
        "solar_breath": {
            "count": 1500,
            "lifetime": 20,
            "normal_velocity": 1.0,
            "random_velocity": 0.0,
            "gravity_factor": 0.0,    # No gravity
            "size": 0.025,
            "size_random": 0.5,
            "physics_type": 'NEWTON',
            "damping": 0.5,           # Deceleration for pulse effect
            "color": (1.0, 0.95, 0.9, 1.0),       # Warm white
            "color_name": "warm white",
        },
    }

    if mode not in mode_configs:
        raise ValueError(
            f"Unknown particle mode '{mode}'. "
            f"Available modes: {list(mode_configs.keys())}"
        )

    config = mode_configs[mode]

    # -- Create particle render instance (small icosphere) --
    def _make_particle_instance():
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2, radius=0.01, location=(100, 100, 100)
        )

    particle_instance = get_or_create_object("efs_lumi_particles", _make_particle_instance)
    particle_instance.location = (100, 100, 100)  # Far off-screen
    particle_instance.hide_viewport = True
    particle_instance.hide_render = True  # Rendered only as particle instance

    # -- Particle emission material --
    mat_name = f"efs_lumi_particle_mat_{mode}"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    mat_nodes = mat.node_tree.nodes
    mat_links = mat.node_tree.links

    # Clear existing nodes
    mat_nodes.clear()

    # Emission shader with mode-specific color
    emission = mat_nodes.new(type='ShaderNodeEmission')
    emission.location = (0, 0)
    emission.inputs["Color"].default_value = config["color"]
    emission.inputs["Strength"].default_value = 2.0

    # Material Output
    mat_output = mat_nodes.new(type='ShaderNodeOutputMaterial')
    mat_output.location = (300, 0)

    mat_links.new(emission.outputs["Emission"], mat_output.inputs["Surface"])

    # Assign material to particle instance
    if particle_instance.data.materials:
        particle_instance.data.materials[0] = mat
    else:
        particle_instance.data.materials.append(mat)

    # -- Find or create particle system on body --
    # Check if particle system already exists from mask_to_mesh (it creates an empty slot)
    ps = None
    ps_settings = None
    for p in body_obj.particle_systems:
        if p.settings.count == 0:
            # Reuse the empty slot from mask_to_mesh
            ps = p
            ps_settings = p.settings
            break

    if ps is None:
        # Create new particle system modifier
        mod = body_obj.modifiers.new(name="LumiParticles", type='PARTICLE_SYSTEM')
        ps = body_obj.particle_systems[-1]
        ps_settings = ps.settings

    # -- Configure particle settings based on mode --
    ps_settings.name = f"efs_lumi_particles_{mode}"
    ps_settings.type = 'HAIR'
    ps_settings.count = config["count"]
    ps_settings.hair_length = config["lifetime"] * config["normal_velocity"] * 0.1
    ps_settings.emit_from = 'FACE'

    # Hair particle velocity settings
    ps_settings.normal_factor = config["normal_velocity"]
    ps_settings.factor_random = config["random_velocity"]

    # Size
    ps_settings.particle_size = config["size"]
    ps_settings.size_random = config["size_random"]

    # Render as object (the icosphere instance)
    ps_settings.render_type = 'OBJECT'
    ps_settings.instance_object = particle_instance

    # Gravity (negative = upward for flame mode)
    # Blender hair doesn't have gravity directly, use force field weight
    ps_settings.effector_weights.gravity = config["gravity_factor"]

    print(f"[luminous_being] Particle system created: mode=\"{mode}\", "
          f"count={config['count']}, lifetime_length={ps_settings.hair_length:.2f}, "
          f"velocity_normal={config['normal_velocity']}, "
          f"color={config['color_name']}")

    return ps_settings


def _create_fire_wisps(body_obj, preset):
    """Create small-scale Mantaflow fire wisps using body mesh as flow source.

    The fire wisps are an ACCENT effect, not the hero fire. Parameters are
    tuned for shorter, subtler flame trails compared to fire_cinema_template:
      - Lower resolution (50% of preset)
      - Faster dissolve (8 vs 15)
      - Less fuel (0.8 vs 1.5)
      - Lower temperature (1.5 vs 2.5)

    Pitfall 6: fuel_amount on the Flow object is keyframeable.
    NOTE: body_obj gets a Fluid Flow modifier for wisps AND a particle system.
    Blender supports multiple modifiers on the same object.

    Args:
        body_obj: The efs_lumi_body mesh object (flow source).
        preset: Quality preset dict.

    Returns:
        Tuple of (domain_obj, flow_obj) where flow_obj is body_obj with
        the Flow modifier attached.
    """
    # -- Domain: bounding box around body + margin --
    bbox = body_obj.bound_box
    xs = [v[0] for v in bbox]
    ys = [v[1] for v in bbox]
    zs = [v[2] for v in bbox]

    margin = 0.5
    domain_width = (max(xs) - min(xs)) + margin * 2
    domain_depth = (max(ys) - min(ys)) + margin * 2
    domain_height = (max(zs) - min(zs)) + margin * 2

    # Ensure minimum domain size
    domain_width = max(domain_width, 2.0)
    domain_depth = max(domain_depth, 1.5)
    domain_height = max(domain_height, 3.0)

    domain_location = (
        body_obj.location.x,
        body_obj.location.y,
        body_obj.location.z,
    )

    def _make_domain():
        bpy.ops.mesh.primitive_cube_add(size=2, location=domain_location)

    domain = get_or_create_object("efs_lumi_fire_domain", _make_domain)
    domain.location = domain_location
    domain.scale = (domain_width / 2.0, domain_depth / 2.0, domain_height / 2.0)

    bpy.context.view_layer.objects.active = domain

    # Add Fluid modifier if not present
    fluid_mod = domain.modifiers.get("Fluid")
    if fluid_mod is None:
        fluid_mod = domain.modifiers.new(name="Fluid", type='FLUID')

    # Configure as gas domain
    fluid_mod.fluid_type = 'DOMAIN'
    ds = fluid_mod.domain_settings
    ds.domain_type = 'GAS'

    # Resolution: 50% of preset (wisps are accent, not hero)
    wisp_resolution = max(32, int(preset["resolution_max"] * 0.5))
    ds.resolution_max = wisp_resolution

    # Cache: modular
    ds.cache_type = 'MODULAR'

    # Cache directory
    set_cache_directory(domain, "luminous_fire_wisps")

    # -- Fire wisp parameters (subtler than standalone fire) --

    # Less turbulence than standalone fire
    ds.vorticity = 0.8

    # Faster dissolve = shorter wisp trails
    ds.use_dissolve_smoke = True
    ds.dissolve_speed = 8

    # Noise for fine detail
    ds.use_noise = True
    ds.noise_scale = preset["noise_scale"]
    ds.noise_strength = 1.0

    # Flame parameters: subtler than fire_cinema_template
    ds.flame_max_temp = 2.0        # Lower = subtler flame brightness
    ds.flame_smoke = 0.2           # Minimal smoke
    ds.flame_vorticity = 1.0       # Moderate flame-specific vortex
    ds.burning_rate = 1.2          # Faster burn = quicker wisp dissipation

    # Display as wireframe
    domain.display_type = 'WIRE'

    # -- Principled Volume material on domain --
    mat_name = "efs_lumi_wisp_material"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    vol_node = nodes.new(type='ShaderNodeVolumePrincipled')
    vol_node.location = (0, 0)

    # Fire wisp volume settings
    vol_node.inputs["Density"].default_value = 5.0
    vol_node.inputs["Blackbody Intensity"].default_value = 1.2
    vol_node.inputs["Blackbody Tint"].default_value = (1.0, 0.9, 0.7, 1.0)

    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (300, 0)

    links.new(vol_node.outputs["Volume"], output_node.inputs["Volume"])

    if domain.data.materials:
        domain.data.materials[0] = mat
    else:
        domain.data.materials.append(mat)

    # -- Flow source: body mesh itself --
    # Add Fluid modifier to body_obj as Flow type
    bpy.context.view_layer.objects.active = body_obj

    flow_mod = None
    for mod in body_obj.modifiers:
        if mod.type == 'FLUID' and hasattr(mod, 'fluid_type'):
            if mod.fluid_type == 'FLOW':
                flow_mod = mod
                break

    if flow_mod is None:
        flow_mod = body_obj.modifiers.new(name="FluidFlow", type='FLUID')

    flow_mod.fluid_type = 'FLOW'
    fs = flow_mod.flow_settings

    # Flow type: FIRE (wisps, not smoke)
    fs.flow_type = 'FIRE'
    fs.flow_behavior = 'INFLOW'

    # Wisp-level fuel (less than standalone fire)
    fs.fuel_amount = 0.8       # Less than fire_cinema 1.5
    fs.temperature = 1.5       # Lower = subtler
    fs.surface_distance = 0.5  # Close to body surface

    print(f"[luminous_being] Fire wisps created: domain_res={wisp_resolution}, "
          f"vorticity=0.8, dissolve=8, flame_max_temp=2.0, "
          f"flow fuel=0.8, temp=1.5, cache=luminous_fire_wisps")

    return (domain, body_obj)


def _create_corona(body_obj):
    """Create Fresnel-based corona edge glow around the body silhouette.

    A duplicate of the body mesh scaled up 1.05x with a Fresnel + Emission
    shader that makes only the edges glow. The corona is parented to the
    body with Copy Location and Copy Rotation constraints so it follows
    body movement.

    For shape key synchronization, a Shrinkwrap modifier binds the corona
    to the body mesh surface.

    Audio-keyframeable: Emission Strength (treble frequency).

    Args:
        body_obj: The efs_lumi_body mesh object.

    Returns:
        The efs_lumi_corona bpy.types.Object.
    """
    # Duplicate body mesh for corona
    existing_corona = bpy.data.objects.get("efs_lumi_corona")
    if existing_corona is not None:
        bpy.data.objects.remove(existing_corona, do_unlink=True)

    # Create a copy of the body mesh data
    corona_mesh = body_obj.data.copy()
    corona_mesh.name = "efs_lumi_corona_mesh"

    corona = bpy.data.objects.new("efs_lumi_corona", corona_mesh)
    bpy.context.collection.objects.link(corona)

    # Slightly scale up (1.05x) for edge separation
    corona.scale = (
        body_obj.scale.x * 1.05,
        body_obj.scale.y * 1.05,
        body_obj.scale.z * 1.05,
    )

    # Match body position
    corona.location = body_obj.location

    # Parent to body so it follows movement
    corona.parent = body_obj

    # Add Shrinkwrap modifier to bind corona to body surface
    shrinkwrap = corona.modifiers.new(name="ShrinkwrapToBody", type='SHRINKWRAP')
    shrinkwrap.target = body_obj
    shrinkwrap.wrap_method = 'NEAREST_SURFACEPOINT'
    shrinkwrap.offset = 0.05  # Slight offset outward

    # Make it renderable (unlike body which is hidden from render)
    corona.hide_render = False

    # -- Fresnel-based edge glow material --
    mat_name = "efs_lumi_corona_material"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear existing nodes
    nodes.clear()

    # Fresnel node: edge detection
    fresnel = nodes.new(type='ShaderNodeFresnel')
    fresnel.location = (-400, 200)
    fresnel.inputs["IOR"].default_value = 1.5

    # ColorRamp: sharp falloff (black at center, white at edges)
    color_ramp = nodes.new(type='ShaderNodeValToRGB')
    color_ramp.location = (-200, 200)
    # Configure stops for sharp edge detection
    color_ramp.color_ramp.elements[0].position = 0.3
    color_ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    color_ramp.color_ramp.elements[1].position = 0.7
    color_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)

    # Math node: multiply Fresnel falloff with Emission Strength
    multiply = nodes.new(type='ShaderNodeMath')
    multiply.location = (0, 100)
    multiply.operation = 'MULTIPLY'
    multiply.inputs[1].default_value = 3.0  # Base Emission Strength (keyframeable by treble)

    # Emission shader: bright cyan-white edge glow
    emission = nodes.new(type='ShaderNodeEmission')
    emission.location = (200, 100)
    emission.inputs["Color"].default_value = (0.9, 0.95, 1.0, 1.0)

    # Transparent BSDF for non-edge areas
    transparent = nodes.new(type='ShaderNodeBsdfTransparent')
    transparent.location = (200, -100)

    # Mix Shader: blend between transparent (center) and emission (edges)
    mix_shader = nodes.new(type='ShaderNodeMixShader')
    mix_shader.location = (400, 0)

    # Material Output
    mat_output = nodes.new(type='ShaderNodeOutputMaterial')
    mat_output.location = (600, 0)

    # Wire the node tree:
    # Fresnel -> ColorRamp -> Multiply (with Strength=3.0)
    links.new(fresnel.outputs["Fac"], color_ramp.inputs["Fac"])
    links.new(color_ramp.outputs["Color"], multiply.inputs[0])

    # Multiply result -> Emission Strength
    links.new(multiply.outputs["Value"], emission.inputs["Strength"])

    # ColorRamp -> Mix Shader Fac (edge mask controls transparency/emission blend)
    links.new(color_ramp.outputs["Color"], mix_shader.inputs["Fac"])

    # Transparent -> Mix Shader input 1 (non-edge = transparent)
    links.new(transparent.outputs["BSDF"], mix_shader.inputs[1])

    # Emission -> Mix Shader input 2 (edge = glow)
    links.new(emission.outputs["Emission"], mix_shader.inputs[2])

    # Mix Shader -> Material Output Surface
    links.new(mix_shader.outputs["Shader"], mat_output.inputs["Surface"])

    # Set blend mode for transparency
    mat.blend_method = 'BLEND'
    mat.shadow_method = 'NONE'

    # Assign material to corona
    if corona.data.materials:
        corona.data.materials[0] = mat
    else:
        corona.data.materials.append(mat)

    print(f"[luminous_being] Corona created: Fresnel IOR=1.5, "
          f"ColorRamp 0.3-0.7, Emission Strength=3.0, "
          f"Color=(0.9, 0.95, 1.0), blend=BLEND")

    return corona


def _setup_compositor(fill_obj, body_obj, fire_domain, corona_obj):
    """Organize objects into collections and build multi-layer compositor.

    Creates five collections for compositor isolation:
      - LumiBody: body mesh (hidden from render, source for effects)
      - LumiVolFill: volumetric fill domain
      - LumiParticles: body object (emits particles) + particle instance
      - LumiFireWisps: Mantaflow fire domain
      - LumiCorona: corona edge glow mesh

    Uses compositor_layers.setup_multi_layer() to build the alpha-over chain
    in background-to-foreground order.

    Args:
        fill_obj: The efs_lumi_fill volumetric fill object.
        body_obj: The efs_lumi_body mesh (particle emitter).
        fire_domain: The efs_lumi_fire_domain Mantaflow object.
        corona_obj: The efs_lumi_corona edge glow mesh.
    """
    # Get the particle instance object
    particle_instance = bpy.data.objects.get("efs_lumi_particles")

    # Create collections for compositor isolation
    create_layer_collection("LumiVolFill", [fill_obj.name])
    create_layer_collection("LumiParticles",
                            [body_obj.name] +
                            ([particle_instance.name] if particle_instance else []))
    create_layer_collection("LumiFireWisps", [fire_domain.name])
    create_layer_collection("LumiCorona", [corona_obj.name])

    # Build multi-layer compositor (background to foreground order)
    layer_configs = [
        {
            "name": "VolFill",
            "collection": "LumiVolFill",
            "opacity": 1.0,
            "bloom": True,
            "bloom_threshold": 0.6,
        },
        {
            "name": "Particles",
            "collection": "LumiParticles",
            "opacity": 0.9,
        },
        {
            "name": "FireWisps",
            "collection": "LumiFireWisps",
            "opacity": 1.0,
            "bloom": True,
            "bloom_threshold": 0.7,
        },
        {
            "name": "Corona",
            "collection": "LumiCorona",
            "opacity": 0.8,
            "bloom": True,
            "bloom_threshold": 0.5,
        },
    ]

    result = setup_multi_layer(layer_configs)

    print(f"[luminous_being] Compositor built: 4 layers "
          f"(VolFill -> Particles -> FireWisps -> Corona), "
          f"bloom on VolFill/FireWisps/Corona")

    return result


def _create_camera():
    """Create a front-facing camera for person-height framing.

    50mm portrait lens at person height with DOF for cinematic focus.
    Track To constraint aimed at body center.

    Returns:
        The camera bpy.types.Object.
    """
    # Camera tracking target at center of body
    def _make_target():
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0.9))

    target = get_or_create_object("efs_lumi_target", _make_target)
    target.location = (0, 0, 0.9)

    # Camera: front-facing at person height
    def _make_camera():
        bpy.ops.object.camera_add(location=(4, -4, 1.5))

    camera = get_or_create_object("efs_lumi_camera", _make_camera)
    camera.location = (4, -4, 1.5)

    # 50mm portrait lens
    camera.data.lens = 50

    # Depth of field: f/2.8 with focus on the target
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 5.7  # ~distance from camera to target
    camera.data.dof.aperture_fstop = 2.8

    # Track To constraint
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

    print(f"[luminous_being] Camera created: pos=(4, -4, 1.5), "
          f"lens=50mm, DOF f/2.8, focus=5.7m, "
          f"tracking target at (0, 0, 0.9)")

    return camera


def _create_lighting():
    """Create minimal rim light for depth separation.

    The being IS the light -- no key light, no fill light. Only one subtle
    rim light behind the body provides depth separation when effects are dim.

    Returns:
        The rim light bpy.types.Object.
    """
    def _make_rim():
        bpy.ops.object.light_add(type='POINT', location=(-2, 3, 3))

    rim_light = get_or_create_object("efs_lumi_rim_light", _make_rim)
    rim_light.location = (-2, 3, 3)
    rim_light.data.energy = 30       # Subtle -- 30W (much less than fire's 150W key)
    rim_light.data.color = (0.7, 0.8, 1.0)  # Cool blue for depth

    print(f"[luminous_being] Rim light created: pos=(-2, 3, 3), "
          f"energy=30W, color=(0.7, 0.8, 1.0) cool blue -- "
          f"NO key light, NO fill light (being is its own light)")

    return rim_light


# ---------------------------------------------------------------------------
# Public API functions (four-function pattern)
# ---------------------------------------------------------------------------

def create_luminous_scene(mask_dir, quality="preview", particle_mode="flame"):
    """Create the complete Luminous Being scene with all four effect layers.

    This is the main entry point. Produces a scene with:
      - Body mesh proxy from mask sequence (via mask_to_mesh.py)
      - Volumetric fill glow (Principled Volume)
      - Surface particle system (3 modes: flame/mist/solar_breath)
      - Mantaflow fire wisps (body mesh as flow source)
      - Fresnel corona edge glow
      - Camera at person height with DOF
      - Minimal rim light (the being is its own illumination)
      - Multi-layer compositor (4 layers with bloom)

    Args:
        mask_dir: Path to directory containing mask PNGs from sam_segmenter.py.
        quality: Quality preset name -- "draft", "preview", "production", or "ultra".
                 Default is "preview".
        particle_mode: Particle behavior mode -- "flame", "mist", or "solar_breath".
                       Default is "flame".

    Returns:
        Dict summary of created scene (also printed as JSON).
    """
    # Load quality preset
    preset = load_quality_preset(quality)

    # Pitfall 3: Save before destructive operations
    save_before_operate(tag="luminous_being_scene")

    # Step 1: Scene-level configuration (total darkness, film_transparent)
    _setup_scene(preset)

    # Step 2: Body mesh proxy from masks
    body = _create_body(mask_dir, quality)

    # Step 3: Volumetric fill glow
    fill = _create_volumetric_fill(body)

    # Step 4: Particle system (3 modes)
    particles = _create_particle_system(body, particle_mode)

    # Step 5: Mantaflow fire wisps from body surface
    fire_domain, fire_flow = _create_fire_wisps(body, preset)

    # Step 6: Fresnel corona edge glow
    corona = _create_corona(body)

    # Step 7: Camera at person height
    camera = _create_camera()

    # Step 8: Minimal rim light
    rim_light = _create_lighting()

    # Step 9: Multi-layer compositor
    compositor_info = _setup_compositor(fill, body, fire_domain, corona)

    # Build JSON summary
    result = {
        "status": "scene_created",
        "quality_preset": preset["name"],
        "particle_mode": particle_mode,
        "objects": {
            "body": {
                "name": body.name,
                "vertex_count": len(body.data.vertices),
                "hidden_from_render": True,
            },
            "volumetric_fill": {
                "name": fill.name,
                "material": "efs_lumi_fill_material",
                "type": "Principled Volume",
                "density": 3.0,
                "emission_strength": 5.0,
                "blackbody_intensity": 0.8,
            },
            "particles": {
                "mode": particle_mode,
                "count": particles.count,
                "instance_object": "efs_lumi_particles",
            },
            "fire_wisps": {
                "domain": fire_domain.name,
                "flow_source": body.name,
                "material": "efs_lumi_wisp_material",
                "type": "Principled Volume + Blackbody",
                "resolution": fire_domain.modifiers["Fluid"].domain_settings.resolution_max,
                "cache_dir": "luminous_fire_wisps",
            },
            "corona": {
                "name": corona.name,
                "material": "efs_lumi_corona_material",
                "type": "Fresnel + Emission (edge glow)",
                "emission_strength": 3.0,
                "fresnel_ior": 1.5,
            },
            "camera": {
                "name": camera.name,
                "location": list(camera.location),
                "focal_length_mm": 50,
                "dof_enabled": True,
                "dof_fstop": 2.8,
            },
            "rim_light": {
                "name": rim_light.name,
                "location": list(rim_light.location),
                "energy_watts": 30,
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
            "film_transparent": True,
            "world_darkness": True,
        },
        "compositor": {
            "layers": ["VolFill", "Particles", "FireWisps", "Corona"],
            "bloom_layers": ["VolFill", "FireWisps", "Corona"],
            "bloom_thresholds": {"VolFill": 0.6, "FireWisps": 0.7, "Corona": 0.5},
        },
        "collections": {
            "LumiVolFill": ["efs_lumi_fill"],
            "LumiParticles": ["efs_lumi_body", "efs_lumi_particles"],
            "LumiFireWisps": ["efs_lumi_fire_domain"],
            "LumiCorona": ["efs_lumi_corona"],
        },
    }

    print(json.dumps(result, indent=2))
    return result


def apply_luminous_audio(audio_json_path, preset_name="luminous_being"):
    """Apply audio-driven keyframes to the Luminous Being scene.

    Convenience wrapper around keyframe_generator.apply_audio_keyframes()
    that defaults to the luminous_being preset. Provides a clean API:
        create_luminous_scene -> apply_luminous_audio -> bake_luminous -> render_luminous

    Audio keyframes drive all four effect layers:
      - Volumetric fill: Density (bass), Emission Strength (rms_energy)
      - Particles: emission strength (mid frequency)
      - Fire wisps: fuel_amount (bass/onsets)
      - Corona: Emission Strength (treble)

    Args:
        audio_json_path: Absolute path to the audio analysis JSON file.
        preset_name: Mapping preset name (default "luminous_being").

    Returns:
        Dict summary from apply_audio_keyframes().
    """
    from keyframe_generator import apply_audio_keyframes
    return apply_audio_keyframes(audio_json_path, preset_name=preset_name)


def bake_luminous(clean_first=True):
    """Start async Mantaflow bake for fire wisps. Run after create_luminous_scene().

    Bakes the efs_lumi_fire_domain Mantaflow fire simulation. Uses the
    async timer pattern from async_bake.py so the MCP call returns
    immediately (Pitfall 2: 180s timeout protection).

    Args:
        clean_first: If True, free existing bake data before starting.
                     Recommended to avoid stale cache issues.

    Poll for completion with:
        from poll_status import poll_status; poll_status()
    """
    from async_bake import start_bake
    start_bake(
        domain_name="efs_lumi_fire_domain",
        bake_type="ALL",
        clean_first=clean_first,
    )


def render_luminous(output_name="luminous_being", frame=None):
    """Start async Cycles render of the Luminous Being scene.

    Uses the scene's Cycles settings (configured by _setup_scene from the
    quality preset used in create_luminous_scene).

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
