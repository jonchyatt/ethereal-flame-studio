using System;
using System.IO;
using UnityEngine;

/// <summary>
/// Holds a pre-baked per-output-frame band-energy table used to drive the
/// audio-reactive components deterministically during batch/headed recording.
///
/// Fixes the Argus-caught reactivity-sync bug: frame-locked capture
/// (Time.captureFrameRate) can take far longer in wall-clock time than the
/// audio's own duration, so realtime AudioListener.GetSpectrumData reads
/// silence for the back portion of the render (audio already finished
/// playing in real time while frames keep capturing). This table is baked
/// offline (unity/Scripts/bake_spectrum.py) indexed by CAPTURED frame, so
/// frame N always reflects the audio content at video-time N/fps regardless
/// of how long that frame actually took to render.
///
/// See data/efs-path-b/NEXT-reactivity-sync-fix.md.
/// </summary>
public static class BakedSpectrum
{
    [Serializable]
    class Payload
    {
        public float fps;
        public int frames;
        public int bands;
        public float[] data; // frame-major flat: frame*bands + band
    }

    public static bool Active { get; private set; }
    public static bool RecordingStarted { get; private set; }
    public static float[] CurrentBands { get; private set; }

    static float[][] _table;

    /// <summary>Load a baked spectrum JSON. Leaves Active=false (realtime fallback) on any failure.</summary>
    public static void Load(string path)
    {
        Active = false;
        RecordingStarted = false;
        CurrentBands = null;
        _table = null;

        if (string.IsNullOrEmpty(path) || !File.Exists(path))
        {
            Debug.LogWarning($"[BakedSpectrum] spectrum file not found: {path} — falling back to realtime spectrum");
            return;
        }

        Payload payload;
        try
        {
            payload = JsonUtility.FromJson<Payload>(File.ReadAllText(path));
        }
        catch (Exception e)
        {
            Debug.LogWarning($"[BakedSpectrum] failed to parse {path}: {e.Message} — falling back to realtime spectrum");
            return;
        }

        if (payload == null || payload.data == null || payload.bands <= 0 || payload.frames <= 0)
        {
            Debug.LogWarning($"[BakedSpectrum] empty/invalid payload from {path} — falling back to realtime spectrum");
            return;
        }

        var table = new float[payload.frames][];
        for (int f = 0; f < payload.frames; f++)
        {
            var row = new float[payload.bands];
            int baseIdx = f * payload.bands;
            for (int b = 0; b < payload.bands; b++)
            {
                int idx = baseIdx + b;
                row[b] = idx < payload.data.Length ? payload.data[idx] : 0f;
            }
            table[f] = row;
        }

        _table = table;
        CurrentBands = _table.Length > 0 ? _table[0] : new float[payload.bands];
        Active = true;
        Debug.Log($"[BakedSpectrum] Loaded {payload.frames} frames x {payload.bands} bands from {path}");
    }

    /// <summary>Called by AutoRecorder the instant recording + audio playback begin.</summary>
    public static void NotifyRecordingStarted() => RecordingStarted = true;

    /// <summary>Called once per captured frame by BakedSpectrumDriver.</summary>
    public static void SetFrame(int frameIndex)
    {
        if (_table == null || _table.Length == 0) return;
        CurrentBands = _table[Mathf.Clamp(frameIndex, 0, _table.Length - 1)];
    }
}
