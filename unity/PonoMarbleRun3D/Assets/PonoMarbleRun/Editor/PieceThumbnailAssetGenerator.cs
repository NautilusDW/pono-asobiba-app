using System;
using System.Collections.Generic;
using System.IO;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Gameplay;
using Pono.MarbleRun3D.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Pono.MarbleRun3D.Editor
{
    /// <summary>
    /// Bakes small transparent UI pictures from the same geometry factory used by
    /// the game. Run this after changing a piece's shape or toy materials.
    /// </summary>
    public static class PieceThumbnailAssetGenerator
    {
        public const string OutputFolder = "Assets/PonoMarbleRun/Resources/PieceThumbnails";
        public const int TextureSize = 192;
        private const int PreviewLayer = 31;

        [MenuItem("Pono/Marble Run/Rebuild Piece Pictures")]
        public static void GenerateAll()
        {
            Directory.CreateDirectory(OutputFolder);
            var previousActiveScene = SceneManager.GetActiveScene();
            if (string.IsNullOrEmpty(previousActiveScene.path))
            {
                if (!Application.isBatchMode)
                    throw new InvalidOperationException("Save the open scene before rebuilding piece pictures.");
                previousActiveScene = EditorSceneManager.OpenScene(
                    MarbleRunProjectSetup.ScenePath,
                    OpenSceneMode.Single);
            }
            var previewScene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Additive);
            SceneManager.SetActiveScene(previewScene);
            var previewRoot = default(GameObject);
            var cameraObject = default(GameObject);
            var keyLightObject = default(GameObject);
            var fillLightObject = default(GameObject);
            ToyMaterialLibrary materials = null;
            RenderTexture target = null;

            try
            {
                previewRoot = CreateInScene(previewScene, "PiecePicturePreview");
                cameraObject = CreateInScene(previewScene, "PiecePictureCamera", typeof(Camera));
                keyLightObject = CreateInScene(previewScene, "PiecePictureKey", typeof(Light));
                fillLightObject = CreateInScene(previewScene, "PiecePictureFill", typeof(Light));

                var camera = ConfigureCamera(cameraObject.GetComponent<Camera>());
                ConfigureLight(keyLightObject.GetComponent<Light>(), new Vector3(42f, -32f, 0f), 1.05f);
                ConfigureLight(fillLightObject.GetComponent<Light>(), new Vector3(28f, 142f, 8f), 0.48f);
                materials = new ToyMaterialLibrary();
                target = CreateRenderTarget();
                camera.targetTexture = target;

                foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
                {
                    var view = WoodenPieceFactory.Create(
                        new PieceRecord
                        {
                            id = "thumbnail-" + kind,
                            kind = kind,
                            pose = new GridPose(0, 0)
                        },
                        materials,
                        previewRoot.transform,
                        false,
                        PreviewLayer,
                        PreviewLayer);
                    SetLayerRecursively(view.gameObject, PreviewLayer);
                    DisableSimulation(view.gameObject);
                    PresentPiece(view.transform, kind);

                    if (!TryCalculateRendererBounds(view.gameObject, out var bounds))
                        throw new InvalidOperationException("No visible geometry for " + kind + ".");

                    Frame(camera, bounds, kind);
                    camera.Render();
                    SavePng(kind, target);
                    UnityEngine.Object.DestroyImmediate(view.gameObject);
                }

                camera.targetTexture = null;
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
                ConfigureImporters();
                AssetDatabase.SaveAssets();
                Debug.Log("Rebuilt " + Enum.GetValues(typeof(MarblePieceKind)).Length
                    + " marble-run piece pictures in " + OutputFolder + ".");
            }
            finally
            {
                if (cameraObject != null) cameraObject.GetComponent<Camera>().targetTexture = null;
                if (target != null)
                {
                    target.Release();
                    UnityEngine.Object.DestroyImmediate(target);
                }
                materials?.Dispose();
                if (previousActiveScene.IsValid() && previousActiveScene.isLoaded)
                    SceneManager.SetActiveScene(previousActiveScene);
                if (previewScene.IsValid() && previewScene.isLoaded)
                    EditorSceneManager.CloseScene(previewScene, true);
            }
        }

        public static void GenerateFromCommandLine()
        {
            GenerateAll();
        }

        public static float CalculateOrthographicSize(
            Camera camera,
            Bounds bounds,
            float padding = 1.13f)
        {
            if (camera == null) throw new ArgumentNullException(nameof(camera));
            var halfWidth = 0f;
            var halfHeight = 0f;
            foreach (var corner in BoundsCorners(bounds))
            {
                var offset = corner - bounds.center;
                halfWidth = Mathf.Max(halfWidth, Mathf.Abs(Vector3.Dot(offset, camera.transform.right)));
                halfHeight = Mathf.Max(halfHeight, Mathf.Abs(Vector3.Dot(offset, camera.transform.up)));
            }
            var aspect = Mathf.Max(0.1f, camera.aspect);
            return Mathf.Max(0.72f, Mathf.Max(halfHeight, halfWidth / aspect) * Mathf.Max(1f, padding));
        }

        private static GameObject CreateInScene(Scene scene, string name, params Type[] components)
        {
            var gameObject = new GameObject(name, components) { hideFlags = HideFlags.DontSave };
            gameObject.layer = PreviewLayer;
            SceneManager.MoveGameObjectToScene(gameObject, scene);
            return gameObject;
        }

        private static Camera ConfigureCamera(Camera camera)
        {
            camera.hideFlags = HideFlags.DontSave;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0f, 0f, 0f, 0f);
            camera.cullingMask = 1 << PreviewLayer;
            camera.orthographic = true;
            camera.aspect = 1f;
            camera.nearClipPlane = 0.05f;
            camera.farClipPlane = 80f;
            camera.allowHDR = false;
            camera.allowMSAA = true;
            camera.enabled = false;
            return camera;
        }

        private static void ConfigureLight(Light light, Vector3 euler, float intensity)
        {
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.95f, 0.88f);
            light.intensity = intensity;
            light.shadows = LightShadows.None;
            light.cullingMask = 1 << PreviewLayer;
            light.transform.rotation = Quaternion.Euler(euler);
        }

        private static RenderTexture CreateRenderTarget()
        {
            var target = new RenderTexture(TextureSize, TextureSize, 24, RenderTextureFormat.ARGB32,
                RenderTextureReadWrite.sRGB)
            {
                name = "PiecePictureTarget",
                antiAliasing = 4,
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.HideAndDontSave
            };
            target.Create();
            return target;
        }

        private static void PresentPiece(Transform root, MarblePieceKind kind)
        {
            root.position = Vector3.zero;
            root.rotation = Quaternion.Euler(0f, PresentationYaw(kind), 0f);
        }

        private static float PresentationYaw(MarblePieceKind kind)
        {
            switch (kind)
            {
                case MarblePieceKind.Curve:
                case MarblePieceKind.ClearCurve:
                    return -12f;
                case MarblePieceKind.Splitter:
                case MarblePieceKind.Funnel:
                case MarblePieceKind.Spinner:
                    return 18f;
                case MarblePieceKind.Seesaw:
                    return -8f;
                default:
                    return 0f;
            }
        }

        private static void Frame(Camera camera, Bounds bounds, MarblePieceKind kind)
        {
            var tall = kind == MarblePieceKind.Helix
                || kind == MarblePieceKind.Lift
                || kind == MarblePieceKind.Tornado
                || kind == MarblePieceKind.Elevator;
            var direction = tall
                ? new Vector3(1.16f, 0.64f, -1.42f).normalized
                : new Vector3(1.16f, 0.88f, -1.42f).normalized;
            var focus = bounds.center + Vector3.up * (tall ? bounds.extents.y * 0.04f : 0f);
            camera.transform.position = focus + direction * 16f;
            camera.transform.LookAt(focus, Vector3.up);
            camera.orthographicSize = CalculateOrthographicSize(camera, bounds, tall ? 1.10f : 1.14f);
        }

        private static bool TryCalculateRendererBounds(GameObject root, out Bounds bounds)
        {
            var renderers = root.GetComponentsInChildren<Renderer>(true);
            var found = false;
            bounds = default;
            for (var i = 0; i < renderers.Length; i++)
            {
                var renderer = renderers[i];
                if (!renderer.gameObject.activeInHierarchy || !renderer.enabled) continue;
                if (!found)
                {
                    bounds = renderer.bounds;
                    found = true;
                }
                else
                {
                    bounds.Encapsulate(renderer.bounds);
                }
            }
            return found;
        }

        private static IEnumerable<Vector3> BoundsCorners(Bounds bounds)
        {
            var min = bounds.min;
            var max = bounds.max;
            yield return new Vector3(min.x, min.y, min.z);
            yield return new Vector3(min.x, min.y, max.z);
            yield return new Vector3(min.x, max.y, min.z);
            yield return new Vector3(min.x, max.y, max.z);
            yield return new Vector3(max.x, min.y, min.z);
            yield return new Vector3(max.x, min.y, max.z);
            yield return new Vector3(max.x, max.y, min.z);
            yield return new Vector3(max.x, max.y, max.z);
        }

        private static void DisableSimulation(GameObject root)
        {
            foreach (var collider in root.GetComponentsInChildren<Collider>(true)) collider.enabled = false;
            foreach (var rigidbody in root.GetComponentsInChildren<Rigidbody>(true))
            {
                rigidbody.isKinematic = true;
                rigidbody.detectCollisions = false;
            }
            foreach (var behaviour in root.GetComponentsInChildren<MonoBehaviour>(true)) behaviour.enabled = false;
        }

        private static void SetLayerRecursively(GameObject root, int layer)
        {
            root.layer = layer;
            foreach (Transform child in root.transform) SetLayerRecursively(child.gameObject, layer);
        }

        private static void SavePng(MarblePieceKind kind, RenderTexture target)
        {
            var previous = RenderTexture.active;
            var texture = new Texture2D(TextureSize, TextureSize, TextureFormat.RGBA32, false, false)
            {
                name = kind + " Piece Picture",
                hideFlags = HideFlags.HideAndDontSave
            };
            try
            {
                RenderTexture.active = target;
                texture.ReadPixels(new Rect(0f, 0f, TextureSize, TextureSize), 0, 0, false);
                texture.Apply(false, false);
                File.WriteAllBytes(Path.Combine(OutputFolder, kind + ".png"), texture.EncodeToPNG());
            }
            finally
            {
                RenderTexture.active = previous;
                UnityEngine.Object.DestroyImmediate(texture);
            }
        }

        private static void ConfigureImporters()
        {
            foreach (MarblePieceKind kind in Enum.GetValues(typeof(MarblePieceKind)))
            {
                var path = OutputFolder + "/" + kind + ".png";
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                if (importer == null) throw new InvalidOperationException("Could not import " + path + ".");
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.spritePixelsPerUnit = 100f;
                importer.alphaSource = TextureImporterAlphaSource.FromInput;
                importer.alphaIsTransparency = true;
                importer.sRGBTexture = true;
                importer.mipmapEnabled = false;
                importer.isReadable = false;
                importer.wrapMode = TextureWrapMode.Clamp;
                importer.filterMode = FilterMode.Bilinear;
                importer.maxTextureSize = 256;
                importer.textureCompression = TextureImporterCompression.CompressedHQ;
                importer.SaveAndReimport();
            }
        }
    }
}
