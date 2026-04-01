#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

/// <summary>
/// One-click scene setup: wires AudioAnalyzer, AudioReactiveSkybox,
/// AudioReactiveWater, and AudioSyncMultiBand into the active scene.
///
/// Run via: EFS menu → Setup Audio-Reactive Scene
/// </summary>
public static class SceneSetup
{
    [MenuItem("EFS/Setup Audio-Reactive Scene (One Click)")]
    static void SetupScene()
    {
        int added = 0;

        // -- 1. Add AudioAnalyzer (replaces AudioSpectrum as the engine) --
        var analyzerObj = FindOrCreate("_AudioAnalyzer");
        if (analyzerObj.GetComponent<AudioAnalyzer>() == null)
        {
            var analyzer = analyzerObj.AddComponent<AudioAnalyzer>();
            analyzer.spectrumSize = 1024;
            analyzer.sensitivity = 150f;       // Raw FFT is tiny, needs massive boost
            analyzer.riseSmoothing = 0.02f;    // Near-instant attack
            analyzer.fallSmoothing = 0.75f;    // Visible decay
            added++;
            Debug.Log("[SceneSetup] Added AudioAnalyzer");
        }

        // -- 2. Add AudioReactiveSkybox --
        var skyboxObj = FindOrCreate("_AudioReactiveSkybox");
        if (skyboxObj.GetComponent<AudioReactiveSkybox>() == null)
        {
            var skybox = skyboxObj.AddComponent<AudioReactiveSkybox>();
            skybox.reactionSpeed = 8f;
            skybox.restScrollSpeed = 0.01f;
            skybox.beatScrollSpeed = 0.06f;
            skybox.restBrightness = 0.5f;
            skybox.beatBrightness = 2.0f;
            skybox.restDarkMatter = 555f;
            skybox.beatDarkMatter = 900f;
            skybox.restSaturation = 77f;
            skybox.beatSaturation = 130f;
            added++;
            Debug.Log("[SceneSetup] Added AudioReactiveSkybox");
        }

        // -- 3. Add AudioReactiveWater to water objects --
        foreach (var go in Object.FindObjectsOfType<GameObject>())
        {
            if (go.name.Contains("Water4") && !go.name.Contains("Reflection") && !go.name.Contains("Camera"))
            {
                if (go.GetComponent<AudioReactiveWater>() == null)
                {
                    go.AddComponent<AudioReactiveWater>();
                    added++;
                    Debug.Log($"[SceneSetup] Added AudioReactiveWater to: {go.name}");
                }
            }
        }

        // -- 4. Replace AudioSyncScale with AudioSyncMultiBand on orb objects --
        string[] orbNames = {
            "simple_rainbow", "additive_rainbow", "simple_white",
            "square_rainbow_ring_rotator", "square_stylized_outline",
            "square_stylized_outline_burst", "textured_stylized",
            "textured_stylized_outline"
        };

        foreach (var go in Object.FindObjectsOfType<GameObject>())
        {
            bool isOrb = false;
            foreach (string orbName in orbNames)
            {
                if (go.name.Contains(orbName)) { isOrb = true; break; }
            }

            if (!isOrb) continue;

            // Add AudioSyncMultiBand if not already there
            if (go.GetComponent<AudioSyncMultiBand>() == null)
            {
                var multi = go.AddComponent<AudioSyncMultiBand>();
                // Copy rest/beat scale from existing AudioSyncScale if present
                var oldSync = go.GetComponent<AudioSyncScale>();
                if (oldSync != null)
                {
                    multi.restScale = oldSync.restScale;
                    multi.beatScale = oldSync.beatScale * 1.2f; // Slightly bigger than original
                    multi.scaleAttackSpeed = 30f;   // Snap up fast
                    multi.scaleDecaySpeed = 3f;     // Fade back slowly
                    multi.useOnsetForScale = false;  // Use raw band value, simpler
                    multi.beatEmissionRate = 300f;   // Aggressive particle bursts
                    multi.beatRotationSpeed = 270f;  // Noticeable spin on presence

                    // Disable old syncer (keep it for reference, don't delete)
                    oldSync.enabled = false;
                    Debug.Log($"[SceneSetup] Disabled old AudioSyncScale on: {go.name}");
                }

                added++;
                Debug.Log($"[SceneSetup] Added AudioSyncMultiBand to: {go.name}");
            }
        }

        // -- 5. Disable old AudioSpectrum (AudioAnalyzer provides spectrumValue) --
        foreach (var spectrum in Object.FindObjectsOfType<AudioSpectrum>())
        {
            spectrum.enabled = false;
            Debug.Log($"[SceneSetup] Disabled old AudioSpectrum on: {spectrum.gameObject.name}");
        }

        // -- Mark scene dirty so changes can be saved --
        UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
            UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene()
        );

        Debug.Log($"[SceneSetup] Done! Added {added} components. Save the scene (Ctrl+S) to keep changes.");
        EditorUtility.DisplayDialog(
            "EFS Scene Setup Complete",
            $"Added {added} audio-reactive components.\n\n" +
            "- AudioAnalyzer (8-band FFT)\n" +
            "- AudioReactiveSkybox (starfield reacts)\n" +
            "- AudioReactiveWater (waves react)\n" +
            "- AudioSyncMultiBand (orbs react to multiple bands)\n\n" +
            "Drag an audio clip onto the 'audio' object and hit Play!\n\n" +
            "Save the scene with Ctrl+S.",
            "OK"
        );
    }

    [MenuItem("EFS/Reset to Original Audio System")]
    static void ResetToOriginal()
    {
        // Re-enable AudioSpectrum, disable new components
        foreach (var spectrum in Object.FindObjectsOfType<AudioSpectrum>(true))
            spectrum.enabled = true;

        foreach (var analyzer in Object.FindObjectsOfType<AudioAnalyzer>(true))
            analyzer.enabled = false;

        foreach (var comp in Object.FindObjectsOfType<AudioReactiveSkybox>(true))
            comp.enabled = false;

        foreach (var comp in Object.FindObjectsOfType<AudioReactiveWater>(true))
            comp.enabled = false;

        foreach (var comp in Object.FindObjectsOfType<AudioSyncMultiBand>(true))
            comp.enabled = false;

        // Re-enable old AudioSyncScale
        foreach (var comp in Object.FindObjectsOfType<AudioSyncScale>(true))
            comp.enabled = true;

        UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
            UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene()
        );

        Debug.Log("[SceneSetup] Reset to original audio system. Save scene with Ctrl+S.");
        EditorUtility.DisplayDialog("Reset Complete", "Original AudioSpectrum + AudioSyncScale re-enabled.\nNew components disabled.\n\nSave with Ctrl+S.", "OK");
    }

    static GameObject FindOrCreate(string name)
    {
        var go = GameObject.Find(name);
        if (go == null)
        {
            go = new GameObject(name);
            Debug.Log($"[SceneSetup] Created GameObject: {name}");
        }
        return go;
    }
}
#endif
