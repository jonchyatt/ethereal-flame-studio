"""
EFS Visual Principles Applicator -- applies perceptual visual intelligence
principles to the active Blender scene.

Principles are loaded from blender/presets/visual_principles.json and applied
as concrete parameter adjustments to scene objects, compositor nodes, and
material nodes.

Usage (from Blender Python console or MCP exec):
    from apply_visual_principles import apply_principles, list_principles

    # See all available principles
    list_principles()

    # Apply specific principles
    apply_principles(["fractal_detail", "contrast_darkness"])

    # Apply all principles
    apply_principles("all")

Each _apply_*() function checks for object existence before modifying,
so it is safe to call on any scene (fire, water, combo, edm, luminous).
Missing objects are skipped with a printed message.
"""

import bpy
import json
import sys
import os
from pathlib import Path

# -- Path setup (standard __file__ fallback for MCP exec) --
try:
    _SCRIPT_DIR = Path(__file__).resolve().parent
except NameError:
    _SCRIPT_DIR = Path("C:/Users/jonch/Projects/ethereal-flame-studio/blender/scripts")

if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from scene_utils import REPO_ROOT, save_before_operate

# -- Constants --
PRESETS_DIR = REPO_ROOT / "blender" / "presets"
PRINCIPLES_FILE = PRESETS_DIR / "visual_principles.json"

# -- Module-level cache --
_cached_principles = None


def _load_principles():
    """Load visual_principles.json from presets directory.

    Caches the result in a module-level variable after first load.

    Returns:
        dict: The parsed JSON containing the principles array.

    Raises:
        FileNotFoundError: If visual_principles.json does not exist.
    """
    global _cached_principles
    if _cached_principles is not None:
        return _cached_principles

    if not PRINCIPLES_FILE.exists():
        raise FileNotFoundError(
            f"Visual principles file not found: {PRINCIPLES_FILE}\n"
            f"Expected at: blender/presets/visual_principles.json"
        )

    with open(PRINCIPLES_FILE, "r") as f:
        _cached_principles = json.load(f)

    print(f"[visual_principles] Loaded {len(_cached_principles['principles'])} "
          f"principles from {PRINCIPLES_FILE.name}")
    return _cached_principles


def list_principles():
    """Print all available visual principles with descriptions and applicability.

    Returns:
        list: The list of principle dicts from the JSON file.
    """
    data = _load_principles()
    principles = data["principles"]

    print(f"\n{'='*60}")
    print(f"EFS Visual Principles ({len(principles)} total)")
    print(f"{'='*60}\n")

    for i, p in enumerate(principles, 1):
        print(f"  {i}. {p['name']}")
        print(f"     {p['description'][:100]}...")
        print(f"     Applies to: {', '.join(p['applies_to'])}")
        param_count = len(p.get("parameters", {}))
        print(f"     Parameters: {param_count} adjustments")
        print()

    print(f"{'='*60}")
    print(f"Usage: apply_principles(['fractal_detail', 'contrast_darkness'])")
    print(f"   or: apply_principles('all')")
    print(f"{'='*60}\n")

    return principles


# ---------------------------------------------------------------------------
# Per-principle application functions
# ---------------------------------------------------------------------------

def _get_fire_domain():
    """Find the fire domain object in the scene.

    Checks for efs_fire_domain (fire_cinema), efs_combo_fire_domain (combo),
    and efs_lumi_fire_domain (luminous).

    Returns:
        bpy.types.Object or None
    """
    for name in ("efs_fire_domain", "efs_combo_fire_domain", "efs_lumi_fire_domain"):
        obj = bpy.data.objects.get(name)
        if obj is not None:
            return obj
    return None


def _get_compositor_node(scene, node_type_label):
    """Get a compositor node by its label or type name.

    Args:
        scene: The Blender scene.
        node_type_label: The node label string (e.g., "Glare", "Color Balance").

    Returns:
        The node or None.
    """
    if not scene.use_nodes or scene.node_tree is None:
        return None
    return scene.node_tree.nodes.get(node_type_label)


def _apply_fractal_detail(scene):
    """Apply fractal_detail principle: increase multi-scale visual detail.

    Modifies fire domain (vorticity, noise_scale, flame_vorticity),
    fire material (density), and compositor glare (size).

    Args:
        scene: The active Blender scene.

    Returns:
        list: Descriptions of changes made.
    """
    changes = []

    # Fire domain adjustments
    domain = _get_fire_domain()
    if domain is not None:
        fluid = domain.modifiers.get("Fluid")
        if fluid and fluid.domain_settings:
            ds = fluid.domain_settings

            # Vorticity: 1.0 -> 1.2
            old_val = ds.vorticity
            ds.vorticity = 1.2
            changes.append(f"fire_domain.vorticity: {old_val} -> 1.2")

            # Noise scale: ensure minimum 3
            old_val = ds.noise_scale
            if ds.noise_scale < 3:
                ds.noise_scale = 3
                changes.append(f"fire_domain.noise_scale: {old_val} -> 3")
            else:
                changes.append(f"fire_domain.noise_scale: {old_val} (already >= 3, kept)")

            # Flame vorticity: 1.5 -> 2.0
            old_val = ds.flame_vorticity
            ds.flame_vorticity = 2.0
            changes.append(f"fire_domain.flame_vorticity: {old_val} -> 2.0")
        else:
            changes.append("SKIP: fire domain has no Fluid modifier")
    else:
        changes.append("SKIP: no fire domain found (efs_fire_domain / efs_combo_fire_domain / efs_lumi_fire_domain)")

    # Fire material density adjustment
    mat = bpy.data.materials.get("efs_fire_material")
    if mat and mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type == 'VOLUME_PRINCIPLED':
                old_val = node.inputs["Density"].default_value
                node.inputs["Density"].default_value = 10.0
                changes.append(f"fire_material.density: {old_val} -> 10.0")
                break
        else:
            changes.append("SKIP: no Principled Volume node in fire material")
    else:
        changes.append("SKIP: efs_fire_material not found or has no nodes")

    # Compositor glare size
    glare = _get_compositor_node(scene, "Glare")
    if glare:
        old_val = glare.size
        glare.size = 8
        changes.append(f"compositor.glare_size: {old_val} -> 8")
    else:
        changes.append("SKIP: no Glare compositor node found")

    for c in changes:
        print(f"  [fractal_detail] {c}")

    return changes


def _apply_emergent_complexity(scene):
    """Apply emergent_complexity principle: layer independent visual systems.

    Increases flame_smoke, adjusts color balance slope, increases rim light.

    Args:
        scene: The active Blender scene.

    Returns:
        list: Descriptions of changes made.
    """
    changes = []

    # Fire domain flame_smoke
    domain = _get_fire_domain()
    if domain is not None:
        fluid = domain.modifiers.get("Fluid")
        if fluid and fluid.domain_settings:
            ds = fluid.domain_settings
            old_val = ds.flame_smoke
            ds.flame_smoke = 0.7
            changes.append(f"fire_domain.flame_smoke: {old_val} -> 0.7")
        else:
            changes.append("SKIP: fire domain has no Fluid modifier")
    else:
        changes.append("SKIP: no fire domain found")

    # Compositor color balance slope
    cb = _get_compositor_node(scene, "Color Balance")
    if cb:
        old_val = list(cb.slope)
        cb.slope = (1.08, 1.0, 0.92)
        changes.append(f"compositor.color_balance.slope: {old_val} -> (1.08, 1.0, 0.92)")
    else:
        changes.append("SKIP: no Color Balance compositor node found")

    # Rim light energy
    rim_names = ("efs_rim_light", "efs_combo_rim_light", "efs_lumi_rim_light", "rim_light")
    rim_found = False
    for name in rim_names:
        obj = bpy.data.objects.get(name)
        if obj and obj.type == 'LIGHT':
            old_val = obj.data.energy
            obj.data.energy = 70
            changes.append(f"lighting.rim_energy ({name}): {old_val} -> 70")
            rim_found = True
            break
    if not rim_found:
        changes.append("SKIP: no rim light found")

    for c in changes:
        print(f"  [emergent_complexity] {c}")

    return changes


def _apply_contrast_darkness(scene):
    """Apply contrast_darkness principle: maximize dark-to-bright perceptual impact.

    Sets world background to pure black, reduces key/ground light energy,
    adjusts color balance offset darker, lowers bloom threshold.

    Args:
        scene: The active Blender scene.

    Returns:
        list: Descriptions of changes made.
    """
    changes = []

    # World background strength -> 0.0
    world = scene.world
    if world and world.use_nodes and world.node_tree:
        for node in world.node_tree.nodes:
            if node.type == 'BACKGROUND':
                old_val = node.inputs["Strength"].default_value
                node.inputs["Strength"].default_value = 0.0
                changes.append(f"world.background_strength: {old_val} -> 0.0")
                break
        else:
            changes.append("SKIP: no Background node in world shader")
    else:
        changes.append("SKIP: world has no node tree")

    # Key light energy: 150 -> 100
    key_names = ("efs_key_light", "efs_combo_key_light", "efs_lumi_key_light", "key_light")
    key_found = False
    for name in key_names:
        obj = bpy.data.objects.get(name)
        if obj and obj.type == 'LIGHT':
            old_val = obj.data.energy
            obj.data.energy = 100
            changes.append(f"lighting.key_energy ({name}): {old_val} -> 100")
            key_found = True
            break
    if not key_found:
        changes.append("SKIP: no key light found")

    # Ground bounce light energy: 30 -> 15
    bounce_names = ("efs_ground_bounce", "efs_combo_ground_bounce", "ground_bounce")
    bounce_found = False
    for name in bounce_names:
        obj = bpy.data.objects.get(name)
        if obj and obj.type == 'LIGHT':
            old_val = obj.data.energy
            obj.data.energy = 15
            changes.append(f"lighting.ground_bounce_energy ({name}): {old_val} -> 15")
            bounce_found = True
            break
    if not bounce_found:
        changes.append("SKIP: no ground bounce light found")

    # Compositor color balance offset -> darker
    cb = _get_compositor_node(scene, "Color Balance")
    if cb:
        old_val = list(cb.offset)
        cb.offset = (0.98, 0.93, 0.85)
        changes.append(f"compositor.color_balance.offset: {old_val} -> (0.98, 0.93, 0.85)")
    else:
        changes.append("SKIP: no Color Balance compositor node found")

    # Compositor bloom threshold: 0.8 -> 0.7
    glare = _get_compositor_node(scene, "Glare")
    if glare:
        old_val = glare.threshold
        glare.threshold = 0.7
        changes.append(f"compositor.bloom_threshold: {old_val} -> 0.7")
    else:
        changes.append("SKIP: no Glare compositor node found")

    for c in changes:
        print(f"  [contrast_darkness] {c}")

    return changes


def _apply_sync_precision(scene):
    """Apply sync_precision principle: document frame-accurate sync settings.

    This principle affects keyframe generation, not scene parameters.
    The keyframe_generator already supports these settings via preset
    curve_type fields. This function prints the recommended settings
    for reference.

    Args:
        scene: The active Blender scene (unused, included for API consistency).

    Returns:
        list: Descriptions of recommended settings.
    """
    changes = [
        "NOTE: sync_precision affects keyframe generation, not scene parameters",
        "RECOMMEND: keyframe.curve_type_onsets = CONSTANT (instant snap for beat hits)",
        "RECOMMEND: keyframe.curve_type_envelopes = BEZIER with AUTO_CLAMPED handles (smooth decay)",
        "RECOMMEND: audio_mapping.onset_scale = 1.5 (amplify onsets 50% above envelope baseline)",
        "RECOMMEND: audio_mapping.envelope_smoothing = none (analysis already provides per-frame values)",
        "ACTION: Set these in your audio mapping preset JSON (e.g., fire_cinema.json)"
    ]

    for c in changes:
        print(f"  [sync_precision] {c}")

    return changes


def _apply_expectation_violation(scene):
    """Apply expectation_violation principle: enhance breakdown/drop extremes.

    Adjusts bloom threshold if compositor exists, and documents recommended
    dynamic_range preset changes for the audio mapping JSON files.

    Args:
        scene: The active Blender scene.

    Returns:
        list: Descriptions of changes made and recommendations.
    """
    changes = []

    # Compositor bloom threshold adjustment (shared with contrast_darkness
    # but this one targets the drop-visible bloom level)
    glare = _get_compositor_node(scene, "Glare")
    if glare:
        old_val = glare.threshold
        # Only lower if currently higher than 0.7 (contrast_darkness may
        # have already set this)
        if glare.threshold > 0.7:
            glare.threshold = 0.7
            changes.append(f"compositor.bloom_threshold: {old_val} -> 0.7 (more bloom for drop visibility)")
        else:
            changes.append(f"compositor.bloom_threshold: {old_val} (already <= 0.7, kept)")
    else:
        changes.append("SKIP: no Glare compositor node found")

    # Document recommended dynamic_range preset changes
    changes.extend([
        "RECOMMEND: dynamic_range.breakdown_multiplier = 0.08 (down from 0.1 -- darker breakdowns)",
        "RECOMMEND: dynamic_range.drop_multiplier = 1.2 (up from 1.0 -- brighter drops)",
        "RECOMMEND: color_temp.inversion_on_drop = true (3-frame cool flash on bass after breakdown)",
        "RECOMMEND: camera.fov_shift_on_drop = 0.02 (2% sensor shift_x for visual punch)",
        "ACTION: Set breakdown/drop multipliers in your audio mapping preset JSON"
    ])

    for c in changes:
        print(f"  [expectation_violation] {c}")

    return changes


# ---------------------------------------------------------------------------
# Dispatcher map
# ---------------------------------------------------------------------------

_PRINCIPLE_FUNCTIONS = {
    "fractal_detail": _apply_fractal_detail,
    "emergent_complexity": _apply_emergent_complexity,
    "contrast_darkness": _apply_contrast_darkness,
    "sync_precision": _apply_sync_precision,
    "expectation_violation": _apply_expectation_violation,
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def apply_principles(principle_names, scene=None):
    """Apply one or more visual principles to the active Blender scene.

    Args:
        principle_names: Either "all" (string), ["all"] (list with "all"),
                         or a list of principle name strings.
                         e.g. ["fractal_detail", "contrast_darkness"]
        scene: Optional bpy.types.Scene. Defaults to bpy.context.scene.

    Returns:
        dict: Summary with keys 'applied', 'skipped', 'changes'.
    """
    if scene is None:
        scene = bpy.context.scene

    # Save before making changes
    save_before_operate("visual_principles")

    # Load principles data (for validation)
    data = _load_principles()
    valid_names = [p["name"] for p in data["principles"]]

    # Normalize input
    if principle_names == "all" or principle_names == ["all"]:
        names_to_apply = list(valid_names)
    elif isinstance(principle_names, str):
        names_to_apply = [principle_names]
    else:
        names_to_apply = list(principle_names)

    # Validate requested principle names
    applied = []
    skipped = []
    all_changes = {}

    print(f"\n[visual_principles] Applying {len(names_to_apply)} principle(s) to scene '{scene.name}'...")
    print(f"{'─'*50}")

    for name in names_to_apply:
        if name not in _PRINCIPLE_FUNCTIONS:
            print(f"  WARNING: Unknown principle '{name}'. Valid: {valid_names}")
            skipped.append(name)
            continue

        print(f"\n  Applying: {name}")
        fn = _PRINCIPLE_FUNCTIONS[name]
        changes = fn(scene)
        applied.append(name)
        all_changes[name] = changes

    print(f"\n{'─'*50}")
    print(f"[visual_principles] Applied {len(applied)} principles: {applied}")
    if skipped:
        print(f"[visual_principles] Skipped {len(skipped)}: {skipped}")
    print()

    return {
        "applied": applied,
        "skipped": skipped,
        "changes": all_changes,
    }
