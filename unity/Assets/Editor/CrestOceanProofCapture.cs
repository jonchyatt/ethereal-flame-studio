#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Starts a 10-second, 30fps Crest proof capture for one migrated scene.
/// Run each public method with -executeMethod, without -batchmode or -quit:
/// Crest deliberately omits its render mesh when Application.isBatchMode is
/// true, and the runtime driver exits the Editor after writing all PNG frames.
/// </summary>
public static class CrestOceanProofCapture
{
    const string ProofRoot = @"C:\hal-jobs\STARKAPOO\proof\unity";
    internal const string EnterPlayModeOptionsSessionKey = "CrestOceanProofCapture.PreviousEnterPlayModeOptions";

    public static void CaptureAStarNestSkyboxExample()
    {
        StartCapture("Assets/AStarNestSkybox/Example.unity", "AStarNestSkybox-Example");
    }

    public static void CaptureBttb()
    {
        StartCapture("Assets/BTTB.unity", "BTTB");
    }

    static void StartCapture(string scenePath, string captureName)
    {
        if (EditorApplication.isPlaying)
            throw new InvalidOperationException("Proof capture must begin from Edit Mode.");

        var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);
        var outputDirectory = Path.Combine(ProofRoot, captureName);
        Directory.CreateDirectory(outputDirectory);

        var captureObject = new GameObject("__CrestProofCapture");
        var driver = captureObject.AddComponent<CrestOceanProofDriver>();
        driver.outputDirectory = outputDirectory;
        driver.captureFrames = 300;
        driver.captureFrameRate = 30;
        driver.width = 960;
        driver.height = 540;

        EditorSceneManager.MarkSceneDirty(scene);
        // This project disables scene reload on Play. Temporarily opt out so
        // the unsaved batch-only driver reliably receives its Start callback.
        SessionState.SetBool(EnterPlayModeOptionsSessionKey, EditorSettings.enterPlayModeOptionsEnabled);
        EditorSettings.enterPlayModeOptionsEnabled = false;
        Debug.Log("[CrestOceanProofCapture] Starting " + captureName + " -> " + outputDirectory);
        EditorApplication.isPlaying = true;
    }
}
#endif
