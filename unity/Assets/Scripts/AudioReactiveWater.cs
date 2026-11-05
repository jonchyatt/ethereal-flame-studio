using Crest;
using UnityEngine;

/// <summary>
/// Makes Crest's Gerstner wave weight and planar-reflection distortion respond
/// to the project's multi-band audio analysis. Attach this to the Crest Ocean
/// GameObject; it deliberately no longer writes legacy Standard Assets water
/// material properties.
/// </summary>
public class AudioReactiveWater : MonoBehaviour
{
    [Header("Crest references")]
    public OceanRenderer crestOcean;
    public ShapeGerstner crestWaves;

    [Header("Wave Weight (driven by Sub-bass)")]
    [UnityEngine.Range(0, 7)] public int waveScaleBand = 0;
    [UnityEngine.Range(0f, 1f)] public float restWaveScale = 0.48f;
    [UnityEngine.Range(0f, 1f)] public float beatWaveScale = 0.92f;

    [Header("Planar Reflection Distortion (driven by Bass)")]
    [UnityEngine.Range(0, 7)] public int reflectionBand = 1;
    public float restReflectionDistort = 0.42f;
    public float beatReflectionDistort = 0.92f;

    [Header("Smoothing")]
    [Min(0f)] public float reactionSpeed = 4f;

    float _currentWaveWeight;
    float _currentReflection;

    void Awake()
    {
        if (crestOcean == null) crestOcean = GetComponent<OceanRenderer>();
        if (crestWaves == null) crestWaves = GetComponent<ShapeGerstner>();
    }

    void Start()
    {
        if (crestOcean == null || crestWaves == null)
        {
            Debug.LogWarning("[AudioReactiveWater] Crest OceanRenderer and ShapeGerstner are required.", this);
            enabled = false;
            return;
        }

        _currentWaveWeight = crestWaves._weight;
        var material = crestOcean.OceanMaterial;
        _currentReflection = material != null && material.HasProperty("_PlanarReflectionNormalsStrength")
            ? material.GetFloat("_PlanarReflectionNormalsStrength")
            : restReflectionDistort;
    }

    void Update()
    {
        if (crestOcean == null || crestWaves == null) return;

        float blend = Mathf.Clamp01(Time.deltaTime * reactionSpeed);

        // Crest consumes ShapeGerstner._weight during every wave-buffer draw,
        // so this scales the actual ocean spectrum rather than a legacy shader.
        float subBass = Mathf.Clamp01(AudioAnalyzer.GetBand(waveScaleBand));
        float targetWaveWeight = Mathf.Lerp(restWaveScale, beatWaveScale, subBass);
        _currentWaveWeight = Mathf.Lerp(_currentWaveWeight, targetWaveWeight, blend);
        crestWaves._weight = _currentWaveWeight;

        float bass = Mathf.Clamp01(AudioAnalyzer.GetBand(reflectionBand));
        float targetReflection = Mathf.Lerp(restReflectionDistort, beatReflectionDistort, bass);
        _currentReflection = Mathf.Lerp(_currentReflection, targetReflection, blend);

        var material = crestOcean.OceanMaterial;
        if (material != null && material.HasProperty("_PlanarReflectionNormalsStrength"))
            material.SetFloat("_PlanarReflectionNormalsStrength", _currentReflection);
    }
}
