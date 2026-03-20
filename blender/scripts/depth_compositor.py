"""
EFS Depth-Aware Compositor -- loads depth maps (from Video Depth Anything or
Blender Z-pass) and composites virtual effects onto real 360 footage with
per-pixel depth occlusion so virtual fire/effects appear behind real foreground
objects.

This is the key mixed-reality compositing innovation: virtual effects interact
with real footage spatially, not just as flat overlays. A fire effect placed
behind a person in the footage is correctly occluded by that person, because
the depth comparison determines which pixels are closer to the camera.

Depth-aware compositing algorithm:
  1. Load real footage as background (Movie Clip node)
  2. Load depth map for the footage (from Video Depth Anything or similar)
  3. Render virtual effects with Z-pass enabled
  4. Compare Z-pass (virtual depth) vs footage depth map per pixel
  5. Where virtual depth > footage depth (virtual is farther): alpha -> 0 (occluded)
  6. Where virtual depth < footage depth (virtual is closer): alpha -> 1 (visible)
  7. Alpha-over the depth-masked virtual effects onto the real footage

Four-function API:
  setup_footage_background() -- load real video footage as compositor background
  load_depth_map() -- load external depth map into compositor
  composite_with_depth() -- build depth comparison chain and composite
  composite_with_depth_simple() -- convenience wrapper calling all three

Usage (via MCP execute_blender_code calls):

  # Step 1: Have real 360 footage and its depth map (from Video Depth Anything)
  # Step 2: Create fire scene and assign to a collection
  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
  from compositor_layers import create_layer_collection, setup_multi_layer
  create_layer_collection("FireEffects", ["efs_fire_domain", "efs_fire_flow"])

  # Step 3: Single-call depth-aware composite
  from depth_compositor import composite_with_depth_simple
  composite_with_depth_simple(
      footage_path="C:/.../real_360_footage.mp4",
      depth_path="C:/.../depth_maps/frame_0001.exr",
      effects_layer_name="Fire",
      is_equirectangular=True,
  )

Pitfall compliance:
  - Pitfall 3: save_before_operate() called before compositor changes
  - Pitfall 11: JSON output from every function for Claude text feedback
"""
import bpy
import json
import sys
import os
import math
from pathlib import Path

# Ensure our scripts directory is on sys.path for imports
try:
    _SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    # __file__ not defined when run via exec(open(...).read())
    _SCRIPTS_DIR = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scene_utils import save_before_operate, RENDERS_DIR

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")

# -- Layout constants for compositor node positioning --
NODE_SPACING_X = 300   # Horizontal spacing between compositor node columns
NODE_SPACING_Y = 250   # Vertical spacing between compositor node rows


def setup_footage_background(footage_path, is_equirectangular=False):
    """Load real video footage as the background plate in the compositor.

    Loads a video file (MP4, MOV, etc.) as a Movie Clip and creates a
    CompositorNodeMovieClip node. The scene frame range is set to match
    the clip duration so the compositor processes all footage frames.

    For equirectangular 360 footage, this function notes the projection
    type in the output but does not apply special nodes -- the footage
    is already in equirectangular projection and will be combined with
    equirectangular VR renders from Blender's panoramic camera.

    Args:
        footage_path: Absolute path to the video footage file (MP4, MOV, etc.).
        is_equirectangular: If True, the footage is 360 equirectangular.
                            Noted in output metadata for downstream handling.

    Returns:
        Dict describing the loaded footage (also printed as JSON).

    Raises:
        FileNotFoundError: If the footage file does not exist.
    """
    footage_path = str(footage_path)
    if not os.path.exists(footage_path):
        raise FileNotFoundError(
            f"Footage file not found: {footage_path}"
        )

    save_before_operate(tag="footage_background")

    scene = bpy.context.scene

    # Enable compositor
    scene.use_nodes = True
    tree = scene.node_tree

    # Load the footage as a Movie Clip
    clip = bpy.data.movieclips.load(footage_path)

    # Create a Movie Clip node in the compositor
    clip_node = tree.nodes.new(type='CompositorNodeMovieClip')
    clip_node.name = "Footage_Background"
    clip_node.label = "Real Footage"
    clip_node.clip = clip
    clip_node.location = (-600, NODE_SPACING_Y)

    # Set scene frame range to match clip duration
    clip_frame_count = clip.frame_duration
    clip_fps = clip.fps
    scene.frame_start = 1
    scene.frame_end = clip_frame_count
    scene.frame_current = 1

    # Get clip resolution
    clip_width = clip.size[0]
    clip_height = clip.size[1]

    result = {
        "status": "footage_loaded",
        "clip_name": clip.name,
        "footage_path": footage_path,
        "frame_count": clip_frame_count,
        "fps": clip_fps,
        "resolution": f"{clip_width}x{clip_height}",
        "is_equirectangular": is_equirectangular,
        "node_name": clip_node.name,
        "scene_frame_range": f"1-{clip_frame_count}",
    }

    print(json.dumps(result, indent=2))
    print(f"[depth_compositor] Footage loaded: {clip.name} "
          f"({clip_width}x{clip_height}, {clip_frame_count} frames @ {clip_fps}fps)"
          f"{' [equirectangular 360]' if is_equirectangular else ''}")

    return result


def load_depth_map(depth_path, depth_format="sequence"):
    """Load an external depth map into the compositor as an image node.

    Supports depth maps from Video Depth Anything or similar depth estimation
    tools. Depth maps can be a numbered image sequence (one per frame) or a
    single static depth image.

    A MapRange node is added after the image node to normalize depth values.
    By default it passes through 0-1 range (assumes Video Depth Anything
    outputs normalized depth). Adjust the MapRange node's From Min/Max
    values if your depth source uses a different range.

    Args:
        depth_path: Path to depth map image or first image in sequence.
                    For sequences: path to any frame (e.g., "depth_0001.exr").
                    For single: path to the depth image file.
        depth_format: "sequence" for numbered frame sequences (depth_0001.exr,
                      depth_0002.exr, ...) or "single" for one static image.

    Returns:
        Dict describing the loaded depth map (also printed as JSON).

    Raises:
        FileNotFoundError: If the depth map file does not exist.
    """
    depth_path = str(depth_path)
    if not os.path.exists(depth_path):
        raise FileNotFoundError(
            f"Depth map file not found: {depth_path}"
        )

    scene = bpy.context.scene

    # Ensure compositor is enabled
    scene.use_nodes = True
    tree = scene.node_tree

    # Load the depth image
    depth_image = bpy.data.images.load(depth_path)

    if depth_format == "sequence":
        depth_image.source = 'SEQUENCE'
        # Set frame range to match scene
        frame_count = scene.frame_end - scene.frame_start + 1
    else:
        depth_image.source = 'FILE'
        frame_count = 1

    # Create Image node for the depth map
    depth_node = tree.nodes.new(type='CompositorNodeImage')
    depth_node.name = "DepthMap_Input"
    depth_node.label = "Depth Map"
    depth_node.image = depth_image
    depth_node.location = (-600, -NODE_SPACING_Y)

    # For sequences, configure frame offset
    if depth_format == "sequence":
        depth_node.frame_duration = frame_count
        depth_node.frame_start = scene.frame_start
        depth_node.frame_offset = 0
        depth_node.use_cyclic = False
        depth_node.use_auto_refresh = True

    # Add MapRange node to normalize depth values
    # Default: 0-1 passthrough (Video Depth Anything outputs normalized depth)
    # Users can adjust From Min/Max for other depth sources
    map_range = tree.nodes.new(type='CompositorNodeMapRange')
    map_range.name = "DepthMap_Normalize"
    map_range.label = "Normalize Depth"
    map_range.location = (-300, -NODE_SPACING_Y)

    # Input range: 0-1 (passthrough for pre-normalized depth)
    map_range.inputs["From Min"].default_value = 0.0
    map_range.inputs["From Max"].default_value = 1.0
    # Output range: 0-1 normalized
    map_range.inputs["To Min"].default_value = 0.0
    map_range.inputs["To Max"].default_value = 1.0
    # Clamp to prevent values outside 0-1
    map_range.use_clamp = True

    # Wire depth image -> MapRange
    tree.links.new(depth_node.outputs["Image"], map_range.inputs["Value"])

    result = {
        "status": "depth_map_loaded",
        "image_name": depth_image.name,
        "depth_path": depth_path,
        "depth_format": depth_format,
        "frame_count": frame_count,
        "depth_node_name": depth_node.name,
        "normalize_node_name": map_range.name,
        "normalize_range": {"from": [0.0, 1.0], "to": [0.0, 1.0]},
    }

    print(json.dumps(result, indent=2))
    print(f"[depth_compositor] Depth map loaded: {depth_image.name} "
          f"(format={depth_format}, frames={frame_count})")

    return result


def composite_with_depth(footage_node_name, depth_node_name,
                         effects_layer_name, depth_threshold=0.5,
                         blend_width=0.02):
    """Build depth-aware compositing chain: virtual effects occluded by real foreground.

    This is the core depth-aware compositing function. It compares the Z-pass
    (depth) of virtual effects against the depth map of real footage to determine
    per-pixel visibility. Virtual effects that are farther from camera than the
    real scene are occluded (hidden), while effects closer than the real scene
    remain visible.

    The depth comparison chain:
      1. Render virtual effects with Z-pass (depth per pixel)
      2. Normalize effects Z-pass from camera near..far to 0..1
      3. Compare effects depth < footage depth (LESS_THAN math node)
      4. Result: mask where 1.0 = effect is closer (visible), 0.0 = occluded
      5. Optional blur for soft edges (blend_width controls softness)
      6. Multiply effect alpha by depth mask (SetAlpha)
      7. Alpha-over masked effects onto real footage

    Args:
        footage_node_name: Name of the Movie Clip node (from setup_footage_background).
        depth_node_name: Name of the depth MapRange node (from load_depth_map,
                         typically "DepthMap_Normalize").
        effects_layer_name: Name of the View Layer containing virtual effects
                            (from compositor_layers.setup_multi_layer).
        depth_threshold: Reserved for future use (per-pixel comparison is automatic).
        blend_width: Softness of depth edge transition. 0 = hard edge (crisp but
                     may show aliasing), higher = softer blend. 0.02 = subtle
                     softening. Range: 0.0 to 0.1 recommended.

    Returns:
        Dict describing the compositing chain (also printed as JSON).

    Raises:
        RuntimeError: If required compositor nodes are not found.
    """
    scene = bpy.context.scene

    if not scene.use_nodes or not scene.node_tree:
        raise RuntimeError(
            "Compositor not initialized. Call setup_footage_background() first."
        )

    tree = scene.node_tree

    # -- Step 1: Find the footage Movie Clip node --
    footage_node = tree.nodes.get(footage_node_name)
    if footage_node is None:
        raise RuntimeError(
            f"Footage node '{footage_node_name}' not found in compositor. "
            f"Call setup_footage_background() first."
        )

    # -- Step 2: Find the depth MapRange node --
    depth_normalize_node = tree.nodes.get(depth_node_name)
    if depth_normalize_node is None:
        raise RuntimeError(
            f"Depth normalize node '{depth_node_name}' not found in compositor. "
            f"Call load_depth_map() first."
        )

    # -- Step 3: Find or create a Render Layers node for the effects layer --
    vl = scene.view_layers.get(effects_layer_name)
    if vl is None:
        raise RuntimeError(
            f"View Layer '{effects_layer_name}' not found. "
            f"Create it with compositor_layers.setup_multi_layer() first."
        )

    # Enable Z-pass on the effects view layer
    vl.use_pass_z = True

    # Find existing Render Layers node for this layer, or create one
    effects_rl_node = None
    for node in tree.nodes:
        if node.type == 'R_LAYERS' and node.layer == effects_layer_name:
            effects_rl_node = node
            break

    if effects_rl_node is None:
        effects_rl_node = tree.nodes.new(type='CompositorNodeRLayers')
        effects_rl_node.name = f"RL_{effects_layer_name}"
        effects_rl_node.label = f"Render: {effects_layer_name}"
        effects_rl_node.layer = effects_layer_name
        effects_rl_node.location = (0, NODE_SPACING_Y)

    # -- Step 4: Normalize the effects Z-pass (camera near..far to 0..1) --
    effects_depth_normalize = tree.nodes.new(type='CompositorNodeMapRange')
    effects_depth_normalize.name = "EffectsDepth_Normalize"
    effects_depth_normalize.label = "Normalize Effects Depth"
    effects_depth_normalize.location = (NODE_SPACING_X, NODE_SPACING_Y - 150)

    # Map from camera clip range to 0..1
    cam = scene.camera
    if cam and cam.data:
        clip_start = cam.data.clip_start
        clip_end = cam.data.clip_end
    else:
        # Fallback to reasonable defaults
        clip_start = 0.1
        clip_end = 1000.0

    effects_depth_normalize.inputs["From Min"].default_value = clip_start
    effects_depth_normalize.inputs["From Max"].default_value = clip_end
    effects_depth_normalize.inputs["To Min"].default_value = 0.0
    effects_depth_normalize.inputs["To Max"].default_value = 1.0
    effects_depth_normalize.use_clamp = True

    # Wire: Effects Render Layers Depth -> Normalize
    tree.links.new(
        effects_rl_node.outputs["Depth"],
        effects_depth_normalize.inputs["Value"]
    )

    # -- Step 5: Depth comparison (LESS_THAN) --
    # effects_depth < footage_depth  =>  effect is CLOSER  =>  visible (1.0)
    # effects_depth >= footage_depth  =>  effect is FARTHER  =>  occluded (0.0)
    depth_compare = tree.nodes.new(type='CompositorNodeMath')
    depth_compare.name = "DepthCompare_LessThan"
    depth_compare.label = "Depth Compare"
    depth_compare.operation = 'LESS_THAN'
    depth_compare.location = (NODE_SPACING_X * 2, 0)

    # Input 1: normalized effects depth
    tree.links.new(
        effects_depth_normalize.outputs["Value"],
        depth_compare.inputs[0]
    )
    # Input 2: footage depth map (already normalized via MapRange)
    tree.links.new(
        depth_normalize_node.outputs["Value"],
        depth_compare.inputs[1]
    )

    # Current mask output
    mask_output = depth_compare.outputs["Value"]

    # -- Step 6 (optional): Blur the depth mask for soft edges --
    blur_node = None
    if blend_width > 0:
        blur_node = tree.nodes.new(type='CompositorNodeBlur')
        blur_node.name = "DepthMask_Blur"
        blur_node.label = "Soft Depth Edge"
        blur_node.location = (NODE_SPACING_X * 3, 0)

        # Blur radius proportional to blend_width * image width
        # Using relative filter size for resolution independence
        blur_node.filter_type = 'GAUSS'
        blur_node.size_x = int(blend_width * scene.render.resolution_x)
        blur_node.size_y = int(blend_width * scene.render.resolution_y)

        # Clamp blur radius to reasonable range (1-50 pixels)
        blur_node.size_x = max(1, min(50, blur_node.size_x))
        blur_node.size_y = max(1, min(50, blur_node.size_y))

        tree.links.new(mask_output, blur_node.inputs["Image"])
        mask_output = blur_node.outputs["Image"]

    # -- Step 7: Apply depth mask to effects alpha (SetAlpha) --
    set_alpha = tree.nodes.new(type='CompositorNodeSetAlpha')
    set_alpha.name = "DepthMask_SetAlpha"
    set_alpha.label = "Apply Depth Mask"
    set_alpha.location = (NODE_SPACING_X * 4, NODE_SPACING_Y // 2)

    # Image input: the rendered effects
    tree.links.new(
        effects_rl_node.outputs["Image"],
        set_alpha.inputs["Image"]
    )
    # Alpha input: the depth mask (1 = visible, 0 = occluded)
    tree.links.new(mask_output, set_alpha.inputs["Alpha"])

    # -- Step 8: Alpha Over -- composite masked effects onto footage --
    alpha_over = tree.nodes.new(type='CompositorNodeAlphaOver')
    alpha_over.name = "DepthComposite_AlphaOver"
    alpha_over.label = "Depth Composite"
    alpha_over.location = (NODE_SPACING_X * 5, 0)

    # Bottom (background): real footage
    tree.links.new(footage_node.outputs["Image"], alpha_over.inputs[1])
    # Top (foreground): depth-masked effects
    tree.links.new(set_alpha.outputs["Image"], alpha_over.inputs[2])

    # -- Step 9: Output to Composite + Viewer --
    # Find or create Composite node
    composite_node = tree.nodes.get("Composite")
    if composite_node is None:
        composite_node = tree.nodes.new(type='CompositorNodeComposite')
        composite_node.name = "Composite"
    composite_node.location = (NODE_SPACING_X * 6, 0)

    # Find or create Viewer node
    viewer_node = tree.nodes.get("Viewer")
    if viewer_node is None:
        viewer_node = tree.nodes.new(type='CompositorNodeViewer')
        viewer_node.name = "Viewer"
    viewer_node.location = (NODE_SPACING_X * 6, -NODE_SPACING_Y)

    # Wire final output
    tree.links.new(alpha_over.outputs["Image"], composite_node.inputs["Image"])
    tree.links.new(alpha_over.outputs["Image"], viewer_node.inputs["Image"])

    # -- Build result summary --
    nodes_created = [
        effects_rl_node.name,
        effects_depth_normalize.name,
        depth_compare.name,
        set_alpha.name,
        alpha_over.name,
    ]
    if blur_node:
        nodes_created.insert(3, blur_node.name)

    result = {
        "status": "depth_composite_created",
        "compositing_chain": {
            "footage_background": footage_node_name,
            "depth_map": depth_node_name,
            "effects_layer": effects_layer_name,
            "z_pass_enabled": True,
            "depth_normalize_range": {
                "from": [clip_start, clip_end],
                "to": [0.0, 1.0],
            },
            "depth_comparison": "LESS_THAN (effects_depth < footage_depth = visible)",
            "soft_edge_blur": blend_width > 0,
            "blend_width": blend_width,
            "blur_radius_px": blur_node.size_x if blur_node else 0,
        },
        "nodes_created": nodes_created,
        "output_nodes": ["Composite", "Viewer"],
    }

    print(json.dumps(result, indent=2))
    print(f"[depth_compositor] Depth-aware composite created: "
          f"effects='{effects_layer_name}' over footage='{footage_node_name}', "
          f"depth comparison via LESS_THAN, "
          f"soft edge={'ON' if blend_width > 0 else 'OFF'} "
          f"-> Composite + Viewer")

    return result


def composite_with_depth_simple(footage_path, depth_path, effects_layer_name,
                                is_equirectangular=False, depth_format="sequence",
                                blend_width=0.02):
    """Convenience wrapper: load footage + depth map + composite in one call.

    Calls setup_footage_background, load_depth_map, and composite_with_depth
    in sequence. This is the most common usage pattern for depth-aware
    compositing -- a single call to set up the entire pipeline.

    Args:
        footage_path: Absolute path to the real video footage file.
        depth_path: Path to depth map image or first image in a sequence.
        effects_layer_name: Name of the View Layer containing virtual effects.
        is_equirectangular: If True, footage is 360 equirectangular.
        depth_format: "sequence" or "single" (passed to load_depth_map).
        blend_width: Soft edge blend width (passed to composite_with_depth).

    Returns:
        Dict combining all three function results (also printed as JSON).
    """
    # Step 1: Load real footage as background
    footage_result = setup_footage_background(
        footage_path, is_equirectangular=is_equirectangular
    )

    # Step 2: Load depth map
    depth_result = load_depth_map(depth_path, depth_format=depth_format)

    # Step 3: Build depth-aware compositing chain
    composite_result = composite_with_depth(
        footage_node_name=footage_result["node_name"],
        depth_node_name=depth_result["normalize_node_name"],
        effects_layer_name=effects_layer_name,
        blend_width=blend_width,
    )

    # Combined result
    result = {
        "status": "depth_composite_complete",
        "footage": footage_result,
        "depth_map": depth_result,
        "composite": composite_result,
        "is_equirectangular": is_equirectangular,
    }

    print(json.dumps(result, indent=2))
    print(f"[depth_compositor] Complete depth-aware composite pipeline created: "
          f"footage -> depth map -> depth comparison -> masked effects -> composite"
          f"{' [equirectangular 360]' if is_equirectangular else ''}")

    return result
