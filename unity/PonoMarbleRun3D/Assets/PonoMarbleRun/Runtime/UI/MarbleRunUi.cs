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
        private Action _onSelected;
        private bool _placing;
        private bool _scrolling;

        public void Configure(
            MarbleRunGameController controller,
            MarblePieceKind kind,
            ScrollRect scrollRect = null,
            Action onSelected = null)
        {
            _controller = controller;
            _kind = kind;
            _scrollRect = scrollRect;
            _onSelected = onSelected;
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
            _onSelected?.Invoke();
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
        private readonly Dictionary<MarblePieceKind, GameObject> _paletteSelectionMarks =
            new Dictionary<MarblePieceKind, GameObject>();

        private MarbleRunGameController _controller;
        private Font _displayFont;
        private Font _bodyFont;
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
        private Outline _statusPanelOutline;
        private Text _selectedText;
        private Image _selectedCardImage;
        private Outline _selectedCardOutline;
        private GameObject _selectedPieceMarker;
        private Image _selectedPieceMarkerImage;
        private Text _heightText;
        private Text _viewText;
        private Text _followText;
        private Text _tutorialText;
        private UiPulse _resetPulse;
        private UiPulse _rotatePulse;
        private MarblePieceKind? _paletteChoice;
        private const string DisplayFontResourcePath = "Fonts/KosugiMaru-Regular";
        private const string BodyFontResourcePath = "Fonts/NotoSansJP-Variable";

        // uGUI colors reach the finished Player close to their authored sRGB values, even
        // though 3D rendering uses Linear. Reuse four soft hues and one paper family.
        private static readonly Color Sky = new Color(0.663f, 0.863f, 0.949f, 0.99f);
        private static readonly Color Green = new Color(0.722f, 0.886f, 0.757f, 0.99f);
        private static readonly Color Coral = new Color(0.957f, 0.714f, 0.690f, 0.99f);
        private static readonly Color Lavender = new Color(0.831f, 0.765f, 0.925f, 0.99f);
        private static readonly Color CocoaText = new Color(0.349f, 0.271f, 0.298f, 1f);
        private static readonly Color MutedText = new Color(0.36f, 0.29f, 0.32f, 1f);
        private static readonly Color CardShadow = new Color(0.25f, 0.18f, 0.22f, 0.13f);
        private static readonly Color SoftSkyPaper = new Color(0.949f, 0.980f, 0.992f, 0.98f);
        private static readonly Color SoftPeachPaper = new Color(1f, 0.976f, 0.949f, 0.98f);
        private static readonly Color SoftLavenderPaper = new Color(0.973f, 0.953f, 0.988f, 0.98f);
        private static readonly Color SelectionGold = Coral;
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
        public string FollowText => _followText != null ? _followText.text : string.Empty;

        public void Build(MarbleRunGameController controller)
        {
            _controller = controller;
            _bodyFont = LoadJapaneseBodyFont();
            _displayFont = Resources.Load<Font>(DisplayFontResourcePath) ?? _bodyFont;
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
            SetPaletteChoice(null);
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
            SetPaletteChoice(null);
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
            _statusText.color = CocoaText;
            _statusPanelImage.color = invalid
                ? Coral
                : Green;
            if (_statusPanelOutline != null)
                _statusPanelOutline.effectColor = CardEdge(invalid ? Coral : Green, 0.56f);
        }

        public void SetSelected(PieceRecord piece)
        {
            if (_selectedText != null)
            {
                _selectedText.text = piece == null
                    ? "おいた ぶひんを おしてね"
                    : "えらんだよ  " + PartCatalog.Get(piece.kind).DisplayName;
            }

            if (piece != null) SetPaletteChoice(null);
            var accent = piece == null ? SoftLavenderPaper : PastelAccent(PartCatalog.Get(piece.kind).Accent);
            if (_selectedCardImage != null)
                _selectedCardImage.color = piece == null ? SoftLavenderPaper : Color.Lerp(accent, SoftSkyPaper, 0.10f);
            if (_selectedCardOutline != null)
                _selectedCardOutline.effectColor = CardEdge(piece == null ? Lavender : accent, piece == null ? 0.46f : 0.78f);
            if (_selectedPieceMarkerImage != null)
                _selectedPieceMarkerImage.color = piece == null ? SelectionGold : Color.Lerp(accent, SelectionGold, 0.36f);
            SetActive(_selectedPieceMarker, piece != null);
            if (_rotatePulse != null) _rotatePulse.Active = piece != null && !piece.locked;
        }

        public void SetInventory(ModeDefinition mode, CourseData course)
        {
            if (mode == null || course == null) return;
            SetPaletteChoice(null);
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

        public void SetCameraFollow(bool following)
        {
            if (_followText != null) _followText.text = following ? "みわたす" : "おいかける";
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
                SoftPeachPaper, 26);
            StyleCard(_menuPanel, Sky, new Vector2(0f, -6f));
            CreateHeadingPlate("TitleTag", _menuPanel.transform, new Vector2(0.11f, 0.82f), new Vector2(0.89f, 0.97f),
                Sky, 24);
            var title = CreateText("Title", _menuPanel.transform, "ポノの マーブルラン", 48, FontStyle.Bold,
                CocoaText, TextAnchor.MiddleCenter);
            SetRect(title.rectTransform, new Vector2(0.06f, 0.82f), new Vector2(0.94f, 0.97f));
            CreateHeadingPlate("SubtitleTag", _menuPanel.transform, new Vector2(0.18f, 0.725f), new Vector2(0.82f, 0.825f),
                SoftLavenderPaper, 18);
            var subtitle = CreateText("Subtitle", _menuPanel.transform, "つくって ころがして かえてみよう", 24,
                FontStyle.Normal, MutedText, TextAnchor.MiddleCenter);
            SetRect(subtitle.rectTransform, new Vector2(0.06f, 0.73f), new Vector2(0.94f, 0.83f));

            var buttons = CreateRect("ModeButtons", _menuPanel.transform, new Vector2(0.12f, 0.08f), new Vector2(0.88f, 0.72f),
                Vector2.zero, Vector2.zero);
            var layout = buttons.AddComponent<GridLayoutGroup>();
            layout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 2;
            layout.cellSize = new Vector2(250f, 74f);
            layout.spacing = new Vector2(14f, 12f);
            layout.childAlignment = TextAnchor.MiddleCenter;

            CreateMenuButton("Starter", buttons.transform, "すぐ ころがす", Sky, Coral, "★",
                () => _controller.StartMode("starter"));
            CreateMenuButton("Tutorial", buttons.transform, "あそびかた", Sky, Lavender, "●",
                () => _controller.StartMode("tutorial"));
            CreateMenuButton("Challenge1", buttons.transform, "チャレンジ １", Coral, Sky, "◆",
                () => _controller.StartMode("challenge1"));
            CreateMenuButton("Challenge2", buttons.transform, "チャレンジ ２", Green, Coral, "♥",
                () => _controller.StartMode("challenge2"));
            CreateMenuButton("Challenge3", buttons.transform, "チャレンジ ３", Lavender, Sky, "＋",
                () => _controller.StartMode("challenge3"));
            var sandbox = CreateMenuButton("Sandbox", buttons.transform, "じゆうに つくる", Coral, Sky, "◎",
                () => _controller.StartMode("sandbox"));
            var sandboxLayout = sandbox.gameObject.AddComponent<LayoutElement>();
            sandboxLayout.minWidth = 310f;
            CreateMenuButton("Samples", buttons.transform, "みほん コース", Sky, Green, "▲", ShowSampleMenu);
        }

        private void BuildSamplePanel()
        {
            _samplePanel = CreatePanel("Samples", _safeRoot.transform, new Vector2(0.14f, 0.06f), new Vector2(0.86f, 0.94f),
                SoftLavenderPaper, 28);
            StyleCard(_samplePanel, Lavender, new Vector2(0f, -6f));
            CreateHeadingPlate("SamplesTitleTag", _samplePanel.transform, new Vector2(0.17f, 0.82f), new Vector2(0.83f, 0.96f),
                Sky, 24);
            var title = CreateText("SamplesTitle", _samplePanel.transform, "みほん コース", 40, FontStyle.Bold,
                CocoaText, TextAnchor.MiddleCenter);
            SetRect(title.rectTransform, new Vector2(0.06f, 0.82f), new Vector2(0.94f, 0.96f));
            CreateHeadingPlate("SamplesNoteTag", _samplePanel.transform, new Vector2(0.18f, 0.705f), new Vector2(0.82f, 0.815f),
                SoftSkyPaper, 18);
            var note = CreateText("SamplesNote", _samplePanel.transform, "えらんで ころがして かえてみよう", 22,
                FontStyle.Normal, MutedText, TextAnchor.MiddleCenter);
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
            CreateButton("Sample3", buttons.transform, "そらの まよいみち", Lavender,
                () => _controller.StartMode("sample3"), 21);
            CreateButton("Sample4", buttons.transform, "のぼって おりて", Green,
                () => _controller.StartMode("sample4"), 21);
            CreateButton("Sample5", buttons.transform, "トルネード タワー", Coral,
                () => _controller.StartMode("sample5"), 21);
            CreateButton("Sample6", buttons.transform, "エレベーター シティ", Sky,
                () => _controller.StartMode("sample6"), 21);

            var back = CreateButton("SamplesBack", _samplePanel.transform, "もどる", Lavender,
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
            _builderTop = CreatePanel("BuilderTop", _safeRoot.transform, new Vector2(0.01f, 0.84f), new Vector2(0.99f, 0.99f),
                SoftSkyPaper, 18);
            StyleCard(_builderTop, Sky, new Vector2(0f, -4f));
            var back = CreateButton("Back", _builderTop.transform, "もどる", Lavender, _controller.ShowMenu, 18);
            SetRect(back.GetComponent<RectTransform>(), new Vector2(0.012f, 0.53f), new Vector2(0.13f, 0.95f));
            CreateHeadingPlate("ModeTag", _builderTop.transform, new Vector2(0.145f, 0.56f), new Vector2(0.465f, 0.94f),
                SoftPeachPaper, 16);
            _modeText = CreateText("Mode", _builderTop.transform, "じゆうに つくる", 27, FontStyle.Bold, CocoaText, TextAnchor.MiddleCenter);
            SetRect(_modeText.rectTransform, new Vector2(0.14f, 0.53f), new Vector2(0.47f, 0.96f));

            var levelDown = CreateButton("LevelDown", _builderTop.transform, "▼ した", Sky,
                () => _controller.ChangePlacementLevel(-1), 15);
            SetRect(levelDown.GetComponent<RectTransform>(), new Vector2(0.48f, 0.53f), new Vector2(0.545f, 0.95f));
            CreateHeadingPlate("HeightTag", _builderTop.transform, new Vector2(0.55f, 0.57f), new Vector2(0.653f, 0.93f),
                SoftLavenderPaper, 14);
            _heightText = CreateText("Height", _builderTop.transform, "たかさ １", 19, FontStyle.Bold,
                CocoaText, TextAnchor.MiddleCenter);
            SetRect(_heightText.rectTransform, new Vector2(0.548f, 0.53f), new Vector2(0.655f, 0.95f));
            var levelUp = CreateButton("LevelUp", _builderTop.transform, "▲ うえ", Green,
                () => _controller.ChangePlacementLevel(1), 15);
            SetRect(levelUp.GetComponent<RectTransform>(), new Vector2(0.658f, 0.53f), new Vector2(0.72f, 0.95f));

            var save = CreateButton("Save", _builderTop.transform, "ほぞん", Green, _controller.SaveCourse, 17);
            SetRect(save.GetComponent<RectTransform>(), new Vector2(0.73f, 0.53f), new Vector2(0.81f, 0.95f));
            var load = CreateButton("Load", _builderTop.transform, "よみこむ", Sky, _controller.LoadCourse, 17);
            SetRect(load.GetComponent<RectTransform>(), new Vector2(0.82f, 0.53f), new Vector2(0.91f, 0.95f));
            var resetView = CreateButton("View", _builderTop.transform, "うえから", Lavender, _controller.ToggleCameraAngle, 15);
            _viewText = resetView.GetComponentInChildren<Text>();
            SetRect(resetView.GetComponent<RectTransform>(), new Vector2(0.92f, 0.53f), new Vector2(0.992f, 0.95f));

            var selectedCard = CreatePanel("SelectedCard", _builderTop.transform, new Vector2(0.012f, 0.04f), new Vector2(0.34f, 0.48f),
                SoftLavenderPaper, 14);
            _selectedCardImage = selectedCard.GetComponent<Image>();
            _selectedCardImage.raycastTarget = false;
            AddDropShadow(_selectedCardImage, new Color(CardShadow.r, CardShadow.g, CardShadow.b, 0.11f), new Vector2(0f, -2f));
            _selectedCardOutline = AddOutline(_selectedCardImage, CardEdge(Lavender, 0.46f), new Vector2(1f, -1f));
            _selectedPieceMarker = CreateDecoration("SelectedMarker", selectedCard.transform,
                new Vector2(0.025f, 0.22f), new Vector2(0.072f, 0.78f), SelectionGold, 14);
            _selectedPieceMarkerImage = _selectedPieceMarker.GetComponent<Image>();
            AddOutline(_selectedPieceMarkerImage, CardEdge(SelectionGold, 0.84f), new Vector2(1f, -1f));
            SetActive(_selectedPieceMarker, false);

            _selectedText = CreateText("Selected", _builderTop.transform, "おいた ぶひんを おしてね", 19, FontStyle.Normal,
                MutedText, TextAnchor.MiddleLeft);
            SetRect(_selectedText.rectTransform, new Vector2(0.038f, 0.04f), new Vector2(0.34f, 0.48f));
            var statusPanel = CreatePanel("Status", _builderTop.transform, new Vector2(0.35f, 0.04f), new Vector2(0.99f, 0.48f),
                Green, 14);
            _statusPanelImage = statusPanel.GetComponent<Image>();
            _statusPanelOutline = AddOutline(_statusPanelImage, CardEdge(Green, 0.45f), new Vector2(1f, -1f));
            _statusText = CreateText("StatusText", statusPanel.transform, "○  ぶひんを えらぼう", 22, FontStyle.Bold,
                CocoaText, TextAnchor.MiddleCenter);
            Stretch(_statusText.rectTransform, 8f);
        }

        private void BuildPalette()
        {
            _palettePanel = CreatePanel("Palette", _safeRoot.transform, new Vector2(0.01f, 0.18f), new Vector2(0.175f, 0.83f),
                SoftPeachPaper, 18);
            StyleCard(_palettePanel, Coral, new Vector2(0f, -4f));
            CreateHeadingPlate("PaletteTag", _palettePanel.transform, new Vector2(0.18f, 0.90f), new Vector2(0.82f, 0.985f),
                SoftPeachPaper, 16);
            var heading = CreateText("PaletteTitle", _palettePanel.transform, "ぶひん", 23, FontStyle.Bold, CocoaText, TextAnchor.MiddleCenter);
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
                var accent = PastelAccent(PartCatalog.Get(kind).Accent);
                var button = CreateButton("Part" + kind, content.transform, PartCatalog.Get(kind).DisplayName,
                    new Color(accent.r, accent.g, accent.b, 0.98f), () => ChoosePalettePart(kind), 19);
                var layout = button.gameObject.AddComponent<LayoutElement>();
                layout.preferredHeight = 74f;
                layout.minHeight = 68f;
                layout.flexibleWidth = 1f;
                var drag = button.gameObject.AddComponent<PaletteDragItem>();
                drag.Configure(_controller, kind, scroll, () => SetPaletteChoice(kind));
                var label = button.GetComponentInChildren<Text>();
                label.rectTransform.offsetMin = new Vector2(20f, label.rectTransform.offsetMin.y);
                var selectionMark = CreateDecoration("SelectionMark", button.transform,
                    new Vector2(0.028f, 0.19f), new Vector2(0.095f, 0.81f), SelectionGold, 14);
                AddOutline(selectionMark.GetComponent<Image>(), CardEdge(SelectionGold, 0.84f), new Vector2(1f, -1f));
                SetActive(selectionMark, false);
                _paletteButtons[kind] = button;
                _paletteLabels[kind] = label;
                _paletteSelectionMarks[kind] = selectionMark;
            }
        }

        private void BuildEditActions()
        {
            _editActions = CreatePanel("EditActions", _safeRoot.transform, new Vector2(0.18f, 0.015f), new Vector2(0.99f, 0.165f),
                SoftPeachPaper, 18);
            StyleCard(_editActions, Sky, new Vector2(0f, -4f));
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
            CreateButton("Undo", _editActions.transform, "ひとつ\nもどす", Lavender, _controller.Undo, 18);
            CreateButton("Clear", _editActions.transform, "ぜんぶ\nけす", Coral, _controller.RequestClearAll, 18);
            CreateButton("Run", _editActions.transform, "ためす", Green, _controller.StartRun, 24);
        }

        private void BuildRunActions()
        {
            _runActions = CreatePanel("RunActions", _safeRoot.transform, new Vector2(0.18f, 0.02f), new Vector2(0.98f, 0.15f),
                SoftSkyPaper, 18);
            StyleCard(_runActions, Sky, new Vector2(0f, -4f));
            var layout = _runActions.AddComponent<HorizontalLayoutGroup>();
            layout.padding = new RectOffset(12, 12, 10, 10);
            layout.spacing = 16f;
            layout.childControlWidth = true;
            layout.childForceExpandWidth = true;
            layout.childControlHeight = true;
            layout.childForceExpandHeight = true;
            var reset = CreateButton("ResetMarble", _runActions.transform, "たまを もどす", Sky, _controller.ResetMarble, 23);
            _resetPulse = reset.gameObject.AddComponent<UiPulse>();
            var follow = CreateButton("FollowCamera", _runActions.transform, "みわたす", Sky,
                _controller.ToggleCameraFollow, 21);
            _followText = follow.GetComponentInChildren<Text>();
            CreateButton("Pause", _runActions.transform, "いったん とめる", Lavender, () => _controller.SetPaused(true), 21);
            CreateButton("Edit", _runActions.transform, "つくりなおす", Green, _controller.ReturnToEditing, 22);
        }

        private void BuildPausePanel()
        {
            _pausePanel = CreatePanel("Pause", _safeRoot.transform, new Vector2(0.28f, 0.20f), new Vector2(0.72f, 0.80f),
                SoftSkyPaper, 28);
            StyleCard(_pausePanel, Lavender, new Vector2(0f, -7f));
            CreateHeadingPlate("PauseTitleTag", _pausePanel.transform, new Vector2(0.14f, 0.67f), new Vector2(0.86f, 0.90f),
                SoftLavenderPaper, 22);
            var title = CreateText("PauseTitle", _pausePanel.transform, "いったん おやすみ", 37, FontStyle.Bold, CocoaText, TextAnchor.MiddleCenter);
            SetRect(title.rectTransform, new Vector2(0.08f, 0.66f), new Vector2(0.92f, 0.90f));
            var note = CreateText("PauseNote", _pausePanel.transform, "たまも しかけも とまっているよ", 23, FontStyle.Normal,
                MutedText, TextAnchor.MiddleCenter);
            SetRect(note.rectTransform, new Vector2(0.08f, 0.48f), new Vector2(0.92f, 0.68f));
            var resume = CreateButton("Resume", _pausePanel.transform, "つづける", Green, () => _controller.SetPaused(false), 28);
            SetRect(resume.GetComponent<RectTransform>(), new Vector2(0.18f, 0.20f), new Vector2(0.82f, 0.44f));
        }

        private void BuildCelebrationPanel()
        {
            _celebrationPanel = CreatePanel("Celebration", _safeRoot.transform, new Vector2(0.28f, 0.23f), new Vector2(0.72f, 0.82f),
                SoftPeachPaper, 30);
            StyleCard(_celebrationPanel, Coral, new Vector2(0f, -8f));
            CreateHeadingPlate("GoalTag", _celebrationPanel.transform, new Vector2(0.16f, 0.52f), new Vector2(0.84f, 0.80f),
                SoftSkyPaper, 24);
            var stars = CreateText("Stars", _celebrationPanel.transform, "★  ★  ★", 44, FontStyle.Bold,
                Coral, TextAnchor.MiddleCenter);
            SetRect(stars.rectTransform, new Vector2(0.06f, 0.77f), new Vector2(0.94f, 0.96f));
            var goal = CreateText("Goal", _celebrationPanel.transform, "ゴール！", 54, FontStyle.Bold,
                CocoaText, TextAnchor.MiddleCenter);
            SetRect(goal.rectTransform, new Vector2(0.06f, 0.52f), new Vector2(0.94f, 0.80f));
            var yay = CreateText("Yay", _celebrationPanel.transform, "やったね！", 31, FontStyle.Bold,
                MutedText, TextAnchor.MiddleCenter);
            SetRect(yay.rectTransform, new Vector2(0.06f, 0.38f), new Vector2(0.94f, 0.56f));
            var edit = CreateButton("ContinueEdit", _celebrationPanel.transform, "コースを かえる", Green,
                _controller.ReturnToEditing, 25);
            SetRect(edit.GetComponent<RectTransform>(), new Vector2(0.17f, 0.11f), new Vector2(0.83f, 0.35f));
        }

        private void BuildTutorialPanel()
        {
            _tutorialPanel = CreatePanel("TutorialGuide", _safeRoot.transform, new Vector2(0.27f, 0.72f), new Vector2(0.73f, 0.83f),
                SoftSkyPaper, 18);
            StyleCard(_tutorialPanel, Green, new Vector2(0f, -4f));
            _tutorialText = CreateText("TutorialText", _tutorialPanel.transform, "ぶひんを ひっぱって おこう", 25,
                FontStyle.Bold, CocoaText, TextAnchor.MiddleCenter);
            Stretch(_tutorialText.rectTransform, 8f);
        }

        private void ChoosePalettePart(MarblePieceKind kind)
        {
            _controller.ChoosePart(kind);
            SetPaletteChoice(kind);
        }

        private void SetPaletteChoice(MarblePieceKind? choice)
        {
            if (choice.HasValue
                && (!_paletteButtons.TryGetValue(choice.Value, out var button)
                    || !button.interactable
                    || !button.gameObject.activeSelf))
            {
                return;
            }

            _paletteChoice = choice;
            foreach (var pair in _paletteSelectionMarks)
                SetActive(pair.Value, _paletteChoice.HasValue && pair.Key == _paletteChoice.Value);
        }

        private Button CreateMenuButton(
            string name,
            Transform parent,
            string label,
            Color color,
            Color badgeColor,
            string symbol,
            Action action)
        {
            var button = CreateButton(name, parent, label, color, action);
            var labelText = button.transform.Find("Label").GetComponent<Text>();
            labelText.rectTransform.offsetMin = new Vector2(64f, 10f);
            labelText.rectTransform.offsetMax = new Vector2(-10f, -10f);

            var badgeFace = Color.Lerp(badgeColor, Lavender, 0.08f);
            badgeFace.a = 1f;
            var badge = CreateDecoration("Badge", button.transform,
                new Vector2(0.035f, 0.14f), new Vector2(0.255f, 0.86f), badgeFace, 30);
            var badgeImage = badge.GetComponent<Image>();
            AddDropShadow(badgeImage, new Color(CardShadow.r, CardShadow.g, CardShadow.b, 0.15f), new Vector2(0f, -2f));
            AddOutline(badgeImage, CardEdge(badgeFace, 0.82f), new Vector2(2f, -2f));

            var symbolColor = PerceivedBrightness(badgeFace) < 0.42f
                ? new Color(1f, 0.94f, 0.83f, 1f)
                : CocoaText;
            var symbolText = CreateText("Symbol", badge.transform, symbol, 30, FontStyle.Bold,
                symbolColor, TextAnchor.MiddleCenter);
            Stretch(symbolText.rectTransform, 2f);
            AddDropShadow(symbolText, new Color(CardShadow.r, CardShadow.g, CardShadow.b, 0.12f), new Vector2(0f, -1f));
            return button;
        }

        private Button CreateButton(
            string name,
            Transform parent,
            string label,
            Color color,
            Action action,
            int fontSize = 22)
        {
            var buttonObject = CreatePanel(name, parent, Vector2.zero, Vector2.one, color, 16);
            var rect = buttonObject.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(180f, 64f);
            var image = buttonObject.GetComponent<Image>();
            StyleButton(buttonObject, image, color);
            var button = buttonObject.AddComponent<Button>();
            button.targetGraphic = image;
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.98f, 0.98f, 0.98f);
            colors.pressedColor = new Color(0.90f, 0.90f, 0.90f);
            colors.disabledColor = new Color(0.80f, 0.80f, 0.80f, 0.66f);
            colors.colorMultiplier = 1f;
            button.colors = colors;
            if (action != null) button.onClick.AddListener(() => action());
            var labelColor = PerceivedBrightness(color) < 0.22f
                ? new Color(1f, 0.91f, 0.78f, 1f)
                : CocoaText;
            var text = CreateText("Label", buttonObject.transform, label, fontSize, FontStyle.Bold,
                labelColor, TextAnchor.MiddleCenter);
            text.lineSpacing = 0.90f;
            Stretch(text.rectTransform, 10f);
            AddDropShadow(text, new Color(CocoaText.r, CocoaText.g, CocoaText.b, 0.07f), new Vector2(0f, -1f));
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
            var hasDedicatedDisplayFont = _displayFont != null && _displayFont != _bodyFont;
            // Kosugi Maru stays comfortably legible at the small sizes used by the
            // child-facing helper copy. Use one friendly rounded voice throughout
            // the UI instead of letting normal-weight Noto turn pale beside it.
            text.font = hasDedicatedDisplayFont ? _displayFont : _bodyFont;
            text.text = value;
            text.fontSize = fontSize;
            text.fontStyle = hasDedicatedDisplayFont ? FontStyle.Normal : style;
            text.color = color;
            text.alignment = alignment;
            text.lineSpacing = style == FontStyle.Normal ? 1.08f : 0.96f;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.supportRichText = false;
            text.raycastTarget = false;
            return text;
        }

        private void StyleButton(GameObject buttonObject, Image image, Color accent)
        {
            AddDropShadow(image, new Color(CardShadow.r, CardShadow.g, CardShadow.b, 0.16f), new Vector2(0f, -3f));
            AddOutline(image, CardEdge(accent, 0.58f), new Vector2(2f, -2f));

            var innerColor = Color.Lerp(accent, SoftSkyPaper, 0.10f);
            innerColor.a = 0.24f;
            var innerEdge = CreateDecoration("InnerEdge", buttonObject.transform,
                new Vector2(0.035f, 0.075f), new Vector2(0.965f, 0.925f), innerColor, 14);
            var innerOutline = AddOutline(innerEdge.GetComponent<Image>(), CardEdge(accent, 0.28f),
                new Vector2(1f, -1f));
            innerOutline.useGraphicAlpha = true;
        }

        private void StyleCard(GameObject card, Color accent, Vector2 shadowDistance)
        {
            var image = card.GetComponent<Image>();
            AddDropShadow(image, CardShadow, shadowDistance);
            AddOutline(image, CardEdge(accent, 0.50f), new Vector2(2f, -2f));
        }

        private GameObject CreateHeadingPlate(
            string name,
            Transform parent,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Color color,
            int radius)
        {
            var plate = CreateDecoration(name, parent, anchorMin, anchorMax, color, radius);
            var image = plate.GetComponent<Image>();
            AddDropShadow(image, new Color(CardShadow.r, CardShadow.g, CardShadow.b, 0.11f), new Vector2(0f, -2f));
            AddOutline(image, CardEdge(color, 0.40f), new Vector2(1f, -1f));
            return plate;
        }

        private GameObject CreateDecoration(
            string name,
            Transform parent,
            Vector2 anchorMin,
            Vector2 anchorMax,
            Color color,
            int radius)
        {
            var decoration = CreatePanel(name, parent, anchorMin, anchorMax, color, radius);
            decoration.GetComponent<Image>().raycastTarget = false;
            return decoration;
        }

        private static Shadow AddDropShadow(Graphic graphic, Color color, Vector2 distance)
        {
            var shadow = graphic.gameObject.AddComponent<Shadow>();
            shadow.effectColor = color;
            shadow.effectDistance = distance;
            shadow.useGraphicAlpha = true;
            return shadow;
        }

        private static Outline AddOutline(Graphic graphic, Color color, Vector2 distance)
        {
            var outline = graphic.gameObject.AddComponent<Outline>();
            outline.effectColor = color;
            outline.effectDistance = distance;
            outline.useGraphicAlpha = true;
            return outline;
        }

        private static Color CardEdge(Color accent, float alpha)
        {
            var edge = Color.Lerp(accent, CocoaText, 0.30f);
            edge.a = alpha;
            return edge;
        }

        private static float PerceivedBrightness(Color color)
        {
            return color.r * 0.299f + color.g * 0.587f + color.b * 0.114f;
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

        private static Color PastelAccent(Color source)
        {
            Color.RGBToHSV(source, out var hue, out _, out _);
            if (hue < 0.10f || hue >= 0.78f) return Coral;
            if (hue >= 0.24f && hue < 0.52f) return Green;
            return Sky;
        }

        private static Font LoadJapaneseBodyFont()
        {
            var japaneseFont = Resources.Load<Font>(BodyFontResourcePath);
            if (japaneseFont != null) return japaneseFont;
            Debug.LogWarning("Noto Sans JP could not be loaded. Falling back to Unity runtime font.");
            return Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
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
