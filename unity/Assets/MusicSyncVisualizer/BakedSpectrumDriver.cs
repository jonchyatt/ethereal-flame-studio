using UnityEngine;

/// <summary>
/// Advances BakedSpectrum by exactly one table row per captured frame.
/// Execution order -10000 guarantees this runs before AudioAnalyzer/
/// AudioSpectrum's Update() in the same frame, so reactive components read
/// the correct baked row this tick rather than the previous one.
///
/// Only ever instantiated by AutoRecorder when BakedSpectrum.Active is true
/// (i.e. a -spectrumFile was supplied and loaded successfully).
/// </summary>
[DefaultExecutionOrder(-10000)]
public class BakedSpectrumDriver : MonoBehaviour
{
    int _frameIndex = -1;

    void Update()
    {
        if (!BakedSpectrum.Active || !BakedSpectrum.RecordingStarted) return;
        _frameIndex++;
        BakedSpectrum.SetFrame(_frameIndex);
    }
}
