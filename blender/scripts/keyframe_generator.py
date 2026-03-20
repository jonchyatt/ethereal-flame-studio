"""
EFS Keyframe Generator -- reads audio analysis JSON + mapping preset,
inserts Blender keyframes on target objects/properties.

Usage via MCP execute_blender_code:
  import sys; sys.path.insert(0, 'C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts')
  from keyframe_generator import apply_audio_keyframes, load_preset, list_presets

  apply_audio_keyframes('C:/.../audio-analysis.json', 'meditation')

Preset CRUD (all via MCP):
  from keyframe_generator import list_presets, load_preset, save_preset, delete_preset, create_preset
  presets = list_presets()
  preset = load_preset('edm')
  save_preset(preset, 'edm_v2')
  delete_preset('edm_v2')
  new = create_preset('Custom', 'My custom mapping', 'custom', [...])

Addresses:
  - AUD4-03: Audio JSON to Blender keyframe pipeline
  - AUD4-04: Mapping preset CRUD system
  - AUD4-05: 8+ features to 8+ visual parameters (emergent complexity)
"""
import bpy
import json
import os
import shutil
from pathlib import Path

# Ensure scripts dir on sys.path for scene_utils import
try:
    _SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    _SCRIPTS_DIR = "C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts"
import sys
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from scene_utils import save_before_operate

# -- Project paths --
REPO_ROOT = Path("C:/Users/jonch/Projects/ethereal-flame-studio")
PRESETS_DIR = REPO_ROOT / "blender" / "presets"


# ---------------------------------------------------------------------------
# Core pipeline functions
# ---------------------------------------------------------------------------

def load_audio_json(filepath):
    """Load and validate an audio analysis JSON file.

    Args:
        filepath: Absolute path to the JSON file exported by AudioExporter.

    Returns:
        Parsed dict with metadata, frames, summary, etc.

    Raises:
        ValueError: If required keys are missing.
        FileNotFoundError: If file does not exist.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Audio JSON not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    required_keys = ["metadata", "frames", "summary"]
    missing = [k for k in required_keys if k not in data]
    if missing:
        raise ValueError(
            f"Audio JSON missing required keys: {missing}. "
            f"Found keys: {list(data.keys())}"
        )

    frame_count = len(data["frames"])
    expected = data["metadata"].get("total_frames", frame_count)
    if frame_count == 0:
        raise ValueError("Audio JSON has 0 frames -- nothing to keyframe")

    print(f"[keyframe_gen] Loaded audio JSON: {frame_count} frames, "
          f"{data['metadata'].get('duration_seconds', '?')}s, "
          f"{data['metadata'].get('fps', '?')} fps")

    return data


def resolve_feature_value(frame_data, source_feature):
    """Extract a float value from a frame dict using dot-notation path.

    Supported paths:
      - "bands.sub_bass" -> frame_data["bands"]["sub_bass"]
      - "envelopes.bass" -> frame_data["envelopes"]["bass"]
      - "onsets.bass" -> frame_data["onsets"]["bass"] (bool -> 1.0/0.0)
      - "spectral_centroid" -> frame_data["spectral_centroid"]
      - "chromagram" -> max of 12 chroma values
      - "rms_energy", "lufs", "crest_factor", etc.

    Args:
        frame_data: Single frame dict from audio JSON frames array.
        source_feature: Dot-notation path string.

    Returns:
        Float value (0.0 if path not found, with warning).
    """
    parts = source_feature.split(".")

    if len(parts) == 1:
        key = parts[0]
        if key == "chromagram":
            chroma = frame_data.get("chromagram", [])
            if isinstance(chroma, list) and len(chroma) > 0:
                return float(max(chroma))
            return 0.0

        val = frame_data.get(key)
        if val is None:
            print(f"[keyframe_gen] WARNING: Feature '{source_feature}' not found in frame data")
            return 0.0
        if isinstance(val, bool):
            return 1.0 if val else 0.0
        return float(val)

    elif len(parts) == 2:
        group, key = parts
        group_data = frame_data.get(group)
        if group_data is None:
            print(f"[keyframe_gen] WARNING: Feature group '{group}' not found in frame data")
            return 0.0
        val = group_data.get(key)
        if val is None:
            print(f"[keyframe_gen] WARNING: Feature '{source_feature}' not found in frame data")
            return 0.0
        if isinstance(val, bool):
            return 1.0 if val else 0.0
        return float(val)

    else:
        print(f"[keyframe_gen] WARNING: Unsupported feature path depth: '{source_feature}'")
        return 0.0


def clamp(value, min_val, max_val):
    """Clamp a value between min and max bounds."""
    return max(min_val, min(max_val, value))


def _color_temp_to_rgb(t):
    """Map a 0-1 audio value to an RGB color temperature.

    0.0 = deep red (1500K), 0.5 = orange (3000K), 1.0 = white (6500K).
    Returns (r, g, b) tuple with values 0-1.
    """
    # Simple interpolation through warm color ramp
    if t <= 0.0:
        return (1.0, 0.2, 0.0)       # Deep red/orange (1500K)
    elif t <= 0.25:
        f = t / 0.25
        return (1.0, 0.2 + 0.2 * f, 0.0)  # Red to orange
    elif t <= 0.5:
        f = (t - 0.25) / 0.25
        return (1.0, 0.4 + 0.3 * f, 0.05 * f)  # Orange to warm yellow
    elif t <= 0.75:
        f = (t - 0.5) / 0.25
        return (1.0, 0.7 + 0.2 * f, 0.05 + 0.35 * f)  # Yellow to warm white
    else:
        f = (t - 0.75) / 0.25
        return (1.0, 0.9 + 0.1 * f, 0.4 + 0.6 * f)  # Warm white to white


def resolve_target(mapping):
    """Resolve a mapping's target to (target_obj, set_fn, keyframe_fn) tuple.

    Handles all 8 data path patterns for the 10 visual parameters.

    Returns:
        (target_obj, set_value_fn, insert_keyframe_fn) where:
          - target_obj: the Blender object/data reference
          - set_value_fn(value): sets the property value
          - insert_keyframe_fn(frame): inserts keyframe at frame

        Returns (None, None, None) if target not found.
    """
    target_name = mapping["target_object"]
    data_path = mapping["data_path"]

    # -- Pattern 8: World background (special sentinel) --
    if target_name == "__world__":
        world = bpy.data.worlds[0] if bpy.data.worlds else None
        if world is None:
            print(f"[keyframe_gen] WARNING: No world found for __world__ target")
            return (None, None, None)

        if not world.use_nodes or not world.node_tree:
            print(f"[keyframe_gen] WARNING: World has no node tree")
            return (None, None, None)

        bg_node = world.node_tree.nodes.get("Background")
        if bg_node is None:
            print(f"[keyframe_gen] WARNING: No Background node in world")
            return (None, None, None)

        strength_input = bg_node.inputs.get("Strength")
        if strength_input is None:
            print(f"[keyframe_gen] WARNING: No Strength input on Background node")
            return (None, None, None)

        def set_val(v):
            strength_input.default_value = v

        def kf_insert(frame):
            strength_input.keyframe_insert("default_value", frame=frame)

        return (world, set_val, kf_insert)

    # -- All other patterns: look up object by name --
    obj = bpy.data.objects.get(target_name)
    if obj is None:
        print(f"[keyframe_gen] WARNING: Object '{target_name}' not found in scene")
        return (None, None, None)

    # -- Pattern 1 & 2: Fluid domain/flow settings --
    if data_path.startswith('modifiers["Fluid"]'):
        fluid_mod = obj.modifiers.get("Fluid")
        if fluid_mod is None:
            print(f"[keyframe_gen] WARNING: No Fluid modifier on '{target_name}'")
            return (None, None, None)

        # Parse: modifiers["Fluid"].domain_settings.flame_max_temp
        # or:    modifiers["Fluid"].flow_settings.fuel_amount
        parts = data_path.split(".")
        # parts[0] = 'modifiers["Fluid"]', parts[1] = 'domain_settings' or 'flow_settings', parts[2] = property
        if len(parts) < 3:
            print(f"[keyframe_gen] WARNING: Invalid fluid data_path: {data_path}")
            return (None, None, None)

        settings_name = parts[1]  # 'domain_settings' or 'flow_settings'
        prop_name = parts[2]

        settings = getattr(fluid_mod, settings_name, None)
        if settings is None:
            print(f"[keyframe_gen] WARNING: No '{settings_name}' on Fluid modifier")
            return (None, None, None)

        def set_val(v, s=settings, p=prop_name):
            setattr(s, p, v)

        def kf_insert(frame, s=settings, p=prop_name):
            s.keyframe_insert(data_path=p, frame=frame)

        return (obj, set_val, kf_insert)

    # -- Pattern 3: Material node inputs (Principled Volume) --
    if data_path.startswith("active_material.node_tree"):
        mat = obj.active_material
        if mat is None or not mat.use_nodes or not mat.node_tree:
            print(f"[keyframe_gen] WARNING: No active material with node tree on '{target_name}'")
            return (None, None, None)

        # Parse: active_material.node_tree.nodes["Principled Volume"].inputs["Density"].default_value
        # Extract node name and input name from the path
        node_name = None
        input_name = None
        try:
            # Find node name between nodes[" and "]
            node_start = data_path.index('nodes["') + len('nodes["')
            node_end = data_path.index('"]', node_start)
            node_name = data_path[node_start:node_end]

            # Find input name between inputs[" and "]
            input_start = data_path.index('inputs["') + len('inputs["')
            input_end = data_path.index('"]', input_start)
            input_name = data_path[input_start:input_end]
        except ValueError:
            print(f"[keyframe_gen] WARNING: Could not parse material data_path: {data_path}")
            return (None, None, None)

        node = mat.node_tree.nodes.get(node_name)
        if node is None:
            print(f"[keyframe_gen] WARNING: Node '{node_name}' not found in material")
            return (None, None, None)

        node_input = node.inputs.get(input_name)
        if node_input is None:
            print(f"[keyframe_gen] WARNING: Input '{input_name}' not found on node '{node_name}'")
            return (None, None, None)

        def set_val(v, ni=node_input):
            ni.default_value = v

        def kf_insert(frame, ni=node_input):
            ni.keyframe_insert("default_value", frame=frame)

        return (obj, set_val, kf_insert)

    # -- Pattern 4: Light energy (data.energy) --
    if data_path == "data.energy":
        if obj.data is None:
            print(f"[keyframe_gen] WARNING: No data on object '{target_name}'")
            return (None, None, None)

        def set_val(v, d=obj.data):
            d.energy = v

        def kf_insert(frame, d=obj.data):
            d.keyframe_insert("energy", frame=frame)

        return (obj, set_val, kf_insert)

    # -- Pattern 5: Light color (data.color) -- special color temp mapping --
    if data_path == "data.color":
        if obj.data is None:
            print(f"[keyframe_gen] WARNING: No data on object '{target_name}'")
            return (None, None, None)

        def set_val(v, d=obj.data):
            r, g, b = _color_temp_to_rgb(v)
            d.color = (r, g, b)

        def kf_insert(frame, d=obj.data):
            d.keyframe_insert("color", frame=frame)

        return (obj, set_val, kf_insert)

    # -- Pattern 6: Camera lens (data.lens) --
    if data_path == "data.lens":
        if obj.data is None:
            print(f"[keyframe_gen] WARNING: No data on object '{target_name}'")
            return (None, None, None)

        def set_val(v, d=obj.data):
            d.lens = v

        def kf_insert(frame, d=obj.data):
            d.keyframe_insert("lens", frame=frame)

        return (obj, set_val, kf_insert)

    # -- Pattern 6b: Camera shift_x (data.shift_x) --
    if data_path == "data.shift_x":
        if obj.data is None:
            print(f"[keyframe_gen] WARNING: No data on object '{target_name}'")
            return (None, None, None)

        def set_val(v, d=obj.data):
            d.shift_x = v

        def kf_insert(frame, d=obj.data):
            d.keyframe_insert("shift_x", frame=frame)

        return (obj, set_val, kf_insert)

    # -- Pattern 7: Particle emission (special -- count not per-frame keyframeable) --
    if data_path.startswith("particle_systems"):
        if not obj.particle_systems:
            print(f"[keyframe_gen] WARNING: No particle systems on '{target_name}'")
            return (None, None, None)

        ps = obj.particle_systems[0].settings

        def set_val(v, p=ps):
            # Keyframe emission_start/end to create density variation
            p.count = int(v)

        def kf_insert(frame, p=ps):
            p.keyframe_insert("count", frame=frame)

        return (obj, set_val, kf_insert)

    # -- Fallback: try generic attribute path --
    print(f"[keyframe_gen] WARNING: Unrecognized data_path pattern: {data_path} -- "
          f"attempting generic setattr")

    # Try to navigate the path
    parts = data_path.split(".")
    target = obj
    for part in parts[:-1]:
        target = getattr(target, part, None)
        if target is None:
            print(f"[keyframe_gen] WARNING: Could not navigate path '{data_path}' on '{target_name}'")
            return (None, None, None)

    final_prop = parts[-1]

    def set_val(v, t=target, p=final_prop):
        setattr(t, p, v)

    def kf_insert(frame, t=target, p=final_prop):
        t.keyframe_insert(data_path=p, frame=frame)

    return (obj, set_val, kf_insert)


def apply_mapping(set_value_fn, insert_keyframe_fn, value, frame, curve_type):
    """Set a property value and insert a keyframe with the correct interpolation.

    Args:
        set_value_fn: Callable that sets the property value.
        insert_keyframe_fn: Callable that inserts a keyframe at a frame number.
        value: The float value to set.
        frame: Blender frame number (1-based).
        curve_type: "BEZIER", "CONSTANT", or "LINEAR".
    """
    # Set the property value
    set_value_fn(value)

    # Insert the keyframe
    insert_keyframe_fn(frame)

    # Set interpolation type on the most recently created keyframe
    # We need to find the FCurve that was just keyframed
    # This is done by checking all action FCurves for the one with a keyframe at this frame
    _set_interpolation_at_frame(frame, curve_type)


def _set_interpolation_at_frame(frame, curve_type):
    """Set interpolation type on all keyframes at the given frame.

    Searches all FCurves in the active action for keyframes at the given frame
    and sets their interpolation type.

    Args:
        frame: Frame number to match.
        curve_type: "BEZIER", "CONSTANT", or "LINEAR".
    """
    # Check all objects and data blocks for recently-inserted keyframes
    for obj in bpy.data.objects:
        anim = obj.animation_data
        if anim and anim.action:
            _apply_interpolation_to_action(anim.action, frame, curve_type)

        # Also check object data (lights, cameras)
        if obj.data and hasattr(obj.data, "animation_data"):
            data_anim = obj.data.animation_data
            if data_anim and data_anim.action:
                _apply_interpolation_to_action(data_anim.action, frame, curve_type)

    # Check materials
    for mat in bpy.data.materials:
        if mat.node_tree and mat.node_tree.animation_data and mat.node_tree.animation_data.action:
            _apply_interpolation_to_action(mat.node_tree.animation_data.action, frame, curve_type)

    # Check worlds
    for world in bpy.data.worlds:
        if world.node_tree and world.node_tree.animation_data and world.node_tree.animation_data.action:
            _apply_interpolation_to_action(world.node_tree.animation_data.action, frame, curve_type)


def _apply_interpolation_to_action(action, frame, curve_type):
    """Apply interpolation type to keyframes at a specific frame in an action."""
    for fcurve in action.fcurves:
        for kp in fcurve.keyframe_points:
            if abs(kp.co[0] - frame) < 0.5:  # Match within half-frame
                if curve_type == "BEZIER":
                    kp.interpolation = 'BEZIER'
                    kp.handle_left_type = 'AUTO_CLAMPED'
                    kp.handle_right_type = 'AUTO_CLAMPED'
                elif curve_type == "CONSTANT":
                    kp.interpolation = 'CONSTANT'
                elif curve_type == "LINEAR":
                    kp.interpolation = 'LINEAR'
                else:
                    kp.interpolation = 'BEZIER'
                    kp.handle_left_type = 'AUTO_CLAMPED'
                    kp.handle_right_type = 'AUTO_CLAMPED'


def apply_audio_keyframes(audio_json_path, preset_name=None, preset_path=None):
    """Main entry point: apply audio-driven keyframes to the Blender scene.

    Loads the audio analysis JSON and a mapping preset, then inserts keyframes
    on all mapped targets for every frame.

    Args:
        audio_json_path: Absolute path to the audio analysis JSON file.
        preset_name: Name of a preset in PRESETS_DIR (e.g., 'meditation').
        preset_path: Absolute path to a preset JSON file.
            If neither preset_name nor preset_path given, uses
            classification.suggested_preset from the audio JSON.

    Returns:
        Dict summary of the operation.
    """
    # Load audio data
    audio = load_audio_json(audio_json_path)
    metadata = audio["metadata"]
    frames = audio["frames"]

    # Resolve preset
    if preset_path:
        with open(preset_path, "r", encoding="utf-8") as f:
            preset = json.load(f)
        print(f"[keyframe_gen] Using preset from path: {preset_path}")
    elif preset_name:
        preset = load_preset(preset_name)
        print(f"[keyframe_gen] Using preset: {preset_name}")
    else:
        # Auto-detect from classification
        classification = audio.get("classification", {})
        suggested = classification.get("suggested_preset", "meditation").lower()
        try:
            preset = load_preset(suggested)
            print(f"[keyframe_gen] Auto-selected preset: {suggested} "
                  f"(confidence: {classification.get('confidence', 'N/A')})")
        except FileNotFoundError:
            print(f"[keyframe_gen] WARNING: Suggested preset '{suggested}' not found, "
                  f"falling back to first available")
            available = list_presets()
            if not available:
                raise FileNotFoundError("No presets available in " + str(PRESETS_DIR))
            preset = load_preset(available[0]["name"].lower().replace(" ", "_"))

    mappings = preset.get("mappings", [])
    if not mappings:
        raise ValueError(f"Preset '{preset.get('name', '?')}' has no mappings")

    # Safety: save before modifying the scene
    save_before_operate("keyframe_generation")

    # Resolve all mapping targets upfront (fail fast on missing objects)
    resolved = []
    skipped = 0
    for m in mappings:
        target_obj, set_fn, kf_fn = resolve_target(m)
        if target_obj is None:
            print(f"[keyframe_gen] SKIPPING mapping: {m['source_feature']} -> "
                  f"{m['target_object']}.{m.get('target_property', '?')} (target not found)")
            skipped += 1
            continue
        resolved.append((m, set_fn, kf_fn))

    if not resolved:
        raise ValueError("No valid mappings could be resolved -- check object names in preset")

    print(f"[keyframe_gen] Resolved {len(resolved)}/{len(mappings)} mappings "
          f"({skipped} skipped)")

    # Apply keyframes for every frame
    total_keyframes = 0
    frame_count = len(frames)

    for i, frame_data in enumerate(frames):
        # Audio frames are 0-based, Blender frames are 1-based
        blender_frame = frame_data["frame"] + 1

        for m, set_fn, kf_fn in resolved:
            # Extract source value
            raw_value = resolve_feature_value(frame_data, m["source_feature"])

            # Apply scale, offset, clamp
            scaled = raw_value * m.get("scale", 1.0) + m.get("offset", 0.0)
            final_value = clamp(
                scaled,
                m.get("clamp_min", 0.0),
                m.get("clamp_max", 1e6)
            )

            # Set value and insert keyframe
            try:
                apply_mapping(set_fn, kf_fn, final_value, blender_frame, m.get("curve_type", "BEZIER"))
                total_keyframes += 1
            except Exception as e:
                print(f"[keyframe_gen] ERROR at frame {blender_frame}, "
                      f"{m['source_feature']} -> {m['target_object']}.{m.get('target_property', '?')}: {e}")

        # Progress reporting every 10%
        if frame_count > 100 and (i + 1) % (frame_count // 10) == 0:
            pct = int((i + 1) / frame_count * 100)
            print(f"[keyframe_gen] Progress: {pct}% ({i + 1}/{frame_count} frames)")

    # Set scene frame range and FPS from audio metadata
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = metadata.get("total_frames", frame_count)
    scene.render.fps = metadata.get("fps", 30)

    # Summary
    result = {
        "status": "keyframes_applied",
        "preset": preset.get("name", "unknown"),
        "mappings_applied": len(resolved),
        "mappings_skipped": skipped,
        "total_keyframes": total_keyframes,
        "frame_range": f"1-{scene.frame_end}",
        "fps": scene.render.fps,
        "audio_duration": metadata.get("duration_seconds", "?"),
    }

    print(f"\n[keyframe_gen] COMPLETE:")
    print(f"  Preset: {result['preset']}")
    print(f"  Mappings: {result['mappings_applied']} applied, {result['mappings_skipped']} skipped")
    print(f"  Keyframes: {result['total_keyframes']} total")
    print(f"  Frame range: {result['frame_range']} at {result['fps']} fps")
    print(f"  Audio duration: {result['audio_duration']}s")

    return result


# ---------------------------------------------------------------------------
# Preset CRUD functions
# ---------------------------------------------------------------------------

def list_presets():
    """List all available mapping presets.

    Returns:
        List of dicts: [{"name": ..., "description": ..., "path": ...}, ...]
    """
    if not PRESETS_DIR.exists():
        return []

    presets = []
    for f in sorted(PRESETS_DIR.glob("*.json")):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            presets.append({
                "name": data.get("name", f.stem),
                "description": data.get("description", ""),
                "audio_style": data.get("audio_style", ""),
                "mapping_count": len(data.get("mappings", [])),
                "path": str(f),
            })
        except (json.JSONDecodeError, IOError) as e:
            print(f"[keyframe_gen] WARNING: Could not read preset {f.name}: {e}")

    return presets


def load_preset(name):
    """Load a mapping preset by name.

    Args:
        name: Preset name (lowercase, underscores). Maps to PRESETS_DIR/{name}.json

    Returns:
        Parsed preset dict.

    Raises:
        FileNotFoundError: If preset does not exist (lists available presets).
    """
    preset_path = PRESETS_DIR / f"{name}.json"
    if not preset_path.exists():
        available = [f.stem for f in PRESETS_DIR.glob("*.json")] if PRESETS_DIR.exists() else []
        raise FileNotFoundError(
            f"Preset '{name}' not found at {preset_path}. "
            f"Available presets: {available or 'none'}"
        )

    with open(preset_path, "r", encoding="utf-8") as f:
        preset = json.load(f)

    print(f"[keyframe_gen] Loaded preset '{preset.get('name', name)}' "
          f"with {len(preset.get('mappings', []))} mappings")

    return preset


def save_preset(preset, name=None):
    """Save a mapping preset to disk.

    Args:
        preset: Preset dict with name, description, mappings, etc.
        name: Filename (without .json). If not given, derived from preset["name"].

    Returns:
        Path to the saved file.
    """
    if name is None:
        name = preset.get("name", "unnamed").lower().replace(" ", "_")

    os.makedirs(PRESETS_DIR, exist_ok=True)

    preset_path = PRESETS_DIR / f"{name}.json"
    with open(preset_path, "w", encoding="utf-8") as f:
        json.dump(preset, f, indent=2)

    print(f"[keyframe_gen] Saved preset '{preset.get('name', name)}' to {preset_path}")
    return str(preset_path)


def delete_preset(name):
    """Delete a mapping preset by name.

    Args:
        name: Preset name (lowercase, underscores).

    Returns:
        True if deleted, False if not found.
    """
    preset_path = PRESETS_DIR / f"{name}.json"
    if preset_path.exists():
        preset_path.unlink()
        print(f"[keyframe_gen] Deleted preset: {name}")
        return True
    else:
        print(f"[keyframe_gen] Preset '{name}' not found -- nothing to delete")
        return False


def create_preset(name, description, audio_style, mappings, auto_classify_hints=None):
    """Create and save a new mapping preset.

    Args:
        name: Display name (e.g., "My Custom Preset").
        description: What this preset is for.
        audio_style: Short style tag (e.g., "meditation", "edm", "custom").
        mappings: List of mapping dicts, each with:
            source_feature, target_object, target_property, data_path,
            curve_type, scale, offset, clamp_min, clamp_max
        auto_classify_hints: Optional dict with bpm_min/max, centroid_min/max, etc.

    Returns:
        The created preset dict (also saved to disk).
    """
    preset = {
        "name": name,
        "description": description,
        "audio_style": audio_style,
        "auto_classify_hints": auto_classify_hints or {},
        "mappings": mappings,
    }

    save_preset(preset)

    print(f"[keyframe_gen] Created preset '{name}' with {len(mappings)} mappings")
    return preset
