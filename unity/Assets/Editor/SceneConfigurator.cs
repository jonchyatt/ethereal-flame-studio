#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

/// <summary>
/// Reads a JSON preset and configures the entire Unity scene before recording.
/// This is the bridge between "manual grind" and "one command = finished video."
///
/// Called by AutoRecorder before entering Play Mode, or manually via EFS menu.
///
/// What it configures:
///   - Which orb prefab is active (simple_rainbow, additive_rainbow, etc.)
///   - Which skybox material (1DarkWorld1, CrazyFractal_Hueshift, etc.)
///   - Water enabled/disabled
///   - Beat sensitivity and audio band mapping
///   - Color palette
///   - Camera behavior
///   - Recording settings (mode, resolution, framerate)
///   - Extra objects (birds, patreon wall, etc.)
/// </summary>
public static class SceneConfigurator
{
    [System.Serializable]
    public class Preset
    {
        public string name;
        public string orb_prefab;
        public string skybox_material;
        public bool water_enabled = true;
        public float beat_sensitivity = 1.0f;
        public string[] color_palette;
        public CameraConfig camera;
        public AudioBandConfig audio_bands;
        public RecordingConfig recording;
        public ExtraConfig extras;
    }

    [System.Serializable]
    public class CameraConfig
    {
        public string mode = "static";
        public float height = 1.6f;
        public float orbit_speed = 0f;
        public float orbit_radius = 0f;
    }

    [System.Serializable]
    public class AudioBandConfig
    {
        public float bass_to_scale = 1.0f;
        public float mid_to_color = 0.8f;
        public float high_to_particles = 0.5f;
        public float sub_bass_to_water = 0.3f;
        public float presence_to_skybox = 0.2f;
    }

    [System.Serializable]
    public class RecordingConfig
    {
        public string mode = "360stereo";
        public int resolution = 4096;
        public int framerate = 30;
        public float stereo_separation = 0.065f;
    }

    [System.Serializable]
    public class ExtraConfig
    {
        public bool birds = false;
        public bool patreon_wall = false;
        public string patreon_data_path = "";
    }

    static readonly string PRESETS_DIR = Path.Combine(Application.dataPath, "..", "Presets");

    /// <summary>
    /// Apply a named preset to the current scene.
    /// Looks for Presets/{name}.json in the project root.
    /// </summary>
    public static Preset ApplyPreset(string presetName)
    {
        string path = Path.Combine(PRESETS_DIR, presetName + ".json");
        if (!File.Exists(path))
        {
            Debug.LogError($"[SceneConfigurator] Preset not found: {path}");
            return null;
        }

        string json = File.ReadAllText(path);
        Preset preset = JsonUtility.FromJson<Preset>(json);

        if (preset == null)
        {
            Debug.LogError($"[SceneConfigurator] Failed to parse preset: {path}");
            return null;
        }

        Debug.Log($"[SceneConfigurator] Applying preset: {preset.name}");

        ApplyOrbPrefab(preset.orb_prefab);
        ApplySkybox(preset.skybox_material);
        ApplyWater(preset.water_enabled);
        ApplyBeatSensitivity(preset.beat_sensitivity);
        ApplyColorPalette(preset.color_palette);

        Debug.Log($"[SceneConfigurator] Preset '{preset.name}' applied successfully");
        return preset;
    }

    /// <summary>
    /// Apply preset from a full file path (for CLI usage).
    /// </summary>
    public static Preset ApplyPresetFromPath(string path)
    {
        if (!File.Exists(path))
        {
            Debug.LogError($"[SceneConfigurator] Preset file not found: {path}");
            return null;
        }

        string json = File.ReadAllText(path);
        Preset preset = JsonUtility.FromJson<Preset>(json);
        if (preset == null) return null;

        ApplyPreset(preset.name);
        return preset;
    }

    // -- Individual configurators --

    static void ApplyOrbPrefab(string prefabName)
    {
        if (string.IsNullOrEmpty(prefabName)) return;

        // Known orb prefab names
        string[] allOrbs = {
            "simple_rainbow", "additive_rainbow", "simple_white",
            "square_rainbow_ring_rotator", "square_stylized_outline",
            "square_stylized_outline_burst", "textured_stylized",
            "textured_stylized_outline"
        };

        // Find all orb GameObjects in scene and enable/disable based on preset
        foreach (string orbName in allOrbs)
        {
            var go = GameObject.Find(orbName);
            if (go != null)
            {
                bool shouldBeActive = orbName == prefabName;
                go.SetActive(shouldBeActive);
                if (shouldBeActive)
                    Debug.Log($"[SceneConfigurator] Activated orb: {orbName}");
            }
        }

        // If the target prefab isn't in the scene, try to instantiate it
        if (GameObject.Find(prefabName) == null)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/Prefabs/{prefabName}.prefab");
            if (prefab != null)
            {
                var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                instance.name = prefabName;
                Debug.Log($"[SceneConfigurator] Instantiated orb prefab: {prefabName}");
            }
            else
            {
                Debug.LogWarning($"[SceneConfigurator] Orb prefab not found: {prefabName}");
            }
        }
    }

    static void ApplySkybox(string materialName)
    {
        if (string.IsNullOrEmpty(materialName)) return;

        // Skybox materials are in Resources (loaded by SkyboxSwitcher)
        var mat = Resources.Load<Material>(materialName);
        if (mat != null)
        {
            RenderSettings.skybox = mat;
            DynamicGI.UpdateEnvironment();
            Debug.Log($"[SceneConfigurator] Skybox set to: {materialName}");
        }
        else
        {
            // Try AStarNestSkybox/Materials/Resources path
            mat = Resources.Load<Material>($"Materials/{materialName}");
            if (mat != null)
            {
                RenderSettings.skybox = mat;
                DynamicGI.UpdateEnvironment();
                Debug.Log($"[SceneConfigurator] Skybox set to: {materialName} (from Materials/)");
            }
            else
            {
                Debug.LogWarning($"[SceneConfigurator] Skybox material not found: {materialName}");
            }
        }
    }

    static void ApplyWater(bool enabled)
    {
        // Find all Water4Advanced objects in the scene
        var waterObjects = new List<GameObject>();
        foreach (var go in UnityEngine.Object.FindObjectsOfType<GameObject>())
        {
            if (go.name.Contains("Water4") || go.name.Contains("water") || go.name.Contains("Ocean"))
            {
                waterObjects.Add(go);
            }
        }

        foreach (var water in waterObjects)
        {
            water.SetActive(enabled);
        }

        if (waterObjects.Count > 0)
            Debug.Log($"[SceneConfigurator] Water {(enabled ? "enabled" : "disabled")} ({waterObjects.Count} objects)");
    }

    static void ApplyBeatSensitivity(float sensitivity)
    {
        // Find all AudioSyncer components and adjust their bias
        var syncers = UnityEngine.Object.FindObjectsOfType<AudioSyncer>();
        foreach (var syncer in syncers)
        {
            // Lower bias = more sensitive to beats
            // Default bias varies, so we scale it inversely with sensitivity
            syncer.bias = Mathf.Lerp(2.0f, 0.1f, Mathf.Clamp01(sensitivity));
            syncer.timeToBeat = Mathf.Lerp(0.5f, 0.05f, Mathf.Clamp01(sensitivity));
            syncer.restSmoothTime = Mathf.Lerp(1.0f, 5.0f, Mathf.Clamp01(sensitivity));
        }

        if (syncers.Length > 0)
            Debug.Log($"[SceneConfigurator] Beat sensitivity set to {sensitivity} ({syncers.Length} syncers)");
    }

    static void ApplyColorPalette(string[] palette)
    {
        if (palette == null || palette.Length == 0) return;

        // Convert hex strings to Unity Colors
        var colors = new List<Color>();
        foreach (string hex in palette)
        {
            if (ColorUtility.TryParseHtmlString(hex, out Color c))
                colors.Add(c);
        }

        if (colors.Count == 0) return;

        // Find AudioSyncColor components and set their beat colors
        var colorSyncers = UnityEngine.Object.FindObjectsOfType<AudioSyncColor>();
        foreach (var syncer in colorSyncers)
        {
            syncer.beatColors = colors.ToArray();
        }

        // Also apply to particle systems' start color
        var particleSystems = UnityEngine.Object.FindObjectsOfType<ParticleSystem>();
        foreach (var ps in particleSystems)
        {
            var main = ps.main;
            if (colors.Count >= 2)
            {
                var gradient = new ParticleSystem.MinMaxGradient(colors[0], colors[colors.Count - 1]);
                main.startColor = gradient;
            }
        }

        Debug.Log($"[SceneConfigurator] Color palette applied: {colors.Count} colors");
    }

    // -- Menu items for Editor testing --

    [MenuItem("EFS/Apply Preset/Meditation")]
    static void ApplyMeditation() { ApplyPreset("meditation"); }

    [MenuItem("EFS/Apply Preset/EDM")]
    static void ApplyEDM() { ApplyPreset("edm"); }

    [MenuItem("EFS/Apply Preset/Ambient")]
    static void ApplyAmbient() { ApplyPreset("ambient"); }

    [MenuItem("EFS/Apply Preset/Fire Cinema")]
    static void ApplyFireCinema() { ApplyPreset("fire_cinema"); }

    [MenuItem("EFS/List Available Presets")]
    static void ListPresets()
    {
        if (!Directory.Exists(PRESETS_DIR))
        {
            Debug.Log($"[SceneConfigurator] No presets directory found at: {PRESETS_DIR}");
            return;
        }

        var files = Directory.GetFiles(PRESETS_DIR, "*.json");
        Debug.Log($"[SceneConfigurator] Found {files.Length} presets:");
        foreach (var file in files)
        {
            Debug.Log($"  - {Path.GetFileNameWithoutExtension(file)}");
        }
    }
}
#endif
