"""
EFS Scene Utilities -- foundational helpers for all Blender MCP scripts.

Import pattern (from execute_blender_code):
  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts'); from scene_utils import *

Safety rules enforced by this module:
  1. ALWAYS save before destructive operations (save_before_operate)
  2. ALWAYS use idempotent object creation (get_or_create_object)
  3. ALWAYS use full_scene_info() instead of blender-mcp's 10-object-capped get_scene_info
  4. ALWAYS clean cache before re-baking (clean_cache)
"""
import bpy
import os
import json
import shutil
from pathlib import Path

# -- Project paths (relative to repo root) --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
BLENDER_DIR = REPO_ROOT / "blender"
SCRIPTS_DIR = BLENDER_DIR / "scripts"
SCENES_DIR = BLENDER_DIR / "scenes"
CACHE_DIR = BLENDER_DIR / "cache"
RENDERS_DIR = BLENDER_DIR / "renders"
MASKS_DIR = BLENDER_DIR / "masks"


def save_before_operate(tag="mcp_operation"):
    """Save the current .blend file before any destructive operation.

    If the file has never been saved, saves to SCENES_DIR/untitled.blend.
    Returns the filepath that was saved.

    Addresses Pitfall 3: No undo management = corrupted scene state on script failure.
    """
    filepath = bpy.data.filepath
    if not filepath:
        filepath = str(SCENES_DIR / "untitled.blend")
    bpy.ops.wm.save_mainfile(filepath=filepath)
    # Push an undo step so we can revert if the next operation fails
    bpy.ops.ed.undo_push(message=f"Before {tag}")
    return filepath


def get_or_create_object(name, create_fn):
    """Idempotent object creation. If object 'name' exists, return it. Otherwise call create_fn().

    Usage:
        cube = get_or_create_object("efs_test_cube", lambda: bpy.ops.mesh.primitive_cube_add(size=2))

    Addresses Pitfall 3: Prevents duplicate objects on script re-run.
    """
    existing = bpy.data.objects.get(name)
    if existing is not None:
        return existing
    create_fn()
    obj = bpy.context.active_object
    obj.name = name
    return obj


def full_scene_info():
    """Return a dict with ALL objects in the scene (not capped at 10 like blender-mcp's get_scene_info).

    Returns dict with keys: object_count, objects (list of {name, type, location, rotation, scale, visible}).

    Addresses Pitfall 11: Claude cannot perceive 3D space -- this gives complete scene data as text.
    """
    objects = []
    for obj in bpy.data.objects:
        objects.append({
            "name": obj.name,
            "type": obj.type,
            "location": [round(v, 4) for v in obj.location],
            "rotation": [round(v, 4) for v in obj.rotation_euler],
            "scale": [round(v, 4) for v in obj.scale],
            "visible": obj.visible_get(),
        })
    result = {
        "object_count": len(objects),
        "objects": objects,
        "active_object": bpy.context.active_object.name if bpy.context.active_object else None,
        "scene_name": bpy.context.scene.name,
        "frame_current": bpy.context.scene.frame_current,
        "frame_start": bpy.context.scene.frame_start,
        "frame_end": bpy.context.scene.frame_end,
        "render_engine": bpy.context.scene.render.engine,
        "resolution_x": bpy.context.scene.render.resolution_x,
        "resolution_y": bpy.context.scene.render.resolution_y,
    }
    return json.dumps(result, indent=2)


def clean_cache(subdirectory=None):
    """Remove all files in the cache directory (or a named subdirectory).

    Addresses Pitfall 4: Mantaflow cache explosion fills disk without warning.
    Always call before starting a new bake.

    Args:
        subdirectory: Optional subdirectory name within cache/ to clean.
                      If None, cleans the entire cache/ directory.

    Returns: Number of bytes freed.
    """
    target = CACHE_DIR / subdirectory if subdirectory else CACHE_DIR
    if not target.exists():
        return 0

    freed = 0
    for item in target.iterdir():
        if item.name == ".gitkeep":
            continue
        if item.is_file():
            freed += item.stat().st_size
            item.unlink()
        elif item.is_dir():
            freed += sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
            shutil.rmtree(item)
    return freed


def check_disk_space_gb(min_gb=5):
    """Check that at least min_gb of free disk space is available on the cache drive.

    Returns (free_gb, ok) tuple.
    """
    import shutil as sh
    total, used, free = sh.disk_usage(str(CACHE_DIR))
    free_gb = free / (1024**3)
    return round(free_gb, 1), free_gb >= min_gb


def set_cache_directory(domain_obj, subdirectory):
    """Set the Mantaflow domain's cache directory to blender/cache/{subdirectory}.

    Creates the subdirectory if it does not exist.
    """
    cache_path = str(CACHE_DIR / subdirectory)
    os.makedirs(cache_path, exist_ok=True)
    domain_obj.modifiers["Fluid"].domain_settings.cache_directory = cache_path
    return cache_path
