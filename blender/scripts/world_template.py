"""
EFS World-Building Utilities -- HDRI environment setup and 3D asset placement.

This module provides composable utility functions for building photorealistic
environments in Blender. Unlike fire/water templates (which are scene-specific
with a four-function API), these are world-building primitives that OTHER
templates call to enhance their scenes.

IMPORTANT: Two-step MCP workflow
--------------------------------
HDRI files and 3D assets are acquired via blender-mcp MCP tools OUTSIDE of
Python. This module only loads/configures them once downloaded.

Step 1 (MCP tools -- called separately, not from Python):
  - HDRI: polyhaven_search(query, type="hdris") -> polyhaven_download(asset_id, type="hdris", resolution="2k")
  - 3D models: search_sketchfab(query) -> import_sketchfab_model(url)
  - AI models: hyper3d_generate(prompt) -> import_generated_model(task_id)

Step 2 (Python -- this module):
  - setup_hdri(hdri_path) to load the downloaded .exr/.hdr into the world node tree
  - place_asset(object_name) to position an already-imported object

This two-step design keeps Python scripts independent of the MCP transport layer.

Usage examples (via MCP execute_blender_code calls):

  Example 1 -- HDRI environment:
    # First, via MCP tool: polyhaven_download("kloofendal_48d_partly_cloudy", type="hdris")
    # Then, via execute_blender_code:
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from world_template import setup_hdri
    setup_hdri('C:/Users/jonch/Projects/ethereal-flame-studio/blender/hdris/kloofendal_48d_partly_cloudy_2k.exr')

  Example 2 -- Place a Sketchfab asset:
    # First, via MCP tool: import_sketchfab_model(url)  (adds object to scene)
    # Then, via execute_blender_code:
    from world_template import list_scene_objects, place_asset
    list_scene_objects()  # Find the imported object's name
    place_asset("MyModel", location=(0, 0, 0), scale=(2, 2, 2))

  Example 3 -- Full world setup in one call:
    from world_template import setup_world
    setup_world(
        hdri_path='C:/.../my_hdri_2k.exr',
        hdri_strength=1.2,
        ground=True,
    )

Functions:
  setup_hdri()         -- Load HDRI .exr/.hdr into world node tree with rotation control
  place_asset()        -- Position an already-imported 3D object
  create_ground_plane() -- Add a simple matte ground surface
  setup_world()        -- Convenience wrapper: HDRI + optional ground in one call
  list_scene_objects() -- Print all scene objects (find imported asset names)
"""
import bpy
import json
import math
import os
import sys
from pathlib import Path

# Ensure our scripts directory is on sys.path for imports
try:
    _SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    # __file__ not defined when run via exec(open(...).read())
    _SCRIPTS_DIR = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scene_utils import save_before_operate, get_or_create_object, BLENDER_DIR

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
HDRI_DIR = REPO_ROOT / "blender" / "hdris"  # Where downloaded HDRIs go


def setup_hdri(hdri_path, strength=1.0, rotation_z=0.0):
    """Load an HDRI image into the world environment for photorealistic lighting.

    Creates a complete world node tree: Texture Coordinate -> Mapping ->
    Environment Texture -> Background -> World Output. The Mapping node
    allows rotating the HDRI to control sun direction.

    HDRI files must be downloaded FIRST via blender-mcp MCP tools:
      polyhaven_search(query, type="hdris")
      polyhaven_download(asset_id, type="hdris", resolution="2k")

    Args:
        hdri_path: Absolute path to the .exr or .hdr file.
        strength: Environment light intensity (default 1.0).
                  Higher values = brighter ambient lighting.
        rotation_z: Rotate the HDRI around Z axis in radians (default 0.0).
                    Useful for controlling sun/highlight direction.

    Returns:
        Dict with status, path, strength, rotation_z.

    Raises:
        FileNotFoundError: If hdri_path does not exist. Includes hint about
            using polyhaven_download MCP tool.
    """
    hdri_path = str(hdri_path)

    # Validate file exists
    if not os.path.isfile(hdri_path):
        raise FileNotFoundError(
            f"HDRI file not found: {hdri_path}\n"
            f"HDRIs must be downloaded first via blender-mcp MCP tools:\n"
            f"  1. polyhaven_search(query, type='hdris') -- find the HDRI\n"
            f"  2. polyhaven_download(asset_id, type='hdris', resolution='2k') -- download .exr"
        )

    # Get or create World
    scene = bpy.context.scene
    world = bpy.data.worlds.get("World")
    if world is None:
        world = bpy.data.worlds.new("World")
    scene.world = world

    # Enable nodes and clear existing tree
    world.use_nodes = True
    world.node_tree.nodes.clear()

    nodes = world.node_tree.nodes
    links = world.node_tree.links

    # -- Create nodes --

    # Texture Coordinate: provides UV mapping coordinates
    tex_coord = nodes.new(type='ShaderNodeTexCoord')
    tex_coord.location = (-1200, 0)

    # Mapping: allows rotation/scale control of the HDRI
    mapping = nodes.new(type='ShaderNodeMapping')
    mapping.location = (-900, 0)
    mapping.inputs["Rotation"].default_value[2] = rotation_z

    # Environment Texture: loads the HDRI image
    env_tex = nodes.new(type='ShaderNodeTexEnvironment')
    env_tex.location = (-600, 0)
    env_tex.image = bpy.data.images.load(hdri_path)

    # Background: controls light strength
    background = nodes.new(type='ShaderNodeBackground')
    background.location = (-300, 0)
    background.inputs["Strength"].default_value = strength

    # World Output: final output
    world_output = nodes.new(type='ShaderNodeOutputWorld')
    world_output.location = (0, 0)

    # -- Wire the nodes --
    # Tex Coord (Generated) -> Mapping (Vector)
    links.new(tex_coord.outputs["Generated"], mapping.inputs["Vector"])
    # Mapping (Vector) -> Environment Texture (Vector)
    links.new(mapping.outputs["Vector"], env_tex.inputs["Vector"])
    # Environment Texture (Color) -> Background (Color)
    links.new(env_tex.outputs["Color"], background.inputs["Color"])
    # Background (Background) -> World Output (Surface)
    links.new(background.outputs["Background"], world_output.inputs["Surface"])

    print(f"[world_template] HDRI loaded: {hdri_path}, "
          f"strength={strength}, rotation_z={rotation_z}")

    return {
        "status": "hdri_loaded",
        "path": hdri_path,
        "strength": strength,
        "rotation_z": rotation_z,
    }


def place_asset(object_name, location=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1)):
    """Position an already-imported 3D object in the scene.

    Assets must be imported FIRST via blender-mcp MCP tools:
      - search_sketchfab(query) + import_sketchfab_model(url)
      - hyper3d_generate(prompt) + import_generated_model(task_id)

    Use list_scene_objects() to find the name of imported assets.

    Args:
        object_name: Exact name of the object in bpy.data.objects.
        location: (x, y, z) world position tuple.
        rotation: (x, y, z) Euler rotation in radians.
        scale: (x, y, z) scale factors.

    Returns:
        Dict with status, name, location, rotation, scale.

    Raises:
        ValueError: If object_name is not found. Lists all available objects.
    """
    obj = bpy.data.objects.get(object_name)
    if obj is None:
        available = [o.name for o in bpy.data.objects]
        raise ValueError(
            f"Object '{object_name}' not found. "
            f"Available objects: {available}\n"
            f"Tip: Use list_scene_objects() to see all objects, or import "
            f"an asset first via blender-mcp MCP tools."
        )

    obj.location = location
    obj.rotation_euler = rotation
    obj.scale = scale

    print(f"[world_template] Asset placed: {object_name} at {location}, "
          f"rot={rotation}, scale={scale}")

    return {
        "status": "asset_placed",
        "name": object_name,
        "location": list(location),
        "rotation": list(rotation),
        "scale": list(scale),
    }


def create_ground_plane(size=50, material_color=(0.15, 0.12, 0.1, 1.0)):
    """Create a simple matte ground plane for scenes needing a surface.

    NOT needed for water scenes (which use the ocean modifier as ground).
    Useful for fire-on-ground, asset showcase, or any scene requiring
    shadow-receiving surfaces.

    The plane is placed slightly below origin (-0.01 Z) to avoid z-fighting
    with objects at ground level.

    Args:
        size: Plane dimensions in Blender units (default 50 for large ground).
        material_color: RGBA tuple for the ground's base color.
                        Default is a dark earthy brown (0.15, 0.12, 0.1).

    Returns:
        The ground bpy.types.Object.
    """
    def _make_ground():
        bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, -0.01))

    ground = get_or_create_object("efs_world_ground", _make_ground)
    ground.location = (0, 0, -0.01)

    # Create or get the ground material
    mat_name = "efs_ground_material"
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Configure Principled BSDF for matte ground
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        nodes.clear()
        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
        bsdf.location = (0, 0)
        output = nodes.new(type='ShaderNodeOutputMaterial')
        output.location = (300, 0)
        links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    bsdf.inputs["Base Color"].default_value = material_color
    bsdf.inputs["Roughness"].default_value = 0.9  # Matte finish

    # Assign material to ground
    if ground.data.materials:
        ground.data.materials[0] = mat
    else:
        ground.data.materials.append(mat)

    # Smooth shading for softer appearance
    bpy.context.view_layer.objects.active = ground
    bpy.ops.object.shade_smooth()

    print(f"[world_template] Ground plane created: size={size}, "
          f"color={material_color[:3]}, roughness=0.9")

    return ground


def setup_world(hdri_path=None, hdri_strength=1.0, hdri_rotation_z=0.0,
                ground=False, ground_size=50,
                ground_color=(0.15, 0.12, 0.1, 1.0)):
    """Set up a complete world environment in one call.

    Convenience wrapper that combines setup_hdri() and create_ground_plane()
    with sensible defaults. Use this for quick environment setup, or call
    the individual functions for more control.

    Args:
        hdri_path: Path to HDRI .exr/.hdr file (optional).
                   If None, no HDRI is loaded (keeps current world background).
        hdri_strength: HDRI light intensity (default 1.0).
        hdri_rotation_z: HDRI Z rotation in radians (default 0.0).
        ground: If True, creates a ground plane (default False).
        ground_size: Ground plane size (default 50).
        ground_color: Ground plane RGBA color (default dark brown).

    Returns:
        Dict with combined results from each enabled component.
    """
    result = {"status": "world_setup_complete", "components": []}

    # HDRI environment
    if hdri_path is not None:
        hdri_result = setup_hdri(hdri_path, hdri_strength, hdri_rotation_z)
        result["hdri"] = hdri_result
        result["components"].append("hdri")

    # Ground plane
    if ground:
        ground_obj = create_ground_plane(ground_size, ground_color)
        result["ground"] = {
            "name": ground_obj.name,
            "size": ground_size,
            "color": list(ground_color),
        }
        result["components"].append("ground")

    summary_parts = []
    if hdri_path:
        summary_parts.append(f"HDRI (strength={hdri_strength})")
    if ground:
        summary_parts.append(f"ground (size={ground_size})")

    if summary_parts:
        print(f"[world_template] World setup complete: {', '.join(summary_parts)}")
    else:
        print("[world_template] World setup called with no components enabled")

    return result


def list_scene_objects():
    """Print all objects in the current scene with their names, types, and locations.

    Useful for finding the exact name of an object imported via blender-mcp
    MCP tools (search_sketchfab + import_sketchfab_model, or hyper3d_generate
    + import_generated_model) so you can pass it to place_asset().

    Returns:
        List of dicts with name, type, location for each object.
    """
    objects = []
    for obj in bpy.data.objects:
        info = {
            "name": obj.name,
            "type": obj.type,
            "location": [round(v, 4) for v in obj.location],
        }
        objects.append(info)
        print(f"[world_template] {obj.name} ({obj.type}) "
              f"at ({info['location'][0]}, {info['location'][1]}, {info['location'][2]})")

    if not objects:
        print("[world_template] Scene is empty -- no objects found")

    return objects
