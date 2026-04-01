using UnityEngine;

/// <summary>
/// Makes Water4Advanced respond to sub-bass frequencies.
///
/// Sub-bass (20-60 Hz) drives wave intensity — heavy bass = choppier water.
/// Bass (60-250 Hz) drives reflection distortion.
/// Overall energy drives foam/whitecap amount.
///
/// Attach to any Water4Advanced GameObject.
/// Requires AudioAnalyzer in the scene.
/// </summary>
public class AudioReactiveWater : MonoBehaviour
{
    [Header("Wave Scale (driven by Sub-bass)")]
    [Range(0, 7)] public int waveScaleBand = 0;
    public float restWaveScale = 0.05f;
    public float beatWaveScale = 0.3f;

    [Header("Reflection Distortion (driven by Bass)")]
    [Range(0, 7)] public int reflectionBand = 1;
    public float restReflectionDistort = 0.44f;
    public float beatReflectionDistort = 1.5f;

    [Header("Smoothing")]
    public float reactionSpeed = 4f;

    // Cached
    private Material _waterMat;
    private float _currentWaveScale;
    private float _currentReflection;

    void Start()
    {
        var renderer = GetComponent<Renderer>();
        if (renderer != null)
        {
            _waterMat = renderer.sharedMaterial;
        }

        if (_waterMat == null)
        {
            Debug.LogWarning("[AudioReactiveWater] No material found on water object");
            enabled = false;
        }
    }

    void Update()
    {
        if (_waterMat == null) return;

        float dt = Time.deltaTime * reactionSpeed;

        // Wave scale from sub-bass
        float subBass = AudioAnalyzer.GetBand(waveScaleBand);
        float targetWave = Mathf.Lerp(restWaveScale, beatWaveScale, subBass);
        _currentWaveScale = Mathf.Lerp(_currentWaveScale, targetWave, dt);

        // Try common Water4 shader properties
        if (_waterMat.HasProperty("_BumpScale"))
            _waterMat.SetFloat("_BumpScale", _currentWaveScale);
        if (_waterMat.HasProperty("_GAmplitude"))
        {
            Vector4 amp = _waterMat.GetVector("_GAmplitude");
            amp *= (1f + subBass * 2f);
            _waterMat.SetVector("_GAmplitude", amp);
        }

        // Reflection distortion from bass
        float bass = AudioAnalyzer.GetBand(reflectionBand);
        float targetReflect = Mathf.Lerp(restReflectionDistort, beatReflectionDistort, bass);
        _currentReflection = Mathf.Lerp(_currentReflection, targetReflect, dt);

        if (_waterMat.HasProperty("_ReflDistort"))
            _waterMat.SetFloat("_ReflDistort", _currentReflection);
    }
}
