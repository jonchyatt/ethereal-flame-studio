"""
EFS Batch Render Queue Processor -- overnight unattended rendering of multiple scenes.

Loads a JSON job queue, renders each scene sequentially, logs results, and
continues to the next job on failure. Designed for "leave it running while
you sleep" workflows where a batch of 3-10 scenes render overnight without
human intervention.

Job queue JSON schema:
{
  "jobs": [
    {
      "id": "fire-meditation-01",
      "template": "fire",
      "quality": "preview",
      "audio_json": "C:/.../audio.json",
      "preset": "fire_cinema",
      "output_name": "fire_meditation",
      "vr": false,
      "enabled": true
    }
  ]
}

Fields:
  id           -- unique string identifier for the job
  template     -- "fire" | "water" | "combo" | "edm" | "luminous"
  quality      -- quality preset name (e.g., "draft", "preview", "production", "ultra")
  audio_json   -- (optional) path to audio analysis JSON
  preset       -- (optional) audio mapping preset name
  output_name  -- render output file prefix
  vr           -- (optional) bool, also render VR stereo output
  enabled      -- (optional) bool, skip if false
  hdri_path    -- (optional, combo only) path to HDRI environment map
  mask_dir     -- (optional, luminous only) path to mask sequence directory
  particle_mode -- (optional, luminous only) "flame" | "mist" | "solar_breath"

Usage:
  from batch_render import run_batch, create_job_queue
  run_batch("path/to/jobs.json")

  # Or create a queue programmatically:
  jobs = [{"id": "test", "template": "fire", "quality": "preview", "output_name": "test"}]
  create_job_queue(jobs)
  run_batch()
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

from scene_utils import REPO_ROOT, RENDERS_DIR, CACHE_DIR
from poll_status import poll_status, is_render_active

# -- Constants --
JOB_QUEUE_PATH = REPO_ROOT / "blender" / "jobs" / "render_queue.json"
BATCH_LOG_PATH = REPO_ROOT / "blender" / "jobs" / "batch_log.json"

# Templates that require a Mantaflow bake step before rendering
_TEMPLATES_NEEDING_BAKE = {"fire", "combo", "luminous"}


def create_job_queue(jobs, path=None):
    """Write a jobs list to JSON file.

    Args:
        jobs: List of job dicts (see module docstring for schema).
        path: Optional output path. Defaults to JOB_QUEUE_PATH.

    Returns:
        Path that was written.
    """
    output_path = Path(path) if path else JOB_QUEUE_PATH
    output_path.parent.mkdir(parents=True, exist_ok=True)

    queue = {"jobs": jobs}
    output_path.write_text(json.dumps(queue, indent=2))
    print(f"[batch] Created job queue: {output_path} ({len(jobs)} jobs)")
    return str(output_path)


def _import_template_functions(template_name, job):
    """Lazily import the correct template module functions for a given template.

    Returns dict with keys: create, audio, bake (or None), render.
    Each value is the callable function from the template module.
    """
    if template_name == "fire":
        from fire_cinema_template import create_fire_scene, apply_audio, bake_fire, render_fire
        return {
            "create": lambda q: create_fire_scene(quality=q),
            "audio": lambda path, preset: apply_audio(path, preset),
            "bake": lambda: bake_fire(clean_first=True),
            "render": lambda name: render_fire(output_name=name),
        }

    elif template_name == "water":
        from water_template import create_water_scene, apply_water_audio, bake_ocean, render_water
        return {
            "create": lambda q: create_water_scene(quality=q),
            "audio": lambda path, preset: apply_water_audio(path, preset),
            "bake": lambda: bake_ocean(),
            "render": lambda name: render_water(output_name=name),
        }

    elif template_name == "combo":
        from combo_fire_water import create_fire_water_scene, apply_combo_audio, bake_fire_water, render_fire_water
        hdri = job.get("hdri_path")
        return {
            "create": lambda q: create_fire_water_scene(quality=q, hdri_path=hdri),
            "audio": lambda path, preset: apply_combo_audio(path, preset),
            "bake": lambda: bake_fire_water(clean_first=True),
            "render": lambda name: render_fire_water(output_name=name),
        }

    elif template_name == "edm":
        from edm_light_template import create_edm_scene, apply_edm_audio, render_edm
        return {
            "create": lambda q: create_edm_scene(quality=q),
            "audio": lambda path, preset: apply_edm_audio(path, preset),
            "bake": None,
            "render": lambda name: render_edm(output_name=name),
        }

    elif template_name == "luminous":
        from luminous_being_template import create_luminous_scene, apply_luminous_audio, bake_luminous, render_luminous
        mask_dir = job.get("mask_dir", "")
        particle_mode = job.get("particle_mode", "flame")
        return {
            "create": lambda q: create_luminous_scene(mask_dir=mask_dir, quality=q, particle_mode=particle_mode),
            "audio": lambda path, preset: apply_luminous_audio(path, preset),
            "bake": lambda: bake_luminous(clean_first=True),
            "render": lambda name: render_luminous(output_name=name),
        }

    else:
        raise ValueError(f"Unknown template: {template_name}. "
                         f"Supported: fire, water, combo, edm, luminous")


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
            print(f"[batch] Bake complete after {elapsed}s")
            return True
        elif state == "error":
            print(f"[batch] Bake error: {status.get('detail', 'unknown')}")
            return False

        # Print progress dot every 30 seconds
        if elapsed % 30 == 0:
            progress = status.get("progress", 0)
            print(f"[batch] Bake in progress... {elapsed}s elapsed, {progress}% done")

    print(f"[batch] Bake timed out after {timeout}s")
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
            print(f"[batch] Render complete after {elapsed}s")
            return True

        if elapsed % 60 == 0:
            print(f"[batch] Render in progress... {elapsed}s elapsed")

    print(f"[batch] Render timed out after {timeout}s")
    return False


def _run_single_job(job):
    """Execute a single render job through the full pipeline.

    Args:
        job: Job dict from the queue JSON.

    Returns:
        Dict with id, status, error, duration_seconds.
    """
    job_id = job.get("id", "unknown")
    template_name = job.get("template", "")
    quality = job.get("quality", "preview")
    audio_json = job.get("audio_json")
    preset = job.get("preset")
    output_name = job.get("output_name", f"{template_name}_{job_id}")

    print(f"\n{'='*60}")
    print(f"[batch] Starting job: {job_id}")
    print(f"[batch] Template: {template_name}, Quality: {quality}")
    print(f"{'='*60}")

    start_time = time.time()

    try:
        # Import the correct template functions
        funcs = _import_template_functions(template_name, job)

        # Step 1: Create scene
        print(f"[batch] [{job_id}] Step 1: Creating {template_name} scene...")
        funcs["create"](quality)

        # Step 2: Apply audio (if provided)
        if audio_json and preset:
            print(f"[batch] [{job_id}] Step 2: Applying audio with preset '{preset}'...")
            funcs["audio"](audio_json, preset)
        elif audio_json:
            print(f"[batch] [{job_id}] Step 2: Skipped (no preset specified)")
        else:
            print(f"[batch] [{job_id}] Step 2: Skipped (no audio_json)")

        # Step 3: Bake (if template requires it)
        if template_name in _TEMPLATES_NEEDING_BAKE and funcs.get("bake"):
            print(f"[batch] [{job_id}] Step 3: Starting bake...")
            funcs["bake"]()

            if not _wait_for_bake():
                duration = time.time() - start_time
                return {
                    "id": job_id,
                    "status": "error",
                    "error": "Bake failed or timed out",
                    "duration_seconds": round(duration, 1),
                }
        else:
            print(f"[batch] [{job_id}] Step 3: Skipped (no bake needed for {template_name})")

        # Step 4: Render
        print(f"[batch] [{job_id}] Step 4: Starting render '{output_name}'...")
        funcs["render"](output_name)

        if not _wait_for_render():
            duration = time.time() - start_time
            return {
                "id": job_id,
                "status": "error",
                "error": "Render timed out",
                "duration_seconds": round(duration, 1),
            }

        # Step 5: VR render (if requested)
        if job.get("vr"):
            print(f"[batch] [{job_id}] Step 5: Adding VR camera and rendering stereo...")
            from vr_template import create_vr_camera, render_vr_stereo
            create_vr_camera(quality=quality)
            render_vr_stereo(output_name=f"{output_name}_vr")

            if not _wait_for_render():
                duration = time.time() - start_time
                return {
                    "id": job_id,
                    "status": "error",
                    "error": "VR render timed out",
                    "duration_seconds": round(duration, 1),
                }

        duration = time.time() - start_time
        print(f"[batch] [{job_id}] COMPLETE in {duration:.1f}s")
        return {
            "id": job_id,
            "status": "complete",
            "error": None,
            "duration_seconds": round(duration, 1),
        }

    except Exception as e:
        duration = time.time() - start_time
        error_msg = f"{type(e).__name__}: {e}"
        print(f"[batch] [{job_id}] FAILED: {error_msg}")
        return {
            "id": job_id,
            "status": "error",
            "error": error_msg,
            "duration_seconds": round(duration, 1),
        }


def _append_to_log(result, log_path=None):
    """Append a job result to the batch log file.

    Appends rather than overwrites so partial progress is preserved
    if Blender crashes mid-batch.
    """
    path = Path(log_path) if log_path else BATCH_LOG_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    # Load existing log or start fresh
    if path.exists():
        try:
            log = json.loads(path.read_text())
        except (json.JSONDecodeError, ValueError):
            log = {"results": []}
    else:
        log = {"results": []}

    log["results"].append(result)
    log["last_updated"] = time.time()
    path.write_text(json.dumps(log, indent=2))


def run_batch(queue_path=None):
    """Execute all enabled jobs in the queue sequentially.

    Args:
        queue_path: Path to job queue JSON. Defaults to JOB_QUEUE_PATH.

    Returns:
        List of result dicts (one per job).
    """
    path = Path(queue_path) if queue_path else JOB_QUEUE_PATH
    if not path.exists():
        print(f"[batch] ERROR: Job queue not found: {path}")
        return []

    queue = json.loads(path.read_text())
    all_jobs = queue.get("jobs", [])

    # Filter to enabled jobs
    jobs = [j for j in all_jobs if j.get("enabled", True)]
    skipped = len(all_jobs) - len(jobs)

    print(f"\n{'#'*60}")
    print(f"[batch] EFS Batch Render Queue")
    print(f"[batch] Total jobs: {len(all_jobs)}, Enabled: {len(jobs)}, Skipped: {skipped}")
    print(f"[batch] Queue file: {path}")
    print(f"{'#'*60}")

    batch_start = time.time()
    results = []

    for i, job in enumerate(jobs, 1):
        print(f"\n[batch] === Job {i}/{len(jobs)} ===")
        result = _run_single_job(job)
        results.append(result)

        # Append to log after each job (preserves partial progress)
        _append_to_log(result)

    batch_duration = time.time() - batch_start
    succeeded = sum(1 for r in results if r["status"] == "complete")
    failed = sum(1 for r in results if r["status"] == "error")

    print(f"\n{'#'*60}")
    print(f"[batch] BATCH COMPLETE")
    print(f"[batch] Succeeded: {succeeded}/{len(jobs)}")
    print(f"[batch] Failed: {failed}/{len(jobs)}")
    print(f"[batch] Total duration: {batch_duration:.1f}s ({batch_duration/60:.1f} min)")
    print(f"[batch] Log: {BATCH_LOG_PATH}")
    print(f"{'#'*60}")

    return results
