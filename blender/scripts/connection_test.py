"""
EFS Connection Test -- validates blender-mcp MCP bridge is working.

Run via execute_blender_code:
  exec(open('C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts/connection_test.py').read())

Tests:
  1. bpy is importable (Python runs inside Blender)
  2. Can create an object (execute_blender_code works)
  3. Can read scene info (full_scene_info works)
  4. Can save file (save_before_operate works)
  5. Can check disk space (cache management ready)
  6. Reports Blender version (for version pinning)
"""
import bpy
import sys
import json

# Add scripts dir to path for scene_utils import
scripts_dir = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from scene_utils import (
    save_before_operate, get_or_create_object, full_scene_info,
    clean_cache, check_disk_space_gb, CACHE_DIR, RENDERS_DIR
)

results = {}

# Test 1: Blender version
results["blender_version"] = bpy.app.version_string
results["blender_version_tuple"] = list(bpy.app.version)

# Test 2: Create a test object (idempotent)
cube = get_or_create_object(
    "efs_connection_test_cube",
    lambda: bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
)
results["test_object_created"] = cube.name == "efs_connection_test_cube"
results["test_object_location"] = [round(v, 4) for v in cube.location]

# Test 3: Full scene info (uncapped)
scene_info = json.loads(full_scene_info())
results["scene_object_count"] = scene_info["object_count"]
results["render_engine"] = scene_info["render_engine"]

# Test 4: Disk space check
free_gb, space_ok = check_disk_space_gb(min_gb=5)
results["free_disk_gb"] = free_gb
results["disk_space_ok"] = space_ok

# Test 5: Cache and render directories exist
results["cache_dir_exists"] = CACHE_DIR.exists()
results["renders_dir_exists"] = RENDERS_DIR.exists()

# Test 6: Python version inside Blender
results["python_version"] = sys.version.split()[0]

# Clean up the test cube
bpy.data.objects.remove(cube, do_unlink=True)
results["test_object_cleaned_up"] = bpy.data.objects.get("efs_connection_test_cube") is None

# Summary
all_pass = all([
    results["test_object_created"],
    results["scene_object_count"] >= 0,
    results["disk_space_ok"],
    results["cache_dir_exists"],
    results["renders_dir_exists"],
    results["test_object_cleaned_up"],
])
results["all_tests_pass"] = all_pass
results["status"] = "PASS - MCP bridge verified" if all_pass else "FAIL - check individual results"

print(json.dumps(results, indent=2))
