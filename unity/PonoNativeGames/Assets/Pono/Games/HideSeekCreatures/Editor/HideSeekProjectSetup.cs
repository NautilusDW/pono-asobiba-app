using System;
using System.IO;
using Pono.HideSeekCreatures.Bootstrap;
using Pono.NativeShell;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace Pono.HideSeekCreatures.Editor
{
    public static class HideSeekProjectSetup
    {
        public const string BootScenePath = "Assets/Pono/AppShell/Scenes/00_Boot.unity";
        public const string GameScenePath = "Assets/Pono/Games/HideSeekCreatures/Scenes/10_HideSeekCreatures.unity";
        private const string ComputePath = "Assets/Pono/Games/HideSeekCreatures/Content/Resources/HideSeekCreatures/Rendering/FluidInk.compute";
        private const string CompositeShaderPath = "Assets/Pono/Games/HideSeekCreatures/Content/Resources/HideSeekCreatures/Rendering/InkComposite.shader";
        private const string ContentRoot = "Assets/Pono/Games/HideSeekCreatures/Content/Resources/HideSeekCreatures";

        private static readonly string[] RequiredTextures =
        {
            $"{ContentRoot}/km01/forest_background.png",
            $"{ContentRoot}/km01/rabbit.png",
            $"{ContentRoot}/km01/fawn.png",
            $"{ContentRoot}/km01/hedgehog.png",
            $"{ContentRoot}/UI/button_normal.png",
            $"{ContentRoot}/UI/button_pressed.png",
            $"{ContentRoot}/UI/back_button.png",
            $"{ContentRoot}/UI/settings_button.png",
            $"{ContentRoot}/UI/leaf_token.png",
            $"{ContentRoot}/UI/discovery_popup.png"
        };

        private static readonly string[] RequiredAudio =
        {
            $"{ContentRoot}/Audio/touch.mp3",
            $"{ContentRoot}/Audio/ink.mp3",
            $"{ContentRoot}/Audio/hint.mp3",
            $"{ContentRoot}/Audio/found.mp3",
            $"{ContentRoot}/Audio/all_found.mp3",
            $"{ContentRoot}/Audio/back.mp3",
            $"{ContentRoot}/Audio/fog_clear.mp3"
        };

        [MenuItem("Pono/Hide Seek Creatures/Rebuild Game Scenes")]
        public static void RebuildGameScenes()
        {
            EnsureFolder("Assets/Pono/AppShell/Scenes");
            EnsureFolder("Assets/Pono/Games/HideSeekCreatures/Scenes");
            ConfigureImportedAssets();
            BuildBootScene();
            BuildGameScene();
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(BootScenePath, true),
                new EditorBuildSettingsScene(GameScenePath, true)
            };
            ConfigurePlayerSettings();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("Hide Seek Creatures scenes rebuilt.");
        }

        [MenuItem("Pono/Hide Seek Creatures/Verify Project")]
        public static void VerifyProject()
        {
            var errors = 0;
            errors += RequireAsset<ComputeShader>(ComputePath);
            errors += RequireAsset<Shader>(CompositeShaderPath);
            errors += RequireAsset<SceneAsset>(BootScenePath);
            errors += RequireAsset<SceneAsset>(GameScenePath);
            errors += RequireAsset<Font>("Assets/Pono/AppShell/Resources/Fonts/NotoSansJP-Variable.otf");
            for (var i = 0; i < RequiredTextures.Length; i++)
            {
                errors += RequireAsset<Texture2D>(RequiredTextures[i]);
            }
            for (var i = 0; i < RequiredAudio.Length; i++)
            {
                errors += RequireAsset<AudioClip>(RequiredAudio[i]);
            }
            if (EditorBuildSettings.scenes.Length != 2
                || EditorBuildSettings.scenes[0].path != BootScenePath
                || EditorBuildSettings.scenes[1].path != GameScenePath)
            {
                Debug.LogError("Build Settings must contain the boot and Hide Seek scenes in order.");
                errors++;
            }
            if (errors > 0)
            {
                throw new InvalidOperationException($"Hide Seek project verification failed with {errors} error(s).");
            }
            Debug.Log("Hide Seek project verification passed.");
        }

        public static void SetupFromCommandLine()
        {
            RebuildGameScenes();
            VerifyProject();
        }

        public static void BuildMacFromCommandLine()
        {
            EnsureReady();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/macOS/PonoHideSeek.app");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/macOS");
            Build(BuildTarget.StandaloneOSX, output, BuildOptions.None);
        }

        public static void BuildAndroidFromCommandLine()
        {
            EnsureReady();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/Android/PonoHideSeek.apk");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/Android");
            EditorUserBuildSettings.buildAppBundle = false;
            Build(BuildTarget.Android, output, BuildOptions.None);
        }

        public static void BuildAndroidBundleFromCommandLine()
        {
            EnsureReady();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/Android/PonoHideSeek.aab");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/Android");
            EditorUserBuildSettings.buildAppBundle = true;
            Build(BuildTarget.Android, output, BuildOptions.None);
        }

        private static void BuildBootScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cameraObject = new GameObject("MainCamera", typeof(Camera));
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.96f, 0.93f, 0.82f);
            camera.transform.position = new Vector3(0f, 0f, -10f);
            var appRoot = new GameObject("AppRoot", typeof(BootSceneController));
            appRoot.transform.position = Vector3.zero;
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, BootScenePath))
            {
                throw new InvalidOperationException($"Could not save scene: {BootScenePath}");
            }
        }

        private static void BuildGameScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cameraObject = new GameObject("MainCamera", typeof(Camera));
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.96f, 0.93f, 0.82f);
            camera.orthographic = true;
            camera.transform.position = new Vector3(0f, 0f, -10f);
            var gameRoot = new GameObject("HideSeekCreatures", typeof(HideSeekRuntimeBootstrap));
            gameRoot.transform.position = Vector3.zero;
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, GameScenePath))
            {
                throw new InvalidOperationException($"Could not save scene: {GameScenePath}");
            }
        }

        private static void ConfigurePlayerSettings()
        {
            PlayerSettings.companyName = "Kodama no Mori";
            PlayerSettings.productName = "ポノのあそびば";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.runInBackground = false;
            PlayerSettings.SplashScreen.showUnityLogo = false;
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone, "com.kodamanomori.pono.nativegames");
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.kodamanomori.pono.nativegames");
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.kodamanomori.pono.nativegames");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.Medium);
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel25;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel36;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.bundleVersionCode = 1;
            PlayerSettings.Android.optimizedFramePacing = true;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            PlayerSettings.SetGraphicsAPIs(
                BuildTarget.Android,
                new[] { GraphicsDeviceType.Vulkan, GraphicsDeviceType.OpenGLES3 });
        }

        private static void ConfigureImportedAssets()
        {
            for (var i = 0; i < RequiredTextures.Length; i++)
            {
                if (AssetImporter.GetAtPath(RequiredTextures[i]) is not TextureImporter importer)
                {
                    continue;
                }
                importer.textureType = TextureImporterType.Default;
                importer.alphaIsTransparency = true;
                importer.mipmapEnabled = false;
                importer.wrapMode = TextureWrapMode.Clamp;
                importer.filterMode = FilterMode.Bilinear;
                var isBackground = RequiredTextures[i].Contains("forest_background", StringComparison.Ordinal);
                importer.maxTextureSize = isBackground ? 4096 : 2048;
                importer.textureCompression = TextureImporterCompression.CompressedHQ;
                importer.SetPlatformTextureSettings(new TextureImporterPlatformSettings
                {
                    name = "Android",
                    overridden = true,
                    maxTextureSize = isBackground ? 4096 : 2048,
                    format = TextureImporterFormat.ASTC_6x6,
                    compressionQuality = 100
                });
                importer.SaveAndReimport();
            }

            for (var i = 0; i < RequiredAudio.Length; i++)
            {
                if (AssetImporter.GetAtPath(RequiredAudio[i]) is not AudioImporter importer)
                {
                    continue;
                }
                var isLoop = RequiredAudio[i].EndsWith("/ink.mp3", StringComparison.Ordinal);
                var settings = importer.defaultSampleSettings;
                settings.loadType = isLoop ? AudioClipLoadType.CompressedInMemory : AudioClipLoadType.DecompressOnLoad;
                settings.compressionFormat = isLoop ? AudioCompressionFormat.Vorbis : AudioCompressionFormat.ADPCM;
                settings.quality = isLoop ? 0.72f : 1f;
                settings.preloadAudioData = !isLoop;
                importer.defaultSampleSettings = settings;
                importer.loadInBackground = isLoop;
                importer.SaveAndReimport();
            }
        }

        private static void EnsureReady()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(BootScenePath) == null
                || AssetDatabase.LoadAssetAtPath<SceneAsset>(GameScenePath) == null)
            {
                RebuildGameScenes();
            }
            VerifyProject();
        }

        private static void Build(BuildTarget target, string output, BuildOptions options)
        {
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { BootScenePath, GameScenePath },
                locationPathName = output,
                target = target,
                options = options
            });
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"{target} build failed: {report.summary.result}, {report.summary.totalErrors} error(s).");
            }
            Debug.Log($"{target} build succeeded: {output} ({report.summary.totalSize} bytes)");
        }

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
