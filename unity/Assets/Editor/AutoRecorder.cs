#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Recorder;
using UnityEditor.Recorder.Input;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Headless batch recorder for Ethereal Flame Studio.
///
/// Accepts an audio file, configures Unity Recorder for 360/stereo/flat capture,
/// plays the scene, records for the duration of the audio, then exits.
///
/// Usage (command line):
///   Unity.exe -batchmode -projectPath "path/to/unity"
///     -executeMethod AutoRecorder.BatchRender
///     -audioFile "C:/audio/meditation.wav"
///     -outputDir "C:/output"
///     -outputName "meditation_001"
///     -mode 360stereo
///     -resolution 4096
///     -framerate 30
///     -stereoSeparation 0.065
///
/// Parameters:
///   -audioFile       (required) Absolute path to WAV/MP3/OGG audio file
///   -outputDir       (optional) Output directory. Default: project/Recordings
///   -outputName      (optional) Output filename. Default: "efs_render"
///   -mode            (optional) "360stereo" | "360mono" | "flat". Default: "360stereo"
///   -resolution      (optional) Cubemap face size for 360, or width for flat. Default: 4096
///   -framerate       (optional) Recording frame rate. Default: 30
///   -stereoSeparation (optional) IPD in meters. Default: 0.065
///   -mapSize         (optional) Cubemap map size. Default: same as resolution
///   -scene           (optional) Scene name to load. Default: "BTTB"
///
/// Can also be called from the Unity Editor menu: EFS > Start Recording
/// </summary>
public static class AutoRecorder
{
    // -- Command-line entry point --
    public static void BatchRender()
    {
        Debug.Log("[AutoRecorder] Starting batch render...");

        var args = ParseCommandLineArgs();

        string audioFile = GetArg(args, "audioFile");
        if (string.IsNullOrEmpty(audioFile))
        {
            Debug.LogError("[AutoRecorder] ERROR: -audioFile is required");
            EditorApplication.Exit(1);
            return;
        }

        if (!File.Exists(audioFile))
        {
            Debug.LogError($"[AutoRecorder] ERROR: Audio file not found: {audioFile}");
            EditorApplication.Exit(1);
            return;
        }

        string outputDir = GetArg(args, "outputDir", Path.Combine(Application.dataPath, "..", "Recordings"));
        string outputName = GetArg(args, "outputName", "efs_render");
        string mode = GetArg(args, "mode", "360stereo");
        int resolution = int.Parse(GetArg(args, "resolution", "4096"));
        float framerate = float.Parse(GetArg(args, "framerate", "30"));
        float stereoSep = float.Parse(GetArg(args, "stereoSeparation", "0.065"));
        int mapSize = int.Parse(GetArg(args, "mapSize", resolution.ToString()));
        string sceneName = GetArg(args, "scene", "Example");
        string presetName = GetArg(args, "preset", "");

        Debug.Log($"[AutoRecorder] Audio: {audioFile}");
        Debug.Log($"[AutoRecorder] Output: {outputDir}/{outputName}");
        Debug.Log($"[AutoRecorder] Mode: {mode}, Resolution: {resolution}, FPS: {framerate}");

        // Load the scene
        var scenePath = FindScenePath(sceneName);
        if (scenePath == null)
        {
            Debug.LogError($"[AutoRecorder] ERROR: Scene '{sceneName}' not found");
            EditorApplication.Exit(1);
            return;
        }
        EditorSceneManager.OpenScene(scenePath);

        // Apply preset if specified (configures scene before recording)
        if (!string.IsNullOrEmpty(presetName))
        {
            Debug.Log($"[AutoRecorder] Applying preset: {presetName}");
            var preset = SceneConfigurator.ApplyPreset(presetName);
            if (preset != null && preset.recording != null)
            {
                // Override recording settings from preset
                mode = preset.recording.mode ?? mode;
                resolution = preset.recording.resolution > 0 ? preset.recording.resolution : resolution;
                framerate = preset.recording.framerate > 0 ? preset.recording.framerate : framerate;
                stereoSep = preset.recording.stereo_separation > 0 ? preset.recording.stereo_separation : stereoSep;
                Debug.Log($"[AutoRecorder] Preset overrides — mode: {mode}, res: {resolution}, fps: {framerate}");
            }
        }

        // Set up the recorder
        var controllerSettings = ScriptableObject.CreateInstance<RecorderControllerSettings>();
        var movieSettings = ScriptableObject.CreateInstance<MovieRecorderSettings>();
        movieSettings.name = "EFS Auto Recorder";
        movieSettings.Enabled = true;
        movieSettings.OutputFormat = MovieRecorderSettings.VideoRecorderOutputFormat.MP4;
        movieSettings.VideoBitRateMode = VideoBitrateMode.High;

        // Configure input based on mode
        switch (mode.ToLower())
        {
            case "360stereo":
                movieSettings.ImageInputSettings = new Camera360InputSettings
                {
                    Source = ImageSource.MainCamera,
                    RenderStereo = true,
                    StereoSeparation = stereoSep,
                    MapSize = mapSize,
                    OutputWidth = resolution,
                    OutputHeight = resolution / 2, // Equirectangular is 2:1
                };
                break;

            case "360mono":
                movieSettings.ImageInputSettings = new Camera360InputSettings
                {
                    Source = ImageSource.MainCamera,
                    RenderStereo = false,
                    MapSize = mapSize,
                    OutputWidth = resolution,
                    OutputHeight = resolution / 2,
                };
                break;

            case "flat":
            default:
                movieSettings.ImageInputSettings = new CameraInputSettings
                {
                    Source = ImageSource.MainCamera,
                    OutputWidth = resolution,
                    OutputHeight = resolution * 9 / 16, // 16:9
                };
                break;
        }

        // Audio
        movieSettings.AudioInputSettings.PreserveAudio = true;

        // Output path
        Directory.CreateDirectory(outputDir);
        movieSettings.OutputFile = Path.Combine(outputDir, outputName);

        // Controller settings
        controllerSettings.AddRecorderSettings(movieSettings);
        controllerSettings.SetRecordModeToManual(); // We control start/stop
        controllerSettings.FrameRate = framerate;

        var controller = new RecorderController(controllerSettings);

        // Store state for the update loop
        _controller = controller;
        _audioFilePath = audioFile;
        _outputDir = outputDir;
        _outputName = outputName;
        _isBatchMode = true;
        _hasStartedPlaying = false;
        _hasStartedRecording = false;

        // Register update callback — this drives the state machine
        EditorApplication.update += BatchUpdateLoop;

        // Enter Play Mode — this triggers the scene to start
        EditorApplication.isPlaying = true;

        Debug.Log("[AutoRecorder] Entering Play Mode...");
    }

    // -- Editor menu entry point (for testing from GUI) --
    [MenuItem("EFS/Quick Record (uses last settings)")]
    static void EditorQuickRecord()
    {
        Debug.Log("[AutoRecorder] Quick record from Editor — use BatchRender for production");
    }

    // -- State machine that runs during Play Mode --
    static RecorderController _controller;
    static string _audioFilePath;
    static string _outputDir;
    static string _outputName;
    static bool _isBatchMode;
    static bool _hasStartedPlaying;
    static bool _hasStartedRecording;
    static float _recordingStartTime;
    static float _audioDuration;

    static void BatchUpdateLoop()
    {
        // Wait for Play Mode to be fully active
        if (!EditorApplication.isPlaying)
            return;

        // First frame in Play Mode — load audio and start recording
        if (!_hasStartedPlaying)
        {
            _hasStartedPlaying = true;

            // Find the AudioSource in the scene
            var audioSource = UnityEngine.Object.FindObjectOfType<AudioSource>();
            if (audioSource == null)
            {
                Debug.LogError("[AutoRecorder] No AudioSource found in scene!");
                StopAndExit(1);
                return;
            }

            // Load the audio clip from the external file
            Debug.Log($"[AutoRecorder] Loading audio: {_audioFilePath}");

            // Use a coroutine helper to load the audio asynchronously
            // For batch mode, we use WWW/UnityWebRequest
            var loader = new GameObject("AudioLoader").AddComponent<AudioLoader>();
            loader.LoadAudio(_audioFilePath, (clip) =>
            {
                if (clip == null)
                {
                    Debug.LogError("[AutoRecorder] Failed to load audio clip!");
                    StopAndExit(1);
                    return;
                }

                audioSource.clip = clip;
                _audioDuration = clip.length;
                Debug.Log($"[AutoRecorder] Audio loaded: {clip.length:F1}s ({clip.frequency}Hz, {clip.channels}ch)");

                // Start recording
                _controller.PrepareRecording();
                _controller.StartRecording();
                _hasStartedRecording = true;
                _recordingStartTime = Time.time;

                // Start audio playback
                audioSource.Play();

                Debug.Log($"[AutoRecorder] Recording started. Duration: {_audioDuration:F1}s");
            });

            return;
        }

        // Check if recording is done (audio finished + small buffer)
        if (_hasStartedRecording)
        {
            float elapsed = Time.time - _recordingStartTime;

            // Add 1 second buffer after audio ends to capture tail
            if (elapsed >= _audioDuration + 1.0f)
            {
                Debug.Log($"[AutoRecorder] Recording complete. Elapsed: {elapsed:F1}s");
                _controller.StopRecording();

                if (_isBatchMode)
                {
                    StopAndExit(0);
                }
                else
                {
                    EditorApplication.update -= BatchUpdateLoop;
                    EditorApplication.isPlaying = false;
                    Debug.Log("[AutoRecorder] Recording saved. Exiting Play Mode.");
                }
            }
        }
    }

    static void StopAndExit(int exitCode)
    {
        EditorApplication.update -= BatchUpdateLoop;
        EditorApplication.isPlaying = false;

        if (exitCode == 0)
            Debug.Log("[AutoRecorder] Batch render complete. Exiting Unity.");
        else
            Debug.LogError("[AutoRecorder] Batch render failed.");

        EditorApplication.Exit(exitCode);
    }

    // -- Helpers --

    static string FindScenePath(string sceneName)
    {
        var guids = AssetDatabase.FindAssets($"t:Scene {sceneName}");
        foreach (var guid in guids)
        {
            var path = AssetDatabase.GUIDToAssetPath(guid);
            if (Path.GetFileNameWithoutExtension(path).Equals(sceneName, StringComparison.OrdinalIgnoreCase))
                return path;
        }

        // Fallback: try direct path
        string directPath = $"Assets/{sceneName}.unity";
        if (File.Exists(Path.Combine(Application.dataPath, $"{sceneName}.unity")))
            return directPath;

        return null;
    }

    static System.Collections.Generic.Dictionary<string, string> ParseCommandLineArgs()
    {
        var result = new System.Collections.Generic.Dictionary<string, string>();
        var args = Environment.GetCommandLineArgs();

        for (int i = 0; i < args.Length; i++)
        {
            if (args[i].StartsWith("-") && i + 1 < args.Length && !args[i + 1].StartsWith("-"))
            {
                result[args[i].TrimStart('-')] = args[i + 1];
            }
        }

        return result;
    }

    static string GetArg(System.Collections.Generic.Dictionary<string, string> args, string key, string defaultValue = null)
    {
        return args.ContainsKey(key) ? args[key] : defaultValue;
    }
}

/// <summary>
/// Helper MonoBehaviour for loading audio clips at runtime from arbitrary file paths.
/// Supports WAV, MP3, and OGG via UnityWebRequest.
/// </summary>
public class AudioLoader : MonoBehaviour
{
    public void LoadAudio(string filePath, System.Action<AudioClip> callback)
    {
        StartCoroutine(LoadAudioCoroutine(filePath, callback));
    }

    System.Collections.IEnumerator LoadAudioCoroutine(string filePath, System.Action<AudioClip> callback)
    {
        // Determine audio type from extension
        AudioType audioType = AudioType.WAV;
        string ext = Path.GetExtension(filePath).ToLower();
        switch (ext)
        {
            case ".mp3": audioType = AudioType.MPEG; break;
            case ".ogg": audioType = AudioType.OGGVORBIS; break;
            case ".wav": audioType = AudioType.WAV; break;
            case ".aif":
            case ".aiff": audioType = AudioType.AIFF; break;
        }

        // Use file:// URI for local files
        string uri = "file:///" + filePath.Replace("\\", "/");

        using (var www = UnityEngine.Networking.UnityWebRequestMultimedia.GetAudioClip(uri, audioType))
        {
            yield return www.SendWebRequest();

            if (www.result == UnityEngine.Networking.UnityWebRequest.Result.Success)
            {
                var clip = UnityEngine.Networking.DownloadHandlerAudioClip.GetContent(www);
                clip.name = Path.GetFileNameWithoutExtension(filePath);
                callback(clip);
            }
            else
            {
                Debug.LogError($"[AudioLoader] Failed to load {filePath}: {www.error}");
                callback(null);
            }
        }

        Destroy(gameObject);
    }
}
#endif
