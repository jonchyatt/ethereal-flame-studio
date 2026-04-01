using UnityEngine;

/// <summary>
/// Multi-band audio-reactive behavior for Ethereal Flame Studio.
///
/// Unlike AudioSyncScale (single beat → single scale), this component
/// drives MULTIPLE visual properties from DIFFERENT frequency bands simultaneously.
///
/// Attach to any GameObject with a ParticleSystem and/or Renderer.
/// Requires AudioAnalyzer in the scene (not the old AudioSpectrum).
///
/// What each band drives:
///   Bass (band 1)     → Object scale (the "thump")
///   Low-mid (band 2)  → Emission color warmth
///   Mid (band 3)      → Particle emission rate
///   Upper-mid (band 4) → Material glow/emission intensity
///   Presence (band 5)  → Rotation speed
///   Brilliance (band 6) → Particle speed/lifetime
///
/// All mappings are configurable in the Inspector.
/// </summary>
public class AudioSyncMultiBand : MonoBehaviour
{
    [Header("Scale (driven by Bass)")]
    public bool enableScale = true;
    public Vector3 restScale = Vector3.one;
    public Vector3 beatScale = new Vector3(1.8f, 1.8f, 1.8f);
    [Range(0, 7)] public int scaleBand = 1;
    public float scaleAttackSpeed = 30f;
    public float scaleDecaySpeed = 3f;

    [Header("Emission Color (driven by Low-Mid)")]
    public bool enableEmission = true;
    public Color restEmissionColor = Color.black;
    public Color beatEmissionColor = new Color(1f, 0.5f, 0f); // warm orange
    [Range(0, 7)] public int emissionBand = 2;
    public float emissionIntensity = 2f;

    [Header("Particle Rate (driven by Mid)")]
    public bool enableParticleRate = true;
    public float restEmissionRate = 10f;
    public float beatEmissionRate = 200f;
    [Range(0, 7)] public int particleRateBand = 3;

    [Header("Glow Intensity (driven by Upper-Mid)")]
    public bool enableGlow = true;
    [Range(0, 7)] public int glowBand = 4;
    public float glowMultiplier = 3f;

    [Header("Rotation (driven by Presence)")]
    public bool enableRotation = true;
    public Vector3 rotationAxis = Vector3.up;
    public float restRotationSpeed = 10f;
    public float beatRotationSpeed = 180f;
    [Range(0, 7)] public int rotationBand = 5;

    [Header("Particle Speed (driven by Brilliance)")]
    public bool enableParticleSpeed = true;
    public float restParticleSpeed = 1f;
    public float beatParticleSpeed = 5f;
    [Range(0, 7)] public int particleSpeedBand = 6;

    [Header("Onset Sensitivity")]
    [Tooltip("Use onset (rate of change) instead of raw value for snappier response")]
    public bool useOnsetForScale = true;
    public float onsetThreshold = 0.05f;

    // Cached components
    private ParticleSystem _ps;
    private Renderer _renderer;
    private MaterialPropertyBlock _propBlock;
    private Vector3 _currentScale;
    private float _currentGlow;

    void Start()
    {
        _ps = GetComponent<ParticleSystem>();
        _renderer = GetComponent<Renderer>();
        _propBlock = new MaterialPropertyBlock();
        _currentScale = restScale;
        _currentGlow = 0f;
    }

    void Update()
    {
        // -- Scale from bass — snap up fast, decay slow (like the original) --
        if (enableScale)
        {
            float bandVal = AudioAnalyzer.GetBand(scaleBand);
            Vector3 target = Vector3.Lerp(restScale, beatScale, Mathf.Clamp01(bandVal));

            // Fast attack, slow decay — this is what makes it "pop"
            if (target.magnitude > _currentScale.magnitude)
                _currentScale = Vector3.Lerp(_currentScale, target, Time.deltaTime * scaleAttackSpeed);
            else
                _currentScale = Vector3.Lerp(_currentScale, target, Time.deltaTime * scaleDecaySpeed);

            transform.localScale = _currentScale;
        }

        // -- Emission color from low-mid --
        if (enableEmission && _renderer != null)
        {
            float emValue = AudioAnalyzer.GetBand(emissionBand);
            Color emColor = Color.Lerp(restEmissionColor, beatEmissionColor * emissionIntensity, emValue);

            _renderer.GetPropertyBlock(_propBlock);
            _propBlock.SetColor("_EmissionColor", emColor);
            _renderer.SetPropertyBlock(_propBlock);
        }

        // -- Particle emission rate from mid --
        if (enableParticleRate && _ps != null)
        {
            float rateValue = AudioAnalyzer.GetBand(particleRateBand);
            var emission = _ps.emission;
            emission.rateOverTime = Mathf.Lerp(restEmissionRate, beatEmissionRate, rateValue);
        }

        // -- Glow intensity from upper-mid --
        if (enableGlow && _renderer != null)
        {
            float glowValue = AudioAnalyzer.GetBand(glowBand);
            float targetGlow = glowValue * glowMultiplier;
            _currentGlow = Mathf.Lerp(_currentGlow, targetGlow, Time.deltaTime * 10f);

            _renderer.GetPropertyBlock(_propBlock);
            _propBlock.SetFloat("_GlowIntensity", _currentGlow);
            _renderer.SetPropertyBlock(_propBlock);
        }

        // -- Rotation from presence --
        if (enableRotation)
        {
            float rotValue = AudioAnalyzer.GetBand(rotationBand);
            float speed = Mathf.Lerp(restRotationSpeed, beatRotationSpeed, rotValue);
            transform.Rotate(rotationAxis * speed * Time.deltaTime);
        }

        // -- Particle speed from brilliance --
        if (enableParticleSpeed && _ps != null)
        {
            float speedValue = AudioAnalyzer.GetBand(particleSpeedBand);
            var main = _ps.main;
            main.startSpeed = Mathf.Lerp(restParticleSpeed, beatParticleSpeed, speedValue);
        }
    }
}
