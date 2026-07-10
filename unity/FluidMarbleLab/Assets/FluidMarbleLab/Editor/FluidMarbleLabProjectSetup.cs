using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.FluidMarbleLab.Editor
{
    public static class FluidMarbleLabProjectSetup
    {
        public const string ScenePath = "Assets/FluidMarbleLab/Scenes/FluidMarbleLab.unity";
        private const string MaterialPath = "Assets/FluidMarbleLab/Materials/FluidSurface.mat";
        private const string ComputePath = "Assets/FluidMarbleLab/Shaders/Fluid.compute";
        private const string ShaderPath = "Assets/FluidMarbleLab/Shaders/FluidSurface.shader";

        [MenuItem("Pono/Fluid Marble Lab/Rebuild Prototype Scene")]
        public static void RebuildPrototypeScene()
        {
            EnsureFolder("Assets/FluidMarbleLab/Scenes");
            EnsureFolder("Assets/FluidMarbleLab/Materials");
            AssetDatabase.ImportAsset(ComputePath, ImportAssetOptions.ForceUpdate);
            AssetDatabase.ImportAsset(ShaderPath, ImportAssetOptions.ForceUpdate);

            var computeShader = AssetDatabase.LoadAssetAtPath<ComputeShader>(ComputePath);
            var surfaceShader = AssetDatabase.LoadAssetAtPath<Shader>(ShaderPath);
            if (computeShader == null) throw new InvalidOperationException($"Missing compute shader: {ComputePath}");
            if (surfaceShader == null) throw new InvalidOperationException($"Missing surface shader: {ShaderPath}");
            var surfaceMaterial = LoadOrCreateMaterial(surfaceShader);

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cameraObject = new GameObject("MainCamera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.transform.position = new Vector3(0f, 0f, -10f);
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.95f, 0.93f, 0.84f);
            camera.allowHDR = false;

            var worldRoot = new GameObject("WorldRoot").transform;
            var surfaceObject = GameObject.CreatePrimitive(PrimitiveType.Quad);
            surfaceObject.name = "FluidSurface";
            surfaceObject.transform.SetParent(worldRoot, false);
            surfaceObject.transform.localPosition = new Vector3(0f, 0f, 2f);
            UnityEngine.Object.DestroyImmediate(surfaceObject.GetComponent<Collider>());
            var surfaceRenderer = surfaceObject.GetComponent<Renderer>();
            surfaceRenderer.sharedMaterial = surfaceMaterial;

            var canvasObject = new GameObject("Canvas", typeof(RectTransform));
            var canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObject.AddComponent<GraphicRaycaster>();
            var scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            var appRoot = new GameObject("AppRoot");
            var bootstrap = appRoot.AddComponent<FluidMarbleLabBootstrap>();
            bootstrap.ConfigureSceneAssets(computeShader, surfaceMaterial, camera, surfaceRenderer, worldRoot, canvas);

            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
            {
                throw new InvalidOperationException($"Could not save scene: {ScenePath}");
            }

            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            ConfigurePlayerSettings();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log($"Fluid Marble Lab scene rebuilt: {ScenePath}");
        }

        [MenuItem("Pono/Fluid Marble Lab/Verify Project")]
        public static void VerifyProject()
        {
            var errors = 0;
            if (AssetDatabase.LoadAssetAtPath<ComputeShader>(ComputePath) == null)
            {
                Debug.LogError($"Missing compute shader: {ComputePath}");
                errors++;
            }
            if (AssetDatabase.LoadAssetAtPath<Shader>(ShaderPath) == null)
            {
                Debug.LogError($"Missing surface shader: {ShaderPath}");
                errors++;
            }
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null)
            {
                Debug.LogError($"Missing scene: {ScenePath}");
                errors++;
            }

            if (errors > 0)
            {
                throw new InvalidOperationException($"Fluid Marble Lab verification failed with {errors} error(s).");
            }
            Debug.Log("Fluid Marble Lab verification passed.");
        }

        public static void SetupFromCommandLine()
        {
            RebuildPrototypeScene();
            VerifyProject();
        }

        public static void BuildMacFromCommandLine()
        {
            EnsureSceneExists();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/macOS/FluidMarbleLab.app");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/macOS");
            Build(ScenePath, BuildTarget.StandaloneOSX, output);
        }

        public static void BuildAndroidFromCommandLine()
        {
            EnsureSceneExists();
            ConfigurePlayerSettings();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/Android/FluidMarbleLab.apk");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/Android");
            EditorUserBuildSettings.buildAppBundle = false;
            Build(ScenePath, BuildTarget.Android, output);
        }

        private static void Build(string scene, BuildTarget target, string output)
        {
            var options = new BuildPlayerOptions
            {
                scenes = new[] { scene },
                locationPathName = output,
                target = target,
                options = BuildOptions.None
            };
            var report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"{target} build failed: {report.summary.result}, {report.summary.totalErrors} error(s).");
            }
            Debug.Log($"{target} build succeeded: {output} ({report.summary.totalSize} bytes)");
        }

        private static void ConfigurePlayerSettings()
        {
            PlayerSettings.companyName = "Kodama no Mori";
            PlayerSettings.productName = "Pono Fluid Marble Lab";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone, "com.kodamanomori.pono.fluidmarblelab");
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.kodamanomori.pono.fluidmarblelab");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel36;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.bundleVersionCode = 1;
            PlayerSettings.Android.preferredInstallLocation = AndroidPreferredInstallLocation.Auto;
        }

        private static Material LoadOrCreateMaterial(Shader shader)
        {
            var material = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if (material != null)
            {
                material.shader = shader;
                EditorUtility.SetDirty(material);
                return material;
            }
            material = new Material(shader) { name = "Fluid Surface" };
            AssetDatabase.CreateAsset(material, MaterialPath);
            return material;
        }

        private static void EnsureSceneExists()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null)
            {
                RebuildPrototypeScene();
            }
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
