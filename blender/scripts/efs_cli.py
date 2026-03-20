"""
EFS CLI -- unified command harness for all Ethereal Flame Studio Blender workflows.

Reduces Claude's token usage when orchestrating Blender scenes. Instead of writing
multi-line Python imports and function calls, Claude calls run(["create-fire", "preview"])
-- a single short line that dispatches to the correct template function with the correct
arguments.

10 commands wrapping 6 templates + shared utilities:

  Scene creation:
    create-fire    [quality]                    Create Mantaflow fire scene
    create-water   [quality]                    Create Ocean Modifier water scene
    create-combo   [quality] [hdri_path?]       Create fire-over-water combo scene
    create-edm     [quality]                    Create EDM light show scene
    create-luminous <mask_dir> [quality] [mode] Create Luminous Being scene

  Operations:
    bake           [type?]                      Auto-detect and bake simulation
    render         [output_name?] [frame?]      Auto-detect and render scene
    render-vr      [output_name?] [frame?]      Render stereoscopic VR output

  Audio:
    apply-audio    <audio_json_path> [preset?]  Apply audio keyframes to scene
    list-presets                                 List available mapping presets

Usage (via MCP execute_blender_code):

  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
  from efs_cli import run

  run(["create-fire", "preview"])
  run(["apply-audio", "C:/.../audio-analysis.json"])
  run(["bake"])
  run(["render", "my_fire_scene", "45"])
  run(["list-presets"])
"""
import sys
import os
import traceback

# -- sys.path setup (same __file__ fallback pattern as fire_cinema_template.py) --
try:
    _SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    # __file__ not defined when run via exec(open(...).read())
    _SCRIPTS_DIR = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)


# ---------------------------------------------------------------------------
# Scene type detection
# ---------------------------------------------------------------------------

def _detect_scene_type():
    """Detect the current scene type by checking for known EFS object name prefixes.

    Checks bpy.data.objects for characteristic objects from each template and
    returns one of: "luminous", "edm", "combo", "fire", "water", "unknown".

    Detection priority (most specific first):
      1. efs_lumi_body          -> "luminous"
      2. efs_edm_laser_red      -> "edm"  (using first laser as sentinel)
      3. efs_fire_domain AND efs_ocean_plane -> "combo"
      4. efs_fire_domain alone  -> "fire"
      5. efs_ocean_plane alone  -> "water"
      6. else                   -> "unknown"
    """
    import bpy

    obj_names = {obj.name for obj in bpy.data.objects}

    # Most specific first
    if "efs_lumi_body" in obj_names:
        return "luminous"
    if "efs_edm_laser_red" in obj_names:
        return "edm"

    has_fire = "efs_fire_domain" in obj_names
    has_ocean = "efs_ocean_plane" in obj_names

    if has_fire and has_ocean:
        return "combo"
    if has_fire:
        return "fire"
    if has_ocean:
        return "water"

    return "unknown"


# ---------------------------------------------------------------------------
# Default preset names per scene type
# ---------------------------------------------------------------------------

_DEFAULT_PRESETS = {
    "fire": "fire_cinema",
    "water": "water_ocean",
    "combo": "fire_water_combo",
    "edm": "edm_lights",
    "luminous": "luminous_being",
}

# Default output names per scene type
_DEFAULT_OUTPUT_NAMES = {
    "fire": "fire_cinema",
    "water": "water_ocean",
    "combo": "fire_water_combo",
    "edm": "edm_lights",
    "luminous": "luminous_being",
}


# ---------------------------------------------------------------------------
# Command handlers (lazy imports inside each function)
# ---------------------------------------------------------------------------

def _cmd_create_fire(args):
    """Create a Mantaflow fire scene.  Args: [quality]"""
    quality = args[0] if args else "preview"
    from fire_cinema_template import create_fire_scene
    return create_fire_scene(quality=quality)


def _cmd_create_water(args):
    """Create an Ocean Modifier water scene.  Args: [quality]"""
    quality = args[0] if args else "preview"
    from water_template import create_water_scene
    return create_water_scene(quality=quality)


def _cmd_create_combo(args):
    """Create a fire-over-water combo scene.  Args: [quality] [hdri_path?]"""
    quality = args[0] if args else "preview"
    hdri_path = args[1] if len(args) > 1 else None
    from combo_fire_water import create_fire_water_scene
    return create_fire_water_scene(quality=quality, hdri_path=hdri_path)


def _cmd_create_edm(args):
    """Create an EDM light show scene.  Args: [quality]"""
    quality = args[0] if args else "preview"
    from edm_light_template import create_edm_scene
    return create_edm_scene(quality=quality)


def _cmd_create_luminous(args):
    """Create a Luminous Being scene.  Args: <mask_dir> [quality] [particle_mode]"""
    if not args:
        print("[efs_cli] ERROR: create-luminous requires mask_dir argument")
        return {"error": "mask_dir argument required"}
    mask_dir = args[0]
    quality = args[1] if len(args) > 1 else "preview"
    particle_mode = args[2] if len(args) > 2 else "flame"
    from luminous_being_template import create_luminous_scene
    return create_luminous_scene(mask_dir=mask_dir, quality=quality, particle_mode=particle_mode)


def _cmd_bake(args):
    """Auto-detect scene type and run the correct bake.  Args: [type?]

    If type is "ocean", bakes ocean specifically.
    Otherwise auto-detects from scene objects:
      efs_fire_domain        -> bake_fire()
      efs_combo_fire_domain  -> bake_fire_water()
      efs_lumi_fire_domain   -> bake_luminous()
    """
    import bpy

    bake_type = args[0].lower() if args else "all"

    if bake_type == "ocean":
        from water_template import bake_ocean
        return bake_ocean()

    obj_names = {obj.name for obj in bpy.data.objects}

    if "efs_combo_fire_domain" in obj_names:
        from combo_fire_water import bake_fire_water
        return bake_fire_water(clean_first=True)

    if "efs_lumi_fire_domain" in obj_names:
        from luminous_being_template import bake_luminous
        return bake_luminous(clean_first=True)

    if "efs_fire_domain" in obj_names:
        from fire_cinema_template import bake_fire
        return bake_fire(clean_first=True)

    print("[efs_cli] ERROR: No bakeable domain found in scene.")
    print("  Expected one of: efs_fire_domain, efs_combo_fire_domain, efs_lumi_fire_domain")
    print("  Or specify bake type: run(['bake', 'ocean'])")
    return {"error": "No bakeable domain found"}


def _cmd_render(args):
    """Auto-detect scene type and render.  Args: [output_name?] [frame?]

    Detection:
      efs_lumi_body                       -> render_luminous()
      efs_edm_laser_red                   -> render_edm()
      efs_fire_domain + efs_ocean_plane   -> render_fire_water()
      efs_fire_domain alone               -> render_fire()
      efs_ocean_plane alone               -> render_water()
    """
    output_name = args[0] if args else None
    frame = int(args[1]) if len(args) > 1 else None

    scene_type = _detect_scene_type()

    # Default output name from scene type
    if output_name is None:
        output_name = _DEFAULT_OUTPUT_NAMES.get(scene_type, "efs_output")

    if scene_type == "luminous":
        from luminous_being_template import render_luminous
        return render_luminous(output_name=output_name, frame=frame)
    elif scene_type == "edm":
        from edm_light_template import render_edm
        return render_edm(output_name=output_name, frame=frame)
    elif scene_type == "combo":
        from combo_fire_water import render_fire_water
        return render_fire_water(output_name=output_name, frame=frame)
    elif scene_type == "fire":
        from fire_cinema_template import render_fire
        return render_fire(output_name=output_name, frame=frame)
    elif scene_type == "water":
        from water_template import render_water
        return render_water(output_name=output_name, frame=frame)
    else:
        print(f"[efs_cli] ERROR: Cannot auto-detect scene type for render.")
        print(f"  Detected: {scene_type}")
        print(f"  Create a scene first: run(['create-fire']) or similar.")
        return {"error": f"Unknown scene type: {scene_type}"}


def _cmd_render_vr(args):
    """Render stereoscopic VR output.  Args: [output_name?] [frame?]"""
    output_name = args[0] if args else "vr_output"
    frame = int(args[1]) if len(args) > 1 else None
    from vr_template import render_vr_stereo
    return render_vr_stereo(output_name=output_name, frame=frame)


def _cmd_apply_audio(args):
    """Apply audio keyframes to the current scene.  Args: <audio_json_path> [preset_name?]

    If preset_name is not specified, auto-detects from scene type.
    """
    if not args:
        print("[efs_cli] ERROR: apply-audio requires audio_json_path argument")
        return {"error": "audio_json_path argument required"}

    audio_json_path = args[0]
    preset_name = args[1] if len(args) > 1 else None

    # Auto-detect preset from scene type if not specified
    if preset_name is None:
        scene_type = _detect_scene_type()
        preset_name = _DEFAULT_PRESETS.get(scene_type)
        if preset_name is None:
            print(f"[efs_cli] WARNING: Could not auto-detect preset for scene type '{scene_type}'.")
            print(f"  Specify explicitly: run(['apply-audio', 'path.json', 'preset_name'])")

    from keyframe_generator import apply_audio_keyframes
    return apply_audio_keyframes(audio_json_path=audio_json_path, preset_name=preset_name)


def _cmd_list_presets(args):
    """List all available mapping presets.  No args."""
    from keyframe_generator import list_presets
    presets = list_presets()

    if not presets:
        print("[efs_cli] No presets found in blender/presets/")
        return presets

    # Print formatted table
    print(f"\n{'Name':<25} {'Mappings':>8}  {'Audio Style':<20}  Description")
    print(f"{'-'*25} {'-'*8}  {'-'*20}  {'-'*40}")
    for p in presets:
        print(f"{p['name']:<25} {p['mapping_count']:>8}  {p.get('audio_style', '')::<20}  {p.get('description', '')}")
    print(f"\n{len(presets)} preset(s) found.\n")

    return presets


# ---------------------------------------------------------------------------
# Command registry
# ---------------------------------------------------------------------------

COMMANDS = {
    # Scene creation
    "create-fire":      _cmd_create_fire,
    "create-water":     _cmd_create_water,
    "create-combo":     _cmd_create_combo,
    "create-edm":       _cmd_create_edm,
    "create-luminous":  _cmd_create_luminous,
    # Operations
    "bake":             _cmd_bake,
    "render":           _cmd_render,
    "render-vr":        _cmd_render_vr,
    # Audio
    "apply-audio":      _cmd_apply_audio,
    "list-presets":     _cmd_list_presets,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run(args):
    """Execute an EFS CLI command.

    Args:
        args: List of strings, like sys.argv.  args[0] is the command name,
              remaining elements are positional arguments.

    Returns:
        The handler's return value (dict or None), or {"error": str} on failure.

    Examples:
        run(["create-fire", "preview"])
        run(["bake"])
        run(["render", "my_fire_scene", "45"])
        run(["apply-audio", "/path/to/audio.json", "fire_cinema"])
        run(["list-presets"])
    """
    if not args:
        print("[efs_cli] ERROR: No command specified.")
        help()
        return None

    command = args[0]
    cmd_args = args[1:]

    handler = COMMANDS.get(command)
    if handler is None:
        print(f"[efs_cli] ERROR: Unknown command '{command}'.")
        print(f"  Available commands: {', '.join(sorted(COMMANDS.keys()))}")
        help()
        return None

    print(f"[efs_cli] Running: {command} {' '.join(cmd_args) if cmd_args else ''}")

    try:
        result = handler(cmd_args)
        print(f"[efs_cli] Done: {command}")
        return result
    except Exception as e:
        print(f"[efs_cli] ERROR in '{command}': {e}")
        traceback.print_exc()
        return {"error": str(e)}


def help():
    """Print all available commands with their argument signatures and descriptions."""
    print(f"\nEFS CLI -- Ethereal Flame Studio Command Harness")
    print(f"{'='*60}\n")

    entries = [
        ("Scene Creation", [
            ("create-fire",     "[quality]",                            "Create Mantaflow fire scene (default: preview)"),
            ("create-water",    "[quality]",                            "Create Ocean Modifier water scene"),
            ("create-combo",    "[quality] [hdri_path?]",               "Create fire-over-water combo scene"),
            ("create-edm",      "[quality]",                            "Create EDM light show scene"),
            ("create-luminous", "<mask_dir> [quality] [particle_mode]", "Create Luminous Being scene"),
        ]),
        ("Operations", [
            ("bake",            "[type?]",                              "Auto-detect and bake (or specify 'ocean')"),
            ("render",          "[output_name?] [frame?]",              "Auto-detect scene type and render"),
            ("render-vr",       "[output_name?] [frame?]",             "Render stereoscopic VR output"),
        ]),
        ("Audio", [
            ("apply-audio",     "<audio_json_path> [preset_name?]",    "Apply audio keyframes (auto-detects preset)"),
            ("list-presets",    "",                                      "List all available mapping presets"),
        ]),
    ]

    for section, commands in entries:
        print(f"  {section}:")
        for name, signature, description in commands:
            cmd_str = f"  {name:<18} {signature:<40}"
            print(f"    {cmd_str} {description}")
        print()

    print(f"Usage: from efs_cli import run; run(['command', 'arg1', 'arg2'])")
    print()
