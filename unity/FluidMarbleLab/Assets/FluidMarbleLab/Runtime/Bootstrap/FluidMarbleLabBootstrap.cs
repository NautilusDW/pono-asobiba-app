using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    public sealed class FluidMarbleLabBootstrap : MonoBehaviour
    {
        [Header("Scene assets")]
        [SerializeField] private ComputeShader fluidComputeShader;
        [SerializeField] private Material fluidSurfaceMaterial;
        [SerializeField] private Camera mainCamera;
        [SerializeField] private Renderer fluidSurfaceRenderer;
        [SerializeField] private Transform worldRoot;
        [SerializeField] private Canvas uiCanvas;

        private readonly List<Material> ownedMaterials = new List<Material>(4);
        private bool bootstrapped;
        private Transform trackRoot;
        private Transform marbleRoot;
        private LabViewport viewport;
        private LabModeController modeController;
        private FluidSimulationController simulation;
        private TrackEditor trackEditor;
        private MarbleSpawner marbleSpawner;
        private GoalZone goalZone;
        private LabPointerRouter pointerRouter;
        private LabHud hud;
        private Coroutine welcomeInkCoroutine;

        public LabViewport Viewport => viewport;
        public LabModeController ModeController => modeController;
        public FluidSimulationController Simulation => simulation;
        public TrackEditor TrackEditor => trackEditor;
        public MarbleSpawner MarbleSpawner => marbleSpawner;
        public GoalZone Goal => goalZone;

        public void ConfigureSceneAssets(
            ComputeShader computeShader,
            Material surfaceMaterial,
            Camera camera,
            Renderer surfaceRenderer,
            Transform sceneWorldRoot,
            Canvas canvas)
        {
            fluidComputeShader = computeShader;
            fluidSurfaceMaterial = surfaceMaterial;
            mainCamera = camera;
            fluidSurfaceRenderer = surfaceRenderer;
            worldRoot = sceneWorldRoot;
            uiCanvas = canvas;
        }

        private void Awake()
        {
            Bootstrap();
        }

        public void Bootstrap()
        {
            if (bootstrapped)
            {
                return;
            }
            bootstrapped = true;

            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Time.fixedDeltaTime = 1f / 60f;
            Physics2D.gravity = new Vector2(0f, -9.2f);

            EnsureCamera();
            EnsureWorldRoot();
            EnsureSurface();
            EnsureCanvasAndEventSystem();

            viewport = GetOrAdd<LabViewport>(gameObject);
            viewport.Configure(mainCamera, 10f);
            ScaleSurfaceToViewport();

            modeController = GetOrAdd<LabModeController>(gameObject);
            simulation = GetOrAdd<FluidSimulationController>(gameObject);
            simulation.Configure(fluidComputeShader, fluidSurfaceRenderer);

            trackRoot = EnsureChild(worldRoot, "CourseRoot");
            marbleRoot = EnsureChild(worldRoot, "MarbleRoot");
            trackEditor = GetOrAdd<TrackEditor>(gameObject);
            trackEditor.Configure(viewport, modeController);
            CreateWorldBounds();
            CreateInitialTrack();
            CreateGoal();

            marbleSpawner = GetOrAdd<MarbleSpawner>(gameObject);
            marbleSpawner.Configure(viewport, simulation, modeController, marbleRoot);

            pointerRouter = GetOrAdd<LabPointerRouter>(gameObject);
            pointerRouter.Configure(viewport, simulation, trackEditor, modeController);

            hud = GetOrAdd<LabHud>(uiCanvas.gameObject);
            hud.Configure(this, modeController, trackEditor, marbleSpawner, simulation, goalZone);
            modeController.NotifyInitialMode();

            welcomeInkCoroutine = StartCoroutine(SeedWelcomeInk());
            var capturePath = ReadCommandLineValue("-capturePath");
            if (!string.IsNullOrWhiteSpace(capturePath))
            {
                StartCoroutine(CaptureAndQuit(capturePath));
            }
        }

        public void ResetLab()
        {
            if (welcomeInkCoroutine != null)
            {
                StopCoroutine(welcomeInkCoroutine);
                welcomeInkCoroutine = null;
            }
            simulation.ResetSimulation();
            trackEditor.ResetAll();
            marbleSpawner.ResetMarbles();
            goalZone.ResetScore();
        }

        private void EnsureCamera()
        {
            if (mainCamera == null)
            {
                mainCamera = Camera.main;
            }
            if (mainCamera == null)
            {
                var cameraObject = new GameObject("MainCamera");
                cameraObject.tag = "MainCamera";
                mainCamera = cameraObject.AddComponent<Camera>();
            }

            mainCamera.transform.SetPositionAndRotation(new Vector3(0f, 0f, -10f), Quaternion.identity);
            mainCamera.orthographic = true;
            mainCamera.orthographicSize = 5f;
            mainCamera.clearFlags = CameraClearFlags.SolidColor;
            mainCamera.backgroundColor = new Color(0.95f, 0.93f, 0.84f);
            mainCamera.allowHDR = false;
            mainCamera.allowMSAA = true;
        }

        private void EnsureWorldRoot()
        {
            if (worldRoot != null)
            {
                return;
            }
            var existing = GameObject.Find("WorldRoot");
            if (existing != null)
            {
                worldRoot = existing.transform;
                return;
            }
            worldRoot = new GameObject("WorldRoot").transform;
        }

        private void EnsureSurface()
        {
            if (fluidSurfaceRenderer == null)
            {
                var existing = GameObject.Find("FluidSurface");
                if (existing != null)
                {
                    fluidSurfaceRenderer = existing.GetComponent<Renderer>();
                }
            }
            if (fluidSurfaceRenderer == null)
            {
                var surface = GameObject.CreatePrimitive(PrimitiveType.Quad);
                surface.name = "FluidSurface";
                surface.transform.SetParent(worldRoot, false);
                surface.transform.localPosition = new Vector3(0f, 0f, 2f);
                var collider = surface.GetComponent<Collider>();
                if (collider != null) Destroy(collider);
                fluidSurfaceRenderer = surface.GetComponent<Renderer>();
            }

            if (fluidSurfaceMaterial == null)
            {
                var shader = Shader.Find("Pono/FluidMarbleLab/FluidSurface");
                if (shader != null)
                {
                    fluidSurfaceMaterial = new Material(shader) { name = "Fluid Surface (Runtime Asset)" };
                    ownedMaterials.Add(fluidSurfaceMaterial);
                }
            }
            if (fluidSurfaceMaterial != null)
            {
                fluidSurfaceRenderer.sharedMaterial = fluidSurfaceMaterial;
            }
        }

        private void ScaleSurfaceToViewport()
        {
            if (fluidSurfaceRenderer == null || viewport == null)
            {
                return;
            }
            var size = viewport.WorldSize;
            fluidSurfaceRenderer.transform.position = new Vector3(viewport.WorldRect.center.x, viewport.WorldRect.center.y, 2f);
            fluidSurfaceRenderer.transform.localScale = new Vector3(size.x + 0.5f, size.y + 0.5f, 1f);
        }

        private void EnsureCanvasAndEventSystem()
        {
            if (uiCanvas == null)
            {
                uiCanvas = FindFirstObjectByType<Canvas>();
            }
            if (uiCanvas == null)
            {
                var canvasObject = new GameObject("Canvas", typeof(RectTransform));
                uiCanvas = canvasObject.AddComponent<Canvas>();
                uiCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvasObject.AddComponent<GraphicRaycaster>();
                var scaler = canvasObject.AddComponent<CanvasScaler>();
                scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1280f, 720f);
                scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
                scaler.matchWidthOrHeight = 0.5f;
            }

            if (EventSystem.current == null)
            {
                var eventSystemObject = new GameObject("EventSystem");
                eventSystemObject.AddComponent<EventSystem>();
                var inputModule = eventSystemObject.AddComponent<InputSystemUIInputModule>();
                inputModule.AssignDefaultActions();
            }
        }

        private void CreateWorldBounds()
        {
            var boundsRoot = EnsureChild(worldRoot, "WorldBounds");
            if (boundsRoot.childCount > 0)
            {
                return;
            }

            var rect = viewport.GameplayRect;
            const float thickness = 0.42f;
            CreateWall(boundsRoot, "Left", new Vector2(rect.xMin - thickness * 0.5f, rect.center.y), new Vector2(thickness, rect.height + thickness * 2f));
            CreateWall(boundsRoot, "Right", new Vector2(rect.xMax + thickness * 0.5f, rect.center.y), new Vector2(thickness, rect.height + thickness * 2f));
            CreateWall(boundsRoot, "Top", new Vector2(rect.center.x, rect.yMax + thickness * 0.5f), new Vector2(rect.width + thickness * 2f, thickness));
            CreateWall(boundsRoot, "Bottom", new Vector2(rect.center.x, rect.yMin - thickness * 0.5f), new Vector2(rect.width + thickness * 2f, thickness));

            var borderObject = new GameObject("Border");
            borderObject.transform.SetParent(boundsRoot, false);
            var line = borderObject.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.loop = true;
            line.positionCount = 4;
            line.widthMultiplier = 0.10f;
            line.numCornerVertices = 6;
            line.sortingOrder = 4;
            var visualRect = viewport.WorldRect;
            line.SetPosition(0, new Vector3(visualRect.xMin, visualRect.yMin, 0f));
            line.SetPosition(1, new Vector3(visualRect.xMin, visualRect.yMax, 0f));
            line.SetPosition(2, new Vector3(visualRect.xMax, visualRect.yMax, 0f));
            line.SetPosition(3, new Vector3(visualRect.xMax, visualRect.yMin, 0f));
            line.sharedMaterial = CreateSolidMaterial("World Border", new Color(0.14f, 0.12f, 0.20f, 0.75f));
        }

        private static void CreateWall(Transform parent, string name, Vector2 position, Vector2 size)
        {
            var wall = new GameObject(name);
            wall.transform.SetParent(parent, false);
            wall.transform.position = position;
            var collider = wall.AddComponent<BoxCollider2D>();
            collider.size = size;
        }

        private void CreateInitialTrack()
        {
            if (trackRoot.childCount > 0)
            {
                var existing = trackRoot.GetComponentsInChildren<TrackPiece>();
                for (var i = 0; i < existing.Length; i++) trackEditor.Register(existing[i]);
                return;
            }

            CreateTrackPiece(
                "ramp-a",
                new[] { new Vector2(-1.35f, 0f), new Vector2(1.35f, 0f) },
                viewport.GameplayUvToWorld(new Vector2(0.24f, 0.72f)),
                -14f,
                new Color(0.18f, 0.70f, 0.91f));

            CreateTrackPiece(
                "curve-a",
                CreateArcPath(1.22f, 185f, 278f, 9),
                viewport.GameplayUvToWorld(new Vector2(0.48f, 0.60f)),
                0f,
                new Color(0.98f, 0.55f, 0.20f));

            CreateTrackPiece(
                "ramp-b",
                new[] { new Vector2(-1.45f, 0f), new Vector2(1.45f, 0f) },
                viewport.GameplayUvToWorld(new Vector2(0.63f, 0.42f)),
                12f,
                new Color(0.55f, 0.39f, 0.91f));

            CreateTrackPiece(
                "funnel",
                new[]
                {
                    new Vector2(-1.15f, 0.65f),
                    new Vector2(-0.28f, -0.15f),
                    new Vector2(0f, -0.32f),
                    new Vector2(0.28f, -0.15f),
                    new Vector2(1.15f, 0.65f)
                },
                viewport.GameplayUvToWorld(new Vector2(0.77f, 0.24f)),
                0f,
                new Color(0.25f, 0.78f, 0.57f));

            CreateTrackPiece(
                "bumper",
                CreateArcPath(0.78f, 18f, 162f, 8),
                viewport.GameplayUvToWorld(new Vector2(0.37f, 0.22f)),
                0f,
                new Color(0.94f, 0.34f, 0.53f));
        }

        private void CreateTrackPiece(string id, Vector2[] path, Vector2 position, float rotation, Color color)
        {
            var pieceObject = new GameObject(id);
            pieceObject.transform.SetParent(trackRoot, false);
            pieceObject.transform.SetPositionAndRotation(
                new Vector3(position.x, position.y, 0f),
                Quaternion.Euler(0f, 0f, rotation));
            pieceObject.AddComponent<Rigidbody2D>();
            pieceObject.AddComponent<EdgeCollider2D>();
            var piece = pieceObject.AddComponent<TrackPiece>();
            piece.Configure(id, path, color);
            trackEditor.Register(piece);
        }

        private void CreateGoal()
        {
            var existing = worldRoot.Find("Goal");
            if (existing != null)
            {
                goalZone = existing.GetComponent<GoalZone>();
                return;
            }
            var goalObject = new GameObject("Goal");
            goalObject.transform.SetParent(worldRoot, false);
            var position = viewport.GameplayUvToWorld(new Vector2(0.86f, 0.18f));
            goalObject.transform.position = new Vector3(position.x, position.y, 0f);
            goalObject.AddComponent<CircleCollider2D>();
            goalZone = goalObject.AddComponent<GoalZone>();
            goalZone.Configure(0.72f, new Color(1f, 0.76f, 0.16f, 0.95f));
        }

        private IEnumerator SeedWelcomeInk()
        {
            yield return null;
            var colors = new[]
            {
                new Color(0.12f, 0.66f, 0.93f),
                new Color(0.94f, 0.26f, 0.52f),
                new Color(0.99f, 0.61f, 0.12f)
            };
            for (var i = 0; i < 42; i++)
            {
                var t = i / 41f;
                var uv = new Vector2(
                    Mathf.Lerp(0.16f, 0.82f, t),
                    0.52f + Mathf.Sin(t * Mathf.PI * 3.2f) * 0.17f);
                var tangent = new Vector2(0.34f, Mathf.Cos(t * Mathf.PI * 3.2f) * 0.28f);
                simulation.Inject(uv, tangent, colors[(i / 14) % colors.Length], 0.052f);
                if (i % 3 == 0) yield return null;
            }
            welcomeInkCoroutine = null;
        }

        private IEnumerator CaptureAndQuit(string capturePath)
        {
            for (var i = 0; i < 150; i++)
            {
                yield return null;
            }

            var directory = Path.GetDirectoryName(capturePath);
            if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
            ScreenCapture.CaptureScreenshot(capturePath, 1);
            for (var i = 0; i < 90; i++)
            {
                yield return null;
            }
            Application.Quit(0);
        }

        private Material CreateSolidMaterial(string label, Color color)
        {
            var shader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default");
            var material = new Material(shader) { name = label };
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            material.color = color;
            ownedMaterials.Add(material);
            return material;
        }

        private static Vector2[] CreateArcPath(float radius, float startDegrees, float endDegrees, int segments)
        {
            var path = new Vector2[Mathf.Max(2, segments)];
            for (var i = 0; i < path.Length; i++)
            {
                var t = i / (float)(path.Length - 1);
                var radians = Mathf.Lerp(startDegrees, endDegrees, t) * Mathf.Deg2Rad;
                path[i] = new Vector2(Mathf.Cos(radians), Mathf.Sin(radians)) * radius;
            }
            return path;
        }

        private static Transform EnsureChild(Transform parent, string name)
        {
            var existing = parent.Find(name);
            if (existing != null)
            {
                return existing;
            }
            var child = new GameObject(name).transform;
            child.SetParent(parent, false);
            return child;
        }

        private static T GetOrAdd<T>(GameObject target) where T : Component
        {
            return target.TryGetComponent<T>(out var component) ? component : target.AddComponent<T>();
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

        private void OnDestroy()
        {
            for (var i = 0; i < ownedMaterials.Count; i++)
            {
                if (ownedMaterials[i] != null) Destroy(ownedMaterials[i]);
            }
            ownedMaterials.Clear();
        }
    }
}
