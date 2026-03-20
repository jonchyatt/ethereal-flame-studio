"""
EFS VR Cinema Template -- stereoscopic 360 camera, async VR render, and
spatial metadata injection for YouTube VR / Meta Quest playback.

Adds VR capability to ANY existing Blender scene. The three-function API
creates a panoramic equirectangular stereo camera, renders via the async
pipeline, and tags the output video with spherical metadata so headset
players and YouTube VR interpret it correctly.

Three-function API:
  create_vr_camera(quality) -> render_vr_stereo(output_name) -> inject_vr_metadata(video_path)

Usage (via MCP execute_blender_code calls):

  Call 1 -- Add VR camera to existing scene:
    import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
    from vr_template import create_vr_camera
    create_vr_camera(quality="preview")

  Call 2 -- Render VR stereo (single frame test):
    from vr_template import render_vr_stereo
    render_vr_stereo(output_name="vr_fire_test", frame=45)

  Call 3 -- Render VR stereo (full animation):
    from vr_template import render_vr_stereo
    render_vr_stereo(output_name="vr_fire_anim")

  Call 4 -- Poll render status:
    from poll_status import is_render_active
    is_render_active()

  Call 5 -- Inject VR metadata for YouTube/Quest playback:
    from vr_template import inject_vr_metadata
    inject_vr_metadata("C:/.../renders/vr_fire_anim/output.mp4")

VR-specific design decisions:
  - Camera is STATIC (no animation keyframes) -- VR camera motion causes
    nausea. The scene moves around the viewer, not the other way around.
  - IPD is 64mm (human average interpupillary distance) for comfortable
    stereoscopic separation. Do NOT increase beyond 70mm.
  - Convergence distance is 10m (OFFAXIS mode) for natural depth at
    typical VR viewing distances.
  - Top-bottom stereo layout (left eye on top, right on bottom) is the
    standard format for YouTube VR and Meta Quest.
  - Clip end set to 1000m -- VR environments need a far clipping plane
    to avoid visible cutoff in 360 views.
  - No Track To constraints -- in VR the user controls gaze direction.
    A constrained camera would fight the headset tracking.

Pitfall compliance:
  - Pitfall 2: Async render via start_render / start_single_frame_render
  - Pitfall 3: save_before_operate() called before VR camera creation
  - Pitfall 14: Single-frame render option for VR preview inspection
"""
import bpy
import json
import math
import subprocess
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

from scene_utils import save_before_operate, get_or_create_object, RENDERS_DIR
from fire_cinema_template import load_quality_preset
from async_render import start_render, start_single_frame_render

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")

# -- VR constants --
# 64mm is the average human interpupillary distance. This value determines
# the stereo separation between left and right eye renders. Changing this
# affects depth perception in the headset -- too high causes eye strain,
# too low flattens the 3D effect.
IPD_METERS = 0.064

# Convergence distance in meters. Objects at this distance appear at the
# screen plane (zero parallax). Objects closer appear to pop out, objects
# farther appear recessed. 10m is comfortable for most VR content.
CONVERGENCE_DISTANCE = 10.0

# Human standing eye height in meters. Places the VR camera at a natural
# viewpoint so the viewer feels "present" in the scene.
EYE_HEIGHT = 1.6


def create_vr_camera(quality="preview"):
    """Create a panoramic equirectangular stereo camera for VR rendering.

    Adds an 8K-capable stereoscopic 360 camera to the current scene,
    configures stereo multiview rendering with top-bottom layout, and
    adjusts Cycles samples for VR quality requirements.

    The camera is placed at human standing eye height (1.6m) with NO
    animation keyframes and NO Track To constraints. In VR, the viewer
    controls where they look -- the camera must remain static to prevent
    motion sickness.

    This function is additive -- it does NOT clear the existing scene.
    Call it after creating your fire/water/combo scene to add VR output
    capability.

    Args:
        quality: Quality preset name -- "draft", "preview", "production",
                 or "ultra". Controls VR resolution and sample count.
                 Default is "preview" (4096x2048, 128 samples).

    Returns:
        Dict summary of VR camera configuration (also printed as JSON).

    Raises:
        KeyError: If the named quality preset is not found.
        FileNotFoundError: If quality_presets.json is missing.

    Pitfall compliance:
        - Pitfall 3: save_before_operate() before camera creation
        - No keyframe_insert calls (static camera, prevents VR nausea)
    """
    # Load quality preset (includes vr_resolution_x, vr_resolution_y,
    # vr_samples_multiplier fields added for VR tiers)
    preset = load_quality_preset(quality)

    # Pitfall 3: Save before destructive operations
    save_before_operate(tag="vr_camera_creation")

    scene = bpy.context.scene

    # -- Create the VR camera --
    def _make_vr_camera():
        bpy.ops.object.camera_add(location=(0, 0, EYE_HEIGHT))

    camera = get_or_create_object("efs_vr_camera", _make_vr_camera)
    camera.location = (0, 0, EYE_HEIGHT)

    # -- Configure panoramic stereo projection --

    # Set camera type to panoramic (required for equirectangular)
    camera.data.type = 'PANO'

    # Set panorama type to equirectangular stereo (Cycles-only feature)
    camera.data.cycles.panorama_type = 'EQUIRECTANGULAR_STEREO'

    # Stereo convergence: OFFAXIS produces the most natural 3D effect
    # in VR headsets (parallel would have zero convergence)
    camera.data.stereo.convergence_mode = 'OFFAXIS'
    camera.data.stereo.convergence_distance = CONVERGENCE_DISTANCE

    # Interocular distance (IPD): 64mm human average
    camera.data.stereo.interocular_distance = IPD_METERS

    # Far clipping plane: 1000m so distant VR environment is not clipped
    camera.data.clip_end = 1000

    # CRITICAL: Do NOT add any animation keyframes to the camera.
    # Static position only. No rotation animation. VR camera motion
    # causes nausea. The scene moves around the viewer.

    # CRITICAL: Do NOT set Track To constraints. In VR the user looks
    # around freely -- constrained camera breaks headset tracking.

    # -- Configure scene render for VR stereo output --

    # Set VR resolution from preset tier
    scene.render.resolution_x = preset["vr_resolution_x"]
    scene.render.resolution_y = preset["vr_resolution_y"]
    scene.render.resolution_percentage = 100

    # Enable stereo multiview rendering
    scene.render.use_multiview = True
    scene.render.views_format = 'STEREO_3D'

    # Set stereo 3D output to top-bottom layout
    # (left eye on top, right eye on bottom -- YouTube VR standard)
    scene.render.image_settings.stereo_3d_format.display_mode = 'TOPBOTTOM'

    # Set as the active scene camera
    scene.camera = camera

    # Adjust Cycles samples: multiply base samples by VR multiplier
    # (VR needs more samples because equirectangular projection spreads
    # samples over a full sphere, reducing effective per-pixel density)
    vr_samples = int(preset["cycles_samples"] * preset["vr_samples_multiplier"])
    scene.cycles.samples = vr_samples

    # Ensure Cycles is the render engine (panoramic stereo is Cycles-only)
    scene.render.engine = 'CYCLES'

    # Enable denoiser (critical for VR -- noise is very visible in headset)
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'

    # Build result summary
    result = {
        "status": "vr_camera_created",
        "quality_preset": preset["name"],
        "camera": {
            "name": camera.name,
            "type": "PANO",
            "panorama_type": "EQUIRECTANGULAR_STEREO",
            "location": list(camera.location),
            "ipd_meters": IPD_METERS,
            "convergence_mode": "OFFAXIS",
            "convergence_distance": CONVERGENCE_DISTANCE,
            "clip_end": 1000,
            "animated": False,
            "track_to": False,
        },
        "render": {
            "resolution": f"{preset['vr_resolution_x']}x{preset['vr_resolution_y']}",
            "stereo_multiview": True,
            "stereo_layout": "TOPBOTTOM",
            "engine": "CYCLES",
            "samples": vr_samples,
            "samples_base": preset["cycles_samples"],
            "samples_multiplier": preset["vr_samples_multiplier"],
            "denoiser": "OPENIMAGEDENOISE",
        },
    }

    print(json.dumps(result, indent=2))
    return result


def render_vr_stereo(output_name="vr_output", frame=None):
    """Launch an async stereoscopic VR render via the established render pipeline.

    Verifies that the active camera is configured for VR panoramic stereo
    before launching the render. Uses start_render / start_single_frame_render
    from async_render.py so the MCP call returns immediately.

    The output will be a stereo image (or image sequence) with left eye on
    top and right eye on bottom, ready for ffmpeg muxing and VR metadata
    injection via inject_vr_metadata().

    Args:
        output_name: Name prefix for output files/directory. The render
                     output goes to blender/renders/{output_name}/.
                     Default is "vr_output".
        frame: If specified, render a single frame (for VR preview/test).
               If None, render the full animation frame range.

    Returns:
        Dict summary of the VR render launch (also printed as JSON).

    Raises:
        ValueError: If the active camera is not panoramic or if stereo
                    multiview is not enabled. Run create_vr_camera() first.

    Pitfall compliance:
        - Pitfall 2: Async render via INVOKE_DEFAULT (never blocks MCP)
        - Pitfall 14: Single-frame render option via frame parameter
    """
    scene = bpy.context.scene

    # -- Validate VR camera setup --

    if scene.camera is None:
        raise ValueError(
            "No active camera in scene. Run create_vr_camera() first."
        )

    if scene.camera.data.type != 'PANO':
        raise ValueError(
            f"Active camera '{scene.camera.name}' is type "
            f"'{scene.camera.data.type}', not 'PANO'. "
            f"Run create_vr_camera() to create a panoramic VR camera."
        )

    if not scene.render.use_multiview:
        raise ValueError(
            "Stereo multiview is not enabled on the scene render settings. "
            "Run create_vr_camera() to configure stereo rendering."
        )

    # -- Set file format to PNG for frame sequences --
    # PNG is lossless and compatible with ffmpeg muxing for final video
    scene.render.image_settings.file_format = 'PNG'

    # -- Launch async render --
    if frame is not None:
        render_result = start_single_frame_render(
            output_name=output_name,
            frame=frame,
        )
    else:
        render_result = start_render(
            output_name=output_name,
        )

    # Build VR-specific result summary
    result = {
        "status": "vr_render_started",
        "output_name": output_name,
        "output_dir": str(RENDERS_DIR / output_name),
        "stereo_mode": "TOPBOTTOM",
        "resolution": f"{scene.render.resolution_x}x{scene.render.resolution_y}",
        "camera": scene.camera.name,
        "panorama_type": scene.camera.data.cycles.panorama_type,
        "frame": frame if frame is not None else "full_animation",
        "render_result": render_result,
    }

    print(json.dumps(result, indent=2))
    return result


def inject_vr_metadata(input_path, output_path=None):
    """Tag a rendered video with spherical VR metadata for YouTube VR and Quest.

    Uses ffmpeg to inject spatial metadata tags that tell video players the
    content is a 360 stereoscopic video. This is required for YouTube VR to
    display the video in immersive mode and for Meta Quest to render it as
    a 3D 360 experience.

    The metadata tags used:
      - spherical=true: marks the video as 360 content
      - stitched=true: indicates the equirectangular projection is pre-stitched
      - stereo_mode=top_bottom: tells the player the stereo layout

    The video codec is copied (no re-encoding), so this operation is fast
    regardless of video length.

    Args:
        input_path: Absolute path to the input video file (mp4, mkv, etc.).
        output_path: Absolute path for the tagged output video. If None,
                     derives from input_path by inserting "_vr" before the
                     file extension (e.g., "render.mp4" -> "render_vr.mp4").

    Returns:
        Dict summary of the metadata injection (also printed as JSON).

    Raises:
        FileNotFoundError: If ffmpeg is not found on PATH, or if the input
                          file does not exist.
        RuntimeError: If ffmpeg returns a non-zero exit code.
        ValueError: If the output file is empty after injection (0 bytes).
    """
    input_path = Path(input_path)

    # Validate input file exists
    if not input_path.exists():
        raise FileNotFoundError(
            f"Input video not found: {input_path}\n"
            f"Render the VR scene first with render_vr_stereo()."
        )

    # Derive output path if not specified
    if output_path is None:
        stem = input_path.stem
        suffix = input_path.suffix
        output_path = input_path.parent / f"{stem}_vr{suffix}"
    else:
        output_path = Path(output_path)

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Build ffmpeg command for spatial metadata injection
    # Uses stream metadata tags that YouTube VR reads:
    #   spherical=true   -> 360 content flag
    #   stitched=true    -> pre-stitched equirectangular
    #   stereo_mode=top_bottom -> stereo layout format
    # -c copy means no re-encoding (fast passthrough)
    # -y overwrites output if it exists
    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(input_path),
        "-c", "copy",
        "-metadata:s:v:0", "spherical=true",
        "-metadata:s:v:0", "stitched=true",
        "-metadata:s:v:0", "stereo_mode=top_bottom",
        str(output_path),
    ]

    # Check ffmpeg is available
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            check=True,
        )
    except FileNotFoundError:
        raise FileNotFoundError(
            "ffmpeg not found on PATH. Install ffmpeg to inject VR metadata.\n"
            "Download: https://ffmpeg.org/download.html\n"
            "Windows: winget install ffmpeg  OR  choco install ffmpeg"
        )

    # Run ffmpeg metadata injection
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )

    if proc.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed with exit code {proc.returncode}.\n"
            f"stderr: {proc.stderr[:500]}"
        )

    # Verify output file exists and is not empty
    if not output_path.exists():
        raise RuntimeError(
            f"ffmpeg completed but output file not found: {output_path}"
        )

    output_size = output_path.stat().st_size
    if output_size == 0:
        raise ValueError(
            f"ffmpeg produced an empty output file (0 bytes): {output_path}\n"
            f"Check that the input video is valid."
        )

    # Build result summary
    result = {
        "status": "vr_metadata_injected",
        "input_path": str(input_path),
        "output_path": str(output_path),
        "output_size_bytes": output_size,
        "metadata_injected": {
            "spherical": True,
            "stitched": True,
            "stereo_mode": "top_bottom",
        },
    }

    print(json.dumps(result, indent=2))
    return result
