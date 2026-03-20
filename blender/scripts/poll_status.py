"""
EFS Poll Status -- check progress of async bake or render operations.

Usage via execute_blender_code:
  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
  from poll_status import poll_status, poll_render_frames
  result = poll_status()               # Check status file
  result = poll_render_frames("fire_orb_test")  # Count rendered frames

Lightweight -- designed for repeated polling without token waste.
"""
import json
import os
from pathlib import Path

STATUS_FILE = Path("C:/Users/jonch/Projects/ethereal-flame-studio/blender/cache/.efs_status.json")
RENDERS_DIR = Path("C:/Users/jonch/Projects/ethereal-flame-studio/blender/renders")


def poll_status():
    """Read the current status from the status file.

    Returns JSON with: operation, state, detail, progress, timestamp.
    State values: "starting" | "running" | "complete" | "error"
    """
    if not STATUS_FILE.exists():
        result = {"status": "no_operation", "detail": "No status file found -- no bake or render has been started"}
        print(json.dumps(result, indent=2))
        return result

    status = json.loads(STATUS_FILE.read_text())
    print(json.dumps(status, indent=2))
    return status


def poll_render_frames(output_name, expected_frames=None):
    """Count rendered frames in the output directory.

    Args:
        output_name: Name prefix matching the start_render output_name
        expected_frames: Total expected frames (for progress calculation)

    Returns JSON with: completed_frames, expected_frames, progress, latest_frame, output_dir.
    """
    output_dir = RENDERS_DIR / output_name
    if not output_dir.exists():
        result = {"error": f"Output directory not found: {output_dir}"}
        print(json.dumps(result, indent=2))
        return result

    # Count image files (PNG, EXR, JPEG)
    image_extensions = {".png", ".exr", ".jpg", ".jpeg"}
    frames = sorted([
        f for f in output_dir.iterdir()
        if f.is_file() and f.suffix.lower() in image_extensions
    ])

    completed = len(frames)
    latest = frames[-1].name if frames else None
    progress = round((completed / expected_frames) * 100, 1) if expected_frames and expected_frames > 0 else 0

    result = {
        "completed_frames": completed,
        "expected_frames": expected_frames,
        "progress": progress,
        "latest_frame": latest,
        "output_dir": str(output_dir),
        "is_complete": completed >= expected_frames if expected_frames else False,
    }
    print(json.dumps(result, indent=2))
    return result


def is_render_active():
    """Check if Blender currently has an active render running.

    Uses bpy to check render status. Must be called via execute_blender_code.
    """
    import bpy
    # Check if the render result exists and has an active render
    result = {
        "render_active": bpy.app.is_job_running('RENDER'),
        "blender_version": bpy.app.version_string,
    }
    print(json.dumps(result, indent=2))
    return result
