using UnityEngine;

/// <summary>
/// Makes the StarNest skybox react to audio via AudioAnalyzer bands.
///
/// Modulates skybox shader parameters in real-time:
///   - Presence band → scroll speed (starfield drifts faster on vocals/leads)
///   - Sub-bass band → dark matter amount (bass pulses shift the void)
///   - Brilliance band → brightness (high frequencies add sparkle)
///   - Energy (overall) → saturation
///
/// Attach to any GameObject. Reads RenderSettings.skybox material directly.
/// Works with any StarNest variant (StarNestSkybox, StarNestSkybox_HSV, etc.)
/// </summary>
public class AudioReactiveSkybox : MonoBehaviour
{
    [Header("Scroll Speed (driven by Presence band)")]
    public bool enableScrollReaction = true;
    [Range(0, 7)] public int scrollBand = 5;
    public float restScrollSpeed = 0.01f;
    public float beatScrollSpeed = 0.05f;

    [Header("Dark Matter (driven by Sub-bass)")]
    public bool enableDarkMatterReaction = true;
    [Range(0, 7)] public int darkMatterBand = 0;
    public float restDarkMatter = 555f;
    public float beatDarkMatter = 800f;

    [Header("Brightness (driven by Brilliance)")]
    public bool enableBrightnessReaction = true;
    [Range(0, 7)] public int brightnessBand = 6;
    public float restBrightness = 0.5f;
    public float beatBrightness = 1.5f;

    [Header("Saturation (driven by overall Energy)")]
    public bool enableSaturationReaction = true;
    public float restSaturation = 77f;
    public float beatSaturation = 120f;

    [Header("Smoothing")]
    public float reactionSpeed = 5f;

    // Cached
    private Material _skyboxMat;
    private float _currentScroll;
    private float _currentDarkMatter;
    private float _currentBrightness;
    private float _currentSaturation;

    // Shader property IDs (avoid string lookups every frame)
    private static readonly int _ScrollID = Shader.PropertyToID("_Scroll");
    private static readonly int _DarkmatterID = Shader.PropertyToID("_Darkmatter");
    private static readonly int _BrightnessID = Shader.PropertyToID("_Brightness");
    private static readonly int _SaturationID = Shader.PropertyToID("_Saturation");

    void Start()
    {
        _skyboxMat = RenderSettings.skybox;
        if (_skyboxMat == null)
        {
            Debug.LogWarning("[AudioReactiveSkybox] No skybox material found");
            enabled = false;
            return;
        }

        // Cache initial values
        if (_skyboxMat.HasProperty("_Brightness"))
            _currentBrightness = _skyboxMat.GetFloat("_Brightness");
        if (_skyboxMat.HasProperty("_Darkmatter"))
            _currentDarkMatter = _skyboxMat.GetFloat("_Darkmatter");
        if (_skyboxMat.HasProperty("_Saturation"))
            _currentSaturation = _skyboxMat.GetFloat("_Saturation");
    }

    void Update()
    {
        if (_skyboxMat == null) return;

        float dt = Time.deltaTime * reactionSpeed;

        // Scroll speed from presence
        if (enableScrollReaction && _skyboxMat.HasProperty("_Scroll"))
        {
            float scrollValue = AudioAnalyzer.GetBand(scrollBand);
            float targetW = Mathf.Lerp(restScrollSpeed, beatScrollSpeed, scrollValue);
            Vector4 scroll = _skyboxMat.GetVector("_Scroll");
            scroll.w = Mathf.Lerp(scroll.w, targetW, dt);
            _skyboxMat.SetVector("_Scroll", scroll);
        }

        // Dark matter from sub-bass
        if (enableDarkMatterReaction && _skyboxMat.HasProperty("_Darkmatter"))
        {
            float dmValue = AudioAnalyzer.GetBand(darkMatterBand);
            float targetDM = Mathf.Lerp(restDarkMatter, beatDarkMatter, dmValue);
            _currentDarkMatter = Mathf.Lerp(_currentDarkMatter, targetDM, dt);
            _skyboxMat.SetFloat("_Darkmatter", _currentDarkMatter);
        }

        // Brightness from brilliance
        if (enableBrightnessReaction && _skyboxMat.HasProperty("_Brightness"))
        {
            float brValue = AudioAnalyzer.GetBand(brightnessBand);
            float targetBR = Mathf.Lerp(restBrightness, beatBrightness, brValue);
            _currentBrightness = Mathf.Lerp(_currentBrightness, targetBR, dt);
            _skyboxMat.SetFloat("_Brightness", _currentBrightness);
        }

        // Saturation from overall energy
        if (enableSaturationReaction && _skyboxMat.HasProperty("_Saturation"))
        {
            float energy = AudioAnalyzer.energy;
            float targetSat = Mathf.Lerp(restSaturation, beatSaturation, energy);
            _currentSaturation = Mathf.Lerp(_currentSaturation, targetSat, dt);
            _skyboxMat.SetFloat("_Saturation", _currentSaturation);
        }
    }

    void OnDisable()
    {
        // Reset skybox to rest values so it doesn't stay in a weird state
        if (_skyboxMat != null)
        {
            if (_skyboxMat.HasProperty("_Brightness"))
                _skyboxMat.SetFloat("_Brightness", restBrightness);
            if (_skyboxMat.HasProperty("_Darkmatter"))
                _skyboxMat.SetFloat("_Darkmatter", restDarkMatter);
            if (_skyboxMat.HasProperty("_Saturation"))
                _skyboxMat.SetFloat("_Saturation", restSaturation);
        }
    }
}
