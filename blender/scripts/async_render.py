"""
EFS Async Render -- non-blocking Cycles render launcher.

Usage via execute_blender_code:
  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
  from async_render import start_render
  start_render(output_name="fire_orb_test", samples=128, engine="CYCLES")

The render runs in Blender's render window (INVOKE_DEFAULT). The MCP call returns
immediately. Use poll_status.py to check progress by counting output frames.

Addresses Pitfall 2: 180-second MCP timeout kills renders silently.
"""
import bpy
import json
import time
import os
from pathlib import Path

STATUS_FILE = Path("C:/Users/jonch/Projects/ethereal-flame-studio/blender/cache/.efs_status.json")
RENDERS_DIR = Path("C:/Users/jonch/Projects/ethereal-flame-studio/blender/renders")


def _write_status(operation, state, detail="", progress=0, extra=None):
    """Write status to JSON file for polling."""
    status = {
        "operation": operation,
        "state": state,
        "detail": detail,
        "progress": progress,
        "timestamp": time.time(),
    }
    if extra:
        status.update(extra)
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def start_render(output_name, samples=128, engine="CYCLES",
                 resolution_x=1920, resolution_y=1080,
                 frame_start=None, frame_end=None,
                 use_denoiser=True, file_format="PNG"):
    """Launch a render asynchronously via INVOKE_DEFAULT.

    Args:
        output_name: Name prefix for output files (e.g., "fire_orb_test")
        samples: Render samples (128 with denoiser is usually sufficient)
        engine: "CYCLES" or "BLENDER_EEVEE_NEXT"
        resolution_x: Horizontal resolution (default 1920)
        resolution_y: Vertical resolution (default 1080)
        frame_start: Start frame (None = use scene setting)
        frame_end: End frame (None = use scene setting)
        use_denoiser: Enable OpenImageDenoise (recommended for lower sample counts)
        file_format: Output format -- "PNG", "OPEN_EXR", "JPEG"

    Returns immediately. Poll for completion via poll_status.py.
    """
    scene = bpy.context.scene

    # Save before render (Pitfall 3)
    bpy.ops.wm.save_mainfile()

    # Configure render engine
    scene.render.engine = engine

    # Configure samples
    if engine == "CYCLES":
        scene.cycles.samples = samples
        scene.cycles.use_denoising = use_denoiser
        if use_denoiser:
            scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    elif engine == "BLENDER_EEVEE_NEXT":
        scene.eevee.taa_render_samples = samples

    # Configure resolution
    scene.render.resolution_x = resolution_x
    scene.render.resolution_y = resolution_y
    scene.render.resolution_percentage = 100

    # Configure output
    output_dir = str(RENDERS_DIR / output_name)
    os.makedirs(output_dir, exist_ok=True)
    scene.render.filepath = output_dir + "/"
    scene.render.image_settings.file_format = file_format

    # Configure frame range
    if frame_start is not None:
        scene.frame_start = frame_start
    if frame_end is not None:
        scene.frame_end = frame_end

    total_frames = scene.frame_end - scene.frame_start + 1

    _write_status("render", "starting", f"Launching {engine} render: {output_name}", 0, extra={
        "output_dir": output_dir,
        "total_frames": total_frames,
        "samples": samples,
        "resolution": f"{resolution_x}x{resolution_y}",
        "engine": engine,
    })

    # Check if this is a single frame or animation
    if total_frames == 1:
        # Single frame: render still image
        # Use INVOKE_DEFAULT so the render runs in Blender's window (non-blocking for MCP)
        bpy.ops.render.render('INVOKE_DEFAULT', write_still=True)
    else:
        # Animation: render all frames to output directory
        # INVOKE_DEFAULT renders animation non-blocking
        bpy.ops.render.render('INVOKE_DEFAULT', animation=True)

    result = {
        "status": "render_started",
        "output_dir": output_dir,
        "total_frames": total_frames,
        "engine": engine,
        "samples": samples,
        "resolution": f"{resolution_x}x{resolution_y}",
        "poll_file": str(STATUS_FILE),
    }
    print(json.dumps(result))
    return result


def start_single_frame_render(output_name, frame=None, **kwargs):
    """Convenience wrapper to render a single frame.

    Args:
        output_name: Output file name prefix
        frame: Frame number to render (None = current frame)
        **kwargs: Passed to start_render (samples, engine, resolution_x, etc.)
    """
    scene = bpy.context.scene
    if frame is not None:
        scene.frame_set(frame)
    return start_render(
        output_name=output_name,
        frame_start=scene.frame_current,
        frame_end=scene.frame_current,
        **kwargs
    )
