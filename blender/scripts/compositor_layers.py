"""
EFS Multi-Layer Compositor -- reusable module for combining separate render
passes (fire, water, EDM effects, luminous being) into a single composited
output via Blender's compositor with Alpha Over nodes.

Each scene element lives in its own Collection. Each Collection gets its own
View Layer, which renders ONLY that collection on a transparent background.
The compositor then stacks these View Layers using Alpha Over nodes in depth
order (background first, foreground last), giving per-element control over
opacity and optional per-layer bloom (Glare) for hot elements like fire.

This enables post-render control: adjust fire intensity, water opacity, or
effect brightness without re-rendering the entire scene. Foundation for
depth-aware compositing in Plan 03 (stereoscopic VR rendering).

Five-function API:
  create_layer_collection() -> setup_multi_layer() -> add_render_pass()
  composite_layers() -- render the composite
  list_layers() -- inspect current setup

Usage (via MCP execute_blender_code calls):

  Call 1 -- Organize objects into collections:
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from compositor_layers import create_layer_collection, setup_multi_layer
    # Assume fire and water objects already exist in scene
    create_layer_collection("FireElements", ["efs_fire_domain", "efs_fire_flow"])
    create_layer_collection("WaterElements", ["efs_water_ocean"])

  Call 2 -- Build multi-layer compositor (background first, foreground last):
    setup_multi_layer([
        {"name": "Water", "collection": "WaterElements", "opacity": 1.0},
        {"name": "Fire", "collection": "FireElements", "opacity": 1.0, "bloom": True, "bloom_threshold": 0.8},
    ])

  Call 3 -- Add another layer incrementally:
    from compositor_layers import add_render_pass
    add_render_pass("Effects", "EffectsElements", opacity=0.8, bloom=True)

  Call 4 -- Render the composite:
    from compositor_layers import composite_layers
    composite_layers(output_name="scene_composite", frame=45)

  Call 5 -- Inspect current layers:
    from compositor_layers import list_layers
    list_layers()

Pitfall compliance:
  - Pitfall 3: save_before_operate() called before compositor changes
  - Pitfall 2: composite_layers() delegates to async_render (no MCP timeout)
  - Pitfall 11: JSON output from every function for Claude text feedback
"""
import bpy
import json
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

from scene_utils import save_before_operate

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")

# -- Layout constants for compositor node positioning --
NODE_SPACING_X = 300   # Horizontal spacing between compositor node columns
NODE_SPACING_Y = 250   # Vertical spacing between compositor node rows


def create_layer_collection(name, objects):
    """Create a Blender Collection and move specified objects into it.

    This is the prerequisite for View Layer isolation -- each render pass
    renders only its assigned collection. Objects are unlinked from all
    existing collections before being added to the new one, ensuring each
    object belongs to exactly one render collection.

    If a collection with the given name already exists, it is reused
    (idempotent for re-runs).

    Args:
        name: Collection name (e.g., "FireElements", "WaterElements").
        objects: List of object name strings to move into this collection.
                 Each must exist in bpy.data.objects.

    Returns:
        The bpy.types.Collection object.

    Raises:
        KeyError: If any named object does not exist in the scene.
    """
    # Reuse existing collection or create new one
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)

    moved = []
    skipped = []

    for obj_name in objects:
        obj = bpy.data.objects.get(obj_name)
        if obj is None:
            raise KeyError(
                f"Object '{obj_name}' not found in scene. "
                f"Available objects: {[o.name for o in bpy.data.objects]}"
            )

        # Check if already in this collection
        if collection.objects.get(obj_name) is not None:
            skipped.append(obj_name)
            continue

        # Unlink from all existing collections
        for existing_col in obj.users_collection:
            existing_col.objects.unlink(obj)

        # Link to new collection
        collection.objects.link(obj)
        moved.append(obj_name)

    result = {
        "status": "collection_created",
        "collection": name,
        "objects_moved": moved,
        "objects_skipped": skipped,
        "total_objects": len(collection.objects),
    }
    print(json.dumps(result, indent=2))
    return collection


def setup_multi_layer(layer_configs):
    """Create a complete multi-layer compositor from a list of layer configurations.

    Builds the full compositor pipeline:
    1. Creates a View Layer per config entry (each renders only its collection)
    2. Creates Render Layers compositor nodes (one per View Layer)
    3. Optionally adds Glare (bloom) nodes for hot elements
    4. Chains layers via Alpha Over nodes (background first, foreground last)
    5. Adds a neutral Color Balance node for final grading
    6. Wires to Composite + Viewer outputs

    Each View Layer renders on a transparent background (film_transparent=True)
    so Alpha Over compositing blends them correctly by depth order.

    Args:
        layer_configs: List of dicts, each with:
            - name (str): Layer name (e.g., "Fire", "Water", "Effects")
            - collection (str): Name of the collection this layer renders
            - opacity (float): Layer opacity 0.0-1.0 (default 1.0)
            - bloom (bool): Add Glare node after this layer (default False)
            - bloom_threshold (float): Glare threshold if bloom=True (default 0.8)

    Returns:
        Dict describing the compositor setup (also printed as JSON).

    Raises:
        ValueError: If layer_configs is empty.
    """
    if not layer_configs:
        raise ValueError("layer_configs must contain at least one layer configuration")

    save_before_operate(tag="multi_layer_compositor")

    scene = bpy.context.scene

    # -- Step 1: Create View Layers --
    created_view_layers = []

    for config in layer_configs:
        layer_name = config["name"]
        collection_name = config["collection"]

        # Create new View Layer (or reuse existing)
        vl = scene.view_layers.get(layer_name)
        if vl is None:
            vl = scene.view_layers.new(name=layer_name)

        # Exclude ALL collections, then include only the target
        _configure_view_layer_collections(vl, collection_name)

        # Transparent background for alpha-over compositing
        # Access film_transparent on the render settings (per-scene, not per-layer)
        # Each view layer inherits scene film settings, but we set transparent
        # via the Use Alpha property on the Render Layers compositor node later.
        # For Cycles, we enable film_transparent at scene level.

        created_view_layers.append({
            "name": layer_name,
            "collection": collection_name,
            "opacity": config.get("opacity", 1.0),
            "bloom": config.get("bloom", False),
        })

    # Remove default "ViewLayer" if it was not explicitly requested
    default_vl = scene.view_layers.get("ViewLayer")
    config_names = [c["name"] for c in layer_configs]
    if default_vl and "ViewLayer" not in config_names and len(scene.view_layers) > 1:
        scene.view_layers.remove(default_vl)

    # Enable transparent film so alpha-over works for all view layers
    scene.render.film_transparent = True

    # -- Step 2: Build compositor node tree --
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()

    # Track nodes for wiring
    layer_outputs = []  # Each entry: (image_output_socket, alpha_output_socket)

    for i, config in enumerate(layer_configs):
        layer_name = config["name"]
        col_x = i * NODE_SPACING_X * 2  # Double spacing per column for bloom nodes

        # Render Layers node
        rl_node = tree.nodes.new(type='CompositorNodeRLayers')
        rl_node.name = f"RL_{layer_name}"
        rl_node.label = f"Render: {layer_name}"
        rl_node.layer = layer_name
        rl_node.location = (col_x, NODE_SPACING_Y)

        # Current output socket for this layer
        current_output = rl_node.outputs["Image"]

        # Optional bloom (Glare node)
        if config.get("bloom", False):
            glare = tree.nodes.new(type='CompositorNodeGlare')
            glare.name = f"Bloom_{layer_name}"
            glare.label = f"Bloom: {layer_name}"
            glare.location = (col_x + NODE_SPACING_X, NODE_SPACING_Y)
            glare.glare_type = 'FOG_GLOW'
            glare.quality = 'HIGH'
            glare.mix = 0.0  # Additive blend
            glare.threshold = config.get("bloom_threshold", 0.8)
            glare.size = 7

            # Wire render layers -> glare
            tree.links.new(current_output, glare.inputs["Image"])
            current_output = glare.outputs["Image"]

        layer_outputs.append({
            "socket": current_output,
            "opacity": config.get("opacity", 1.0),
            "name": layer_name,
        })

    # -- Step 3: Chain layers with Alpha Over nodes --
    chain_x_start = len(layer_configs) * NODE_SPACING_X * 2 + NODE_SPACING_X
    chain_output = layer_outputs[0]["socket"]  # First layer is the base

    alpha_over_nodes = []
    for i in range(1, len(layer_outputs)):
        ao_node = tree.nodes.new(type='CompositorNodeAlphaOver')
        ao_node.name = f"AlphaOver_{layer_outputs[i]['name']}"
        ao_node.label = f"Stack: {layer_outputs[i]['name']}"
        ao_node.location = (chain_x_start + (i - 1) * NODE_SPACING_X, 0)

        # Fac controls opacity of the top layer
        ao_node.inputs["Fac"].default_value = layer_outputs[i]["opacity"]

        # Bottom input: previous chain result (or first layer for i=1)
        tree.links.new(chain_output, ao_node.inputs[1])  # Image (bottom)

        # Top input: current layer
        tree.links.new(layer_outputs[i]["socket"], ao_node.inputs[2])  # Image (top)

        chain_output = ao_node.outputs["Image"]
        alpha_over_nodes.append(ao_node.name)

    # -- Step 4: Color Balance (neutral default -- users can adjust) --
    cb_x = chain_x_start + max(len(layer_outputs) - 1, 1) * NODE_SPACING_X
    color_balance = tree.nodes.new(type='CompositorNodeColorBalance')
    color_balance.name = "ColorBalance_Final"
    color_balance.label = "Final Grade"
    color_balance.location = (cb_x, 0)
    color_balance.correction_method = 'OFFSET_POWER_SLOPE'
    # Neutral defaults (no color shift)
    color_balance.offset = (1.0, 1.0, 1.0)
    color_balance.power = (1.0, 1.0, 1.0)
    color_balance.slope = (1.0, 1.0, 1.0)

    tree.links.new(chain_output, color_balance.inputs["Image"])

    # -- Step 5: Output nodes --
    output_x = cb_x + NODE_SPACING_X

    composite = tree.nodes.new(type='CompositorNodeComposite')
    composite.name = "Composite"
    composite.location = (output_x, 0)

    viewer = tree.nodes.new(type='CompositorNodeViewer')
    viewer.name = "Viewer"
    viewer.location = (output_x, -NODE_SPACING_Y)

    tree.links.new(color_balance.outputs["Image"], composite.inputs["Image"])
    tree.links.new(color_balance.outputs["Image"], viewer.inputs["Image"])

    # -- Build result summary --
    result = {
        "status": "multi_layer_compositor_created",
        "layer_count": len(layer_configs),
        "layers": [],
        "alpha_over_chain": alpha_over_nodes,
        "color_balance": "neutral (adjustable)",
        "film_transparent": True,
    }
    for config in layer_configs:
        result["layers"].append({
            "name": config["name"],
            "collection": config["collection"],
            "opacity": config.get("opacity", 1.0),
            "bloom": config.get("bloom", False),
            "bloom_threshold": config.get("bloom_threshold", 0.8) if config.get("bloom") else None,
        })

    print(json.dumps(result, indent=2))
    print(f"[compositor_layers] Multi-layer compositor created: "
          f"{len(layer_configs)} layers, "
          f"{len(alpha_over_nodes)} Alpha Over nodes, "
          f"Color Balance -> Composite + Viewer")

    return result


def add_render_pass(name, collection, opacity=1.0, bloom=False, bloom_threshold=0.8):
    """Add a single new render pass to an existing multi-layer compositor.

    Finds the current end of the Alpha Over chain (or the last Render Layers
    node if only one layer exists), inserts a new Alpha Over node to stack
    the new layer on top, and re-wires the output to Composite and Viewer.

    This supports incremental building of the compositor -- add layers one
    at a time without rebuilding the entire pipeline.

    Args:
        name: View Layer name for the new pass (e.g., "Effects").
        collection: Collection name this pass renders.
        opacity: Layer opacity 0.0-1.0 (default 1.0).
        bloom: Whether to add a Glare (bloom) node (default False).
        bloom_threshold: Glare threshold if bloom=True (default 0.8).

    Returns:
        Dict describing the new layer (also printed as JSON).

    Raises:
        RuntimeError: If the compositor has no nodes (call setup_multi_layer first).
    """
    scene = bpy.context.scene

    if not scene.use_nodes or not scene.node_tree or len(scene.node_tree.nodes) == 0:
        raise RuntimeError(
            "Compositor has no nodes. Call setup_multi_layer() first to "
            "create the initial compositor pipeline."
        )

    tree = scene.node_tree

    # -- Step 1: Create View Layer for the new pass --
    vl = scene.view_layers.get(name)
    if vl is None:
        vl = scene.view_layers.new(name=name)

    _configure_view_layer_collections(vl, collection)

    # -- Step 2: Create Render Layers node --
    # Find rightmost render layer node for positioning
    rl_nodes = [n for n in tree.nodes if n.type == 'R_LAYERS']
    max_x = max((n.location.x for n in rl_nodes), default=0)

    rl_node = tree.nodes.new(type='CompositorNodeRLayers')
    rl_node.name = f"RL_{name}"
    rl_node.label = f"Render: {name}"
    rl_node.layer = name
    rl_node.location = (max_x + NODE_SPACING_X * 2, NODE_SPACING_Y)

    current_output = rl_node.outputs["Image"]

    # Optional bloom
    if bloom:
        glare = tree.nodes.new(type='CompositorNodeGlare')
        glare.name = f"Bloom_{name}"
        glare.label = f"Bloom: {name}"
        glare.location = (rl_node.location.x + NODE_SPACING_X, NODE_SPACING_Y)
        glare.glare_type = 'FOG_GLOW'
        glare.quality = 'HIGH'
        glare.mix = 0.0
        glare.threshold = bloom_threshold
        glare.size = 7
        tree.links.new(current_output, glare.inputs["Image"])
        current_output = glare.outputs["Image"]

    # -- Step 3: Find the current chain endpoint --
    # The chain ends at whichever node feeds the Composite node's Image input
    composite_node = tree.nodes.get("Composite")
    color_balance_node = tree.nodes.get("ColorBalance_Final")

    if composite_node is None:
        raise RuntimeError("No Composite node found. Compositor may be corrupted.")

    # Find what currently feeds the Color Balance (or Composite if no CB)
    feed_target = color_balance_node if color_balance_node else composite_node
    previous_chain_output = None

    for link in tree.links:
        if link.to_node == feed_target and link.to_socket.name == "Image":
            previous_chain_output = link.from_socket
            break

    if previous_chain_output is None:
        # Fallback: use the first render layers node output
        if rl_nodes:
            previous_chain_output = rl_nodes[0].outputs["Image"]
        else:
            raise RuntimeError("Cannot find existing chain to extend.")

    # -- Step 4: Insert new Alpha Over node --
    # Position it between the previous chain end and the Color Balance / Composite
    ao_x = feed_target.location.x - NODE_SPACING_X
    ao_node = tree.nodes.new(type='CompositorNodeAlphaOver')
    ao_node.name = f"AlphaOver_{name}"
    ao_node.label = f"Stack: {name}"
    ao_node.location = (ao_x, 0)
    ao_node.inputs["Fac"].default_value = opacity

    # Remove the old link feeding into the Color Balance / Composite
    for link in list(tree.links):
        if link.to_node == feed_target and link.to_socket.name == "Image":
            tree.links.remove(link)
            break

    # Wire: previous chain -> Alpha Over bottom, new layer -> Alpha Over top
    tree.links.new(previous_chain_output, ao_node.inputs[1])  # Bottom
    tree.links.new(current_output, ao_node.inputs[2])          # Top

    # Wire Alpha Over output -> Color Balance / Composite
    tree.links.new(ao_node.outputs["Image"], feed_target.inputs["Image"])

    # Shift Color Balance and outputs rightward to make room
    if color_balance_node:
        color_balance_node.location.x += NODE_SPACING_X
    if composite_node:
        composite_node.location.x += NODE_SPACING_X
    viewer_node = tree.nodes.get("Viewer")
    if viewer_node:
        viewer_node.location.x += NODE_SPACING_X

    result = {
        "status": "render_pass_added",
        "layer": {
            "name": name,
            "collection": collection,
            "opacity": opacity,
            "bloom": bloom,
            "bloom_threshold": bloom_threshold if bloom else None,
        },
        "nodes_created": [rl_node.name, ao_node.name] + ([f"Bloom_{name}"] if bloom else []),
    }
    print(json.dumps(result, indent=2))
    print(f"[compositor_layers] Render pass added: '{name}' "
          f"(collection='{collection}', opacity={opacity}, bloom={bloom})")

    return result


def composite_layers(output_name="composited", frame=None):
    """Render the multi-layer composite via async render (non-blocking).

    Verifies the compositor has nodes, then delegates to async_render for
    non-blocking Cycles rendering. Poll for completion with poll_status.

    Args:
        output_name: Name prefix for output files/directory (default "composited").
        frame: If specified, render a single frame (for test/preview).
               If None, render the full animation.

    Returns:
        Dict with render launch info (also printed as JSON).

    Raises:
        ValueError: If the compositor has no nodes.
    """
    scene = bpy.context.scene

    if not scene.use_nodes or not scene.node_tree or len(scene.node_tree.nodes) == 0:
        raise ValueError(
            "Compositor has no nodes. Call setup_multi_layer() first "
            "to build the compositor pipeline before rendering."
        )

    # Count layers for the status report
    rl_count = sum(1 for n in scene.node_tree.nodes if n.type == 'R_LAYERS')
    ao_count = sum(1 for n in scene.node_tree.nodes if n.type == 'ALPHAOVER')

    if frame is not None:
        from async_render import start_single_frame_render
        start_single_frame_render(output_name=output_name, frame=frame)
        render_type = "single_frame"
    else:
        from async_render import start_render
        start_render(output_name=output_name)
        render_type = "full_animation"

    result = {
        "status": "composite_render_started",
        "render_type": render_type,
        "output_name": output_name,
        "frame": frame,
        "compositor": {
            "render_layers": rl_count,
            "alpha_over_nodes": ao_count,
        },
    }
    print(json.dumps(result, indent=2))
    print(f"[compositor_layers] Composite render started: "
          f"{rl_count} layers, {ao_count} Alpha Over nodes, "
          f"output='{output_name}', type={render_type}")

    return result


def list_layers():
    """List all View Layers and their collection include/exclude assignments.

    Utility for debugging and inspecting the current multi-layer setup.
    Shows which collections each View Layer renders and which are excluded.

    Returns:
        Dict with view layer details (also printed as JSON).
    """
    scene = bpy.context.scene

    layers_info = []
    for vl in scene.view_layers:
        included = []
        excluded = []

        # Walk the layer collection tree to find include/exclude status
        _walk_layer_collections(vl.layer_collection, included, excluded)

        layers_info.append({
            "name": vl.name,
            "included_collections": included,
            "excluded_collections": excluded,
        })

    # Also report compositor node summary
    compositor_info = {"nodes": 0, "render_layers": 0, "alpha_over": 0}
    if scene.use_nodes and scene.node_tree:
        compositor_info["nodes"] = len(scene.node_tree.nodes)
        compositor_info["render_layers"] = sum(
            1 for n in scene.node_tree.nodes if n.type == 'R_LAYERS'
        )
        compositor_info["alpha_over"] = sum(
            1 for n in scene.node_tree.nodes if n.type == 'ALPHAOVER'
        )

    result = {
        "status": "layer_info",
        "view_layer_count": len(layers_info),
        "view_layers": layers_info,
        "compositor": compositor_info,
        "film_transparent": scene.render.film_transparent,
    }
    print(json.dumps(result, indent=2))
    return result


# ---------------------------------------------------------------------------
# Internal helper functions
# ---------------------------------------------------------------------------

def _configure_view_layer_collections(view_layer, include_collection_name):
    """Configure a View Layer to render ONLY the specified collection.

    Excludes all top-level collections except the named one. This ensures
    each View Layer renders its isolated element for alpha-over compositing.

    Args:
        view_layer: The bpy.types.ViewLayer to configure.
        include_collection_name: Name of the collection to include.
    """
    layer_col = view_layer.layer_collection
    for child in layer_col.children:
        if child.name == include_collection_name:
            child.exclude = False
        else:
            child.exclude = True


def _walk_layer_collections(layer_collection, included, excluded, depth=0):
    """Recursively walk a layer collection tree, recording include/exclude status.

    Args:
        layer_collection: The bpy.types.LayerCollection to walk.
        included: List to append included collection names to.
        excluded: List to append excluded collection names to.
        depth: Current recursion depth (0 = root, skip reporting).
    """
    # Skip the root Scene Collection (depth 0)
    if depth > 0:
        if layer_collection.exclude:
            excluded.append(layer_collection.name)
        else:
            included.append(layer_collection.name)

    for child in layer_collection.children:
        _walk_layer_collections(child, included, excluded, depth + 1)
