using UnityEngine;

/// <summary>
/// Multi-band audio spectrum analyzer for Ethereal Flame Studio.
///
/// Drop-in enhancement for AudioSpectrum.cs — keeps backward compatibility
/// via the static spectrumValue property, while adding 8-band frequency
/// analysis with onset detection for much snappier visual response.
///
/// Band mapping (ISO octave bands):
///   0: Sub-bass    (20-60 Hz)    → Background pulse, water turbulence
///   1: Bass        (60-250 Hz)   → Orb scale (primary beat)
///   2: Low-mid     (250-500 Hz)  → Color warmth
///   3: Mid         (500-2kHz)    → Particle emission rate
///   4: Upper-mid   (2-4 kHz)     → Glow intensity
///   5: Presence    (4-6 kHz)     → Starfield scroll speed
///   6: Brilliance  (6-12 kHz)    → Sparkle / fine particles
///   7: Air         (12-20 kHz)   → Subtle shimmer
///
/// Usage:
///   // Backward compatible (same as old AudioSpectrum)
///   float beat = AudioAnalyzer.spectrumValue;
///
///   // New: per-band values (0-1 normalized)
///   float bass = AudioAnalyzer.GetBand(1);
///   float mids = AudioAnalyzer.GetBand(3);
///
///   // New: onset (rate of change) for snappier response
///   float bassOnset = AudioAnalyzer.GetOnset(1);
///
///   // New: full band array
///   float[] bands = AudioAnalyzer.bandValues;
/// </summary>
public class AudioAnalyzer : MonoBehaviour
{
    [Header("FFT Settings")]
    [Tooltip("Higher = more frequency resolution, less time resolution. 1024 is good for music.")]
    public int spectrumSize = 1024;

    [Header("Smoothing")]
    [Tooltip("How quickly bands rise to new peaks (0 = instant, 1 = never). Lower = snappier.")]
    [Range(0f, 0.95f)]
    public float riseSmoothing = 0.1f;

    [Tooltip("How quickly bands fall after peaks (0 = instant, 1 = never). Higher = smoother decay.")]
    [Range(0f, 0.99f)]
    public float fallSmoothing = 0.85f;

    [Header("Sensitivity")]
    [Tooltip("Global multiplier for all band values. Increase if visuals feel weak.")]
    public float sensitivity = 2.0f;

    [Tooltip("Per-band sensitivity multipliers (optional override).")]
    public float[] bandSensitivity = new float[] { 1.5f, 1.2f, 1.0f, 1.0f, 1.1f, 1.3f, 1.5f, 2.0f };

    // -- Static API (backward compatible + new) --

    /// <summary>Backward compatible with AudioSpectrum.spectrumValue (bass-weighted).</summary>
    public static float spectrumValue { get; private set; }

    /// <summary>Smoothed band values (0-1 normalized). 8 bands.</summary>
    public static float[] bandValues { get; private set; } = new float[BAND_COUNT];

    /// <summary>Raw (unsmoothed) band values for this frame.</summary>
    public static float[] bandRaw { get; private set; } = new float[BAND_COUNT];

    /// <summary>Onset values (positive = rising, negative = falling). Best for beat detection.</summary>
    public static float[] bandOnset { get; private set; } = new float[BAND_COUNT];

    /// <summary>Peak-held band values (slow decay). Good for envelope following.</summary>
    public static float[] bandPeak { get; private set; } = new float[BAND_COUNT];

    /// <summary>Overall energy (RMS of all bands). Good for global intensity.</summary>
    public static float energy { get; private set; }

    /// <summary>Get smoothed value for a specific band (0-7).</summary>
    public static float GetBand(int band)
    {
        if (band < 0 || band >= BAND_COUNT) return 0f;
        return bandValues[band];
    }

    /// <summary>Get onset (rate of change) for a specific band. Positive = attack.</summary>
    public static float GetOnset(int band)
    {
        if (band < 0 || band >= BAND_COUNT) return 0f;
        return bandOnset[band];
    }

    /// <summary>Check if a specific band just had an onset (beat) this frame.</summary>
    public static bool IsBeat(int band, float threshold = 0.15f)
    {
        if (band < 0 || band >= BAND_COUNT) return false;
        return bandOnset[band] > threshold;
    }

    // -- Constants --
    public const int BAND_COUNT = 8;

    // Frequency ranges for each band (Hz)
    // Based on ISO octave band centers, tuned for music visualization
    static readonly float[] BAND_FREQ_MIN = { 20f, 60f, 250f, 500f, 2000f, 4000f, 6000f, 12000f };
    static readonly float[] BAND_FREQ_MAX = { 60f, 250f, 500f, 2000f, 4000f, 6000f, 12000f, 20000f };

    // -- Instance state --
    float[] _spectrum;
    float[] _prevBandValues = new float[BAND_COUNT];
    float _sampleRate;

    void Start()
    {
        _spectrum = new float[spectrumSize];
        _sampleRate = AudioSettings.outputSampleRate;

        // Initialize static arrays
        bandValues = new float[BAND_COUNT];
        bandRaw = new float[BAND_COUNT];
        bandOnset = new float[BAND_COUNT];
        bandPeak = new float[BAND_COUNT];
    }

    void Update()
    {
        if (_spectrum == null || _spectrum.Length != spectrumSize)
            _spectrum = new float[spectrumSize];

        // Get raw FFT data (Blackman-Harris for better frequency resolution than Hamming)
        AudioListener.GetSpectrumData(_spectrum, 0, FFTWindow.BlackmanHarris);

        if (_spectrum == null || _spectrum.Length == 0) return;

        // Frequency resolution: each bin covers (sampleRate / 2) / spectrumSize Hz
        float freqPerBin = (_sampleRate * 0.5f) / spectrumSize;

        // Calculate energy for each band
        float totalEnergy = 0f;

        for (int band = 0; band < BAND_COUNT; band++)
        {
            // Find which FFT bins fall in this band's frequency range
            int binMin = Mathf.Max(1, Mathf.FloorToInt(BAND_FREQ_MIN[band] / freqPerBin));
            int binMax = Mathf.Min(spectrumSize - 1, Mathf.CeilToInt(BAND_FREQ_MAX[band] / freqPerBin));

            // Sum energy in this frequency range (RMS)
            float sum = 0f;
            int count = 0;
            for (int bin = binMin; bin <= binMax; bin++)
            {
                sum += _spectrum[bin] * _spectrum[bin];
                count++;
            }

            // RMS energy for this band
            float rawValue = (count > 0) ? Mathf.Sqrt(sum / count) : 0f;

            // Apply sensitivity
            float bandSens = (band < bandSensitivity.Length) ? bandSensitivity[band] : 1f;
            rawValue *= sensitivity * bandSens;

            // Clamp to 0-1
            rawValue = Mathf.Clamp01(rawValue);
            bandRaw[band] = rawValue;

            // Asymmetric smoothing: fast rise, slow fall
            float prev = bandValues[band];
            if (rawValue > prev)
                bandValues[band] = Mathf.Lerp(rawValue, prev, riseSmoothing);
            else
                bandValues[band] = Mathf.Lerp(rawValue, prev, fallSmoothing);

            // Onset detection: difference from previous frame (positive = attack)
            bandOnset[band] = bandValues[band] - _prevBandValues[band];
            _prevBandValues[band] = bandValues[band];

            // Peak hold with slow decay
            if (bandValues[band] > bandPeak[band])
                bandPeak[band] = bandValues[band];
            else
                bandPeak[band] *= 0.995f; // ~3 second decay to zero

            totalEnergy += bandValues[band] * bandValues[band];
        }

        // Overall energy (RMS of all bands)
        energy = Mathf.Sqrt(totalEnergy / BAND_COUNT);

        // Backward compatibility: spectrumValue weighted toward bass (bands 0-2)
        // Matches the "feel" of the original AudioSpectrum.spectrumValue
        spectrumValue = (bandValues[0] * 0.3f + bandValues[1] * 0.5f + bandValues[2] * 0.2f) * 100f;
    }
}
