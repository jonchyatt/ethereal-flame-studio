using System;
using System.Collections;
using System.IO;
using Crest;
using UnityEngine;

/// <summary>
/// Batch-only capture helper. It produces numbered PNGs plus a representative
/// still while a generated 45 Hz test tone drives AudioAnalyzer and Crest.
/// The editor launcher supplies outputDirectory before entering Play Mode.
/// </summary>
[DefaultExecutionOrder(10000)]
public class CrestOceanProofDriver : MonoBehaviour
{
    [HideInInspector] public string outputDirectory;
    [HideInInspector] public int captureFrames = 300;
    [HideInInspector] public int captureFrameRate = 30;
    [HideInInspector] public int width = 1280;
    [HideInInspector] public int height = 720;

    Camera _camera;
    RenderTexture _renderTexture;
    Texture2D _readback;
    RenderTexture _originalTarget;
    Vector3 _cameraStartPosition;
    Quaternion _cameraStartRotation;

    IEnumerator Start()
    {
        Debug.Log("[CrestOceanProofDriver] Initialising batch capture.");
        if (string.IsNullOrEmpty(outputDirectory))
        {
            Debug.LogError("[CrestOceanProofDriver] No output directory was supplied.");
            Exit(2);
            yield break;
        }

        Directory.CreateDirectory(outputDirectory);
        _camera = FindCaptureCamera();
        if (_camera == null)
        {
            Debug.LogError("[CrestOceanProofDriver] No enabled non-reflection camera was found.");
            Exit(2);
            yield break;
        }

        EnsureAudioInput();
        EnsureCrestBatchCaptureSurface();
        _cameraStartPosition = _camera.transform.position;
        _cameraStartRotation = _camera.transform.rotation;
        _originalTarget = _camera.targetTexture;
        _renderTexture = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32)
        {
            name = "CrestProofCaptureRT"
        };
        _readback = new Texture2D(width, height, TextureFormat.RGB24, false);
        Time.captureFramerate = captureFrameRate;
        Application.targetFrameRate = captureFrameRate;

        // Allow the OceanRenderer, audio analyser, and planar reflection helper
        // to initialise before the first recorded image.
        yield return null;
        yield return null;

        for (var frame = 0; frame < captureFrames; frame++)
        {
            AnimateCamera(frame / (float)captureFrameRate);
            // WaitForEndOfFrame does not resume in Unity batch mode. A normal
            // frame yield still advances audio/Crest and Camera.Render below
            // renders the completed state from the preceding player loop.
            yield return null;
            WriteFrame(frame);
        }

        Cleanup();
        Debug.Log("[CrestOceanProofDriver] Wrote " + captureFrames + " frames to " + outputDirectory);
        Exit(0);
    }

    static Camera FindCaptureCamera()
    {
        if (Camera.main != null && Camera.main.enabled) return Camera.main;
        foreach (var camera in FindObjectsByType<Camera>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
        {
            if (camera.enabled && !camera.name.Contains("Reflection")) return camera;
        }
        return null;
    }

    void EnsureAudioInput()
    {
        if (FindFirstObjectByType<AudioAnalyzer>() == null)
        {
            var analyzerObject = new GameObject("_CrestProofAudioAnalyzer");
            var analyzer = analyzerObject.AddComponent<AudioAnalyzer>();
            analyzer.spectrumSize = 1024;
            analyzer.sensitivity = 150f;
            analyzer.riseSmoothing = 0.02f;
            analyzer.fallSmoothing = 0.75f;
        }

        var source = gameObject.AddComponent<AudioSource>();
        source.clip = CreatePulsedTestTone(captureFrameRate * 12, 48000, 45f);
        source.loop = true;
        source.volume = 0.65f;
        source.Play();
    }

    static AudioClip CreatePulsedTestTone(int durationSeconds, int sampleRate, float frequency)
    {
        var sampleCount = durationSeconds * sampleRate;
        var samples = new float[sampleCount];
        for (var i = 0; i < sampleCount; i++)
        {
            var t = i / (float)sampleRate;
            var pulse = 0.25f + 0.75f * Mathf.Pow(Mathf.Max(0f, Mathf.Sin(t * Mathf.PI * 2f)), 2f);
            samples[i] = Mathf.Sin(t * Mathf.PI * 2f * frequency) * pulse * 0.45f;
        }

        var clip = AudioClip.Create("CrestProof45HzTestTone", sampleCount, 1, sampleRate, false);
        clip.SetData(samples, 0);
        return clip;
    }

    void AnimateCamera(float seconds)
    {
        var drift = Mathf.Sin(seconds * 0.45f) * 0.12f;
        _camera.transform.position = _cameraStartPosition + _camera.transform.right * drift;
        // The source camera is composed for the nebula. Tilt only the proof
        // view down so the ocean shares the frame with the cosmic sky. The
        // BTTB fallback camera already starts angled down toward the water.
        var basePitch = _camera.name == "Crest Fallback Camera" ? 20f : 42f;
        _camera.transform.rotation = _cameraStartRotation * Quaternion.Euler(basePitch + Mathf.Sin(seconds * 0.35f) * 0.35f, drift * 2f, 0f);
    }

    void EnsureCrestBatchCaptureSurface()
    {
        // Crest intentionally suppresses its automatically generated tile
        // meshes when Application.isBatchMode is true. The ocean system,
        // material, spectrum, and shader data still run, so add an unsaved
        // capture-only proxy using the same Crest material and LOD data.
        if (!Application.isBatchMode || OceanRenderer.Instance == null)
            return;

        var surface = new GameObject("_CrestBatchCaptureSurface");
        surface.layer = OceanRenderer.Instance.Layer;
        surface.transform.SetParent(OceanRenderer.Instance.transform, false);
        surface.transform.localPosition = Vector3.zero;

        var filter = surface.AddComponent<MeshFilter>();
        filter.sharedMesh = BuildCaptureMesh(64f, 32);
        var renderer = surface.AddComponent<MeshRenderer>();
        renderer.sharedMaterial = OceanRenderer.Instance.OceanMaterial;
        renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows = false;
        var properties = new MaterialPropertyBlock();
        properties.SetInt("_LD_SliceIndex", 0);
        renderer.SetPropertyBlock(properties);
        _camera.depthTextureMode |= DepthTextureMode.Depth;
    }

    static Mesh BuildCaptureMesh(float size, int divisions)
    {
        var verticesPerEdge = divisions + 1;
        var vertices = new Vector3[verticesPerEdge * verticesPerEdge];
        var normals = new Vector3[vertices.Length];
        var uvs = new Vector2[vertices.Length];
        var triangles = new int[divisions * divisions * 6];
        var halfSize = size * 0.5f;

        for (var z = 0; z <= divisions; z++)
        for (var x = 0; x <= divisions; x++)
        {
            var index = z * verticesPerEdge + x;
            vertices[index] = new Vector3(Mathf.Lerp(-halfSize, halfSize, x / (float)divisions), 0f, Mathf.Lerp(-halfSize, halfSize, z / (float)divisions));
            normals[index] = Vector3.up;
            uvs[index] = new Vector2(x / (float)divisions, z / (float)divisions);
        }

        var triangleIndex = 0;
        for (var z = 0; z < divisions; z++)
        for (var x = 0; x < divisions; x++)
        {
            var bottomLeft = z * verticesPerEdge + x;
            triangles[triangleIndex++] = bottomLeft;
            triangles[triangleIndex++] = bottomLeft + verticesPerEdge;
            triangles[triangleIndex++] = bottomLeft + verticesPerEdge + 1;
            triangles[triangleIndex++] = bottomLeft;
            triangles[triangleIndex++] = bottomLeft + verticesPerEdge + 1;
            triangles[triangleIndex++] = bottomLeft + 1;
        }

        var mesh = new Mesh { name = "CrestBatchCaptureMesh" };
        mesh.vertices = vertices;
        mesh.normals = normals;
        mesh.uv = uvs;
        mesh.triangles = triangles;
        mesh.RecalculateBounds();
        return mesh;
    }

    void WriteFrame(int frame)
    {
        _camera.targetTexture = _renderTexture;
        _camera.Render();
        var previous = RenderTexture.active;
        RenderTexture.active = _renderTexture;
        _readback.ReadPixels(new Rect(0, 0, width, height), 0, 0);
        _readback.Apply(false, false);
        RenderTexture.active = previous;

        var bytes = _readback.EncodeToPNG();
        File.WriteAllBytes(Path.Combine(outputDirectory, "frame-" + frame.ToString("D4") + ".png"), bytes);
        if (frame == captureFrames / 2)
            File.WriteAllBytes(Path.Combine(outputDirectory, "still.png"), bytes);
    }

    void Cleanup()
    {
        if (_camera != null)
        {
            _camera.targetTexture = _originalTarget;
            _camera.transform.position = _cameraStartPosition;
            _camera.transform.rotation = _cameraStartRotation;
        }
        if (_renderTexture != null) Destroy(_renderTexture);
        if (_readback != null) Destroy(_readback);
        Time.captureFramerate = 0;
    }

    static void Exit(int code)
    {
#if UNITY_EDITOR
        const string enterPlayModeOptionsSessionKey = "CrestOceanProofCapture.PreviousEnterPlayModeOptions";
        if (UnityEditor.SessionState.GetBool(enterPlayModeOptionsSessionKey, false))
            UnityEditor.EditorSettings.enterPlayModeOptionsEnabled = true;
        UnityEditor.SessionState.EraseBool(enterPlayModeOptionsSessionKey);
        UnityEditor.EditorApplication.Exit(code);
#else
        Application.Quit(code);
#endif
    }
}
