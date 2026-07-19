using System;
using System.IO;
using Pono.ColorWaterDelivery.Bootstrap;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Pono.ColorWaterDelivery.Editor
{
    public static class ColorWaterDeliveryProjectSetup
    {
        public const string GameScenePath =
            "Assets/Pono/Games/ColorWaterDelivery/Scenes/20_ColorWaterDelivery.unity";

        private const string ComputePath =
            "Assets/Pono/Games/ColorWaterDelivery/Content/Resources/ColorWaterDelivery/Rendering/ColorWaterFluid.compute";
        private const string CompositeShaderPath =
            "Assets/Pono/Games/ColorWaterDelivery/Content/Resources/ColorWaterDelivery/Rendering/ColorWaterComposite.shader";

        [MenuItem("Pono/Color Water Delivery/Rebuild Prototype Scene")]
        public static void RebuildGameScene()
        {
            EnsureFolder("Assets/Pono/Games/ColorWaterDelivery/Scenes");
            var scene = EditorSceneManager.NewScene(
                NewSceneSetup.EmptyScene,
                NewSceneMode.Single);
            var cameraObject = new GameObject("MainCamera", typeof(Camera));
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.96f, 0.93f, 0.82f);
            camera.orthographic = true;
            camera.transform.position = new Vector3(0f, 0f, -10f);

            var gameRoot = new GameObject(
                "ColorWaterDelivery",
                typeof(ColorWaterDeliveryBootstrap));
            gameRoot.transform.position = Vector3.zero;
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, GameScenePath))
            {
                throw new InvalidOperationException(
                    $"Could not save scene: {GameScenePath}");
            }
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("Color Water Delivery prototype scene rebuilt.");
        }

        [MenuItem("Pono/Color Water Delivery/Verify Prototype")]
        public static void VerifyProject()
        {
            var errors = 0;
            errors += RequireAsset<ComputeShader>(ComputePath);
            errors += RequireAsset<Shader>(CompositeShaderPath);
            errors += RequireAsset<SceneAsset>(GameScenePath);
            errors += RequireAsset<Font>(
                "Assets/Pono/AppShell/Resources/Fonts/NotoSansJP-Variable.otf");
            if (errors > 0)
            {
                throw new InvalidOperationException(
                    $"Color Water Delivery verification failed with {errors} error(s).");
            }
            Debug.Log("Color Water Delivery prototype verification passed.");
        }

        public static void SetupFromCommandLine()
        {
            RebuildGameScene();
            VerifyProject();
        }

        public static void BuildMacFromCommandLine()
        {
            EnsureReady();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/macOS/PonoColorWaterDelivery.app");
            Directory.CreateDirectory(
                Path.GetDirectoryName(output) ?? "Builds/macOS");
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { GameScenePath },
                locationPathName = output,
                target = BuildTarget.StandaloneOSX,
                options = BuildOptions.None
            });
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"macOS build failed: {report.summary.result}, "
                    + $"{report.summary.totalErrors} error(s).");
            }
            Debug.Log(
                $"macOS build succeeded: {output} "
                + $"({report.summary.totalSize} bytes)");
        }

        private static void EnsureReady()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(GameScenePath) == null)
            {
                RebuildGameScene();
            }
            VerifyProject();
        }

        private static int RequireAsset<T>(string path)
            where T : UnityEngine.Object
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
            for (var index = 1; index < parts.Length; index++)
            {
                var next = $"{current}/{parts[index]}";
                if (!AssetDatabase.IsValidFolder(next))
                {
                    AssetDatabase.CreateFolder(current, parts[index]);
                }
                current = next;
            }
        }

        private static string ReadCommandLineValue(string key)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var index = 0; index < arguments.Length - 1; index++)
            {
                if (string.Equals(
                    arguments[index],
                    key,
                    StringComparison.OrdinalIgnoreCase))
                {
                    return arguments[index + 1];
                }
            }
            return null;
        }
    }
}
