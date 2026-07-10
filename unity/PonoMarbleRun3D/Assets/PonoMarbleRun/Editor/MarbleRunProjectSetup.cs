using System;
using System.Diagnostics;
using System.IO;
using Pono.MarbleRun3D.Bootstrap;
using Pono.MarbleRun3D.Core;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using Debug = UnityEngine.Debug;

namespace Pono.MarbleRun3D.Editor
{
    public static class MarbleRunProjectSetup
    {
        public const string ScenePath = "Assets/PonoMarbleRun/Scenes/10_MarbleRun.unity";
        public const string FontPath = "Assets/Resources/Fonts/NotoSansJP-Variable.otf";
        public const string BaseMaterialPath = "Assets/Resources/Materials/ToyBase.mat";

        [MenuItem("Pono/Marble Run/Rebuild Scene")]
        public static void RebuildScene()
        {
            EnsureFolder("Assets/PonoMarbleRun/Scenes");
            EnsureBaseMaterial();
            ConfigureLayers();
            ConfigureProjectSettings();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var cameraObject = new GameObject("MainCamera", typeof(Camera), typeof(AudioListener));
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.72f, 0.90f, 0.96f);
            camera.fieldOfView = 43f;
            camera.nearClipPlane = 0.15f;
            camera.farClipPlane = 130f;
            camera.transform.position = new Vector3(-16f, 22f, -22f);
            camera.transform.rotation = Quaternion.Euler(43f, 36f, 0f);

            var root = new GameObject("PonoMarbleRun3D", typeof(MarbleRunBootstrap));
            root.transform.position = Vector3.zero;
            EditorSceneManager.MarkSceneDirty(scene);
            if (!EditorSceneManager.SaveScene(scene, ScenePath))
            {
                throw new InvalidOperationException("Could not save scene: " + ScenePath);
            }
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("Marble Run scene rebuilt.");
        }

        [MenuItem("Pono/Marble Run/Verify Project")]
        public static void VerifyProject()
        {
            var errors = 0;
            errors += RequireAsset<SceneAsset>(ScenePath);
            errors += RequireAsset<Font>(FontPath);
            errors += RequireAsset<Material>(BaseMaterialPath);
            if (EditorBuildSettings.scenes.Length != 1
                || EditorBuildSettings.scenes[0].path != ScenePath
                || !EditorBuildSettings.scenes[0].enabled)
            {
                Debug.LogError("Build Settings must contain the Marble Run scene.");
                errors++;
            }
            if (Mathf.Abs(Time.fixedDeltaTime - 1f / 60f) > 0.00001f)
            {
                Debug.LogError("Fixed timestep must be 1/60.");
                errors++;
            }
            if (LayerMask.NameToLayer("PlacementQuery") < 0
                || LayerMask.NameToLayer("CourseGeometry") < 0
                || LayerMask.NameToLayer("Board") < 0
                || LayerMask.NameToLayer("Marble") < 0)
            {
                Debug.LogError("Marble Run physics layers are missing.");
                errors++;
            }
            if (errors > 0)
            {
                throw new InvalidOperationException("Marble Run verification failed with " + errors + " error(s).");
            }
            Debug.Log("Marble Run project verification passed.");
        }

        public static void SetupFromCommandLine()
        {
            RebuildScene();
            VerifyProject();
        }

        public static void BuildMacFromCommandLine()
        {
            EnsureReady();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/macOS/PonoMarbleRun.app");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/macOS");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.SetArchitecture(NamedBuildTarget.Standalone, 2);
            Build(BuildTarget.StandaloneOSX, output);
            NormalizeAndSignMacBundle(output);
        }

        public static void BuildAndroidFromCommandLine()
        {
            EnsureReady();
            var output = ReadCommandLineValue("-buildOutput")
                ?? Path.GetFullPath("Builds/Android/PonoMarbleRun.apk");
            Directory.CreateDirectory(Path.GetDirectoryName(output) ?? "Builds/Android");
            EditorUserBuildSettings.buildAppBundle = false;
            Build(BuildTarget.Android, output);
        }

        private static void ConfigureProjectSettings()
        {
            PlayerSettings.companyName = "Kodama no Mori";
            PlayerSettings.productName = "ポノの マーブルラン";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.runInBackground = false;
            PlayerSettings.resizableWindow = true;
            PlayerSettings.defaultScreenWidth = 1280;
            PlayerSettings.defaultScreenHeight = 720;
            PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.SplashScreen.showUnityLogo = false;
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Standalone, "com.kodamanomori.pono.marblerun3d");
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.kodamanomori.pono.marblerun3d");
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.kodamanomori.pono.marblerun3d");
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.SetArchitecture(NamedBuildTarget.Standalone, 2);
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.Medium);
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel25;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevel36;
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.bundleVersionCode = 1;
            PlayerSettings.Android.optimizedFramePacing = true;
            PlayerSettings.Android.predictiveBackSupport = true;
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
            PlayerSettings.SetGraphicsAPIs(
                BuildTarget.Android,
                new[] { GraphicsDeviceType.Vulkan, GraphicsDeviceType.OpenGLES3 });
            var currentQuality = QualitySettings.GetQualityLevel();
            QualitySettings.SetQualityLevel(2, false);
            QualitySettings.vSyncCount = 0;
            QualitySettings.antiAliasing = 2;
            QualitySettings.shadowDistance = 24f;
            QualitySettings.SetQualityLevel(currentQuality, false);
            QualitySettings.vSyncCount = 0;
            QualitySettings.antiAliasing = 2;
            QualitySettings.shadowDistance = 24f;
            Time.fixedDeltaTime = MarbleRunPhysicsProfile.FixedTimestep;
            Time.maximumDeltaTime = MarbleRunPhysicsProfile.MaximumTimestep;
            Physics.defaultSolverIterations = MarbleRunPhysicsProfile.SolverIterations;
            Physics.defaultSolverVelocityIterations = MarbleRunPhysicsProfile.SolverVelocityIterations;
            Physics.defaultMaxDepenetrationVelocity = 6f;
            Physics.reuseCollisionCallbacks = true;
            Physics.IgnoreLayerCollision(6, 7, true);
            Physics.IgnoreLayerCollision(6, 8, true);
            Physics.IgnoreLayerCollision(6, 9, true);
            Physics.IgnoreLayerCollision(9, 9, true);
            ConfigureTimeManagerAsset();
        }

        private static void ConfigureTimeManagerAsset()
        {
            var assets = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TimeManager.asset");
            if (assets == null || assets.Length == 0) return;
            var serialized = new SerializedObject(assets[0]);
            var fixedTimestep = serialized.FindProperty("Fixed Timestep");
            if (fixedTimestep != null)
            {
                var count = fixedTimestep.FindPropertyRelative("m_Count");
                var rate = fixedTimestep.FindPropertyRelative("m_Rate");
                var denominator = rate?.FindPropertyRelative("m_Denominator");
                var numerator = rate?.FindPropertyRelative("m_Numerator");
                if (count != null) count.longValue = 1;
                if (denominator != null) denominator.intValue = 1;
                if (numerator != null) numerator.intValue = 60;
            }
            var maximum = serialized.FindProperty("Maximum Allowed Timestep");
            if (maximum != null) maximum.floatValue = 1f / 15f;
            serialized.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void NormalizeAndSignMacBundle(string appPath)
        {
            const string executableName = "PonoMarbleRun";
            var contents = Path.Combine(appPath, "Contents");
            var macDirectory = Path.Combine(contents, "MacOS");
            var executables = Directory.GetFiles(macDirectory);
            if (executables.Length != 1)
                throw new InvalidOperationException("Expected one macOS executable, found " + executables.Length + ".");

            var normalizedExecutable = Path.Combine(macDirectory, executableName);
            if (!string.Equals(executables[0], normalizedExecutable, StringComparison.Ordinal))
            {
                if (File.Exists(normalizedExecutable)) File.Delete(normalizedExecutable);
                File.Move(executables[0], normalizedExecutable);
            }

            var infoPlistPath = Path.Combine(contents, "Info.plist");
            RunProcess("/usr/bin/plutil", "-replace", "CFBundleExecutable", "-string", executableName,
                infoPlistPath);

            var frameworks = Path.Combine(contents, "Frameworks");
            foreach (var dylib in Directory.GetFiles(frameworks, "*.dylib"))
                RunProcess("/usr/bin/codesign", "--force", "--sign", "-", "--timestamp=none", dylib);
            RunProcess("/usr/bin/codesign", "--force", "--sign", "-", "--timestamp=none", normalizedExecutable);
            RunProcess("/usr/bin/codesign", "--force", "--sign", "-", "--timestamp=none", appPath);
            RunProcess("/usr/bin/codesign", "--verify", "--deep", "--strict", "--verbose=4", appPath);
            Debug.Log("macOS bundle normalized and ad-hoc signature verified: " + appPath);
        }

        private static void RunProcess(string executable, params string[] arguments)
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = executable,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };
            foreach (var argument in arguments) startInfo.ArgumentList.Add(argument);
            using var process = Process.Start(startInfo);
            if (process == null) throw new InvalidOperationException("Could not start " + executable + ".");
            var output = process.StandardOutput.ReadToEnd();
            var error = process.StandardError.ReadToEnd();
            process.WaitForExit();
            if (!string.IsNullOrWhiteSpace(output)) Debug.Log(output.Trim());
            if (process.ExitCode != 0)
                throw new InvalidOperationException(executable + " failed: " + error.Trim());
            if (!string.IsNullOrWhiteSpace(error)) Debug.Log(error.Trim());
        }

        private static void ConfigureLayers()
        {
            var assets = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset");
            if (assets == null || assets.Length == 0)
                throw new InvalidOperationException("TagManager asset is unavailable.");
            var serialized = new SerializedObject(assets[0]);
            var layers = serialized.FindProperty("layers");
            SetLayer(layers, 6, "PlacementQuery");
            SetLayer(layers, 7, "CourseGeometry");
            SetLayer(layers, 8, "Board");
            SetLayer(layers, 9, "Marble");
            serialized.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void EnsureBaseMaterial()
        {
            EnsureFolder("Assets/Resources/Materials");
            var material = AssetDatabase.LoadAssetAtPath<Material>(BaseMaterialPath);
            if (material != null) return;
            var shader = Shader.Find("Standard");
            if (shader == null) throw new InvalidOperationException("Built-in Standard shader is unavailable.");
            material = new Material(shader)
            {
                name = "ToyBase",
                color = Color.white,
                enableInstancing = true
            };
            material.SetFloat("_Glossiness", 0.2f);
            AssetDatabase.CreateAsset(material, BaseMaterialPath);
        }

        private static void SetLayer(SerializedProperty layers, int index, string value)
        {
            var element = layers.GetArrayElementAtIndex(index);
            if (string.IsNullOrEmpty(element.stringValue) || element.stringValue == value)
            {
                element.stringValue = value;
                return;
            }
            throw new InvalidOperationException("Unity layer " + index + " is already used by " + element.stringValue);
        }

        private static void EnsureReady()
        {
            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null)
                RebuildScene();
            ConfigureProjectSettings();
            VerifyProject();
        }

        private static void Build(BuildTarget target, string output)
        {
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ScenePath },
                locationPathName = output,
                target = target,
                options = BuildOptions.None
            });
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new InvalidOperationException(
                    target + " build failed: " + report.summary.result + ", "
                    + report.summary.totalErrors + " error(s).");
            }
            Debug.Log(target + " build succeeded: " + output + " (" + report.summary.totalSize + " bytes)");
        }

        private static int RequireAsset<T>(string path) where T : UnityEngine.Object
        {
            if (AssetDatabase.LoadAssetAtPath<T>(path) != null) return 0;
            Debug.LogError("Missing required asset: " + path);
            return 1;
        }

        private static void EnsureFolder(string path)
        {
            var parts = path.Split('/');
            var current = parts[0];
            for (var i = 1; i < parts.Length; i++)
            {
                var next = current + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(next)) AssetDatabase.CreateFolder(current, parts[i]);
                current = next;
            }
        }

        private static string ReadCommandLineValue(string key)
        {
            var arguments = Environment.GetCommandLineArgs();
            for (var i = 0; i < arguments.Length - 1; i++)
            {
                if (string.Equals(arguments[i], key, StringComparison.OrdinalIgnoreCase))
                    return arguments[i + 1];
            }
            return null;
        }
    }
}
