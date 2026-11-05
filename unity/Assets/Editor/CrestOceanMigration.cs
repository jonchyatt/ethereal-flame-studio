#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using Crest;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>
/// Repeatable migration from the Standard Assets Water4 prefabs to one Crest
/// ocean per affected scene. Run with -executeMethod CrestOceanMigration.MigrateAllScenes.
/// The legacy objects remain in the scene but are disabled for easy rollback.
/// </summary>
public static class CrestOceanMigration
{
    const string CrestMaterialPath = "Assets/Crest/CrestCosmicOcean.mat";
    const string CrestBaseMaterialPath = "Assets/Crest/Crest/Materials/Ocean.mat";

    [MenuItem("EFS/Crest/Migrate Legacy Water Scenes")]
    public static void MigrateAllScenes()
    {
        var scenePaths = FindLegacyWaterScenes();
        if (scenePaths.Count == 0)
            throw new InvalidOperationException("No scene YAML references Water4Advanced or WaterProDaytime.");

        var material = GetOrCreateCosmicOceanMaterial();
        var changed = new List<string>();

        foreach (var scenePath in scenePaths)
        {
            var scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);
            MigrateScene(scene, material);
            if (!EditorSceneManager.SaveScene(scene))
                throw new IOException("Could not save migrated scene: " + scenePath);
            changed.Add(scenePath);
        }

        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("[CrestOceanMigration] Migrated " + changed.Count + " scene(s): " + string.Join(", ", changed));
    }

    static List<string> FindLegacyWaterScenes()
    {
        var paths = new List<string>();
        foreach (var guid in AssetDatabase.FindAssets("t:Scene"))
        {
            var scenePath = AssetDatabase.GUIDToAssetPath(guid);
            var absolutePath = Path.GetFullPath(Path.Combine(Application.dataPath, "..", scenePath));
            var yaml = File.ReadAllText(absolutePath);
            if (yaml.Contains("Water4Advanced") || yaml.Contains("WaterProDaytime"))
                paths.Add(scenePath);
        }
        return paths;
    }

    static void MigrateScene(Scene scene, Material material)
    {
        var legacyRoots = FindLegacyWaterRoots();
        // BTTB serializes only orphaned Water4 reflection cameras, not the
        // corresponding water renderer prefab. Preserve that legacy state as
        // disabled and use the established waterline from the active scenes.
        var waterHeight = legacyRoots.Count > 0 ? legacyRoots[0].transform.position.y : -3.86f;
        foreach (var root in legacyRoots)
        {
            root.SetActive(false);
            EditorUtility.SetDirty(root);
        }
        var staleLegacyReflections = DisableStaleLegacyReflectionObjects();

        var oceanObject = FindOrCreateOceanObject(waterHeight);
        var ocean = GetOrAdd<OceanRenderer>(oceanObject);
        ocean.OceanMaterial = material;
        ocean._waterBodyCulling = false;
        ocean._globalWindSpeed = 21f;
        ocean._globalWindDirectionAngle = 32f;
        ocean._globalWindTurbulence = 0.08f;
        EnableOceanSimulation(ocean);
        ocean._primaryLight = FindOrCreateMoonlight();

        var waves = GetOrAdd<ShapeGerstner>(oceanObject);
        waves._swell = true;
        waves._componentsPerOctave = 12;
        waves._randomSeed = 413;
        waves._overrideGlobalWindDirection = true;
        waves._waveDirectionHeadingAngle = 32f;
        waves._overrideGlobalWindSpeed = true;
        waves._windSpeed = 21f;
        waves._weight = 0.48f;

        var audioWater = GetOrAdd<AudioReactiveWater>(oceanObject);
        audioWater.crestOcean = ocean;
        audioWater.crestWaves = waves;
        audioWater.waveScaleBand = 0;
        audioWater.restWaveScale = 0.48f;
        audioWater.beatWaveScale = 0.92f;
        audioWater.reflectionBand = 1;
        audioWater.restReflectionDistort = 0.42f;
        audioWater.beatReflectionDistort = 0.92f;
        audioWater.reactionSpeed = 4f;

        EnsureAudioAnalyzer();
        var primaryCamera = FindPrimaryCamera();
        if (legacyRoots.Count == 0)
            ConfigureFallbackCosmicEnvironment(primaryCamera, ocean._primaryLight);
        EnsureNightReflection(primaryCamera);

        EditorUtility.SetDirty(oceanObject);
        EditorSceneManager.MarkSceneDirty(scene);
        Debug.Log("[CrestOceanMigration] " + scene.path + ": disabled " + legacyRoots.Count + " legacy water root(s) and " + staleLegacyReflections + " stale Water4 reflection object(s), added Crest Ocean.");
    }

    static List<GameObject> FindLegacyWaterRoots()
    {
        var roots = new HashSet<GameObject>();
        foreach (var candidate in UnityEngine.Object.FindObjectsByType<GameObject>(FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            if (!IsLegacyWaterObject(candidate)) continue;

            var root = candidate;
            while (root.transform.parent != null && IsLegacyWaterObject(root.transform.parent.gameObject))
                root = root.transform.parent.gameObject;
            roots.Add(root);
        }
        return new List<GameObject>(roots);
    }

    static bool IsLegacyWaterObject(GameObject candidate)
    {
        if (candidate.name == "Water4Advanced" || candidate.name == "WaterProDaytime") return true;

        var source = PrefabUtility.GetCorrespondingObjectFromSource(candidate);
        if (source == null) return false;
        var sourcePath = AssetDatabase.GetAssetPath(source);
        return sourcePath.Contains("Standard Assets/Environment/Water/")
            && (sourcePath.EndsWith("Water4Advanced.prefab", StringComparison.Ordinal)
                || sourcePath.EndsWith("WaterProDaytime.prefab", StringComparison.Ordinal));
    }

    static int DisableStaleLegacyReflectionObjects()
    {
        var disabled = 0;
        foreach (var candidate in UnityEngine.Object.FindObjectsByType<GameObject>(FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            if (!candidate.name.StartsWith("Water4Advanced", StringComparison.Ordinal)
                && !candidate.name.StartsWith("WaterProDaytime", StringComparison.Ordinal)) continue;
            if (!candidate.name.Contains("Reflection")) continue;
            if (candidate.activeSelf)
            {
                candidate.SetActive(false);
                EditorUtility.SetDirty(candidate);
                disabled++;
            }
        }
        return disabled;
    }

    static GameObject FindOrCreateOceanObject(float waterHeight)
    {
        foreach (var ocean in UnityEngine.Object.FindObjectsByType<OceanRenderer>(FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            if (ocean.gameObject.scene == SceneManager.GetActiveScene()) return ocean.gameObject;
        }

        var oceanObject = new GameObject("Crest Ocean");
        oceanObject.transform.position = new Vector3(0f, waterHeight, 0f);
        return oceanObject;
    }

    static void EnableOceanSimulation(OceanRenderer ocean)
    {
        var serializedOcean = new SerializedObject(ocean);
        serializedOcean.FindProperty("_createSeaFloorDepthData").boolValue = true;
        serializedOcean.FindProperty("_createFoamSim").boolValue = true;
        serializedOcean.FindProperty("_createDynamicWaveSim").boolValue = false;
        serializedOcean.FindProperty("_createShadowData").boolValue = false;
        serializedOcean.ApplyModifiedPropertiesWithoutUndo();
    }

    static void EnsureAudioAnalyzer()
    {
        var analyzers = UnityEngine.Object.FindObjectsByType<AudioAnalyzer>(FindObjectsInactive.Include, FindObjectsSortMode.None);
        if (analyzers.Length > 0) return;

        var analyzerObject = new GameObject("_CrestAudioAnalyzer");
        var analyzer = analyzerObject.AddComponent<AudioAnalyzer>();
        analyzer.spectrumSize = 1024;
        analyzer.sensitivity = 150f;
        analyzer.riseSmoothing = 0.02f;
        analyzer.fallSmoothing = 0.75f;
    }

    static Camera FindPrimaryCamera()
    {
        if (Camera.main != null && Camera.main.enabled) return Camera.main;

        foreach (var camera in UnityEngine.Object.FindObjectsByType<Camera>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
        {
            if (camera.enabled && !camera.name.Contains("Reflection")) return camera;
        }

        var cameraObject = new GameObject("Crest Fallback Camera");
        cameraObject.tag = "MainCamera";
        cameraObject.transform.position = new Vector3(0f, 1f, -10f);
        cameraObject.transform.LookAt(new Vector3(0f, -3.4f, 24f));
        var fallbackCamera = cameraObject.AddComponent<Camera>();
        fallbackCamera.clearFlags = CameraClearFlags.Skybox;
        cameraObject.AddComponent<AudioListener>();
        Debug.LogWarning("[CrestOceanMigration] Created a fallback camera because this legacy scene had no enabled gameplay camera.");
        return fallbackCamera;
    }

    static Light FindOrCreateMoonlight()
    {
        foreach (var light in UnityEngine.Object.FindObjectsByType<Light>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
        {
            if (light.type == LightType.Directional) return light;
        }

        var moonlightObject = new GameObject("Crest Moonlight");
        moonlightObject.transform.rotation = Quaternion.Euler(35f, -40f, 0f);
        var moonlight = moonlightObject.AddComponent<Light>();
        moonlight.type = LightType.Directional;
        moonlight.intensity = 0.42f;
        moonlight.color = new Color(0.5f, 0.68f, 1f, 1f);
        moonlight.shadows = LightShadows.Soft;
        return moonlight;
    }

    static void ConfigureFallbackCosmicEnvironment(Camera camera, Light moonlight)
    {
        // BTTB contains legacy reflection cameras but no playable camera or
        // environment. Give that otherwise empty scene a restrained nocturnal
        // backdrop so the retained Crest water can be inspected in context.
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = new Color(0.012f, 0.045f, 0.14f, 1f);
        camera.farClipPlane = 750f;
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.06f, 0.13f, 0.3f, 1f);
        RenderSettings.reflectionIntensity = 0.8f;
        if (moonlight != null)
            moonlight.intensity = 0.8f;
    }

    static void EnsureNightReflection(Camera camera)
    {
        var reflection = GetOrAdd<OceanPlanarReflection>(camera.gameObject);
        var serializedReflection = new SerializedObject(reflection);
        var waterLayer = LayerMask.NameToLayer("Water");
        var reflectionLayers = waterLayer >= 0 ? ~(1 << waterLayer) : ~0;
        serializedReflection.FindProperty("_reflectionLayers").intValue = reflectionLayers;
        serializedReflection.FindProperty("_farClipPlane").floatValue = 750f;
        serializedReflection.FindProperty("_disablePixelLights").boolValue = false;
        serializedReflection.FindProperty("_disableShadows").boolValue = false;
        serializedReflection.FindProperty("_forceForwardRenderingPath").boolValue = true;
        serializedReflection.FindProperty("_clearFlags").enumValueIndex = (int)camera.clearFlags;
        serializedReflection.ApplyModifiedPropertiesWithoutUndo();
    }

    static Material GetOrCreateCosmicOceanMaterial()
    {
        var material = AssetDatabase.LoadAssetAtPath<Material>(CrestMaterialPath);
        if (material == null)
        {
            if (!AssetDatabase.CopyAsset(CrestBaseMaterialPath, CrestMaterialPath))
                throw new IOException("Could not create Crest cosmic material from " + CrestBaseMaterialPath);
            material = AssetDatabase.LoadAssetAtPath<Material>(CrestMaterialPath);
        }

        SetFloat(material, "_ApplyNormalMapping", 1f, "_APPLYNORMALMAPPING_ON");
        SetFloat(material, "_PlanarReflections", 1f, "_PLANARREFLECTIONS_ON");
        SetFloat(material, "_Foam", 1f, "_FOAM_ON");
        SetFloat(material, "_Foam3DLighting", 1f, "_FOAM3DLIGHTING_ON");
        SetFloat(material, "_Transparency", 1f, "_TRANSPARENCY_ON");
        SetFloat(material, "_ProceduralSky", 1f, "_PROCEDURALSKY_ON");
        SetFloat(material, "_Specular", 0.88f);
        SetFloat(material, "_Roughness", 0.14f);
        SetFloat(material, "_FresnelPower", 5.8f);
        SetFloat(material, "_PlanarReflectionIntensity", 0.9f);
        SetFloat(material, "_PlanarReflectionNormalsStrength", 0.42f);
        SetFloat(material, "_PlanarReflectionDistanceFactor", 0.18f);
        SetFloat(material, "_NormalsScale", 32f);
        SetFloat(material, "_NormalsStrength", 0.18f);
        SetFloat(material, "_WaveFoamCoverage", 0.24f);
        SetFloat(material, "_WaveFoamFeather", 0.5f);
        SetFloat(material, "_WaveFoamStrength", 0.72f);
        SetFloat(material, "_WaveFoamLightScale", 0.52f);
        SetFloat(material, "_ShorelineFoamMinDepth", 0.5f);
        SetFloat(material, "_SubSurfaceScattering", 1f, "_SUBSURFACESCATTERING_ON");
        SetFloat(material, "_SubSurfaceBase", 0.08f);
        SetFloat(material, "_SubSurfaceSun", 0.25f);
        SetFloat(material, "_SubSurfaceSunFallOff", 9f);
        SetColor(material, "_Diffuse", new Color(0.025f, 0.09f, 0.26f, 1f));
        SetColor(material, "_DiffuseGrazing", new Color(0.09f, 0.32f, 0.78f, 1f));
        SetColor(material, "_DiffuseShadow", new Color(0.008f, 0.03f, 0.12f, 1f));
        SetColor(material, "_SubSurfaceColour", new Color(0.04f, 0.18f, 0.42f, 1f));
        SetColor(material, "_FoamWhiteColor", new Color(0.32f, 0.72f, 1f, 0.82f));
        SetColor(material, "_SkyBase", new Color(0.006f, 0.012f, 0.05f, 1f));
        SetColor(material, "_SkyTowardsSun", new Color(0.16f, 0.08f, 0.42f, 1f));
        SetColor(material, "_SkyAwayFromSun", new Color(0.012f, 0.08f, 0.2f, 1f));
        EditorUtility.SetDirty(material);
        return material;
    }

    static void SetFloat(Material material, string property, float value, string keyword = null)
    {
        if (material.HasProperty(property)) material.SetFloat(property, value);
        if (!string.IsNullOrEmpty(keyword)) material.EnableKeyword(keyword);
    }

    static void SetColor(Material material, string property, Color value)
    {
        if (material.HasProperty(property)) material.SetColor(property, value);
    }

    static T GetOrAdd<T>(GameObject gameObject) where T : Component
    {
        var component = gameObject.GetComponent<T>();
        return component != null ? component : gameObject.AddComponent<T>();
    }
}
#endif
