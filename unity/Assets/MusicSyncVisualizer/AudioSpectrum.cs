using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Mini "engine" for analyzing spectrum data
/// Feel free to get fancy in here for more accurate visualizations!
/// </summary>
public class AudioSpectrum : MonoBehaviour {

	// Calibration gain for the baked path — the offline 1024-bin band-RMS
	// convention (bake_spectrum.py) reads much smaller than Unity's native
	// 128-bin single-bin GetSpectrumData magnitude this value was tuned
	// against (fewer, wider bins concentrate more energy per bin). 7 was
	// measured (not guessed) against band1's actual dynamic range in
	// SirAnthony.mp3 — quiet ~0.3, kick-hit peaks ~1-2, straddling
	// AudioSyncer's bias=1 threshold so beats actually re-trigger.
	// -bakedGain CLI arg overrides for future re-tuning; see
	// data/efs-path-b/NEXT-reactivity-sync-fix.md STATUS for the tuning log.
	public static float BakedGain = 7f;
	static int _frameCount = -1;

	private void Update()
    {
        // Batch/headed recording: read the pre-baked per-frame table instead
        // of the realtime DSP clock — see BakedSpectrum.cs.
        if (BakedSpectrum.Active)
        {
            float[] baked = BakedSpectrum.CurrentBands;
            // Band 1 (60-250Hz, "Bass") is AudioAnalyzer's own documented
            // "Orb scale (primary beat)" band — it has real dynamic swing
            // (kick-drum range). Band 0 (sub-bass) sits nearly flat in this
            // track and never re-crosses AudioSyncer's beat threshold after
            // the first rise. See NEXT-reactivity-sync-fix.md punch-tuning log.
            if (baked != null && baked.Length > 1)
            {
                spectrumValue = baked[1] * 100 * BakedGain;
                _frameCount++;
                if (_frameCount % 15 == 0)
                    Debug.Log($"[AudioSpectrum:calib] frame={_frameCount} raw1={baked[1]:F6} spectrumValue={spectrumValue:F4}");
            }
            return;
        }

        // get the data
        AudioListener.GetSpectrumData(m_audioSpectrum, 0, FFTWindow.Hamming);

        // assign spectrum value
        // this "engine" focuses on the simplicity of other classes only..
        // ..needing to retrieve one value (spectrumValue)
        if (m_audioSpectrum != null && m_audioSpectrum.Length > 0)
        {
            spectrumValue = m_audioSpectrum[0] * 100;
        }
    }

    private void Start()
    {
        /// initialize buffer
        m_audioSpectrum = new float[128];
    }

    // This value served to AudioSyncer for beat extraction
    public static float spectrumValue {get; private set;}

    // Unity fills this up for us
    private float[] m_audioSpectrum;

}
