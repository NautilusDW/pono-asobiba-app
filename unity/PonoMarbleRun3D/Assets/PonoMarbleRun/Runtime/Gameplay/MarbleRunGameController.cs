using System;
using System.Collections;
using System.Collections.Generic;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.UI;
using UnityEngine;
using UnityEngine.EventSystems;

namespace Pono.MarbleRun3D.Gameplay
{
    public enum MarbleRunState
    {
        Menu,
        Editing,
        Running,
        Paused,
        Celebrating
    }

    [DisallowMultipleComponent]
    public sealed class MarbleRunGameController : MonoBehaviour
    {
        private const int MaximumPieces = 96;
        private const int MaximumMarbles = 8;
        private const float MarbleReleaseInterval = 0.36f;
        private const float PointerDragThreshold = 10f;
        private readonly Dictionary<string, PieceView> _pieceViews = new Dictionary<string, PieceView>();
        private readonly CourseHistory _history = new CourseHistory(50);
        private readonly List<MarbleRuntime> _marbles = new List<MarbleRuntime>();
        private readonly List<Rigidbody> _marbleBodies = new List<Rigidbody>();
        private readonly Vector3[] _cameraFollowPositions = new Vector3[MaximumMarbles];
        private readonly Vector3[] _cameraFollowVelocities = new Vector3[MaximumMarbles];
        private readonly float[] _cameraFollowAxis = new float[MaximumMarbles];

        private ToyMaterialLibrary _materials;
        private ToyAudio _audio;
        private MarbleRunUi _ui;
        private OrbitCameraController _orbit;
        private Transform _pieceRoot;
        private Transform _worldRoot;
        private Camera _camera;
        private CourseData _course;
        private ModeDefinition _mode;
        private PieceView _ghost;
        private PlacementResult _ghostResult;
        private MarblePieceKind? _placingKind;
        private int _placingQuarterTurns;
        private int _placingLevel;
        private int _activePlacementLevel;
        private string _movingPieceId;
        private string _selectedPieceId;
        private bool _externalPaletteDrag;
        private bool _pointerDown;
        private bool _cameraDragging;
        private bool _existingDragCandidate;
        private bool _existingDragActive;
        private int _pointerFingerId = -1;
        private Vector2 _pointerStart;
        private Vector2 _pointerLast;
        private float _pinchDistance;
        private float _clearConfirmDeadline;
        private int _activeMarbleCount;
        private int _marblesAtGoal;
        private bool _goalCelebrationRaised;
        private MarbleRunState _stateBeforePause;
        private SimulationMode _simulationModeBeforePause;
        private int _tutorialStep;
        private int _placementLayer;
        private int _courseLayer;
        private int _boardLayer;
        private int _marbleLayer;
        private Coroutine _celebrationRoutine;
        private Coroutine _launchRoutine;
        private Coroutine _goalFinishRoutine;
        private Light _sunLight;
        private GameObject _goalLightObject;

        private sealed class MarbleRuntime
        {
            public int Index;
            public GameObject Object;
            public Rigidbody Body;
            public TrailRenderer Trail;
            public readonly MarbleSafetyModel Safety = new MarbleSafetyModel();
            public Coroutine ResetRoutine;
            public bool ReachedGoal;
        }

        public MarbleRunState State { get; private set; } = MarbleRunState.Menu;
        public CourseData Course => _course?.Clone();
        public ModeDefinition CurrentMode => _mode;
        public Rigidbody MarbleBody => _marbles.Count > 0 ? _marbles[0].Body : null;
        public IReadOnlyList<Rigidbody> MarbleBodies => _marbleBodies;
        public bool IsPaused => State == MarbleRunState.Paused;
        public bool IsCameraFollowing => _orbit != null && _orbit.IsFollowing;
        public int PieceCount => _course?.pieces.Count ?? 0;
        public int ActiveMarbleCount => _activeMarbleCount;
        public int MarblesAtGoal => _marblesAtGoal;
        public int ActivePlacementLevel => _activePlacementLevel;
        public string SelectedPieceId => _selectedPieceId ?? string.Empty;
        public IReadOnlyDictionary<string, PieceView> PieceViews => _pieceViews;
        public OrbitCameraController OrbitCamera => _orbit;
        public MarbleRunUi Ui => _ui;
        public int TutorialStep => _tutorialStep;
        public bool SuppressApplicationPauseForQa { get; set; }
        public event Action<bool> CameraFollowChanged;

        private void Awake()
        {
            ConfigurePhysics();
            ResolveLayers();
            _materials = new ToyMaterialLibrary();
            _audio = gameObject.AddComponent<ToyAudio>();
            BuildWorld();
            BuildCamera();
            BuildMarblePool();
            BuildUi();
            ShowMenu();
        }

        private void Update()
        {
            if (State == MarbleRunState.Editing)
            {
                UpdateBuilderInput();
            }
            else if (State == MarbleRunState.Running
                     || State == MarbleRunState.Paused
                     || State == MarbleRunState.Celebrating)
            {
                UpdatePreviewCameraInput();
            }

            if (IsCameraFollowing) UpdateCameraFollowTarget();
        }

        private void FixedUpdate()
        {
            if (State != MarbleRunState.Running)
            {
                return;
            }
            var stalled = false;
            var maximumSpeed = MarbleRunPhysicsProfile.MarbleMaximumSpeed;
            for (var i = 0; i < _activeMarbleCount; i++)
            {
                var marble = _marbles[i];
                if (!marble.Object.activeSelf || marble.ReachedGoal || marble.Body.isKinematic) continue;
                if (marble.Body.linearVelocity.sqrMagnitude > maximumSpeed * maximumSpeed)
                {
                    marble.Body.linearVelocity = marble.Body.linearVelocity.normalized * maximumSpeed;
                }
                var safetyEvent = marble.Safety.Tick(
                    marble.Body.position,
                    marble.Body.linearVelocity,
                    marble.Body.angularVelocity,
                    Time.fixedDeltaTime);
                if (safetyEvent == MarbleSafetyEvent.OutOfBounds && marble.ResetRoutine == null)
                {
                    marble.ResetRoutine = StartCoroutine(ResetAfterFall(marble));
                }
                else if (safetyEvent == MarbleSafetyEvent.Stalled)
                {
                    stalled = true;
                }
            }
            if (stalled)
            {
                _ui.SetStatus("たまが とまったよ", false);
                _ui.SetResetAttention(true);
            }
        }

        private void OnApplicationPause(bool paused)
        {
            if (SuppressApplicationPauseForQa) return;
            if (paused && State != MarbleRunState.Menu && State != MarbleRunState.Paused)
            {
                SetPaused(true);
            }
        }

        private void OnDestroy()
        {
            if (Time.timeScale == 0f) Time.timeScale = 1f;
            if (Physics.simulationMode == SimulationMode.Script)
                Physics.simulationMode = SimulationMode.FixedUpdate;
            AudioListener.pause = false;
            _materials?.Dispose();
        }

        public void ShowMenu()
        {
            CancelPlacement();
            StopMarbleCoroutines();
            StopAllCoroutines();
            _celebrationRoutine = null;
            if (_goalLightObject != null) Destroy(_goalLightObject);
            _goalLightObject = null;
            Time.timeScale = 1f;
            Physics.simulationMode = SimulationMode.FixedUpdate;
            AudioListener.pause = false;
            State = MarbleRunState.Menu;
            HideAllMarbles();
            ClearCourseViews();
            _course = null;
            _mode = null;
            _history.Clear();
            _selectedPieceId = null;
            _activePlacementLevel = 0;
            SetCameraFollow(false, true);
            ResetPreviewCameraInput();
            _orbit.ResetView();
            _ui.ShowMenu();
            _ui.SetCameraView(false);
            _audio.PlayClick();
        }

        public void StartMode(string modeId)
        {
            CancelPlacement();
            _mode = ChallengeCatalog.Get(modeId);
            _course = _mode.CreateInitialCourse();
            _history.Clear();
            _selectedPieceId = null;
            _tutorialStep = 0;
            _activePlacementLevel = HighestInitialLevel(_course);
            RebuildCourseViews();
            State = MarbleRunState.Editing;
            HideAllMarbles();
            SetCameraFollow(false, true);
            ResetPreviewCameraInput();
            _orbit.ResetView();
            _ui.ShowBuilder(_mode);
            _ui.SetCameraView(false);
            _ui.SetHeightLevel(_activePlacementLevel);
            _ui.SetInventory(_mode, _course);
            _ui.SetSelected(null);
            _ui.SetStatus(_mode.GuideText, false);
            UpdateTutorialGuide();
            _audio.PlayClick();
        }

        public void ChoosePart(MarblePieceKind kind)
        {
            if (State != MarbleRunState.Editing || _mode == null) return;
            if (_course.pieces.Count >= MaximumPieces)
            {
                _ui.SetStatus("ぶひんが いっぱいだよ", true);
                _audio.PlayGentleNo();
                return;
            }
            if (!_mode.CanAdd(kind, _course.pieces))
            {
                _ui.SetStatus("ぶひんを つかいきったよ", true);
                _audio.PlayGentleNo();
                return;
            }
            CancelPlacement();
            _placingKind = kind;
            _placingQuarterTurns = 0;
            _placingLevel = _activePlacementLevel;
            _selectedPieceId = null;
            _ui.SetSelected(null);
            _ui.SetStatus("ここに おこう", false);
            _audio.PlayClick();
        }

        public void ChangePlacementLevel(int delta)
        {
            if (State != MarbleRunState.Editing) return;
            var next = Mathf.Clamp(_activePlacementLevel + delta, PlacementSolver.MinLevel, PlacementSolver.MaxLevel);
            if (next == _activePlacementLevel)
            {
                _ui.SetStatus(delta > 0 ? "いちばん うえだよ" : "いちばん しただよ", false);
                _audio.PlayGentleNo();
                return;
            }
            _activePlacementLevel = next;
            if (_placingKind.HasValue)
            {
                _placingLevel = next;
                if (_ghost != null)
                    UpdateGhostAtWorld(_ghostResult.Pose.x, _ghostResult.Pose.z, _movingPieceId);
            }
            _ui.SetHeightLevel(next);
            _ui.SetStatus("たかさを かえたよ", false);
            _audio.PlayClick();
        }

        public void ToggleCameraAngle()
        {
            _orbit.ToggleTopView();
            _ui.SetCameraView(_orbit.IsTopView);
            _audio.PlayClick();
        }

        public void ToggleCameraFollow()
        {
            var canFollow = State == MarbleRunState.Running
                || (State == MarbleRunState.Paused && _stateBeforePause == MarbleRunState.Running);
            if (!canFollow) return;

            SetCameraFollow(!IsCameraFollowing, true);
            if (IsCameraFollowing)
            {
                UpdateCameraFollowTarget();
                _ui.SetStatus("たまを おいかけるよ", false);
            }
            else
            {
                _ui.SetStatus("コースを みわたすよ", false);
            }
            _audio.PlayClick();
        }

        public void BeginPaletteDrag(MarblePieceKind kind, Vector2 screenPosition)
        {
            ChoosePart(kind);
            if (!_placingKind.HasValue) return;
            _externalPaletteDrag = true;
            UpdateGhostAtScreen(screenPosition, null);
        }

        public void UpdatePaletteDrag(Vector2 screenPosition)
        {
            if (!_externalPaletteDrag || !_placingKind.HasValue) return;
            UpdateGhostAtScreen(screenPosition, null);
        }

        public void EndPaletteDrag(Vector2 screenPosition)
        {
            if (!_externalPaletteDrag) return;
            UpdateGhostAtScreen(screenPosition, null);
            CommitGhost();
            _externalPaletteDrag = false;
        }

        public void RotateSelection()
        {
            if (State != MarbleRunState.Editing) return;
            if (_placingKind.HasValue)
            {
                _placingQuarterTurns = GridPose.NormalizeQuarterTurns(_placingQuarterTurns + 1);
                if (_ghost != null)
                {
                    UpdateGhostAtWorld(_ghostResult.Pose.x, _ghostResult.Pose.z, _movingPieceId);
                }
                _audio.PlayClick();
                _ui.SetStatus("みぎに むきを かえたよ", false);
                AdvanceTutorialAfterRotate();
                return;
            }

            var piece = _course?.Find(_selectedPieceId);
            if (piece == null)
            {
                _ui.SetStatus("おいた ぶひんを おしてから くるっ", true);
                _audio.PlayGentleNo();
                return;
            }
            if (piece.locked)
            {
                _ui.SetStatus("この ぶひんは そのままだよ", true);
                _audio.PlayGentleNo();
                return;
            }
            var rotated = piece.pose.RotatedClockwise();
            var validation = PlacementSolver.Validate(piece.kind, rotated, _course.pieces, _mode, piece.id);
            if (!validation.IsValid)
            {
                _ui.SetStatus(validation.Reason, true);
                _audio.PlayGentleNo();
                return;
            }
            _history.Capture(_course);
            piece.pose = rotated;
            RebuildCourseViews();
            SelectPiece(piece.id);
            _audio.PlayPlace();
            _ui.SetStatus("くるっと みぎに まわしたよ", false);
            AdvanceTutorialAfterRotate();
        }

        public void DeleteSelection()
        {
            if (State != MarbleRunState.Editing) return;
            var piece = _course?.Find(_selectedPieceId);
            if (piece == null) return;
            if (piece.locked)
            {
                _ui.SetStatus("この ぶひんは そのままだよ", true);
                _audio.PlayGentleNo();
                return;
            }
            _history.Capture(_course);
            _course.pieces.Remove(piece);
            _selectedPieceId = null;
            _ui.SetSelected(null);
            RebuildCourseViews();
            _audio.PlayClick();
            _ui.SetStatus("けしたよ ひとつ もどせるよ", false);
        }

        public void Undo()
        {
            if (State != MarbleRunState.Editing) return;
            CancelPlacement();
            if (!_history.TryUndo(out var restored))
            {
                _ui.SetStatus("まだ もどすものが ないよ", false);
                return;
            }
            _course = restored;
            _selectedPieceId = null;
            _ui.SetSelected(null);
            RebuildCourseViews();
            _audio.PlayReset();
            _ui.SetStatus("ひとつ もどしたよ", false);
        }

        public void RequestClearAll()
        {
            if (State != MarbleRunState.Editing || _course == null) return;
            if (Time.unscaledTime > _clearConfirmDeadline)
            {
                _clearConfirmDeadline = Time.unscaledTime + 3f;
                _ui.SetStatus("もういちど おしてね", true);
                _audio.PlayGentleNo();
                return;
            }
            _clearConfirmDeadline = 0f;
            _history.Capture(_course);
            _course.pieces.RemoveAll(piece => !piece.locked);
            _selectedPieceId = null;
            _ui.SetSelected(null);
            RebuildCourseViews();
            _audio.PlayReset();
            _ui.SetStatus("ぜんぶ けしたよ もどせるよ", false);
        }

        public void SaveCourse()
        {
            if (_course == null || State != MarbleRunState.Editing) return;
            if (CourseStorage.Save(_course, out var error))
            {
                _ui.SetStatus("ほぞん できたよ", false);
                _audio.PlayPlace();
            }
            else
            {
                _ui.SetStatus(error, true);
                _audio.PlayGentleNo();
            }
        }

        public void LoadCourse()
        {
            if (_mode == null || State != MarbleRunState.Editing) return;
            if (!CourseStorage.Load(_mode.Id, out var loaded, out var error))
            {
                _ui.SetStatus(error, true);
                _audio.PlayGentleNo();
                return;
            }
            _history.Capture(_course);
            _course = loaded;
            _selectedPieceId = null;
            _activePlacementLevel = HighestInitialLevel(_course);
            _ui.SetSelected(null);
            _ui.SetHeightLevel(_activePlacementLevel);
            RebuildCourseViews();
            _audio.PlayReset();
            _ui.SetStatus("つづきから あそべるよ", false);
        }

        public void StartRun()
        {
            if (State != MarbleRunState.Editing || _course == null) return;
            CancelPlacement();
            var start = FindPiece(MarblePieceKind.Start);
            var goal = FindPiece(MarblePieceKind.Goal);
            if (start == null || goal == null)
            {
                _ui.SetStatus("スタートと ゴールを おこう", true);
                _audio.PlayGentleNo();
                return;
            }
            State = MarbleRunState.Running;
            _goalCelebrationRaised = false;
            _marblesAtGoal = 0;
            foreach (var view in _pieceViews.Values) view.SetRunMode(true);
            Physics.SyncTransforms();
            LaunchAllMarbles(start, false);
            SetCameraFollow(true, false);
            UpdateCameraFollowTarget();
            ResetPreviewCameraInput();
            _ui.ShowRunning();
            _ui.SetStatus("ドラッグで カメラを うごかせるよ", false);
            _audio.PlayPlace();
            if (_mode.IsTutorial)
            {
                _tutorialStep = Math.Max(_tutorialStep, 3);
                UpdateTutorialGuide();
            }
        }

        public void ResetMarble()
        {
            if (State != MarbleRunState.Running) return;
            var start = FindPiece(MarblePieceKind.Start);
            if (start != null) LaunchAllMarbles(start, true);
        }

        public void ReturnToEditing()
        {
            if (State != MarbleRunState.Running && State != MarbleRunState.Celebrating) return;
            if (_celebrationRoutine != null) StopCoroutine(_celebrationRoutine);
            _celebrationRoutine = null;
            _goalCelebrationRaised = false;
            StopMarbleCoroutines();
            if (_goalLightObject != null) Destroy(_goalLightObject);
            _goalLightObject = null;
            HideAllMarbles();
            foreach (var view in _pieceViews.Values) view.SetRunMode(false);
            State = MarbleRunState.Editing;
            SetCameraFollow(false, true);
            ResetPreviewCameraInput();
            _orbit.EndGoalFocus();
            _ui.ShowBuilder(_mode);
            _ui.SetInventory(_mode, _course);
            _ui.SetStatus("コースを かえてみよう", false);
            _ui.ShowCelebration(false);
        }

        public void SetPaused(bool paused)
        {
            if (paused)
            {
                if (State == MarbleRunState.Menu || State == MarbleRunState.Paused) return;
                _stateBeforePause = State;
                State = MarbleRunState.Paused;
                _simulationModeBeforePause = Physics.simulationMode;
                Physics.simulationMode = SimulationMode.Script;
                Time.timeScale = 0f;
                AudioListener.pause = true;
                if (_sunLight != null) _sunLight.shadows = LightShadows.None;
                _ui.ShowPause(true);
            }
            else
            {
                if (State != MarbleRunState.Paused) return;
                Time.timeScale = 1f;
                Physics.simulationMode = _simulationModeBeforePause;
                AudioListener.pause = false;
                if (_sunLight != null) _sunLight.shadows = LightShadows.Soft;
                State = _stateBeforePause;
                _ui.ShowPause(false);
            }
        }

        public void ResetCameraView()
        {
            SetCameraFollow(false, true);
            _orbit.ResetView();
            _ui.SetCameraView(false);
            _audio.PlayClick();
        }

        public bool PlaceForQa(MarblePieceKind kind, GridPose pose)
        {
            if (State != MarbleRunState.Editing || _course == null) return false;
            var validation = PlacementSolver.Validate(kind, pose, _course.pieces, _mode);
            if (!validation.IsValid) return false;
            _history.Capture(_course);
            var piece = new PieceRecord
            {
                id = Guid.NewGuid().ToString("N"),
                kind = kind,
                pose = pose
            };
            _course.pieces.Add(piece);
            RebuildCourseViews();
            AdvanceTutorialAfterPlace();
            return true;
        }

        public bool SelectForQa(string id)
        {
            if (_course?.Find(id) == null) return false;
            SelectPiece(id);
            return true;
        }

        public void ShowInvalidGhostForQa()
        {
            if (State != MarbleRunState.Editing) return;
            _placingKind = MarblePieceKind.Straight;
            _placingQuarterTurns = 0;
            UpdateGhostAtWorld(0f, 0f, null);
        }

        public void CelebrateForQa()
        {
            var goal = FindPiece(MarblePieceKind.Goal);
            if (goal != null) HandleGoal(null);
        }

        public bool ReachGoalForQa(int marbleIndex)
        {
            if (marbleIndex < 0 || marbleIndex >= _activeMarbleCount) return false;
            var runtime = _marbles[marbleIndex];
            if (!runtime.Object.activeSelf || runtime.ReachedGoal) return false;
            HandleGoal(runtime.Object.GetComponent<MarbleActor>());
            return runtime.ReachedGoal;
        }

        private void ConfigurePhysics()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Time.fixedDeltaTime = MarbleRunPhysicsProfile.FixedTimestep;
            Time.maximumDeltaTime = MarbleRunPhysicsProfile.MaximumTimestep;
            Physics.defaultSolverIterations = MarbleRunPhysicsProfile.SolverIterations;
            Physics.defaultSolverVelocityIterations = MarbleRunPhysicsProfile.SolverVelocityIterations;
            Physics.defaultMaxDepenetrationVelocity = 6f;
            Physics.reuseCollisionCallbacks = true;
        }

        private void ResolveLayers()
        {
            _placementLayer = LayerMask.NameToLayer("PlacementQuery");
            _courseLayer = LayerMask.NameToLayer("CourseGeometry");
            _boardLayer = LayerMask.NameToLayer("Board");
            _marbleLayer = LayerMask.NameToLayer("Marble");
            if (_placementLayer < 0) _placementLayer = 6;
            if (_courseLayer < 0) _courseLayer = 7;
            if (_boardLayer < 0) _boardLayer = 8;
            if (_marbleLayer < 0) _marbleLayer = 9;
            Physics.IgnoreLayerCollision(_placementLayer, _marbleLayer, true);
            Physics.IgnoreLayerCollision(_placementLayer, _courseLayer, true);
            Physics.IgnoreLayerCollision(_placementLayer, _boardLayer, true);
            Physics.IgnoreLayerCollision(_marbleLayer, _marbleLayer, true);
        }

        private void BuildWorld()
        {
            _worldRoot = new GameObject("ToyRoom").transform;
            _worldRoot.SetParent(transform, false);
            _pieceRoot = new GameObject("CoursePieces").transform;
            _pieceRoot.SetParent(_worldRoot, false);

            var backdropMaterial = MakeRuntimeMaterial("そら", new Color(0.72f, 0.90f, 0.96f), 0.04f);
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "やわらかい ゆか";
            floor.layer = _boardLayer;
            floor.transform.SetParent(_worldRoot, false);
            floor.transform.position = new Vector3(0f, -0.20f, 0f);
            floor.transform.localScale = new Vector3(72f, 0.25f, 64f);
            floor.GetComponent<Renderer>().sharedMaterial = backdropMaterial;

            var board = GameObject.CreatePrimitive(PrimitiveType.Cube);
            board.name = "おおきな きの だい";
            board.layer = _boardLayer;
            board.transform.SetParent(_worldRoot, false);
            board.transform.position = new Vector3(0f, 0.54f, 0f);
            board.transform.localScale = new Vector3(41.5f, 0.76f, 35.5f);
            board.GetComponent<Renderer>().sharedMaterial = _materials.Board;

            for (var x = PlacementSolver.MinX; x <= PlacementSolver.MaxX; x++)
            {
                var line = GameObject.CreatePrimitive(PrimitiveType.Cube);
                line.name = "たての せん";
                line.layer = 2;
                line.transform.SetParent(_worldRoot, false);
                line.transform.position = new Vector3(x * WoodenPieceFactory.CellSize, 0.929f, 0f);
                line.transform.localScale = new Vector3(0.035f, 0.012f, 33f);
                line.GetComponent<Renderer>().sharedMaterial = _materials.MapleDark;
                line.GetComponent<Collider>().enabled = false;
            }
            for (var z = PlacementSolver.MinZ; z <= PlacementSolver.MaxZ; z++)
            {
                var line = GameObject.CreatePrimitive(PrimitiveType.Cube);
                line.name = "よこの せん";
                line.layer = 2;
                line.transform.SetParent(_worldRoot, false);
                line.transform.position = new Vector3(0f, 0.93f, z * WoodenPieceFactory.CellSize);
                line.transform.localScale = new Vector3(39f, 0.012f, 0.035f);
                line.GetComponent<Renderer>().sharedMaterial = _materials.MapleDark;
                line.GetComponent<Collider>().enabled = false;
            }

            CreateBoardEdge(new Vector3(0f, 1.02f, 18.1f), new Vector3(42.6f, 0.72f, 0.66f));
            CreateBoardEdge(new Vector3(0f, 1.02f, -18.1f), new Vector3(42.6f, 0.72f, 0.66f));
            CreateBoardEdge(new Vector3(21.1f, 1.02f, 0f), new Vector3(0.66f, 0.72f, 36.8f));
            CreateBoardEdge(new Vector3(-21.1f, 1.02f, 0f), new Vector3(0.66f, 0.72f, 36.8f));

            RenderSettings.ambientLight = new Color(0.74f, 0.78f, 0.82f);
            RenderSettings.ambientIntensity = 1.15f;
            var lightObject = new GameObject("SunLight");
            lightObject.transform.SetParent(_worldRoot, false);
            lightObject.transform.rotation = Quaternion.Euler(48f, -32f, 0f);
            var light = lightObject.AddComponent<Light>();
            _sunLight = light;
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.88f, 0.72f);
            light.intensity = 1.2f;
            light.shadows = LightShadows.Soft;
            light.shadowStrength = 0.55f;
            light.shadowBias = 0.06f;
        }

        private void BuildCamera()
        {
            _camera = Camera.main;
            if (_camera == null)
            {
                var cameraObject = new GameObject("MainCamera");
                cameraObject.tag = "MainCamera";
                _camera = cameraObject.AddComponent<Camera>();
            }
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = new Color(0.72f, 0.90f, 0.96f);
            _camera.fieldOfView = 43f;
            _camera.nearClipPlane = 0.15f;
            _camera.farClipPlane = 130f;
            _camera.allowHDR = false;
            _camera.allowMSAA = true;
            _orbit = _camera.GetComponent<OrbitCameraController>()
                ?? _camera.gameObject.AddComponent<OrbitCameraController>();
            _orbit.ConfigureDefault();
        }

        private void BuildMarblePool()
        {
            var marblePhysicsMaterial = new PhysicsMaterial("たまの すべり")
            {
                staticFriction = MarbleRunPhysicsProfile.MarbleStaticFriction,
                dynamicFriction = MarbleRunPhysicsProfile.MarbleDynamicFriction,
                bounciness = MarbleRunPhysicsProfile.MarbleBounciness,
                frictionCombine = PhysicsMaterialCombine.Minimum,
                bounceCombine = PhysicsMaterialCombine.Minimum
            };

            for (var index = 0; index < MaximumMarbles; index++)
            {
                var marbleObject = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                marbleObject.name = "たま " + (index + 1);
                marbleObject.layer = _marbleLayer;
                marbleObject.transform.SetParent(_worldRoot, false);
                marbleObject.transform.localScale = Vector3.one * WoodenPieceFactory.MarbleRadius * 2f;
                var marbleMaterial = _materials.MarbleAt(index);
                marbleObject.GetComponent<Renderer>().sharedMaterial = marbleMaterial;
                marbleObject.AddComponent<MarbleActor>().Configure(index);
                marbleObject.GetComponent<SphereCollider>().sharedMaterial = marblePhysicsMaterial;

                var body = marbleObject.AddComponent<Rigidbody>();
                body.mass = MarbleRunPhysicsProfile.MarbleMass;
                body.linearDamping = MarbleRunPhysicsProfile.MarbleLinearDamping;
                body.angularDamping = MarbleRunPhysicsProfile.MarbleAngularDamping;
                body.interpolation = RigidbodyInterpolation.Interpolate;
                body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
                body.maxAngularVelocity = 35f;
                body.solverIterations = 12;
                body.solverVelocityIterations = 5;
                body.isKinematic = true;

                var trail = marbleObject.AddComponent<TrailRenderer>();
                trail.time = 0.42f;
                trail.startWidth = 0.13f;
                trail.endWidth = 0.015f;
                trail.sharedMaterial = _materials.Selection;
                var trailColor = marbleMaterial != null ? marbleMaterial.color : Color.white;
                trail.startColor = new Color(trailColor.r, trailColor.g, trailColor.b, 0.76f);
                trail.endColor = new Color(trailColor.r, trailColor.g, trailColor.b, 0f);

                var runtime = new MarbleRuntime
                {
                    Index = index,
                    Object = marbleObject,
                    Body = body,
                    Trail = trail
                };
                _marbles.Add(runtime);
                _marbleBodies.Add(body);
                marbleObject.SetActive(false);
            }
        }

        private void BuildUi()
        {
            var uiObject = new GameObject("MarbleRunUi");
            uiObject.transform.SetParent(transform, false);
            _ui = uiObject.AddComponent<MarbleRunUi>();
            _ui.Build(this);
        }

        private void UpdateBuilderInput()
        {
            if (_externalPaletteDrag) return;
            if (Input.touchCount >= 2)
            {
                _pointerDown = false;
                _cameraDragging = false;
                var first = Input.GetTouch(0);
                var second = Input.GetTouch(1);
                if (IsPointerOverUi(first.fingerId) || IsPointerOverUi(second.fingerId)) return;
                var distance = Vector2.Distance(first.position, second.position);
                if (first.phase == TouchPhase.Began || second.phase == TouchPhase.Began)
                {
                    _pinchDistance = distance;
                    return;
                }
                if (_pinchDistance > 0f)
                {
                    _orbit.Zoom((_pinchDistance - distance) * 0.018f);
                }
                _pinchDistance = distance;
                var averageDelta = (first.deltaPosition + second.deltaPosition) * 0.5f;
                _orbit.Orbit(averageDelta * 0.30f);
                return;
            }
            _pinchDistance = 0f;

            if (Input.mouseScrollDelta.sqrMagnitude > 0f && !IsPointerOverUi(-1))
            {
                _orbit.Zoom(-Input.mouseScrollDelta.y * 1.4f);
            }

            if (!TryGetPrimaryPointer(out var position, out var phase, out var fingerId)) return;
            if (phase == TouchPhase.Began)
            {
                if (IsPointerOverUi(fingerId)) return;
                _pointerDown = true;
                _pointerFingerId = fingerId;
                _pointerStart = _pointerLast = position;
                if (_placingKind.HasValue)
                {
                    UpdateGhostAtScreen(position, _movingPieceId);
                    return;
                }

                if (TryRaycastPiece(position, out var view))
                {
                    SelectPiece(view.Record.id);
                    _existingDragCandidate = !view.Record.locked;
                    _movingPieceId = view.Record.id;
                }
                else
                {
                    SelectPiece(null);
                    _cameraDragging = true;
                }
            }
            else if ((phase == TouchPhase.Moved || phase == TouchPhase.Stationary)
                     && _pointerDown && fingerId == _pointerFingerId)
            {
                var delta = position - _pointerLast;
                if (_placingKind.HasValue)
                {
                    UpdateGhostAtScreen(position, _movingPieceId);
                }
                else if (_existingDragCandidate
                         && Vector2.Distance(position, _pointerStart) >= PointerDragThreshold)
                {
                    BeginExistingPieceDrag();
                    UpdateGhostAtScreen(position, _movingPieceId);
                }
                else if (_cameraDragging)
                {
                    _orbit.Orbit(delta);
                }
                _pointerLast = position;
            }
            else if ((phase == TouchPhase.Ended || phase == TouchPhase.Canceled)
                     && _pointerDown && fingerId == _pointerFingerId)
            {
                if (_placingKind.HasValue)
                {
                    UpdateGhostAtScreen(position, _movingPieceId);
                    CommitGhost();
                }
                _pointerDown = false;
                _cameraDragging = false;
                _existingDragCandidate = false;
                _existingDragActive = false;
                _movingPieceId = null;
            }
        }

        private void UpdatePreviewCameraInput()
        {
            if (Input.touchCount >= 2)
            {
                _pointerDown = false;
                _cameraDragging = false;
                var first = Input.GetTouch(0);
                var second = Input.GetTouch(1);
                if (IsPointerOverUi(first.fingerId) || IsPointerOverUi(second.fingerId))
                {
                    _pinchDistance = 0f;
                    return;
                }

                var distance = Vector2.Distance(first.position, second.position);
                if (first.phase == TouchPhase.Began || second.phase == TouchPhase.Began || _pinchDistance <= 0f)
                {
                    _pinchDistance = distance;
                    return;
                }

                _orbit.Zoom((_pinchDistance - distance) * 0.018f);
                _pinchDistance = distance;
                var averageDelta = (first.deltaPosition + second.deltaPosition) * 0.5f;
                _orbit.Orbit(averageDelta * 0.30f);
                return;
            }
            _pinchDistance = 0f;

            if (Input.mouseScrollDelta.sqrMagnitude > 0f && !IsPointerOverUi(-1))
            {
                _orbit.Zoom(-Input.mouseScrollDelta.y * 1.4f);
            }

            if (!TryGetPrimaryPointer(out var position, out var phase, out var fingerId)) return;
            if (phase == TouchPhase.Began)
            {
                if (IsPointerOverUi(fingerId)) return;
                _pointerDown = true;
                _pointerFingerId = fingerId;
                _pointerLast = position;
                _cameraDragging = true;
            }
            else if ((phase == TouchPhase.Moved || phase == TouchPhase.Stationary)
                     && _pointerDown && _cameraDragging && fingerId == _pointerFingerId)
            {
                var delta = position - _pointerLast;
                _orbit.Orbit(delta);
                _pointerLast = position;
            }
            else if ((phase == TouchPhase.Ended || phase == TouchPhase.Canceled)
                     && _pointerDown && fingerId == _pointerFingerId)
            {
                _pointerDown = false;
                _cameraDragging = false;
                _pointerFingerId = -1;
            }
        }

        private void UpdateCameraFollowTarget()
        {
            if (_orbit == null || !_orbit.IsFollowing) return;

            var count = 0;
            for (var i = 0; i < _activeMarbleCount && count < MaximumMarbles; i++)
            {
                var marble = _marbles[i];
                var body = marble.Body;
                if (body == null || !marble.Object.activeSelf || marble.ReachedGoal
                    || body.isKinematic || marble.ResetRoutine != null)
                {
                    continue;
                }

                var position = body.position;
                var velocity = body.linearVelocity;
                if (!IsFinite(position) || !IsFinite(velocity)
                    || position.y < -2f
                    || new Vector2(position.x, position.z).sqrMagnitude > 34f * 34f)
                {
                    continue;
                }

                _cameraFollowPositions[count] = position;
                _cameraFollowVelocities[count] = velocity;
                count++;
            }
            if (count == 0) return;

            var median = new Vector3(
                MedianFollowAxis(count, 0),
                MedianFollowAxis(count, 1),
                MedianFollowAxis(count, 2));
            var center = Vector3.zero;
            var averageVelocity = Vector3.zero;
            for (var i = 0; i < count; i++)
            {
                center += median + Vector3.ClampMagnitude(_cameraFollowPositions[i] - median, 9f);
                averageVelocity += Vector3.ClampMagnitude(_cameraFollowVelocities[i], 6f);
            }
            center /= count;
            averageVelocity /= count;

            var lookAhead = averageVelocity * 0.28f;
            lookAhead.y = Mathf.Clamp(lookAhead.y, -0.45f, 0.45f);
            _orbit.SetFollowTarget(center + lookAhead + Vector3.up * 0.55f);
        }

        private float MedianFollowAxis(int count, int axis)
        {
            for (var i = 0; i < count; i++)
            {
                var value = axis == 0
                    ? _cameraFollowPositions[i].x
                    : axis == 1
                        ? _cameraFollowPositions[i].y
                        : _cameraFollowPositions[i].z;
                var insert = i;
                while (insert > 0 && _cameraFollowAxis[insert - 1] > value)
                {
                    _cameraFollowAxis[insert] = _cameraFollowAxis[insert - 1];
                    insert--;
                }
                _cameraFollowAxis[insert] = value;
            }

            var middle = count / 2;
            return count % 2 == 1
                ? _cameraFollowAxis[middle]
                : (_cameraFollowAxis[middle - 1] + _cameraFollowAxis[middle]) * 0.5f;
        }

        private void SetCameraFollow(bool enabled, bool returnToCourseOverview)
        {
            if (_orbit == null) return;
            _orbit.SetFollowEnabled(enabled, returnToCourseOverview);
            _ui?.SetCameraFollow(_orbit.IsFollowing);
            CameraFollowChanged?.Invoke(_orbit.IsFollowing);
        }

        private void ResetPreviewCameraInput()
        {
            _pointerDown = false;
            _cameraDragging = false;
            _pointerFingerId = -1;
            _pinchDistance = 0f;
        }

        private bool TryGetPrimaryPointer(out Vector2 position, out TouchPhase phase, out int fingerId)
        {
            if (Input.touchCount > 0)
            {
                var touch = Input.GetTouch(0);
                position = touch.position;
                phase = touch.phase;
                fingerId = touch.fingerId;
                return true;
            }
            position = Input.mousePosition;
            fingerId = -1;
            if (Input.GetMouseButtonDown(0)) phase = TouchPhase.Began;
            else if (Input.GetMouseButtonUp(0)) phase = TouchPhase.Ended;
            else if (Input.GetMouseButton(0)) phase = TouchPhase.Moved;
            else
            {
                phase = TouchPhase.Canceled;
                return false;
            }
            return true;
        }

        private bool IsPointerOverUi(int fingerId)
        {
            if (EventSystem.current == null) return false;
            return fingerId >= 0
                ? EventSystem.current.IsPointerOverGameObject(fingerId)
                : EventSystem.current.IsPointerOverGameObject();
        }

        private bool TryRaycastPiece(Vector2 screenPosition, out PieceView view)
        {
            view = null;
            var ray = _camera.ScreenPointToRay(screenPosition);
            if (!Physics.Raycast(ray, out var hit, 120f, 1 << _placementLayer, QueryTriggerInteraction.Collide))
                return false;
            view = hit.collider.GetComponentInParent<PieceView>();
            return view != null && !view.IsGhost;
        }

        private void BeginExistingPieceDrag()
        {
            if (_existingDragActive) return;
            var piece = _course.Find(_movingPieceId);
            if (piece == null || piece.locked) return;
            _existingDragActive = true;
            _placingKind = piece.kind;
            _placingQuarterTurns = piece.pose.quarterTurns;
            _placingLevel = piece.pose.level;
            _activePlacementLevel = piece.pose.level;
            _ui.SetHeightLevel(_activePlacementLevel);
            if (_pieceViews.TryGetValue(piece.id, out var view)) view.gameObject.SetActive(false);
        }

        private void UpdateGhostAtScreen(Vector2 screenPosition, string ignorePieceId)
        {
            var planeHeight = WoodenPieceFactory.PieceRootY + _placingLevel * WoodenPieceFactory.LevelHeight;
            var plane = new Plane(Vector3.up, new Vector3(0f, planeHeight, 0f));
            var ray = _camera.ScreenPointToRay(screenPosition);
            if (!plane.Raycast(ray, out var distance)) return;
            var world = ray.GetPoint(distance);
            UpdateGhostAtWorld(
                world.x / WoodenPieceFactory.CellSize,
                world.z / WoodenPieceFactory.CellSize,
                ignorePieceId);
        }

        private void UpdateGhostAtWorld(float cellX, float cellZ, string ignorePieceId)
        {
            if (!_placingKind.HasValue || _course == null) return;
            _ghostResult = PlacementSolver.Solve(
                _placingKind.Value,
                _placingQuarterTurns,
                new Vector2(cellX, cellZ),
                _placingLevel,
                _course.pieces,
                _mode,
                ignorePieceId);
            _placingLevel = _ghostResult.Pose.level;
            _activePlacementLevel = _ghostResult.Pose.level;
            _ui.SetHeightLevel(_activePlacementLevel);
            if (_ghost == null || _ghost.Record.kind != _placingKind.Value)
            {
                DestroyGhost();
                var record = new PieceRecord
                {
                    id = "ghost",
                    kind = _placingKind.Value,
                    pose = _ghostResult.Pose
                };
                _ghost = WoodenPieceFactory.Create(
                    record,
                    _materials,
                    _pieceRoot,
                    true,
                    _placementLayer,
                    _courseLayer);
            }
            _ghost.transform.position = WoodenPieceFactory.PoseToWorld(_ghostResult.Pose);
            _ghost.transform.rotation = Quaternion.Euler(0f, _ghostResult.Pose.quarterTurns * 90f, 0f);
            _ghost.SetGhostValidity(_ghostResult.IsValid, _materials);
            _ui.SetStatus(
                _ghostResult.IsValid
                    ? (_ghostResult.SnappedToConnector ? "つながったよ" : "ここに おこう")
                    : _ghostResult.Reason,
                !_ghostResult.IsValid);
        }

        private void CommitGhost()
        {
            if (!_placingKind.HasValue) return;
            var movedPiece = _course.Find(_movingPieceId);
            if (!_ghostResult.IsValid)
            {
                if (movedPiece != null && _pieceViews.TryGetValue(movedPiece.id, out var originalView))
                    originalView.gameObject.SetActive(true);
                _audio.PlayGentleNo();
                DestroyGhost();
                _placingKind = null;
                _placingLevel = _activePlacementLevel;
                _movingPieceId = null;
                return;
            }

            _history.Capture(_course);
            if (movedPiece != null)
            {
                movedPiece.pose = _ghostResult.Pose;
            }
            else
            {
                _course.pieces.Add(new PieceRecord
                {
                    id = Guid.NewGuid().ToString("N"),
                    kind = _placingKind.Value,
                    pose = _ghostResult.Pose,
                    locked = false
                });
            }
            DestroyGhost();
            _placingKind = null;
            _activePlacementLevel = _ghostResult.Pose.level;
            _placingLevel = _activePlacementLevel;
            _ui.SetHeightLevel(_activePlacementLevel);
            _movingPieceId = null;
            _existingDragActive = false;
            RebuildCourseViews();
            _audio.PlayPlace();
            _ui.SetStatus(_ghostResult.SnappedToConnector ? "つながったよ" : "おけたよ", false);
            AdvanceTutorialAfterPlace();
        }

        private void CancelPlacement()
        {
            if (!string.IsNullOrEmpty(_movingPieceId)
                && _pieceViews.TryGetValue(_movingPieceId, out var original))
            {
                original.gameObject.SetActive(true);
            }
            DestroyGhost();
            _placingKind = null;
            _placingLevel = _activePlacementLevel;
            _movingPieceId = null;
            _externalPaletteDrag = false;
            _existingDragCandidate = false;
            _existingDragActive = false;
        }

        private void DestroyGhost()
        {
            if (_ghost == null) return;
            _ghost.gameObject.SetActive(false);
            Destroy(_ghost.gameObject);
            _ghost = null;
        }

        private void SelectPiece(string id)
        {
            if (!string.IsNullOrEmpty(_selectedPieceId)
                && _pieceViews.TryGetValue(_selectedPieceId, out var previous))
            {
                previous.SetSelected(false);
            }
            _selectedPieceId = id;
            var record = _course?.Find(id);
            if (record != null && _pieceViews.TryGetValue(id, out var current))
                current.SetSelected(true);
            if (record != null)
            {
                _activePlacementLevel = record.pose.level;
                _placingLevel = _activePlacementLevel;
                _ui.SetHeightLevel(_activePlacementLevel);
            }
            _ui.SetSelected(record);
            if (record != null)
            {
                _ui.SetStatus(
                    record.locked
                        ? "この ぶひんは そのままだよ"
                        : record.kind == MarblePieceKind.Slope
                          || record.kind == MarblePieceKind.Steps
                          || record.kind == MarblePieceKind.Lift
                            ? "くるっを ２かい おすと のぼりと くだりが かわるよ"
                            : "したの くるっで みぎに まわせるよ",
                    record.locked);
            }
        }

        private void RebuildCourseViews()
        {
            ClearCourseViews();
            if (_course == null) return;
            for (var i = 0; i < _course.pieces.Count; i++)
            {
                var record = _course.pieces[i];
                var view = WoodenPieceFactory.Create(
                    record,
                    _materials,
                    _pieceRoot,
                    false,
                    _placementLayer,
                    _courseLayer);
                _pieceViews[record.id] = view;
                if (view.GoalSensor != null) view.GoalSensor.MarbleEntered += HandleGoal;
            }
            _ui?.SetInventory(_mode, _course);
            if (_course != null)
            {
                var positions = new List<Vector3>(_course.pieces.Count * 3);
                for (var i = 0; i < _course.pieces.Count; i++)
                {
                    var piece = _course.pieces[i];
                    positions.Add(WoodenPieceFactory.PoseToWorld(piece.pose));
                    var connectors = PartCatalog.Get(piece.kind).Connectors;
                    for (var connectorIndex = 0; connectorIndex < connectors.Count; connectorIndex++)
                    {
                        var connector = PartCatalog.GetWorldConnector(piece, connectorIndex);
                        positions.Add(new Vector3(
                            connector.cellPosition.x * WoodenPieceFactory.CellSize,
                            WoodenPieceFactory.PieceRootY + connector.level * WoodenPieceFactory.LevelHeight,
                            connector.cellPosition.y * WoodenPieceFactory.CellSize));
                    }
                }
                _orbit?.FrameCourse(positions);
            }
        }

        private void ClearCourseViews()
        {
            DestroyGhost();
            foreach (var view in _pieceViews.Values)
            {
                if (view != null)
                {
                    view.gameObject.SetActive(false);
                    Destroy(view.gameObject);
                }
            }
            _pieceViews.Clear();
        }

        private PieceView FindPiece(MarblePieceKind kind)
        {
            if (_course == null) return null;
            for (var i = 0; i < _course.pieces.Count; i++)
            {
                var piece = _course.pieces[i];
                if (piece.kind == kind && _pieceViews.TryGetValue(piece.id, out var view))
                    return view;
            }
            return null;
        }

        private static int HighestInitialLevel(CourseData course)
        {
            if (course == null || course.pieces == null) return PlacementSolver.MinLevel;
            var highest = PlacementSolver.MinLevel;
            for (var i = 0; i < course.pieces.Count; i++)
            {
                var piece = course.pieces[i];
                highest = Mathf.Max(highest, piece.pose.level);
                var connectors = PartCatalog.Get(piece.kind).Connectors;
                for (var connector = 0; connector < connectors.Count; connector++)
                    highest = Mathf.Max(highest, PartCatalog.GetWorldConnector(piece, connector).level);
            }
            return Mathf.Clamp(highest, PlacementSolver.MinLevel, PlacementSolver.MaxLevel);
        }

        private void LaunchAllMarbles(PieceView start, bool playSound)
        {
            if (start == null || start.MarbleSpawn == null) return;
            StopMarbleCoroutines();
            HideAllMarbles();
            _activeMarbleCount = Mathf.Clamp(
                _course != null ? _course.marbleCount : CourseData.DefaultMarbleCount,
                CourseData.MinimumMarbleCount,
                Mathf.Min(CourseData.MaximumMarbleCount, MaximumMarbles));
            _marblesAtGoal = 0;
            _goalCelebrationRaised = false;
            var goal = FindPiece(MarblePieceKind.Goal);
            goal?.GoalSensor?.ResetSensor();
            _ui.SetResetAttention(false);
            _launchRoutine = StartCoroutine(ReleaseMarbles(start));
            if (playSound)
            {
                _ui.SetStatus("たまを もどしたよ", false);
                _audio.PlayReset();
            }
        }

        private IEnumerator ReleaseMarbles(PieceView start)
        {
            for (var i = 0; i < _activeMarbleCount; i++)
            {
                if (State != MarbleRunState.Running && State != MarbleRunState.Celebrating) break;
                ResetSingleMarble(_marbles[i], start);
                yield return new WaitForSeconds(MarbleReleaseInterval);
            }
            _launchRoutine = null;
        }

        private void ResetSingleMarble(MarbleRuntime marble, PieceView start)
        {
            if (marble == null || start == null || start.MarbleSpawn == null) return;
            var body = marble.Body;
            marble.Object.SetActive(true);
            FreezeBody(body);
            body.position = start.MarbleSpawn.position;
            body.rotation = start.MarbleSpawn.rotation;
            marble.Trail.Clear();
            marble.Safety.Reset();
            marble.ReachedGoal = false;
            body.isKinematic = false;
            body.linearVelocity = start.transform.forward * MarbleRunPhysicsProfile.MarbleLaunchSpeed;
        }

        private IEnumerator ResetAfterFall(MarbleRuntime marble)
        {
            if (marble == null) yield break;
            FreezeBody(marble.Body);
            marble.Object.SetActive(false);
            _ui.SetStatus("たまを もどすね", false);
            yield return new WaitForSeconds(0.28f);
            if (State == MarbleRunState.Running)
            {
                var start = FindPiece(MarblePieceKind.Start);
                if (start != null)
                {
                    ResetSingleMarble(marble, start);
                    _audio.PlayReset();
                }
            }
            marble.ResetRoutine = null;
        }

        private void StopMarbleCoroutines()
        {
            if (_launchRoutine != null)
            {
                StopCoroutine(_launchRoutine);
                _launchRoutine = null;
            }
            for (var i = 0; i < _marbles.Count; i++)
            {
                if (_marbles[i].ResetRoutine == null) continue;
                StopCoroutine(_marbles[i].ResetRoutine);
                _marbles[i].ResetRoutine = null;
            }
            if (_goalFinishRoutine != null)
            {
                StopCoroutine(_goalFinishRoutine);
                _goalFinishRoutine = null;
            }
        }

        private void HideAllMarbles()
        {
            for (var i = 0; i < _marbles.Count; i++)
            {
                var marble = _marbles[i];
                FreezeBody(marble.Body);
                marble.Trail.Clear();
                marble.Safety.Reset();
                marble.ReachedGoal = false;
                marble.Object.SetActive(false);
            }
            _activeMarbleCount = 0;
            _marblesAtGoal = 0;
        }

        private void HandleGoal(MarbleActor marble)
        {
            if (State != MarbleRunState.Running && State != MarbleRunState.Celebrating) return;
            if (marble == null)
            {
                BeginGoalCelebration();
                return;
            }

            if (marble.Index < 0 || marble.Index >= _activeMarbleCount) return;
            var runtime = _marbles[marble.Index];
            if (runtime.ReachedGoal) return;
            runtime.ReachedGoal = true;
            FreezeBody(runtime.Body);
            _marblesAtGoal++;
            _ui.SetStatus("たまが ついたよ", false);

            if (_marblesAtGoal >= _activeMarbleCount)
            {
                BeginGoalCelebration();
                return;
            }
            if (_goalFinishRoutine == null)
                _goalFinishRoutine = StartCoroutine(CelebrateAfterGoalDelay());
        }

        private IEnumerator CelebrateAfterGoalDelay()
        {
            yield return new WaitForSeconds(2.8f);
            _goalFinishRoutine = null;
            if (State == MarbleRunState.Running && _marblesAtGoal > 0)
                BeginGoalCelebration();
        }

        private void BeginGoalCelebration()
        {
            if (_goalCelebrationRaised) return;
            if (_goalFinishRoutine != null)
            {
                StopCoroutine(_goalFinishRoutine);
                _goalFinishRoutine = null;
            }
            _goalCelebrationRaised = true;
            State = MarbleRunState.Celebrating;
            SetCameraFollow(false, false);
            ResetPreviewCameraInput();
            var goal = FindPiece(MarblePieceKind.Goal);
            if (goal != null) _orbit.FocusForGoal(goal.transform.position);
            _ui.ShowCelebration(true);
            _audio.PlayGoal();
            _celebrationRoutine = StartCoroutine(GoalLightShow(goal));
        }

        private IEnumerator GoalLightShow(PieceView goal)
        {
            if (goal == null) yield break;
            if (_goalLightObject != null) Destroy(_goalLightObject);
            var lightObject = new GameObject("ゴールの ひかり");
            _goalLightObject = lightObject;
            lightObject.transform.SetParent(goal.transform, false);
            lightObject.transform.localPosition = new Vector3(0f, 2.2f, 0f);
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1f, 0.65f, 0.25f);
            light.range = 9f;
            var start = Time.realtimeSinceStartup;
            while ((State == MarbleRunState.Celebrating
                    || (State == MarbleRunState.Paused && _stateBeforePause == MarbleRunState.Celebrating))
                   && Time.realtimeSinceStartup - start < 8f)
            {
                light.intensity = 1.8f + Mathf.Sin((Time.realtimeSinceStartup - start) * 7f) * 0.65f;
                goal.transform.localScale = Vector3.one * (1f + Mathf.Sin((Time.realtimeSinceStartup - start) * 5f) * 0.018f);
                yield return null;
            }
            goal.transform.localScale = Vector3.one;
            Destroy(lightObject);
            if (_goalLightObject == lightObject) _goalLightObject = null;
            _celebrationRoutine = null;
        }

        private void AdvanceTutorialAfterPlace()
        {
            if (_mode == null || !_mode.IsTutorial) return;
            if (_tutorialStep == 0) _tutorialStep = 1;
            else if (_tutorialStep == 2 && PlacementSolver.HasStartToGoalGraphPath(_course.pieces))
                _tutorialStep = 3;
            UpdateTutorialGuide();
        }

        private void AdvanceTutorialAfterRotate()
        {
            if (_mode == null || !_mode.IsTutorial) return;
            if (_tutorialStep <= 1) _tutorialStep = 2;
            UpdateTutorialGuide();
        }

        private void UpdateTutorialGuide()
        {
            if (_mode == null || !_mode.IsTutorial)
            {
                _ui.ShowTutorialGuide(string.Empty, false);
                return;
            }
            string text;
            switch (_tutorialStep)
            {
                case 0: text = "ぶひんを ひっぱって おこう"; break;
                case 1: text = "したの くるっで みぎに まわそう"; break;
                case 2: text = "みどりの まるを つなげよう"; break;
                default: text = "ためすを おしてみよう"; break;
            }
            _ui.ShowTutorialGuide(text, true);
        }

        private void CreateBoardEdge(Vector3 position, Vector3 scale)
        {
            var edge = GameObject.CreatePrimitive(PrimitiveType.Cube);
            edge.name = "きの ふち";
            edge.layer = _boardLayer;
            edge.transform.SetParent(_worldRoot, false);
            edge.transform.position = position;
            edge.transform.localScale = scale;
            edge.GetComponent<Renderer>().sharedMaterial = _materials.BoardEdge;
        }

        private Material MakeRuntimeMaterial(string name, Color color, float smoothness)
        {
            var material = new Material(_materials.BaseShader) { name = name, color = color };
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            material.enableInstancing = true;
            return material;
        }

        private static void FreezeBody(Rigidbody body)
        {
            if (body == null || body.isKinematic) return;
            body.linearVelocity = Vector3.zero;
            body.angularVelocity = Vector3.zero;
            body.isKinematic = true;
        }

        private static bool IsFinite(Vector3 value)
        {
            return !float.IsNaN(value.x) && !float.IsInfinity(value.x)
                && !float.IsNaN(value.y) && !float.IsInfinity(value.y)
                && !float.IsNaN(value.z) && !float.IsInfinity(value.z);
        }
    }
}
