"""
EFS Async Bake -- fire-and-forget Mantaflow simulation bake.

Usage via execute_blender_code:
  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
  from async_bake import start_bake
  start_bake(domain_name="efs_fire_domain", bake_type="ALL")

The bake runs on Blender's main thread via bpy.app.timers. The MCP call returns
immediately. Use poll_status.py to check progress.

Status is written to blender/cache/.efs_status.json so it survives MCP disconnection.

Addresses Pitfall 2: 180-second MCP timeout kills long operations silently.
Addresses Pitfall 4: Cache explosion -- calls clean_cache before baking.
"""
import bpy
import json
import time
import os
from pathlib import Path

STATUS_FILE = Path("C:/Users/jonch/Projects/ethereal-flame-studio/blender/cache/.efs_status.json")


def _write_status(operation, state, detail="", progress=0):
    """Write status to JSON file for polling."""
    status = {
        "operation": operation,
        "state": state,          # "starting" | "running" | "complete" | "error"
        "detail": detail,
        "progress": progress,    # 0-100
        "timestamp": time.time(),
        "blender_version": bpy.app.version_string,
    }
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def start_bake(domain_name, bake_type="ALL", clean_first=True):
    """Launch a Mantaflow bake asynchronously.

    Args:
        domain_name: Name of the Mantaflow domain object (e.g., "efs_fire_domain")
        bake_type: "ALL" for full bake, "DATA" for data only, "NOISE" for noise only
        clean_first: If True, free existing bake data before starting (recommended)

    Returns immediately. Use poll_status() to check progress.
    """
    domain = bpy.data.objects.get(domain_name)
    if domain is None:
        _write_status("bake", "error", f"Domain object '{domain_name}' not found")
        print(json.dumps({"error": f"Domain '{domain_name}' not found"}))
        return

    # Verify it has fluid physics
    fluid_mod = domain.modifiers.get("Fluid")
    if fluid_mod is None or fluid_mod.domain_settings is None:
        _write_status("bake", "error", f"'{domain_name}' has no Fluid modifier with domain settings")
        print(json.dumps({"error": f"'{domain_name}' is not a fluid domain"}))
        return

    # Save before bake (Pitfall 3: save before destructive operations)
    bpy.ops.wm.save_mainfile()

    _write_status("bake", "starting", f"Preparing {bake_type} bake for {domain_name}")

    def _do_bake():
        """Timer callback -- runs on Blender's main thread after MCP returns."""
        try:
            # Select the domain (required for bake operators)
            bpy.context.view_layer.objects.active = domain
            domain.select_set(True)

            _write_status("bake", "running", f"Baking {bake_type}...", 10)

            # Execute the bake
            if bake_type == "DATA":
                bpy.ops.fluid.bake_data()
            elif bake_type == "NOISE":
                bpy.ops.fluid.bake_noise()
            else:
                bpy.ops.fluid.bake_all()

            _write_status("bake", "complete", f"{bake_type} bake finished for {domain_name}", 100)
            print(json.dumps({"status": "complete", "domain": domain_name, "type": bake_type}))

        except Exception as e:
            _write_status("bake", "error", str(e))
            print(json.dumps({"status": "error", "error": str(e)}))

        return None  # None = don't repeat the timer

    def _free_then_bake():
        """Two-phase approach: free cache first, then schedule bake on next tick.

        Calling free_all() and bake_*() in the same callback causes a race
        condition crash in Mantaflow's MANTA::initHeat (the free hasn't finished
        when the bake reinitializes the domain). Separating them with a timer
        tick ensures the free completes before baking starts.
        """
        try:
            bpy.context.view_layer.objects.active = domain
            domain.select_set(True)
            _write_status("bake", "running", "Freeing previous bake data", 5)
            bpy.ops.fluid.free_all()
        except Exception:
            pass  # OK if nothing to free
        # Schedule the actual bake on the NEXT timer tick
        bpy.app.timers.register(_do_bake, first_interval=0.5)
        return None

    # Register: if cleaning first, free then bake in two steps; otherwise bake directly
    if clean_first:
        bpy.app.timers.register(_free_then_bake, first_interval=0.1)
    else:
        bpy.app.timers.register(_do_bake, first_interval=0.1)

    result = {"status": "bake_started", "domain": domain_name, "type": bake_type, "poll_file": str(STATUS_FILE)}
    print(json.dumps(result))
    return result
