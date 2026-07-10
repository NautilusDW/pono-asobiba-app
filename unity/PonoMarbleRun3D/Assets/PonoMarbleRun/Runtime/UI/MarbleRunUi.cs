using System;
using System.Collections.Generic;
using Pono.MarbleRun3D.Core;
using Pono.MarbleRun3D.Gameplay;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Pono.MarbleRun3D.UI
{
    [DisallowMultipleComponent]
    public sealed class SafeAreaPanel : MonoBehaviour
    {
        private Rect _lastSafeArea;
        private Vector2Int _lastScreen;

        private void OnEnable()
        {
            Apply();
        }

        private void Update()
        {
            if (_lastSafeArea != Screen.safeArea
                || _lastScreen.x != Screen.width
                || _lastScreen.y != Screen.height)
            {
                Apply();
            }
        }

        private void Apply()
        {
            var rect = transform as RectTransform;
            if (rect == null || Screen.width <= 0 || Screen.height <= 0) return;
            var reportedSafeArea = Screen.safeArea;
            var safe = ClampToScreen(reportedSafeArea, Screen.width, Screen.height);
            rect.anchorMin = new Vector2(safe.xMin / Screen.width, safe.yMin / Screen.height);
            rect.anchorMax = new Vector2(safe.xMax / Screen.width, safe.yMax / Screen.height);
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            _lastSafeArea = reportedSafeArea;
            _lastScreen = new Vector2Int(Screen.width, Screen.height);
        }

        public static Rect ClampToScreen(Rect safe, int width, int height)
        {
            if (width <= 0 || height <= 0) return Rect.zero;
            var xMin = Mathf.Clamp(safe.xMin, 0f, width);
            var yMin = Mathf.Clamp(safe.yMin, 0f, height);
            var xMax = Mathf.Clamp(safe.xMax, 0f, width);
            var yMax = Mathf.Clamp(safe.yMax, 0f, height);
            if (xMax - xMin < 1f || yMax - yMin < 1f)
                return new Rect(0f, 0f, width, height);
            return Rect.MinMaxRect(xMin, yMin, xMax, yMax);
        }
    }

    [DisallowMultipleComponent]
    public sealed class UiPulse : MonoBehaviour
    {
        public bool Active { get; set; }
        private Vector3 _baseScale = Vector3.one;

        private void OnEnable()
        {
            _baseScale = transform.localScale;
        }

        private void Update()
        {
            if (!Active)
            {
                transform.localScale = _baseScale;
                return;
            }
            var amount = 1f + Mathf.Sin(Time.unscaledTime * 5.4f) * 0.045f;
            transform.localScale = _baseScale * amount;
        }
    }

    [DisallowMultipleComponent]
    public sealed class PaletteDragItem : MonoBehaviour,
        IBeginDragHandler,
        IDragHandler,
        IEndDragHandler
    {
        private MarbleRunGameController _controller;
        private MarblePieceKind _kind;
        private ScrollRect _scrollRect;
        private bool _placing;
        private bool _scrolling;

        public void Configure(MarbleRunGameController controller, MarblePieceKind kind, ScrollRect scrollRect = null)
        {
            _controller = controller;
            _kind = kind;
            _scrollRect = scrollRect;
        }

        public void OnBeginDrag(PointerEventData eventData)
        {
            if (_controller == null) return;
            if (Mathf.Abs(eventData.delta.y) > Mathf.Abs(eventData.delta.x) * 1.25f)
            {
                _placing = false;
                _scrolling = _scrollRect != null;
                if (_scrolling) _scrollRect.OnBeginDrag(eventData);
                return;
            }
            _scrolling = false;
            _placing = true;
            _controller.BeginPaletteDrag(_kind, eventData.position);
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (_scrolling) _scrollRect.OnDrag(eventData);
            else if (_placing) _controller.UpdatePaletteDrag(eventData.position);
        }

        public void OnEndDrag(PointerEventData eventData)
        {
            if (_scrolling) _scrollRect.OnEndDrag(eventData);
            else if (_placing) _controller.EndPaletteDrag(eventData.position);
            _placing = false;
            _scrolling = false;
        }
    }

    [DisallowMultipleComponent]
    public sealed class MarbleRunUi : MonoBehaviour
    {
        private readonly Dictionary<MarblePieceKind, Button> _paletteButtons =
            new Dictionary<MarblePieceKind, Button>();
        private readonly Dictionary<MarblePieceKind, Text> _paletteLabels =
            new Dictionary<MarblePieceKind, Text>();

        private MarbleRunGameController _controller;
        private Font _font;
        private Canvas _canvas;
        private GameObject _safeRoot;
        private GameObject _menuPanel;
        private GameObject _samplePanel;
        private GameObject _builderTop;
        private GameObject _palettePanel;
        private GameObject _editActions;
        private GameObject _runActions;
        private GameObject _pausePanel;
        private GameObject _celebrationPanel;
        private GameObject _tutorialPanel;
        private Text _modeText;
        private Text _statusText;
        private Image _statusPanelImage;
        private Text _selectedText;
        private Text _heightText;
        private Text _viewText;
        private Text _tutorialText;
        private UiPulse _resetPulse;
        private UiPulse _rotatePulse;

        private static readonly Color Cream = new Color(1f, 0.95f, 0.82f, 0.97f);
        private static readonly Color Wood = new Color(0.52f, 0.29f, 0.13f, 0.98f);
        private static readonly Color Sky = new Color(0.34f, 0.78f, 0.92f, 0.96f);
        private static readonly Color Green = new Color(0.27f, 0.76f, 0.48f, 0.98f);
        private static readonly Color Coral = new Color(0.95f, 0.43f, 0.35f, 0.98f);
        private static readonly Color Purple = new Color(0.63f, 0.46f, 0.85f, 0.98f);
        private static readonly MarblePieceKind[] PaletteOrder =
        {
            MarblePieceKind.Start,
            MarblePieceKind.Goal,
            MarblePieceKind.Tornado,
            MarblePieceKind.Elevator,
            MarblePieceKind.ClearTube,
            MarblePieceKind.ClearCurve,
            MarblePieceKind.Wave,
            MarblePieceKind.Spinner,
            MarblePieceKind.Straight,
            MarblePieceKind.Curve,
            MarblePieceKind.Slope,
            MarblePieceKind.Helix,
            MarblePieceKind.Steps,
            MarblePieceKind.Lift,
            MarblePieceKind.Splitter,
            MarblePieceKind.Tunnel,
            MarblePieceKind.Funnel,
            MarblePieceKind.Seesaw,
            MarblePieceKind.Domino
        };

        public RectTransform SafeRootRect => _safeRoot?.transform as RectTransform;
        public string StatusText => _statusText != null ? _statusText.text : string.Empty;
        public string TutorialText => _tutorialText != null ? _tutorialText.text : string.Empty;
        public string HeightText => _heightText != null ? _heightText.text : string.Empty;

        public void Build(MarbleRunGameController controller)
        {
            _controller = controller;
            _font = Resources.Load<Font>("Fonts/NotoSansJP-Variable")
                ?? Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            ValidateCopy();
            EnsureEventSystem();
            BuildCanvas();
            BuildMenu();
            BuildSamplePanel();
            BuildBuilderTop();
            BuildPalette();
            BuildEditActions();
            BuildRunActions();
            BuildPausePanel();
            BuildCelebrationPanel();
            BuildTutorialPanel();
        }

        public void ShowMenu()
        {
            SetActive(_menuPanel, true);
            SetActive(_samplePanel, false);
            SetActive(_builderTop, false);
            SetActive(_palettePanel, false);
            SetActive(_editActions, false);
            SetActive(_runActions, false);
            SetActive(_pausePanel, false);
            SetActive(_celebrationPanel, false);
            SetActive(_tutorialPanel, false);
        }

        public void ShowBuilder(ModeDefinition mode)
        {
            SetActive(_menuPanel, false);
            SetActive(_samplePanel, false);
            SetActive(_builderTop, true);
            SetActive(_palettePanel, true);
            SetActive(_editActions, true);
            SetActive(_runActions, false);
            SetActive(_pausePanel, false);
            SetActive(_celebrationPanel, false);
            _modeText.text = mode?.DisplayName ?? "じゆうに つくる";
        }

        public void ShowSampleMenu()
        {
            ShowSamplePanel(true);
        }

        public void ShowRunning()
        {
            SetActive(_palettePanel, false);
            SetActive(_editActions, false);
            SetActive(_runActions, true);
            SetActive(_tutorialPanel, false);
            SetSelected(null);
        }

        public void ShowPause(bool visible)
        {
            SetActive(_pausePanel, visible);
            if (visible) _pausePanel.transform.SetAsLastSibling();
        }

        public void ShowCelebration(bool visible)
        {
            SetActive(_celebrationPanel, visible);
            SetActive(_runActions, !visible);
        }

        public void ShowTutorialGuide(string text, bool visible)
        {
            if (_tutorialText != null) _tutorialText.text = text;
            SetActive(_tutorialPanel, visible);
        }

        public void SetStatus(string text, bool invalid)
        {
            if (_statusText == null) return;
            _statusText.text = invalid ? "×  " + text : "○  " + text;
            _statusText.color = invalid ? new Color(0.54f, 0.10f, 0.06f) : new Color(0.08f, 0.31f, 0.22f);
            _statusPanelImage.color = invalid
                ? new Color(1f, 0.77f, 0.68f, 0.98f)
                : new Color(0.78f, 1f, 0.82f, 0.98f);
        }

        public void SetSelected(PieceRecord piece)
        {
            if (_selectedText == null) return;
            _selectedText.text = piece == null
                ? "おいた ぶひんを おしてね"
                : "えらんだよ  " + PartCatalog.Get(piece.kind).DisplayName;
            if (_rotatePulse != null) _rotatePulse.Active = piece != null && !piece.locked;
        }

        public void SetInventory(ModeDefinition mode, CourseData course)
        {
            if (mode == null || course == null) return;
            foreach (var pair in _paletteButtons)
            {
                var kind = pair.Key;
                var limit = mode.LimitFor(kind);
                var remaining = mode.Remaining(kind, course.pieces);
                pair.Value.gameObject.SetActive(limit != 0);
                pair.Value.interactable = limit < 0 || remaining > 0;
                var countText = limit < 0 ? "たくさん" : "のこり " + ToFullWidthDigits(remaining);
                _paletteLabels[kind].text = PartCatalog.Get(kind).DisplayName + "\n" + countText;
            }
        }

        public void SetResetAttention(bool attention)
        {
            if (_resetPulse != null) _resetPulse.Active = attention;
        }

        public void SetHeightLevel(int level)
        {
            if (_heightText != null)
                _heightText.text = "たかさ " + ToFullWidthDigits(Mathf.Max(0, level) + 1);
        }

        public void SetCameraView(bool topView)
        {
            if (_viewText != null) _viewText.text = topView ? "ななめ" : "うえから";
        }

        private void EnsureEventSystem()
        {
            if (EventSystem.current != null) return;
            var eventSystem = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
            eventSystem.transform.SetParent(transform, false);
        }

        private void BuildCanvas()
        {
            var canvasObject = new GameObject("Canvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasObject.transform.SetParent(transform, false);
            _canvas = canvasObject.GetComponent<Canvas>();
            _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            _canvas.sortingOrder = 100;
            var scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.50f;

            _safeRoot = CreateRect("SafeArea", canvasObject.transform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            _safeRoot.AddComponent<SafeAreaPanel>();
        }

        private void BuildMenu()
        {
            _menuPanel = CreatePanel("Menu", _safeRoot.transform, new Vector2(0.16f, 0.05f), new Vector2(0.84f, 0.95f),
                new Color(1f, 0.95f, 0.82f, 0.97f), 26);
            var title = CreateText("Title", _menuPanel.transform, "ポノの マーブルラン", 50, FontStyle.Bold,
                new Color(0.38f, 0.20f, 0.09f), TextAnchor.MiddleCenter);
            SetRect(title.rectTransform, new Vector2(0.06f, 0.82f), new Vector2(0.94f, 0.97f));
            var subtitle = CreateText("Subtitle", _menuPanel.transform, "つくって ころがして かえてみよう", 26,
                FontStyle.Normal, new Color(0.18f, 0.45f, 0.52f), TextAnchor.MiddleCenter);
            SetRect(subtitle.rectTransform, new Vector2(0.06f, 0.73f), new Vector2(0.94f, 0.83f));

            var buttons = CreateRect("ModeButtons", _menuPanel.transform, new Vector2(0.12f, 0.08f), new Vector2(0.88f, 0.72f),
                Vector2.zero, Vector2.zero);
            var layout = buttons.AddComponent<GridLayoutGroup>();
            layout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 2;
            layout.cellSize = new Vector2(250f, 74f);
            layout.spacing = new Vector2(14f, 12f);
            layout.childAlignment = TextAnchor.MiddleCenter;

            CreateButton("Starter", buttons.transform, "すぐ ころがす", new Color(0.99f, 0.76f, 0.24f),
                () => _controller.StartMode("starter"));
            CreateButton("Tutorial", buttons.transform, "あそびかた", Sky, () => _controller.StartMode("tutorial"));
            CreateButton("Challenge1", buttons.transform, "チャレンジ １", new Color(0.96f, 0.63f, 0.28f),
                () => _controller.StartMode("challenge1"));
            CreateButton("Challenge2", buttons.transform, "チャレンジ ２", Green,
                () => _controller.StartMode("challenge2"));
            CreateButton("Challenge3", buttons.transform, "チャレンジ ３", Purple,
                () => _controller.StartMode("challenge3"));
            var sandbox = CreateButton("Sandbox", buttons.transform, "じゆうに つくる", Coral,
                () => _controller.StartMode("sandbox"));
            var sandboxLayout = sandbox.gameObject.AddComponent<LayoutElement>();
            sandboxLayout.minWidth = 310f;
            CreateButton("Samples", buttons.transform, "みほん コース", new Color(1f, 0.78f, 0.30f),
                ShowSampleMenu);
        }

        private void BuildSamplePanel()
        {
            _samplePanel = CreatePanel("Samples", _safeRoot.transform, new Vector2(0.14f, 0.06f), new Vector2(0.86f, 0.94f),
                new Color(1f, 0.95f, 0.82f, 0.99f), 28);
            var title = CreateText("SamplesTitle", _samplePanel.transform, "みほん コース", 43, FontStyle.Bold,
                Wood, TextAnchor.MiddleCenter);
            SetRect(title.rectTransform, new Vector2(0.06f, 0.82f), new Vector2(0.94f, 0.96f));
            var note = CreateText("SamplesNote", _samplePanel.transform, "えらんで ころがして かえてみよう", 24,
                FontStyle.Bold, Wood, TextAnchor.MiddleCenter);
            SetRect(note.rectTransform, new Vector2(0.06f, 0.70f), new Vector2(0.94f, 0.82f));

            var buttons = CreateRect("SampleButtons", _samplePanel.transform, new Vector2(0.08f, 0.20f), new Vector2(0.92f, 0.70f),
                Vector2.zero, Vector2.zero);
            var layout = buttons.AddComponent<GridLayoutGroup>();
            layout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 2;
            layout.cellSize = new Vector2(280f, 82f);
            layout.spacing = new Vector2(18f, 10f);
            layout.childAlignment = TextAnchor.MiddleCenter;

            CreateButton("Sample1", buttons.transform, "はじめての みち", Sky,
                () => _controller.StartMode("sample1"), 21);
            CreateButton("Sample2", buttons.transform, "にじいろ タワー", Coral,
                () => _controller.StartMode("sample2"), 21);
            CreateButton("Sample3", buttons.transform, "そらの まよいみち", Purple,
                () => _controller.StartMode("sample3"), 21);
            CreateButton("Sample4", buttons.transform, "のぼって おりて", Green,
                () => _controller.StartMode("sample4"), 21);
            CreateButton("Sample5", buttons.transform, "トルネード タワー", new Color(0.98f, 0.60f, 0.22f),
                () => _controller.StartMode("sample5"), 21);
            CreateButton("Sample6", buttons.transform, "エレベーター シティ", new Color(0.35f, 0.72f, 0.88f),
                () => _controller.StartMode("sample6"), 21);

            var back = CreateButton("SamplesBack", _samplePanel.transform, "もどる", Wood,
                ShowMenu, 23);
            SetRect(back.GetComponent<RectTransform>(), new Vector2(0.35f, 0.05f), new Vector2(0.65f, 0.16f));
            SetActive(_samplePanel, false);
        }

        private void ShowSamplePanel(bool visible)
        {
            SetActive(_menuPanel, !visible);
            SetActive(_samplePanel, visible);
            if (visible) _samplePanel.transform.SetAsLastSibling();
        }

        private void BuildBuilderTop()
        {
            _builderTop = CreatePanel("BuilderTop", _safeRoot.transform, new Vector2(0.01f, 0.84f), new Vector2(0.99f, 0.99f), Cream, 18);
            var back = CreateButton("Back", _builderTop.transform, "もどる", Wood, _controller.ShowMenu, 18);
            SetRect(back.GetComponent<RectTransform>(), new Vector2(0.012f, 0.53f), new Vector2(0.13f, 0.95f));
            _modeText = CreateText("Mode", _builderTop.transform, "じゆうに つくる", 29, FontStyle.Bold, Wood, TextAnchor.MiddleCenter);
            SetRect(_modeText.rectTransform, new Vector2(0.14f, 0.53f), new Vector2(0.47f, 0.96f));

            var levelDown = CreateButton("LevelDown", _builderTop.transform, "▼ した", Sky,
                () => _controller.ChangePlacementLevel(-1), 15);
            SetRect(levelDown.GetComponent<RectTransform>(), new Vector2(0.48f, 0.53f), new Vector2(0.545f, 0.95f));
            _heightText = CreateText("Height", _builderTop.transform, "たかさ １", 19, FontStyle.Bold,
                Wood, TextAnchor.MiddleCenter);
            SetRect(_heightText.rectTransform, new Vector2(0.548f, 0.53f), new Vector2(0.655f, 0.95f));
            var levelUp = CreateButton("LevelUp", _builderTop.transform, "▲ うえ", Green,
                () => _controller.ChangePlacementLevel(1), 15);
            SetRect(levelUp.GetComponent<RectTransform>(), new Vector2(0.658f, 0.53f), new Vector2(0.72f, 0.95f));

            var save = CreateButton("Save", _builderTop.transform, "ほぞん", Green, _controller.SaveCourse, 17);
            SetRect(save.GetComponent<RectTransform>(), new Vector2(0.73f, 0.53f), new Vector2(0.81f, 0.95f));
            var load = CreateButton("Load", _builderTop.transform, "よみこむ", Sky, _controller.LoadCourse, 17);
            SetRect(load.GetComponent<RectTransform>(), new Vector2(0.82f, 0.53f), new Vector2(0.91f, 0.95f));
            var resetView = CreateButton("View", _builderTop.transform, "うえから", Purple, _controller.ToggleCameraAngle, 15);
            _viewText = resetView.GetComponentInChildren<Text>();
            SetRect(resetView.GetComponent<RectTransform>(), new Vector2(0.92f, 0.53f), new Vector2(0.992f, 0.95f));

            _selectedText = CreateText("Selected", _builderTop.transform, "おいた ぶひんを おしてね", 20, FontStyle.Bold,
                new Color(0.38f, 0.20f, 0.09f), TextAnchor.MiddleLeft);
            SetRect(_selectedText.rectTransform, new Vector2(0.012f, 0.04f), new Vector2(0.34f, 0.48f));
            var statusPanel = CreatePanel("Status", _builderTop.transform, new Vector2(0.35f, 0.04f), new Vector2(0.99f, 0.48f),
                new Color(0.78f, 1f, 0.82f, 0.98f), 14);
            _statusPanelImage = statusPanel.GetComponent<Image>();
            _statusText = CreateText("StatusText", statusPanel.transform, "○  ぶひんを えらぼう", 22, FontStyle.Bold,
                new Color(0.08f, 0.31f, 0.22f), TextAnchor.MiddleCenter);
            Stretch(_statusText.rectTransform, 8f);
        }

        private void BuildPalette()
        {
            _palettePanel = CreatePanel("Palette", _safeRoot.transform, new Vector2(0.01f, 0.18f), new Vector2(0.175f, 0.83f), Cream, 18);
            var heading = CreateText("PaletteTitle", _palettePanel.transform, "ぶひん", 25, FontStyle.Bold, Wood, TextAnchor.MiddleCenter);
            SetRect(heading.rectTransform, new Vector2(0.05f, 0.89f), new Vector2(0.95f, 0.99f));

            var scrollObject = CreateRect("Scroll", _palettePanel.transform, new Vector2(0.04f, 0.03f), new Vector2(0.96f, 0.89f),
                Vector2.zero, Vector2.zero);
            var scroll = scrollObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.vertical = true;
            scroll.movementType = ScrollRect.MovementType.Elastic;
            scroll.scrollSensitivity = 22f;

            var viewport = CreateRect("Viewport", scrollObject.transform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            viewport.AddComponent<RectMask2D>();
            var viewportImage = viewport.AddComponent<Image>();
            viewportImage.color = new Color(1f, 1f, 1f, 0.025f);
            scroll.viewport = viewport.GetComponent<RectTransform>();

            var content = CreateRect("Content", viewport.transform, new Vector2(0f, 1f), new Vector2(1f, 1f), Vector2.zero, Vector2.zero);
            var contentRect = content.GetComponent<RectTransform>();
            contentRect.pivot = new Vector2(0.5f, 1f);
            var vertical = content.AddComponent<VerticalLayoutGroup>();
            vertical.childAlignment = TextAnchor.UpperCenter;
            vertical.spacing = 10f;
            vertical.padding = new RectOffset(5, 5, 5, 8);
            vertical.childControlHeight = true;
            vertical.childForceExpandHeight = false;
            var fitter = content.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scroll.content = contentRect;

            for (var index = 0; index < PaletteOrder.Length; index++)
            {
                var kind = PaletteOrder[index];
                var accent = PartCatalog.Get(kind).Accent;
                var button = CreateButton("Part" + kind, content.transform, PartCatalog.Get(kind).DisplayName,
                    new Color(accent.r, accent.g, accent.b, 0.98f), () => _controller.ChoosePart(kind), 19);
                var layout = button.gameObject.AddComponent<LayoutElement>();
                layout.preferredHeight = 74f;
                layout.minHeight = 68f;
                layout.flexibleWidth = 1f;
                var drag = button.gameObject.AddComponent<PaletteDragItem>();
                drag.Configure(_controller, kind, scroll);
                _paletteButtons[kind] = button;
                _paletteLabels[kind] = button.GetComponentInChildren<Text>();
            }
        }

        private void BuildEditActions()
        {
            _editActions = CreatePanel("EditActions", _safeRoot.transform, new Vector2(0.18f, 0.015f), new Vector2(0.99f, 0.165f), Cream, 18);
            var layout = _editActions.AddComponent<HorizontalLayoutGroup>();
            layout.padding = new RectOffset(10, 10, 10, 10);
            layout.spacing = 8f;
            layout.childControlWidth = true;
            layout.childForceExpandWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandHeight = true;
            var rotate = CreateButton("Rotate", _editActions.transform, "↻ くるっ\nみぎに まわす", Sky,
                _controller.RotateSelection, 17);
            _rotatePulse = rotate.gameObject.AddComponent<UiPulse>();
            CreateButton("Delete", _editActions.transform, "けす", Coral, _controller.DeleteSelection, 20);
            CreateButton("Undo", _editActions.transform, "ひとつ\nもどす", Purple, _controller.Undo, 18);
            CreateButton("Clear", _editActions.transform, "ぜんぶ\nけす", new Color(0.90f, 0.53f, 0.30f), _controller.RequestClearAll, 18);
            CreateButton("Run", _editActions.transform, "ためす", Green, _controller.StartRun, 24);
        }

        private void BuildRunActions()
        {
            _runActions = CreatePanel("RunActions", _safeRoot.transform, new Vector2(0.22f, 0.02f), new Vector2(0.98f, 0.15f), Cream, 18);
            var layout = _runActions.AddComponent<HorizontalLayoutGroup>();
            layout.padding = new RectOffset(12, 12, 10, 10);
            layout.spacing = 16f;
            layout.childControlWidth = true;
            layout.childForceExpandWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandHeight = true;
            var reset = CreateButton("ResetMarble", _runActions.transform, "たまを もどす", Sky, _controller.ResetMarble, 23);
            _resetPulse = reset.gameObject.AddComponent<UiPulse>();
            CreateButton("Pause", _runActions.transform, "いったん とめる", Purple, () => _controller.SetPaused(true), 21);
            CreateButton("Edit", _runActions.transform, "つくりなおす", Green, _controller.ReturnToEditing, 22);
        }

        private void BuildPausePanel()
        {
            _pausePanel = CreatePanel("Pause", _safeRoot.transform, new Vector2(0.28f, 0.20f), new Vector2(0.72f, 0.80f),
                new Color(1f, 0.95f, 0.82f, 0.99f), 28);
            var title = CreateText("PauseTitle", _pausePanel.transform, "いったん おやすみ", 39, FontStyle.Bold, Wood, TextAnchor.MiddleCenter);
            SetRect(title.rectTransform, new Vector2(0.08f, 0.66f), new Vector2(0.92f, 0.90f));
            var note = CreateText("PauseNote", _pausePanel.transform, "たまも しかけも とまっているよ", 23, FontStyle.Normal,
                new Color(0.20f, 0.46f, 0.50f), TextAnchor.MiddleCenter);
            SetRect(note.rectTransform, new Vector2(0.08f, 0.48f), new Vector2(0.92f, 0.68f));
            var resume = CreateButton("Resume", _pausePanel.transform, "つづける", Green, () => _controller.SetPaused(false), 28);
            SetRect(resume.GetComponent<RectTransform>(), new Vector2(0.18f, 0.20f), new Vector2(0.82f, 0.44f));
        }

        private void BuildCelebrationPanel()
        {
            _celebrationPanel = CreatePanel("Celebration", _safeRoot.transform, new Vector2(0.28f, 0.23f), new Vector2(0.72f, 0.82f),
                new Color(1f, 0.91f, 0.56f, 0.98f), 30);
            var stars = CreateText("Stars", _celebrationPanel.transform, "★  ★  ★", 44, FontStyle.Bold,
                new Color(0.96f, 0.48f, 0.16f), TextAnchor.MiddleCenter);
            SetRect(stars.rectTransform, new Vector2(0.06f, 0.77f), new Vector2(0.94f, 0.96f));
            var goal = CreateText("Goal", _celebrationPanel.transform, "ゴール！", 54, FontStyle.Bold,
                new Color(0.40f, 0.21f, 0.08f), TextAnchor.MiddleCenter);
            SetRect(goal.rectTransform, new Vector2(0.06f, 0.52f), new Vector2(0.94f, 0.80f));
            var yay = CreateText("Yay", _celebrationPanel.transform, "やったね！", 31, FontStyle.Bold,
                new Color(0.18f, 0.55f, 0.38f), TextAnchor.MiddleCenter);
            SetRect(yay.rectTransform, new Vector2(0.06f, 0.38f), new Vector2(0.94f, 0.56f));
            var edit = CreateButton("ContinueEdit", _celebrationPanel.transform, "コースを かえる", Green,
                _controller.ReturnToEditing, 25);
            SetRect(edit.GetComponent<RectTransform>(), new Vector2(0.17f, 0.11f), new Vector2(0.83f, 0.35f));
        }

        private void BuildTutorialPanel()
        {
            _tutorialPanel = CreatePanel("TutorialGuide", _safeRoot.transform, new Vector2(0.27f, 0.72f), new Vector2(0.73f, 0.83f),
                new Color(0.78f, 1f, 0.90f, 0.98f), 18);
            _tutorialText = CreateText("TutorialText", _tutorialPanel.transform, "ぶひんを ひっぱって おこう", 25,
                FontStyle.Bold, new Color(0.08f, 0.34f, 0.23f), TextAnchor.MiddleCenter);
            Stretch(_tutorialText.rectTransform, 8f);
        }

        private Button CreateButton(
            string name,
            Transform parent,
            string label,
            Color color,
            Action action,
            int fontSize = 23)
        {
            var buttonObject = CreatePanel(name, parent, Vector2.zero, Vector2.one, color, 16);
            var rect = buttonObject.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(180f, 64f);
            var button = buttonObject.AddComponent<Button>();
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1.08f, 1.08f, 1.08f);
            colors.pressedColor = new Color(0.82f, 0.82f, 0.82f);
            colors.disabledColor = new Color(0.62f, 0.62f, 0.62f, 0.72f);
            colors.colorMultiplier = 1f;
            button.colors = colors;
            if (action != null) button.onClick.AddListener(() => action());
            var text = CreateText("Label", buttonObject.transform, label, fontSize, FontStyle.Bold,
                new Color(0.20f, 0.10f, 0.05f), TextAnchor.MiddleCenter);
            Stretch(text.rectTransform, 6f);
            return button;
        }

        private Text CreateText(
            string name,
            Transform parent,
            string value,
            int fontSize,
            FontStyle style,
            Color color,
            TextAnchor alignment)
        {
            var textObject = CreateRect(name, parent, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var text = textObject.AddComponent<Text>();
            text.font = _font;
            text.text = value;
            text.fontSize = fontSize;
            text.fontStyle = style;
            text.color = color;
            text.alignment = alignment;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.supportRichText = false;
            text.raycastTarget = false;
            return text;
        }

        private GameObject CreatePanel(
            string name,
            Transform parent,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Color color,
            int radius)
        {
            var panel = CreateRect(name, parent, anchorMin, anchorMax, Vector2.zero, Vector2.zero);
            var image = panel.AddComponent<Image>();
            image.sprite = RoundedSpriteCache.Get(radius);
            image.type = Image.Type.Sliced;
            image.color = color;
            return panel;
        }

        private static GameObject CreateRect(
            string name,
            Transform parent,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Vector2 offsetMin,
            Vector2 offsetMax)
        {
            var gameObject = new GameObject(name, typeof(RectTransform));
            gameObject.transform.SetParent(parent, false);
            var rect = gameObject.GetComponent<RectTransform>();
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
            return gameObject;
        }

        private static void SetRect(RectTransform rect, Vector2 anchorMin, Vector2 anchorMax)
        {
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        private static void Stretch(RectTransform rect, float inset)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(inset, inset);
            rect.offsetMax = new Vector2(-inset, -inset);
        }

        private static void SetActive(GameObject gameObject, bool active)
        {
            if (gameObject != null) gameObject.SetActive(active);
        }

        private static string ToFullWidthDigits(int value)
        {
            var source = value.ToString();
            var chars = source.ToCharArray();
            for (var i = 0; i < chars.Length; i++)
            {
                if (chars[i] >= '0' && chars[i] <= '9') chars[i] = (char)('０' + chars[i] - '0');
            }
            return new string(chars);
        }

        private static void ValidateCopy()
        {
            for (var i = 0; i < MarbleRunCopy.All.Count; i++)
            {
                if (!ChildFacingTextValidator.IsKanaSafe(MarbleRunCopy.All[i], out var invalid))
                {
                    Debug.LogError("Child-facing copy contains a disallowed character: " + invalid);
                }
            }
        }

        private static class RoundedSpriteCache
        {
            private static readonly Dictionary<int, Sprite> Cache = new Dictionary<int, Sprite>();

            public static Sprite Get(int radius)
            {
                radius = Mathf.Clamp(radius, 6, 30);
                if (Cache.TryGetValue(radius, out var sprite)) return sprite;
                const int size = 64;
                var texture = new Texture2D(size, size, TextureFormat.RGBA32, false)
                {
                    name = "まるい パネル",
                    filterMode = FilterMode.Bilinear,
                    wrapMode = TextureWrapMode.Clamp
                };
                var pixels = new Color32[size * size];
                var r = radius;
                for (var y = 0; y < size; y++)
                {
                    for (var x = 0; x < size; x++)
                    {
                        var dx = Mathf.Max(r - x, x - (size - 1 - r), 0);
                        var dy = Mathf.Max(r - y, y - (size - 1 - r), 0);
                        var distance = Mathf.Sqrt(dx * dx + dy * dy);
                        var alpha = (byte)Mathf.RoundToInt(Mathf.Clamp01(r + 0.5f - distance) * 255f);
                        pixels[y * size + x] = new Color32(255, 255, 255, alpha);
                    }
                }
                texture.SetPixels32(pixels);
                texture.Apply(false, true);
                sprite = Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f,
                    0, SpriteMeshType.FullRect, new Vector4(radius, radius, radius, radius));
                sprite.name = "まるい パネル";
                Cache[radius] = sprite;
                return sprite;
            }
        }
    }
}
