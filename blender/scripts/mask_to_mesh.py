"""
EFS Mask-to-Mesh Converter -- creates Blender mesh proxy from mask image sequences.

Blender Python script (imports bpy) that converts binary mask PNGs produced by
sam_segmenter.py into a mesh proxy suitable as a particle emitter, volumetric
fill target, and Mantaflow flow source.

Pipeline position:
  video -> sam_segmenter.py -> mask PNGs -> mask_to_mesh.py -> efs_lumi_body mesh

Two public functions:
  load_masks_as_mesh(mask_dir, ...) -- low-level: contour extraction + mesh + shape keys
  create_body_proxy(mask_dir, ...) -- high-level: mesh + modifiers + particle slot

The mesh is a 2D silhouette extruded for depth (Solidify modifier), with shape keys
driven by frame number for animated deformation matching the original video.

Naming convention: efs_lumi_* (Luminous Being namespace, consistent with efs_fire_*, efs_edm_*).

Usage (via MCP execute_blender_code):
  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
  from mask_to_mesh import create_body_proxy
  result = create_body_proxy('C:/.../blender/masks/my_video/', quality='preview')
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
    _SCRIPTS_DIR = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scene_utils import (
    save_before_operate,
    get_or_create_object,
    MASKS_DIR,
)

# -- Constants --
DEFAULT_BODY_NAME = "efs_lumi_body"
REFERENCE_HEIGHT = 1.8  # Blender units -- average human height for scaling


def _try_import_cv2():
    """Try to import cv2 with a helpful error message for Blender environments.

    Returns:
        cv2 module if available, None if not.
    """
    try:
        import cv2
        return cv2
    except ImportError:
        return None


def _get_mask_files(mask_dir):
    """Get sorted list of mask PNG files from a directory.

    Args:
        mask_dir: Path to directory containing mask PNGs.

    Returns:
        List of Path objects sorted by name.

    Raises:
        FileNotFoundError: If mask directory does not exist.
        ValueError: If no mask PNGs found.
    """
    mask_dir = Path(mask_dir)
    if not mask_dir.exists():
        raise FileNotFoundError(
            f"Mask directory not found: {mask_dir}. "
            f"Run sam_segmenter.py first to generate masks."
        )

    mask_files = sorted(mask_dir.glob("*.png"))
    if not mask_files:
        raise ValueError(
            f"No PNG mask files found in {mask_dir}. "
            f"Expected files like frame_0001.png, frame_0002.png, ..."
        )

    return mask_files


def _extract_contour_cv2(mask_path, max_vertices=2000):
    """Extract simplified contour from a binary mask using OpenCV.

    Uses cv2.findContours to get the outline, then cv2.approxPolyDP
    to simplify to a manageable vertex count.

    Args:
        mask_path: Path to binary mask PNG.
        max_vertices: Maximum vertices in the simplified contour.

    Returns:
        List of (x, y) tuples representing the simplified contour,
        normalized to 0..1 range relative to image dimensions.
        Returns None if no contour found.
    """
    cv2 = _try_import_cv2()
    import numpy as np

    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        return None

    # Threshold to ensure clean binary
    _, binary = cv2.threshold(mask, 127, 255, cv2.THRESH_BINARY)

    # Find contours (external only -- we want the outer silhouette)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None

    # Select largest contour (the person)
    largest = max(contours, key=cv2.contourArea)

    # Simplify with approxPolyDP (epsilon = 0.5% of perimeter)
    perimeter = cv2.arcLength(largest, True)
    epsilon = 0.005 * perimeter
    simplified = cv2.approxPolyDP(largest, epsilon, True)

    # Further reduce if still over max_vertices
    while len(simplified) > max_vertices and epsilon < 0.05 * perimeter:
        epsilon *= 1.5
        simplified = cv2.approxPolyDP(largest, epsilon, True)

    h, w = mask.shape[:2]
    # Normalize to 0..1 range and return as list of (x, y) tuples
    points = [(float(pt[0][0]) / w, float(pt[0][1]) / h) for pt in simplified]

    return points


def _extract_contour_bpy(mask_path, max_vertices=2000):
    """Fallback contour extraction using Blender's image loading (no cv2 needed).

    Less accurate than cv2 approach but works in any Blender Python environment.

    Approach:
      1. Load mask image via bpy.data.images.load()
      2. Read pixel data, threshold at 0.5 for binary mask
      3. Simple edge detection by comparing adjacent pixels
      4. Creates a cruder but functional silhouette outline

    Args:
        mask_path: Path to binary mask PNG.
        max_vertices: Maximum vertices in the outline.

    Returns:
        List of (x, y) tuples normalized to 0..1 range.
        Returns None if no edge found.
    """
    # Load image into Blender
    img = bpy.data.images.load(str(mask_path))
    w, h = img.size[0], img.size[1]

    if w == 0 or h == 0:
        bpy.data.images.remove(img)
        return None

    # Read pixel data (flat array: R, G, B, A, R, G, B, A, ...)
    pixels = list(img.pixels)

    # Build binary grid from red channel (mask is grayscale)
    grid = []
    for y in range(h):
        row = []
        for x in range(w):
            idx = (y * w + x) * 4  # RGBA
            row.append(1 if pixels[idx] > 0.5 else 0)
        grid.append(row)

    # Simple edge detection: pixel is edge if it's 1 and any neighbor is 0
    edge_points = []
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if grid[y][x] == 1:
                is_edge = (
                    grid[y - 1][x] == 0 or grid[y + 1][x] == 0 or
                    grid[y][x - 1] == 0 or grid[y][x + 1] == 0
                )
                if is_edge:
                    edge_points.append((float(x) / w, float(y) / h))

    # Clean up loaded image
    bpy.data.images.remove(img)

    if not edge_points:
        return None

    # Subsample if too many edge points
    if len(edge_points) > max_vertices:
        step = max(1, len(edge_points) // max_vertices)
        edge_points = edge_points[::step]

    return edge_points


def _extract_contour(mask_path, max_vertices=2000):
    """Extract contour from mask, using cv2 if available, bpy fallback otherwise.

    Args:
        mask_path: Path to binary mask PNG.
        max_vertices: Maximum vertices.

    Returns:
        List of (x, y) tuples normalized to 0..1 range, or None.
    """
    cv2 = _try_import_cv2()
    if cv2 is not None:
        return _extract_contour_cv2(mask_path, max_vertices)
    else:
        print("[mask_to_mesh] WARNING: cv2 not available, using bpy fallback "
              "(less accurate contours). Install opencv-python for better results.")
        return _extract_contour_bpy(mask_path, max_vertices)


def _create_mesh_from_contour(name, contour_points, depth=0.1):
    """Create a flat 2D mesh from contour points in the XZ plane.

    The mesh is oriented as a standing person in the XZ plane:
      - X axis = left-right
      - Z axis = up-down (standing height)
      - Y axis = depth (extruded slightly)

    The contour is scaled so the person height = REFERENCE_HEIGHT (1.8 BU)
    and centered at the origin.

    Args:
        name: Blender object name.
        contour_points: List of (x, y) tuples in 0..1 normalized range.
        depth: Extrusion depth in Blender units.

    Returns:
        The created bpy.types.Object.
    """
    import bmesh

    if not contour_points:
        raise ValueError("Cannot create mesh from empty contour")

    # Calculate bounding box for scaling
    xs = [p[0] for p in contour_points]
    ys = [p[1] for p in contour_points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    contour_width = max_x - min_x
    contour_height = max_y - min_y

    if contour_height < 0.001:
        raise ValueError("Contour has near-zero height -- invalid mask")

    # Scale factor to match REFERENCE_HEIGHT in Z
    scale = REFERENCE_HEIGHT / contour_height

    # Center offset
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0

    # Create mesh
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    # Create vertices in XZ plane (Y flipped because image Y goes down)
    verts = []
    for px, py in contour_points:
        x = (px - center_x) * scale
        z = (center_y - py) * scale  # Flip Y for Blender Z-up
        verts.append(bm.verts.new((x, 0.0, z)))

    bm.verts.ensure_lookup_table()

    # Create edges connecting consecutive vertices (closed loop)
    for i in range(len(verts)):
        bm.edges.new((verts[i], verts[(i + 1) % len(verts)]))

    # Create face from the loop
    try:
        bm.faces.new(verts)
    except ValueError:
        # Face creation can fail if vertices are degenerate
        # Still usable as an edge loop for particle emission
        pass

    bm.to_mesh(mesh)
    bm.free()

    # Create object and link to scene
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Center at origin
    obj.location = (0.0, 0.0, REFERENCE_HEIGHT / 2.0)

    return obj


def _add_shape_keys_from_masks(obj, mask_files, max_vertices, max_keys=100,
                               sample_step=1):
    """Add shape keys to the mesh from subsequent mask frames.

    Each shape key represents the person's silhouette at a different frame.
    Shape keys are driven by frame number so the mesh auto-deforms during
    animation playback.

    If frame count > max_keys, samples every Nth frame to keep shape key
    count manageable. Linear interpolation between keys gives smooth motion.

    Args:
        obj: The Blender mesh object.
        mask_files: List of mask file paths.
        max_vertices: Maximum vertices per contour.
        max_keys: Maximum number of shape keys.
        sample_step: Sample every Nth mask frame.

    Returns:
        Number of shape keys added.
    """
    if len(mask_files) <= 1:
        return 0

    # Adjust sample step if too many frames
    effective_step = sample_step
    while len(mask_files) // effective_step > max_keys:
        effective_step += 1

    # Create basis shape key from current mesh
    basis_key = obj.shape_key_add(name="Basis", from_mix=False)

    base_mesh = obj.data
    base_vert_count = len(base_mesh.vertices)

    shape_key_count = 0

    for i in range(0, len(mask_files), effective_step):
        if i == 0:
            continue  # First frame is the basis

        contour = _extract_contour(str(mask_files[i]), max_vertices)
        if contour is None:
            continue

        # Create shape key
        frame_num = i + 1
        key_name = f"frame_{frame_num:04d}"
        sk = obj.shape_key_add(name=key_name, from_mix=False)

        # Calculate center and scale matching the basis approach
        xs = [p[0] for p in contour]
        ys = [p[1] for p in contour]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        contour_height = max_y - min_y

        if contour_height < 0.001:
            continue

        scale = REFERENCE_HEIGHT / contour_height
        center_x = (min_x + max_x) / 2.0
        center_y = (min_y + max_y) / 2.0

        # Map contour points to shape key vertex positions
        # Match vertex count: use as many contour points as we have vertices
        for vi in range(min(base_vert_count, len(contour))):
            px, py = contour[vi % len(contour)]
            x = (px - center_x) * scale
            z = (center_y - py) * scale
            sk.data[vi].co = (x, 0.0, z)

        # Set up driver: shape key value driven by frame number
        # Normalize: value goes from 0 to 1 between this key's frame range
        sk.value = 0.0

        # Add driver on the shape key value
        try:
            fcurve = sk.driver_add("value")
            driver = fcurve.driver
            driver.type = 'SCRIPTED'

            # Add frame variable
            var = driver.variables.new()
            var.name = "frame"
            var.type = 'SINGLE_PROP'
            var.targets[0].id_type = 'SCENE'
            var.targets[0].id = bpy.context.scene
            var.targets[0].data_path = "frame_current"

            # Expression: triangular window centered on this frame
            # Each key active for effective_step frames on each side
            half_window = effective_step
            driver.expression = (
                f"max(0.0, 1.0 - abs(frame - {frame_num}) / {half_window})"
            )
        except Exception as e:
            print(f"[mask_to_mesh] Warning: Could not add driver for {key_name}: {e}")

        shape_key_count += 1

    return shape_key_count


def load_masks_as_mesh(mask_dir, name="efs_lumi_body", max_vertices=2000,
                       smooth_factor=2.0):
    """Load mask image sequence and create an animated mesh proxy.

    Low-level function that:
      1. Loads first mask frame to determine body silhouette contour
      2. Creates a flat 2D mesh in the XZ plane (standing person convention)
      3. Scales mesh to REFERENCE_HEIGHT (1.8 Blender units)
      4. Centers mesh at origin
      5. Adds shape keys from subsequent frames for animation
      6. Sets up shape key drivers linked to frame number

    Args:
        mask_dir: Path to directory containing mask PNGs from sam_segmenter.py.
        name: Blender object name (default "efs_lumi_body").
        max_vertices: Maximum vertices in the simplified contour.
        smooth_factor: Subdivision smooth factor (applied via Smooth modifier).

    Returns:
        The created bpy.types.Object.

    Raises:
        FileNotFoundError: If mask_dir does not exist.
        ValueError: If no masks found or contour extraction fails.
    """
    mask_files = _get_mask_files(mask_dir)

    print(f"[mask_to_mesh] Loading {len(mask_files)} masks from {mask_dir}")
    print(json.dumps({"stage": "loading", "mask_count": len(mask_files)}))

    # Extract contour from first frame
    first_contour = _extract_contour(str(mask_files[0]), max_vertices)
    if first_contour is None:
        raise ValueError(
            f"Could not extract contour from first mask: {mask_files[0]}. "
            f"Mask may be empty or corrupted."
        )

    print(f"[mask_to_mesh] First frame contour: {len(first_contour)} vertices")

    # Check if object already exists (idempotent via get_or_create_object)
    existing = bpy.data.objects.get(name)
    if existing is not None:
        print(f"[mask_to_mesh] Object '{name}' already exists, removing for rebuild")
        bpy.data.objects.remove(existing, do_unlink=True)

    # Create mesh from first frame contour
    obj = _create_mesh_from_contour(name, first_contour)

    print(json.dumps({
        "stage": "mesh_created",
        "name": obj.name,
        "vertices": len(obj.data.vertices),
    }))

    # Add shape keys from subsequent frames
    sample_step = 1
    if len(mask_files) > 100:
        sample_step = max(1, len(mask_files) // 100)

    shape_key_count = _add_shape_keys_from_masks(
        obj, mask_files, max_vertices,
        max_keys=100, sample_step=sample_step,
    )

    print(f"[mask_to_mesh] Added {shape_key_count} shape keys "
          f"(sample step: {sample_step})")

    # Apply smooth modifier for softer silhouette
    if smooth_factor > 0:
        smooth_mod = obj.modifiers.new(name="Smooth", type='SMOOTH')
        smooth_mod.factor = smooth_factor
        smooth_mod.iterations = 3

    # Set frame range to match mask count
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = len(mask_files)

    print(json.dumps({
        "stage": "complete",
        "name": obj.name,
        "vertices": len(obj.data.vertices),
        "shape_keys": shape_key_count,
        "frame_range": [1, len(mask_files)],
    }))

    return obj


def create_body_proxy(mask_dir, quality="preview"):
    """Create a complete body proxy mesh ready for effects attachment.

    High-level convenience function that calls load_masks_as_mesh() with
    quality-appropriate settings, then adds modifiers and prepares the mesh
    for use as:
      a. Particle emitter (empty particle system slot)
      b. Mantaflow flow source (compatible with Flow modifier)
      c. Volumetric fill target (material slot for Principled Volume)

    Quality presets:
      "draft":      max_vertices=500,  sample every 5th frame
      "preview":    max_vertices=1000, sample every 3rd frame
      "production": max_vertices=2000, sample every frame

    Args:
        mask_dir: Path to directory containing mask PNGs.
        quality: Quality preset -- "draft", "preview", or "production".

    Returns:
        Dict: {"status": "body_proxy_created", "name": str,
               "vertex_count": int, "shape_keys": int,
               "frame_range": [start, end]}
    """
    # Quality presets
    presets = {
        "draft": {"max_vertices": 500, "sample_step": 5, "subdiv_level": 0},
        "preview": {"max_vertices": 1000, "sample_step": 3, "subdiv_level": 1},
        "production": {"max_vertices": 2000, "sample_step": 1, "subdiv_level": 1},
    }

    if quality not in presets:
        raise ValueError(
            f"Unknown quality '{quality}'. Available: {list(presets.keys())}"
        )

    preset = presets[quality]
    print(f"[mask_to_mesh] Creating body proxy at '{quality}' quality")
    print(json.dumps({"stage": "starting", "quality": quality, "preset": preset}))

    # Save before destructive operations
    save_before_operate(tag="mask_to_mesh_body_proxy")

    # Create base mesh with shape keys
    mask_files = _get_mask_files(mask_dir)
    obj = load_masks_as_mesh(
        mask_dir=mask_dir,
        name=DEFAULT_BODY_NAME,
        max_vertices=preset["max_vertices"],
        smooth_factor=2.0,
    )

    # Use get_or_create_object pattern for naming consistency
    # (load_masks_as_mesh already handles this, but ensure the name sticks)
    obj.name = DEFAULT_BODY_NAME

    # -- Subdivision Surface modifier for smoother silhouette --
    if preset["subdiv_level"] > 0:
        subdiv_mod = obj.modifiers.new(name="Subdivision", type='SUBSURF')
        subdiv_mod.levels = preset["subdiv_level"]
        subdiv_mod.render_levels = preset["subdiv_level"]
        print(f"[mask_to_mesh] Subdivision Surface added: level {preset['subdiv_level']}")

    # -- Solidify modifier for mesh depth (volumetric material needs volume) --
    solidify_mod = obj.modifiers.new(name="Solidify", type='SOLIDIFY')
    solidify_mod.thickness = 0.15
    solidify_mod.offset = 0.0  # Center the solidification
    solidify_mod.use_even_offset = True
    print("[mask_to_mesh] Solidify modifier added: thickness=0.15")

    # -- Particle system slot (empty, configured by luminous_being_template.py later) --
    obj.modifiers.new(name="Particles", type='PARTICLE_SYSTEM')
    ps = obj.particle_systems[-1]
    ps.settings.count = 0  # Empty -- configured by downstream template
    ps.settings.emit_from = 'FACE'
    print("[mask_to_mesh] Empty particle system slot added")

    # -- Material slot for volumetric fill --
    if not obj.data.materials:
        # Create a placeholder material (replaced by luminous_being_template.py)
        placeholder_mat = bpy.data.materials.get("efs_lumi_body_material")
        if placeholder_mat is None:
            placeholder_mat = bpy.data.materials.new(name="efs_lumi_body_material")
        placeholder_mat.use_nodes = True
        obj.data.materials.append(placeholder_mat)
        print("[mask_to_mesh] Placeholder material slot added")

    # -- Hide from render (raw mesh invisible, only effects show) --
    obj.hide_render = True
    obj.display_type = 'WIRE'  # Wireframe in viewport for visibility of effects

    # -- Collect shape key count --
    shape_key_count = 0
    if obj.data.shape_keys:
        # Subtract 1 for Basis key
        shape_key_count = len(obj.data.shape_keys.key_blocks) - 1

    # Build result
    result = {
        "status": "body_proxy_created",
        "name": obj.name,
        "vertex_count": len(obj.data.vertices),
        "shape_keys": shape_key_count,
        "frame_range": [bpy.context.scene.frame_start, bpy.context.scene.frame_end],
        "quality": quality,
        "modifiers": ["Smooth", "Subdivision", "Solidify", "Particles"]
        if preset["subdiv_level"] > 0
        else ["Smooth", "Solidify", "Particles"],
        "hide_render": True,
    }

    print(json.dumps(result, indent=2))
    return result
