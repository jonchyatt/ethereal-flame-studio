"""
EFS End-to-End Pipeline Orchestrator -- audio file in, rendered video out.

Chains the complete pipeline: create scene -> apply audio keyframes -> bake
simulation -> render output. One function call goes from an audio analysis
JSON file to a finished rendered video, with per-step timing and error handling.

Supports all 5 EFS templates (fire, water, combo, edm, luminous) via the
SUPPORTED_TEMPLATES registry. Each template defines its create/audio/bake/render
functions, default preset, and whether baking is required.

Usage:
  from pipeline import run_pipeline, list_templates
  run_pipeline("C:/.../audio.json", "fire", "fire_cinema", "preview")

  # Minimal (uses template defaults):
  run_pipeline("C:/.../audio.json", "fire")

  # With VR output:
  run_pipeline("C:/.../audio.json", "combo", quality="production", vr=True)

  # List available templates:
  list_templates()
"""
import bpy
import json
import time
import os
import sys
from pathlib import Path

# -- sys.path setup (same __file__ fallback pattern as other EFS scripts) --
try:
    _SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    _SCRIPTS_DIR = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scene_utils import REPO_ROOT, RENDERS_DIR
from poll_status import poll_status, is_render_active

# ---------------------------------------------------------------------------
# Template registry
# ---------------------------------------------------------------------------

SUPPORTED_TEMPLATES = {
    "fire": {
        "module": "fire_cinema_template",
        "create": "create_fire_scene",
        "audio": "apply_audio",
        "bake": "bake_fire",
        "render": "render_fire",
        "default_preset": "fire_cinema",
        "default_output": "fire_pipeline",
        "needs_bake": True,
        "description": "Mantaflow fire simulation with Principled Volume material",
    },
    "water": {
        "module": "water_template",
        "create": "create_water_scene",
        "audio": "apply_water_audio",
        "bake": "bake_ocean",
        "render": "render_water",
        "default_preset": "water_ocean",
        "default_output": "water_pipeline",
        "needs_bake": False,
        "description": "Ocean Modifier water surface with Glass BSDF refraction",
    },
    "combo": {
        "module": "combo_fire_water",
        "create": "create_fire_water_scene",
        "audio": "apply_combo_audio",
        "bake": "bake_fire_water",
        "render": "render_fire_water",
        "default_preset": "fire_water_combo",
        "default_output": "combo_pipeline",
        "needs_bake": True,
        "description": "Fire hovering above reflective water with caustics and HDRI",
    },
    "edm": {
        "module": "edm_light_template",
        "create": "create_edm_scene",
        "audio": "apply_edm_audio",
        "bake": None,
        "render": "render_edm",
        "default_preset": "edm_lights",
        "default_output": "edm_pipeline",
        "needs_bake": False,
        "description": "Concert-venue laser and LED light show in total darkness",
    },
    "luminous": {
        "module": "luminous_being_template",
        "create": "create_luminous_scene",
        "audio": "apply_luminous_audio",
        "bake": "bake_luminous",
        "render": "render_luminous",
        "default_preset": "luminous_being",
        "default_output": "luminous_pipeline",
        "needs_bake": True,
        "description": "Person silhouette as glowing being with 4 effect layers",
    },
}


# ---------------------------------------------------------------------------
# Wait helpers (shared bake/render polling loops)
# ---------------------------------------------------------------------------

def _wait_for_bake(timeout=3600):
    """Poll bake status until complete, error, or timeout.

    Args:
        timeout: Maximum seconds to wait (default 1 hour).

    Returns:
        True if bake completed successfully, False on error/timeout.
    """
    elapsed = 0
    while elapsed < timeout:
        time.sleep(5)
        elapsed += 5

        status = poll_status()
        state = status.get("state", "")

        if state == "complete":
            print(f"[pipeline] Bake complete ({elapsed}s)")
            return True
        elif state == "error":
            detail = status.get("detail", "unknown error")
            print(f"[pipeline] Bake error: {detail}")
            return False

        # Progress report every 30 seconds
        if elapsed % 30 == 0:
            progress = status.get("progress", 0)
            print(f"[pipeline] Bake in progress... {elapsed}s, {progress}%")

    print(f"[pipeline] Bake timed out after {timeout}s")
    return False


def _wait_for_render(timeout=7200):
    """Poll render status until complete or timeout.

    Args:
        timeout: Maximum seconds to wait (default 2 hours).

    Returns:
        True if render completed, False on timeout.
    """
    elapsed = 0
    while elapsed < timeout:
        time.sleep(10)
        elapsed += 10

        result = is_render_active()
        if not result.get("render_active", False):
            print(f"[pipeline] Render complete ({elapsed}s)")
            return True

        # Progress report every 60 seconds
        if elapsed % 60 == 0:
            print(f"[pipeline] Render in progress... {elapsed}s elapsed")

    print(f"[pipeline] Render timed out after {timeout}s")
    return False


# ---------------------------------------------------------------------------
# Template function loader
# ---------------------------------------------------------------------------

def _load_template_funcs(template_name):
    """Dynamically import and return the template's callable functions.

    Returns dict with keys: create, audio, bake (or None), render.
    """
    config = SUPPORTED_TEMPLATES[template_name]
    module_name = config["module"]

    # Dynamic import
    import importlib
    mod = importlib.import_module(module_name)

    funcs = {
        "create": getattr(mod, config["create"]),
        "audio": getattr(mod, config["audio"]),
        "render": getattr(mod, config["render"]),
    }

    if config["bake"] is not None:
        funcs["bake"] = getattr(mod, config["bake"])
    else:
        funcs["bake"] = None

    return funcs


# ---------------------------------------------------------------------------
# Main pipeline orchestrator
# ---------------------------------------------------------------------------

def run_pipeline(audio_json, template, preset=None, quality="preview",
                 output_name=None, vr=False, **kwargs):
    """Run the complete audio-to-rendered-video pipeline.

    Chains: create scene -> apply audio -> bake (if needed) -> render -> VR (if requested).

    Args:
        audio_json: Path to audio analysis JSON file.
        template: Template name ("fire", "water", "combo", "edm", "luminous").
        preset: Audio mapping preset name. Defaults to template's default.
        quality: Quality preset ("draft", "preview", "production", "ultra").
        output_name: Render output prefix. Defaults to template's default.
        vr: If True, also render a VR stereo output after the main render.
        **kwargs: Template-specific args passed to create function:
                  - hdri_path (combo): Path to HDRI environment map
                  - mask_dir (luminous): Path to mask sequence directory
                  - particle_mode (luminous): "flame" | "mist" | "solar_breath"

    Returns:
        Dict with status, template, quality, preset, output_name, duration_seconds,
        steps_completed, and per-step timing. On error: status="error", failed_at=step.
    """
    # Validate template
    if template not in SUPPORTED_TEMPLATES:
        print(f"[pipeline] ERROR: Unknown template '{template}'")
        print(f"[pipeline] Supported: {', '.join(SUPPORTED_TEMPLATES.keys())}")
        return {"status": "error", "failed_at": "validation",
                "error": f"Unknown template: {template}"}

    config = SUPPORTED_TEMPLATES[template]

    # Apply defaults
    if preset is None:
        preset = config["default_preset"]
    if output_name is None:
        output_name = config["default_output"]

    print(f"\n{'='*60}")
    print(f"[pipeline] EFS Audio-to-Video Pipeline")
    print(f"[pipeline] Template: {template} ({config['description']})")
    print(f"[pipeline] Quality:  {quality}")
    print(f"[pipeline] Preset:   {preset}")
    print(f"[pipeline] Audio:    {audio_json}")
    print(f"[pipeline] Output:   {output_name}")
    print(f"[pipeline] VR:       {vr}")
    print(f"{'='*60}")

    pipeline_start = time.time()
    steps_completed = []
    step_timings = {}

    # Load template functions
    try:
        funcs = _load_template_funcs(template)
    except Exception as e:
        return {"status": "error", "failed_at": "import",
                "error": f"Failed to import {template} template: {e}",
                "duration_seconds": 0}

    # -----------------------------------------------------------------------
    # Step 1: Create scene
    # -----------------------------------------------------------------------
    try:
        step_start = time.time()
        print(f"\n[pipeline] Step 1: Create {template} scene (quality={quality})...")

        # Build create args based on template
        if template == "combo":
            funcs["create"](quality=quality, hdri_path=kwargs.get("hdri_path"))
        elif template == "luminous":
            funcs["create"](
                mask_dir=kwargs.get("mask_dir", ""),
                quality=quality,
                particle_mode=kwargs.get("particle_mode", "flame"),
            )
        else:
            funcs["create"](quality=quality)

        step_duration = time.time() - step_start
        step_timings["create"] = round(step_duration, 1)
        steps_completed.append("create")
        print(f"[pipeline] Step 1: Create scene ({step_duration:.1f}s)")
    except Exception as e:
        duration = time.time() - pipeline_start
        print(f"[pipeline] FAILED at Step 1 (create): {e}")
        return {"status": "error", "failed_at": "create", "error": str(e),
                "steps_completed": steps_completed,
                "duration_seconds": round(duration, 1)}

    # -----------------------------------------------------------------------
    # Step 2: Apply audio keyframes
    # -----------------------------------------------------------------------
    try:
        step_start = time.time()
        print(f"\n[pipeline] Step 2: Apply audio keyframes (preset={preset})...")

        funcs["audio"](audio_json, preset)

        step_duration = time.time() - step_start
        step_timings["audio"] = round(step_duration, 1)
        steps_completed.append("audio")
        print(f"[pipeline] Step 2: Apply audio ({step_duration:.1f}s)")
    except Exception as e:
        duration = time.time() - pipeline_start
        print(f"[pipeline] FAILED at Step 2 (audio): {e}")
        return {"status": "error", "failed_at": "audio", "error": str(e),
                "steps_completed": steps_completed,
                "duration_seconds": round(duration, 1)}

    # -----------------------------------------------------------------------
    # Step 3: Bake simulation (if needed)
    # -----------------------------------------------------------------------
    if config["needs_bake"] and funcs["bake"] is not None:
        try:
            step_start = time.time()
            print(f"\n[pipeline] Step 3: Bake {template} simulation...")

            funcs["bake"]()

            if not _wait_for_bake():
                duration = time.time() - pipeline_start
                print(f"[pipeline] FAILED at Step 3 (bake): Bake failed or timed out")
                return {"status": "error", "failed_at": "bake",
                        "error": "Bake failed or timed out",
                        "steps_completed": steps_completed,
                        "duration_seconds": round(duration, 1)}

            step_duration = time.time() - step_start
            step_timings["bake"] = round(step_duration, 1)
            steps_completed.append("bake")
            print(f"[pipeline] Step 3: Bake ({step_duration:.1f}s)")
        except Exception as e:
            duration = time.time() - pipeline_start
            print(f"[pipeline] FAILED at Step 3 (bake): {e}")
            return {"status": "error", "failed_at": "bake", "error": str(e),
                    "steps_completed": steps_completed,
                    "duration_seconds": round(duration, 1)}
    else:
        print(f"\n[pipeline] Step 3: Skipped (no bake needed for {template})")
        steps_completed.append("bake_skipped")

    # -----------------------------------------------------------------------
    # Step 4: Render
    # -----------------------------------------------------------------------
    try:
        step_start = time.time()
        print(f"\n[pipeline] Step 4: Render '{output_name}'...")

        funcs["render"](output_name=output_name)

        # Step 5: Wait for render to complete
        print(f"\n[pipeline] Step 5: Waiting for render completion...")
        if not _wait_for_render():
            duration = time.time() - pipeline_start
            print(f"[pipeline] FAILED at Step 5 (render wait): Render timed out")
            return {"status": "error", "failed_at": "render",
                    "error": "Render timed out",
                    "steps_completed": steps_completed,
                    "duration_seconds": round(duration, 1)}

        step_duration = time.time() - step_start
        step_timings["render"] = round(step_duration, 1)
        steps_completed.append("render")
        print(f"[pipeline] Step 4-5: Render + wait ({step_duration:.1f}s)")
    except Exception as e:
        duration = time.time() - pipeline_start
        print(f"[pipeline] FAILED at Step 4 (render): {e}")
        return {"status": "error", "failed_at": "render", "error": str(e),
                "steps_completed": steps_completed,
                "duration_seconds": round(duration, 1)}

    # -----------------------------------------------------------------------
    # Step 6: VR stereo render (optional)
    # -----------------------------------------------------------------------
    if vr:
        try:
            step_start = time.time()
            print(f"\n[pipeline] Step 6: VR stereo render...")

            from vr_template import create_vr_camera, render_vr_stereo
            create_vr_camera(quality=quality)
            render_vr_stereo(output_name=f"{output_name}_vr")

            if not _wait_for_render():
                duration = time.time() - pipeline_start
                print(f"[pipeline] FAILED at Step 6 (VR render): Timed out")
                return {"status": "error", "failed_at": "vr_render",
                        "error": "VR render timed out",
                        "steps_completed": steps_completed,
                        "duration_seconds": round(duration, 1)}

            step_duration = time.time() - step_start
            step_timings["vr"] = round(step_duration, 1)
            steps_completed.append("vr")
            print(f"[pipeline] Step 6: VR render ({step_duration:.1f}s)")
        except Exception as e:
            duration = time.time() - pipeline_start
            print(f"[pipeline] FAILED at Step 6 (VR): {e}")
            return {"status": "error", "failed_at": "vr_render", "error": str(e),
                    "steps_completed": steps_completed,
                    "duration_seconds": round(duration, 1)}

    # -----------------------------------------------------------------------
    # Pipeline complete
    # -----------------------------------------------------------------------
    total_duration = time.time() - pipeline_start
    output_dir = str(RENDERS_DIR / output_name)

    print(f"\n{'='*60}")
    print(f"[pipeline] PIPELINE COMPLETE")
    print(f"[pipeline] Template: {template}")
    print(f"[pipeline] Quality:  {quality}")
    print(f"[pipeline] Output:   {output_dir}")
    print(f"[pipeline] Duration: {total_duration:.1f}s ({total_duration/60:.1f} min)")
    print(f"[pipeline] Steps:    {' -> '.join(steps_completed)}")
    for step_name, step_time in step_timings.items():
        print(f"[pipeline]   {step_name}: {step_time}s")
    print(f"{'='*60}")

    return {
        "status": "complete",
        "template": template,
        "quality": quality,
        "preset": preset,
        "output_name": output_name,
        "output_dir": output_dir,
        "vr": vr,
        "duration_seconds": round(total_duration, 1),
        "steps_completed": steps_completed,
        "step_timings": step_timings,
    }


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def list_templates():
    """Print a formatted table of supported templates.

    Returns the SUPPORTED_TEMPLATES dict for programmatic use.
    """
    print(f"\n{'='*70}")
    print(f"  EFS Pipeline -- Supported Templates")
    print(f"{'='*70}")
    print(f"  {'Template':<12} {'Bake?':<8} {'Default Preset':<20} {'Description'}")
    print(f"  {'-'*12} {'-'*8} {'-'*20} {'-'*35}")

    for name, config in SUPPORTED_TEMPLATES.items():
        bake = "Yes" if config["needs_bake"] else "No"
        print(f"  {name:<12} {bake:<8} {config['default_preset']:<20} {config['description']}")

    print(f"{'='*70}")
    return SUPPORTED_TEMPLATES
