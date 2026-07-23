using System;
using System.IO;
using Pono.KawaGlint.Bootstrap;
using Pono.KawaGlint.Rendering;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Pono.KawaGlint.Editor
{
    /// <summary>
    /// Mirrors <c>Pono.AquaLumina.Editor.AquaLuminaProjectSetup</c> clause for clause (itself
    /// mirroring HideSeekProjectSetup.cs / ColorWaterDeliveryProjectSetup.cs): idempotent
    /// [MenuItem] Editor methods that programmatically build/verify the KawaGlint spike scene and
    /// its own private Renderer2DData + VolumeProfile, plus -executeMethod entry points for CLI
    /// use. Never hand-authors scene/asset YAML text - everything below goes through
    /// EditorSceneManager, ScriptableObject.CreateInstance/AssetDatabase.CreateAsset, or
    /// SerializedObject/SerializedProperty, per this project's established convention.
    /// </summary>
    public static class KawaGlintProjectSetup
    {
        public const string SpikeScenePath = "Assets/Pono/Games/KawaGlint/Scenes/91_KawaGlint.unity";
        public const string RendererDataPath = "Assets/Pono/Games/KawaGlint/Content/Rendering/KawaGlintRenderer2D.asset";
        public const string VolumeProfilePath = "Assets/Pono/Games/KawaGlint/Content/Rendering/KawaGlintVolumeProfile.asset";
        public const string SourceRendererPath = "Assets/Settings/Renderer2D.asset";
        public const string PipelineAssetPath = "Assets/Settings/UniversalRP.asset";

        // Project-wide, shared default Volume Profile (referenced by
        // Assets/UniversalRenderPipelineGlobalSettings.asset as the pipeline-wide fallback for
        // every camera/scene, including the shipping HideSeekCreatures/ColorWaterDelivery games,
        // and the AquaLumina spike). This spike must NEVER add component overrides here - see
        // EnsureRefractionOverrides/EnsureBloomOverrides below, which only ever touch
        // VolumeProfilePath. It can still end up here anyway: Unity auto-syncs newly compiled
        // VolumeComponent subclasses into the project's global default profile the first time the
        // Editor evaluates the Volume stack after a domain reload (VolumeManager.
        // EvaluateVolumeDefaultState/ApplyDefaultProfile), which is exactly what happened once in
        // practice for AquaLumina's own new VolumeComponent subclasses (recovered 2026-07-24; see
        // AquaLumina/README.md's safety-design section for the full story). VerifySpike guards
        // against a repeat, and RemoveOrphanedDefaultProfileEntries (below) is the idempotent
        // cleanup for it - called from RemoveRendererFromPipeline (so retiring the spike also
        // un-pollutes this shared asset), RebuildSpikeScene (so a routine rebuild self-heals it
        // too), and BuildMacFromCommandLine (so the auto-sync a real BuildPipeline.BuildPlayer call
        // can itself re-trigger - confirmed happening for AquaLumina even right after a clean
        // VerifySpike - gets cleaned up before the build path exits).
        private const string SharedDefaultVolumeProfilePath = "Assets/DefaultVolumeProfile.asset";

        // Pinned so EnsurePipelineEntry can abort loudly if Assets/Settings/Renderer2D.asset -
        // shared by both shipping games (and referenced at index 0 alongside AquaLumina's own
        // entry) - is ever swapped out for a different asset at the same path (see the safety
        // constraints this integration operates under).
        private const string SourceRendererGuid = "424799608f7334c24bf367e4bbfa7f9a";

        private const string ShaderContentRoot = "Assets/Pono/Games/KawaGlint/Content/Resources/KawaGlint/Rendering";
        private const string RefractionShaderPath = ShaderContentRoot + "/KawaRefraction.shader";
        private const string SurfaceShaderPath = ShaderContentRoot + "/KawaSurface.shader";

        private static readonly Color SceneBackgroundColor = new Color(0x17 / 255f, 0x46 / 255f, 0x6B / 255f, 1f);

        [MenuItem("Pono/Kawa Glint/Rebuild Spike Scene")]
        public static void RebuildSpikeScene()
        {
            EnsureFolder("Assets/Pono/Games/KawaGlint/Scenes");
            EnsureFolder("Assets/Pono/Games/KawaGlint/Content/Rendering");

            var rendererData = EnsureRendererData();
            var rendererIndex = EnsurePipelineEntry(rendererData);
            var profile = EnsureVolumeProfile();

            BuildScene(rendererData, rendererIndex, profile);

            // Self-heal: a routine rebuild is also a good place to catch/undo the Unity
            // default-Volume-profile auto-sync described on SharedDefaultVolumeProfilePath's doc
            // comment, in case it has silently reoccurred since the last run.
            RemoveOrphanedDefaultProfileEntries();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("Kawa Glint spike scene rebuilt.");
        }

        [MenuItem("Pono/Kawa Glint/Verify Spike")]
        public static void VerifySpike()
        {
            var errors = 0;

            errors += RequireAsset<Shader>(RefractionShaderPath);
            errors += RequireAsset<Shader>(SurfaceShaderPath);
            errors += RequireAsset<SceneAsset>(SpikeScenePath);

            var rendererData = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(RendererDataPath);
            if (rendererData == null)
            {
                Debug.LogError($"Missing required asset: {RendererDataPath}");
                errors++;
            }
            else
            {
                if (!rendererData.TryGetRendererFeature<KawaRefractionFeature>(out _))
                {
                    Debug.LogError($"{RendererDataPath} is missing KawaRefractionFeature.");
                    errors++;
                }
            }

            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(VolumeProfilePath);
            if (profile == null)
            {
                Debug.LogError($"Missing required asset: {VolumeProfilePath}");
                errors++;
            }
            else
            {
                if (!profile.Has<KawaRefractionVolume>())
                {
                    Debug.LogError($"{VolumeProfilePath} is missing KawaRefractionVolume.");
                    errors++;
                }
                if (!profile.Has<Bloom>())
                {
                    Debug.LogError($"{VolumeProfilePath} is missing Bloom.");
                    errors++;
                }
            }

            var pipelineAsset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);
            if (pipelineAsset == null)
            {
                Debug.LogError($"Missing required asset: {PipelineAssetPath}");
                errors++;
            }
            else
            {
                var serializedPipeline = new SerializedObject(pipelineAsset);
                var listProperty = serializedPipeline.FindProperty("m_RendererDataList");
                var sourceRenderer = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(SourceRendererPath);

                if (listProperty.arraySize == 0 || sourceRenderer == null
                    || listProperty.GetArrayElementAtIndex(0).objectReferenceValue != sourceRenderer)
                {
                    Debug.LogError($"{PipelineAssetPath} element 0 no longer resolves to {SourceRendererPath}.");
                    errors++;
                }

                var foundAtValidIndex = false;
                for (var i = 1; i < listProperty.arraySize; i++)
                {
                    if (rendererData != null && listProperty.GetArrayElementAtIndex(i).objectReferenceValue == rendererData)
                    {
                        foundAtValidIndex = true;
                        break;
                    }
                }
                if (!foundAtValidIndex)
                {
                    Debug.LogError($"{PipelineAssetPath} does not list {RendererDataPath} at index >= 1.");
                    errors++;
                }

                var requireDepthProperty = serializedPipeline.FindProperty("m_RequireDepthTexture");
                var requireOpaqueProperty = serializedPipeline.FindProperty("m_RequireOpaqueTexture");
                if (requireDepthProperty != null && requireDepthProperty.boolValue)
                {
                    Debug.LogError($"{PipelineAssetPath} m_RequireDepthTexture must stay 0 (shared by shipping games).");
                    errors++;
                }
                if (requireOpaqueProperty != null && requireOpaqueProperty.boolValue)
                {
                    Debug.LogError($"{PipelineAssetPath} m_RequireOpaqueTexture must stay 0 (shared by shipping games).");
                    errors++;
                }
            }

            // Regression guard: this spike's overrides must live only in VolumeProfilePath, never
            // leak into the shared, project-global default Volume Profile. See
            // SharedDefaultVolumeProfilePath's doc comment for why this matters and the incident
            // (on AquaLumina) that prompted adding this check.
            var sharedDefaultProfile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(SharedDefaultVolumeProfilePath);
            if (sharedDefaultProfile != null && sharedDefaultProfile.Has<KawaRefractionVolume>())
            {
                Debug.LogError(
                    $"{SharedDefaultVolumeProfilePath} (shared, project-global) must NOT contain "
                    + $"KawaRefractionVolume - it belongs only in {VolumeProfilePath}.");
                errors++;
            }

            var sceneInBuildSettings = false;
            foreach (var buildScene in EditorBuildSettings.scenes)
            {
                if (buildScene.path == SpikeScenePath)
                {
                    sceneInBuildSettings = true;
                    break;
                }
            }
            if (sceneInBuildSettings)
            {
                Debug.LogError($"{SpikeScenePath} must NOT be present in EditorBuildSettings.scenes (non-shipping spike).");
                errors++;
            }

            if (errors > 0)
            {
                throw new InvalidOperationException($"Kawa Glint spike verification failed with {errors} error(s).");
            }
            Debug.Log("Kawa Glint spike verification passed.");
        }

        [MenuItem("Pono/Kawa Glint/Remove Renderer From Pipeline")]
        public static void RemoveRendererFromPipeline()
        {
            var pipelineAsset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);
            if (pipelineAsset == null)
            {
                Debug.LogWarning($"[KawaGlintProjectSetup] No pipeline asset at '{PipelineAssetPath}'; nothing to remove.");
                return;
            }

            var rendererData = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(RendererDataPath);
            var serializedPipeline = new SerializedObject(pipelineAsset);
            var listProperty = serializedPipeline.FindProperty("m_RendererDataList");

            var removed = 0;
            for (var i = listProperty.arraySize - 1; i >= 1; i--) // index 0 (the shared Renderer2D.asset) is never touched
            {
                var element = listProperty.GetArrayElementAtIndex(i);
                if (rendererData != null && element.objectReferenceValue == rendererData)
                {
                    // SerializedProperty quirk for object-reference array elements: the element
                    // must be nulled before DeleteArrayElementAtIndex actually removes the slot,
                    // otherwise the first delete call only clears the reference in place. This only
                    // ever touches KawaGlint's own entry - an AquaLumina entry elsewhere in the list
                    // is never inspected, moved, or removed by this loop.
                    element.objectReferenceValue = null;
                    listProperty.DeleteArrayElementAtIndex(i);
                    removed++;
                }
            }

            if (removed > 0)
            {
                serializedPipeline.ApplyModifiedProperties();
                EditorUtility.SetDirty(pipelineAsset);
                AssetDatabase.SaveAssets();
                Debug.Log($"[KawaGlintProjectSetup] Removed {removed} Kawa Glint renderer entry(ies) from the pipeline asset.");
            }
            else
            {
                Debug.Log("[KawaGlintProjectSetup] No KawaGlint renderer entries found in the pipeline asset; nothing to remove.");
            }

            // Retiring the spike from the pipeline is exactly the moment an orphaned KawaGlint
            // entry in the shared project-global default profile (see
            // SharedDefaultVolumeProfilePath's doc comment) would otherwise be left behind
            // indefinitely - clean it up here too, unconditionally and idempotently.
            RemoveOrphanedDefaultProfileEntries();
        }

        public static void SetupFromCommandLine()
        {
            RebuildSpikeScene();
            VerifySpike();
        }

        public static void BuildMacFromCommandLine()
        {
            EnsureReady();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/macOS/PonoKawaGlint.app");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/macOS");

            BuildReport report;
            try
            {
                report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
                {
                    // 00_Boot is deliberately excluded - it boots HideSeekCreatures (see
                    // HideSeekProjectSetup), not this spike. This mirrors the ColorWaterDelivery/
                    // AquaLumina precedent of building only its own scene.
                    scenes = new[] { SpikeScenePath },
                    locationPathName = output,
                    target = BuildTarget.StandaloneOSX,
                    options = BuildOptions.None
                });
            }
            finally
            {
                // BuildPipeline.BuildPlayer itself (its script recompile/domain reload for the
                // build target) can re-trigger Unity's internal VolumeComponent auto-sync into the
                // shared default profile - even immediately after EnsureReady()'s VerifySpike() call
                // reported it clean, since that check runs before the build, not after (see
                // SharedDefaultVolumeProfilePath's doc comment for the full story, confirmed on
                // AquaLumina). Clean up here, unconditionally and in a finally block, so pollution
                // introduced by the build itself never survives the build path, whether the build
                // succeeds or throws.
                RemoveOrphanedDefaultProfileEntries();
            }

            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"macOS build failed: {report.summary.result}, {report.summary.totalErrors} error(s).");
            }
            Debug.Log($"macOS build succeeded: {output} ({report.summary.totalSize} bytes)");
        }

        private static void EnsureReady()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(SpikeScenePath) == null)
            {
                RebuildSpikeScene();
            }
            VerifySpike();
        }

        // -----------------------------------------------------------------
        // Renderer2DData (private copy, appended to the shared pipeline)
        // -----------------------------------------------------------------

        private static ScriptableRendererData EnsureRendererData()
        {
            var rendererData = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(RendererDataPath);
            if (rendererData == null)
            {
                // CopyAsset (not CreateInstance) is the primary path: Renderer2DData serializes
                // required default-shader/material/blend-style references that a raw
                // CreateInstance leaves unset (NRE risk in the 2D renderer). CopyAsset is fully
                // programmatic and cannot damage the source asset.
                if (AssetDatabase.CopyAsset(SourceRendererPath, RendererDataPath))
                {
                    AssetDatabase.SaveAssets();
                    AssetDatabase.Refresh();
                }
                else
                {
                    Debug.LogWarning(
                        $"[KawaGlintProjectSetup] AssetDatabase.CopyAsset failed for '{SourceRendererPath}' -> "
                        + $"'{RendererDataPath}'; falling back to ScriptableObject.CreateInstance<Renderer2DData> "
                        + "(documented fallback only - may leave default shader/material/blend-style references unset).");
                    var fallback = ScriptableObject.CreateInstance<Renderer2DData>();
                    fallback.name = "KawaGlintRenderer2D";
                    AssetDatabase.CreateAsset(fallback, RendererDataPath);
                    AssetDatabase.SaveAssets();
                    AssetDatabase.Refresh();
                }

                rendererData = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(RendererDataPath);
            }

            if (rendererData == null)
            {
                throw new InvalidOperationException($"Could not create or load renderer data asset at '{RendererDataPath}'.");
            }

            EnsureRendererFeature<KawaRefractionFeature>(rendererData);

            return rendererData;
        }

        private static void EnsureRendererFeature<T>(ScriptableRendererData rendererData)
            where T : ScriptableRendererFeature
        {
            if (rendererData.TryGetRendererFeature<T>(out _))
            {
                return; // Idempotent: a feature of this type already lives on the asset.
            }

            var feature = ScriptableObject.CreateInstance<T>();
            feature.name = typeof(T).Name;
            AssetDatabase.AddObjectToAsset(feature, rendererData);

            if (!AssetDatabase.TryGetGUIDAndLocalFileIdentifier(feature, out _, out long localId))
            {
                throw new InvalidOperationException(
                    $"Could not resolve a local file identifier for the newly added '{typeof(T).Name}' sub-asset.");
            }

            var serializedRenderer = new SerializedObject(rendererData);
            var featuresProperty = serializedRenderer.FindProperty("m_RendererFeatures");
            var mapProperty = serializedRenderer.FindProperty("m_RendererFeatureMap");

            // Keep the two parallel arrays the same length before appending - a fresh
            // Renderer2D.asset copy starts with an empty/null map, and a partially-run previous
            // attempt could otherwise leave them out of sync.
            while (mapProperty.arraySize < featuresProperty.arraySize)
            {
                mapProperty.InsertArrayElementAtIndex(mapProperty.arraySize);
            }

            var index = featuresProperty.arraySize;
            featuresProperty.InsertArrayElementAtIndex(index);
            featuresProperty.GetArrayElementAtIndex(index).objectReferenceValue = feature;

            mapProperty.InsertArrayElementAtIndex(index);
            mapProperty.GetArrayElementAtIndex(index).longValue = localId;

            serializedRenderer.ApplyModifiedProperties();
            EditorUtility.SetDirty(rendererData);
        }

        // -----------------------------------------------------------------
        // Pipeline append (Assets/Settings/UniversalRP.asset)
        // -----------------------------------------------------------------

        private static int EnsurePipelineEntry(ScriptableRendererData rendererData)
        {
            var pipelineAsset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);
            if (pipelineAsset == null)
            {
                throw new InvalidOperationException($"Could not load UniversalRenderPipelineAsset at '{PipelineAssetPath}'.");
            }

            var serializedPipeline = new SerializedObject(pipelineAsset);
            var listProperty = serializedPipeline.FindProperty("m_RendererDataList");

            for (var i = 0; i < listProperty.arraySize; i++)
            {
                if (listProperty.GetArrayElementAtIndex(i).objectReferenceValue == rendererData)
                {
                    return i; // Idempotent: already appended, nothing to save.
                }
            }

            var newIndex = listProperty.arraySize;
            listProperty.InsertArrayElementAtIndex(newIndex);
            listProperty.GetArrayElementAtIndex(newIndex).objectReferenceValue = rendererData;

            // Guard before saving: element 0 must still be the single shared Renderer2D.asset both
            // shipping games (HideSeekCreatures, ColorWaterDelivery) depend on. Abort loudly -
            // without writing anything - rather than risk silently corrupting the shared asset. Any
            // AquaLumina entry already present elsewhere in the list is left exactly where it is;
            // this method only ever appends its own entry at the end.
            var sourceGuid = AssetDatabase.AssetPathToGUID(SourceRendererPath);
            if (sourceGuid != SourceRendererGuid)
            {
                throw new InvalidOperationException(
                    $"Refusing to modify '{PipelineAssetPath}': '{SourceRendererPath}' guid changed unexpectedly "
                    + $"(expected {SourceRendererGuid}, found {sourceGuid}).");
            }

            var sourceRenderer = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(SourceRendererPath);
            var elementZero = listProperty.GetArrayElementAtIndex(0).objectReferenceValue;
            if (sourceRenderer == null || elementZero != sourceRenderer)
            {
                throw new InvalidOperationException(
                    $"Refusing to modify '{PipelineAssetPath}': element 0 no longer resolves to '{SourceRendererPath}'. "
                    + "Aborting without saving.");
            }

            serializedPipeline.ApplyModifiedProperties();
            EditorUtility.SetDirty(pipelineAsset);
            return newIndex;
        }

        // -----------------------------------------------------------------
        // Shared DefaultVolumeProfile.asset guard (see SharedDefaultVolumeProfilePath's doc
        // comment for why this asset needs guarding at all).
        // -----------------------------------------------------------------

        [MenuItem("Pono/Kawa Glint/Clean Shared Default Volume Profile")]
        public static void CleanSharedDefaultVolumeProfile()
        {
            if (RemoveOrphanedDefaultProfileEntries() == 0)
            {
                Debug.Log(
                    $"[KawaGlintProjectSetup] '{SharedDefaultVolumeProfilePath}' has no Kawa Glint components to remove.");
            }
        }

        /// <summary>
        /// Idempotently strips any KawaRefractionVolume sub-asset from the project-wide shared
        /// default Volume profile, if present. Uses VolumeProfile.Remove&lt;T&gt; (removes the
        /// component from the profile's components list) followed by
        /// AssetDatabase.RemoveObjectFromAsset + DestroyImmediate (removes the now-unreferenced
        /// sub-asset object from the .asset file itself) - Remove&lt;T&gt; alone would leave an
        /// orphaned, unreferenced MonoBehaviour sub-asset serialized into the file. No-op (returns
        /// 0) if the shared asset doesn't exist or doesn't contain the component, so this is always
        /// safe to call unconditionally.
        /// </summary>
        private static int RemoveOrphanedDefaultProfileEntries()
        {
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(SharedDefaultVolumeProfilePath);
            if (profile == null)
            {
                return 0;
            }

            var removed = RemoveComponentIfPresent<KawaRefractionVolume>(profile);

            if (removed > 0)
            {
                EditorUtility.SetDirty(profile);
                AssetDatabase.SaveAssets();
                Debug.LogWarning(
                    $"[KawaGlintProjectSetup] Removed {removed} orphaned Kawa Glint component(s) from the shared "
                    + $"'{SharedDefaultVolumeProfilePath}' (project-wide default Volume profile). These must only "
                    + $"ever live in '{VolumeProfilePath}'.");
            }
            return removed;
        }

        private static int RemoveComponentIfPresent<T>(VolumeProfile profile)
            where T : VolumeComponent
        {
            if (!profile.TryGet(out T component))
            {
                return 0;
            }

            profile.Remove<T>();
            if (component != null)
            {
                AssetDatabase.RemoveObjectFromAsset(component);
                UnityEngine.Object.DestroyImmediate(component, true);
            }
            return 1;
        }

        // -----------------------------------------------------------------
        // Volume profile (private, referenced by the spike scene's Volume)
        // -----------------------------------------------------------------

        private static VolumeProfile EnsureVolumeProfile()
        {
            var profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(VolumeProfilePath);
            if (profile == null)
            {
                profile = ScriptableObject.CreateInstance<VolumeProfile>();
                profile.name = "KawaGlintVolumeProfile";
                AssetDatabase.CreateAsset(profile, VolumeProfilePath);
            }

            EnsureRefractionOverrides(profile);
            EnsureBloomOverrides(profile);

            EditorUtility.SetDirty(profile);
            AssetDatabase.SaveAssets();
            return profile;
        }

        private static void EnsureRefractionOverrides(VolumeProfile profile)
        {
            if (!profile.Has<KawaRefractionVolume>())
            {
                var component = profile.Add<KawaRefractionVolume>(true);
                AssetDatabase.AddObjectToAsset(component, profile);
            }

            if (profile.TryGet(out KawaRefractionVolume refraction))
            {
                refraction.refractionStrength.Override(0.010f);
                refraction.reflectionStrength.Override(0.35f);
                refraction.shimmerStrength.Override(0.30f);
                refraction.waveScale.Override(1.8f);
                refraction.speed.Override(0.6f);
                refraction.chromaticShift.Override(0.002f);
                refraction.waterlineViewportY.Override(0.66f);
            }
        }

        private static void EnsureBloomOverrides(VolumeProfile profile)
        {
            if (!profile.Has<Bloom>())
            {
                var component = profile.Add<Bloom>(true);
                AssetDatabase.AddObjectToAsset(component, profile);
            }

            if (profile.TryGet(out Bloom bloom))
            {
                bloom.intensity.Override(0.8f);
                bloom.threshold.Override(0.85f);
                bloom.scatter.Override(0.6f);
            }
        }

        // -----------------------------------------------------------------
        // Scene
        // -----------------------------------------------------------------

        private static void BuildScene(ScriptableRendererData rendererData, int rendererIndex, VolumeProfile profile)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cameraObject = new GameObject("MainCamera", typeof(Camera));
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.GetComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.transform.position = new Vector3(0f, 0f, -10f);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = SceneBackgroundColor;

            var cameraData = camera.GetUniversalAdditionalCameraData();
            cameraData.renderPostProcessing = true;
            cameraData.SetRenderer(rendererIndex);

            var volumeObject = new GameObject("KawaGlintVolume", typeof(Volume));
            var volume = volumeObject.GetComponent<Volume>();
            volume.isGlobal = true;
            volume.sharedProfile = profile;

            var root = new GameObject("KawaGlint", typeof(KawaGlintBootstrap));
            root.transform.position = Vector3.zero;

            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, SpikeScenePath))
            {
                throw new InvalidOperationException($"Could not save scene: {SpikeScenePath}");
            }
        }

        // -----------------------------------------------------------------
        // Shared helpers (copied verbatim in spirit from HideSeekProjectSetup /
        // ColorWaterDeliveryProjectSetup / AquaLuminaProjectSetup - kept local rather than factored
        // into a shared utility so this file never needs a reference beyond its own asmdef's
        // declared dependencies).
        // -----------------------------------------------------------------

        private static int RequireAsset<T>(string path) where T : UnityEngine.Object
        {
            if (AssetDatabase.LoadAssetAtPath<T>(path) != null)
            {
                return 0;
            }
            Debug.LogError($"Missing required asset: {path}");
            return 1;
        }

        private static void EnsureFolder(string path)
        {
            var parts = path.Split('/');
            var current = parts[0];
            for (var i = 1; i < parts.Length; i++)
            {
                var next = $"{current}/{parts[i]}";
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, parts[i]);
                }
                current = next;
            }
        }

        private static string ReadCommandLineValue(string key)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var i = 0; i < arguments.Length - 1; i++)
            {
                if (string.Equals(arguments[i], key, StringComparison.OrdinalIgnoreCase))
                {
                    return arguments[i + 1];
                }
            }
            return null;
        }
    }
}
