using System;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.FluidMarbleLab
{
    [DisallowMultipleComponent]
    public sealed class LabHud : MonoBehaviour
    {
        private static readonly string[] JapaneseFontCandidates =
        {
            "Hiragino Sans",
            "Hiragino Kaku Gothic ProN",
            "Noto Sans CJK JP",
            "Noto Sans JP",
            "Yu Gothic",
            "Meiryo"
        };

        private FluidMarbleLabBootstrap bootstrap;
        private LabModeController modeController;
        private TrackEditor trackEditor;
        private MarbleSpawner marbleSpawner;
        private FluidSimulationController simulation;
        private GoalZone goal;
        private Font font;
        private bool ownsFont;
        private Texture2D roundedTexture;
        private Sprite roundedSprite;
        private Text subtitleText;
        private Text backendText;
        private Text scoreText;
        private Text modeButtonText;
        private Text qualityButtonText;
        private Button rotateButton;
        private Button marbleButton;
        private float fpsAccumulator;
        private int fpsFrames;
        private float fpsTimer;

        public void Configure(
            FluidMarbleLabBootstrap labBootstrap,
            LabModeController labMode,
            TrackEditor editor,
            MarbleSpawner spawner,
            FluidSimulationController fluidSimulation,
            GoalZone goalZone)
        {
            bootstrap = labBootstrap;
            modeController = labMode;
            trackEditor = editor;
            marbleSpawner = spawner;
            simulation = fluidSimulation;
            goal = goalZone;
            BuildUi();

            modeController.ModeChanged += HandleModeChanged;
            trackEditor.SelectionChanged += HandleSelectionChanged;
            goal.ScoreChanged += HandleScoreChanged;
            HandleModeChanged(modeController.Mode);
            HandleSelectionChanged(trackEditor.SelectedPiece);
            HandleScoreChanged(goal.Score);
        }

        private void Update()
        {
            if (backendText == null || simulation == null)
            {
                return;
            }

            fpsAccumulator += Time.unscaledDeltaTime;
            fpsFrames++;
            fpsTimer += Time.unscaledDeltaTime;
            if (fpsTimer >= 0.5f)
            {
                var fps = fpsAccumulator > 0f ? fpsFrames / fpsAccumulator : 0f;
                backendText.text = $"{simulation.BackendLabel}  {fps:0} FPS";
                fpsAccumulator = 0f;
                fpsFrames = 0;
                fpsTimer = 0f;
            }
        }

        private void BuildUi()
        {
            EnsureVisualAssets();
            var root = transform as RectTransform;
            root.anchorMin = Vector2.zero;
            root.anchorMax = Vector2.one;
            root.offsetMin = Vector2.zero;
            root.offsetMax = Vector2.zero;

            var safeArea = CreateRect("SafeArea", root);
            safeArea.anchorMin = Vector2.zero;
            safeArea.anchorMax = Vector2.one;
            safeArea.offsetMin = Vector2.zero;
            safeArea.offsetMax = Vector2.zero;
            safeArea.gameObject.AddComponent<SafeAreaFitter>();

            var titlePanel = CreatePanel("TitlePanel", safeArea, new Color(0.10f, 0.10f, 0.16f, 0.84f));
            titlePanel.anchorMin = new Vector2(0f, 1f);
            titlePanel.anchorMax = new Vector2(0f, 1f);
            titlePanel.pivot = new Vector2(0f, 1f);
            titlePanel.anchoredPosition = new Vector2(24f, -22f);
            titlePanel.sizeDelta = new Vector2(520f, 110f);

            var title = CreateText("Title", titlePanel, "いろみずと ビーだま", 34, FontStyle.Bold, Color.white);
            SetRect(title.rectTransform, new Vector2(22f, 49f), new Vector2(-22f, -10f));
            title.alignment = TextAnchor.MiddleLeft;

            subtitleText = CreateText("Subtitle", titlePanel, "ゆびで ながれを つくろう", 23, FontStyle.Normal, new Color(0.86f, 0.91f, 1f));
            SetRect(subtitleText.rectTransform, new Vector2(22f, 10f), new Vector2(-22f, -54f));
            subtitleText.alignment = TextAnchor.MiddleLeft;

            var developerPanel = CreatePanel("DeveloperPanel", safeArea, new Color(0.08f, 0.08f, 0.12f, 0.7f));
            developerPanel.anchorMin = new Vector2(1f, 1f);
            developerPanel.anchorMax = new Vector2(1f, 1f);
            developerPanel.pivot = new Vector2(1f, 1f);
            developerPanel.anchoredPosition = new Vector2(-24f, -22f);
            developerPanel.sizeDelta = new Vector2(330f, 56f);
            developerPanel.gameObject.SetActive(Application.isEditor || Debug.isDebugBuild);
            backendText = CreateText("Backend", developerPanel, simulation.BackendLabel, 21, FontStyle.Bold, new Color(0.83f, 0.95f, 1f));
            SetRect(backendText.rectTransform, new Vector2(14f, 7f), new Vector2(-14f, -7f));
            backendText.alignment = TextAnchor.MiddleCenter;

            var scorePanel = CreatePanel("ScorePanel", safeArea, new Color(0.98f, 0.78f, 0.20f, 0.92f));
            scorePanel.anchorMin = new Vector2(1f, 1f);
            scorePanel.anchorMax = new Vector2(1f, 1f);
            scorePanel.pivot = new Vector2(1f, 1f);
            scorePanel.anchoredPosition = new Vector2(-24f, -92f);
            scorePanel.sizeDelta = new Vector2(220f, 58f);
            scoreText = CreateText("Score", scorePanel, "ゴール 0", 27, FontStyle.Bold, new Color(0.16f, 0.12f, 0.20f));
            SetRect(scoreText.rectTransform, new Vector2(10f, 5f), new Vector2(-10f, -5f));
            scoreText.alignment = TextAnchor.MiddleCenter;

            var bottomBar = CreatePanel("BottomBar", safeArea, new Color(0.08f, 0.08f, 0.13f, 0.88f));
            bottomBar.anchorMin = new Vector2(0.5f, 0f);
            bottomBar.anchorMax = new Vector2(0.5f, 0f);
            bottomBar.pivot = new Vector2(0.5f, 0f);
            bottomBar.anchoredPosition = new Vector2(0f, 22f);
            bottomBar.sizeDelta = new Vector2(1140f, 104f);

            var layout = bottomBar.gameObject.AddComponent<HorizontalLayoutGroup>();
            layout.padding = new RectOffset(18, 18, 14, 14);
            layout.spacing = 14f;
            layout.childAlignment = TextAnchor.MiddleCenter;
            layout.childControlHeight = true;
            layout.childControlWidth = true;
            layout.childForceExpandHeight = true;
            layout.childForceExpandWidth = true;

            var modeButton = CreateButton("ModeButton", bottomBar, "つくる", new Color(0.20f, 0.64f, 0.92f));
            modeButtonText = modeButton.GetComponentInChildren<Text>();
            modeButton.onClick.AddListener(() => modeController.ToggleMode());

            marbleButton = CreateButton("MarbleButton", bottomBar, "ビーだま", new Color(0.94f, 0.42f, 0.54f));
            marbleButton.onClick.AddListener(() => marbleSpawner.AddMarble());

            rotateButton = CreateButton("RotateButton", bottomBar, "まわす", new Color(0.52f, 0.40f, 0.90f));
            rotateButton.onClick.AddListener(() => trackEditor.RotateSelected());

            var resetButton = CreateButton("ResetButton", bottomBar, "リセット", new Color(0.96f, 0.62f, 0.20f));
            resetButton.onClick.AddListener(ResetAll);

            var qualityButton = CreateButton("QualityButton", bottomBar, "がしつ", new Color(0.25f, 0.75f, 0.58f));
            qualityButtonText = qualityButton.GetComponentInChildren<Text>();
            qualityButton.onClick.AddListener(CycleQuality);
            UpdateQualityLabel();
        }

        private void ResetAll()
        {
            bootstrap.ResetLab();
        }

        private void CycleQuality()
        {
            simulation.CycleQuality();
            UpdateQualityLabel();
            backendText.text = simulation.BackendLabel;
        }

        private void UpdateQualityLabel()
        {
            if (qualityButtonText == null)
            {
                return;
            }
            qualityButtonText.text = simulation.Quality switch
            {
                FluidQuality.Beautiful => "きれい",
                FluidQuality.Light => "かるい",
                _ => "ふつう"
            };
        }

        private void HandleModeChanged(LabMode mode)
        {
            if (subtitleText == null)
            {
                return;
            }
            var isBuild = mode == LabMode.Build;
            subtitleText.text = isBuild ? "ぶひんを えらんで うごかそう" : "ゆびで ながれを つくろう";
            modeButtonText.text = isBuild ? "ながす" : "つくる";
            rotateButton.interactable = isBuild && trackEditor.SelectedPiece != null;
            marbleButton.interactable = !isBuild;
        }

        private void HandleSelectionChanged(TrackPiece piece)
        {
            if (rotateButton != null)
            {
                rotateButton.interactable = modeController.Mode == LabMode.Build && piece != null;
            }
        }

        private void HandleScoreChanged(int score)
        {
            if (scoreText != null)
            {
                scoreText.text = $"ゴール {score}";
            }
        }

        private Button CreateButton(string name, Transform parent, string label, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = roundedSprite;
            image.type = Image.Type.Sliced;
            image.color = color;

            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1.08f, 1.08f, 1.08f, 1f);
            colors.pressedColor = new Color(0.82f, 0.82f, 0.82f, 1f);
            colors.disabledColor = new Color(0.45f, 0.45f, 0.48f, 0.72f);
            colors.colorMultiplier = 1f;
            button.colors = colors;

            var layoutElement = rect.gameObject.AddComponent<LayoutElement>();
            layoutElement.minWidth = 170f;
            layoutElement.minHeight = 74f;

            var text = CreateText("Label", rect, label, 27, FontStyle.Bold, new Color(0.10f, 0.08f, 0.14f));
            SetRect(text.rectTransform, new Vector2(8f, 5f), new Vector2(-8f, -5f));
            text.alignment = TextAnchor.MiddleCenter;
            return button;
        }

        private RectTransform CreatePanel(string name, Transform parent, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = roundedSprite;
            image.type = Image.Type.Sliced;
            image.color = color;
            return rect;
        }

        private Text CreateText(string name, Transform parent, string value, int size, FontStyle style, Color color)
        {
            var rect = CreateRect(name, parent);
            var text = rect.gameObject.AddComponent<Text>();
            text.font = font;
            text.text = value;
            text.fontSize = size;
            text.fontStyle = style;
            text.color = color;
            text.raycastTarget = false;
            text.horizontalOverflow = HorizontalWrapMode.Wrap;
            text.verticalOverflow = VerticalWrapMode.Truncate;
            return text;
        }

        private static RectTransform CreateRect(string name, Transform parent)
        {
            var gameObject = new GameObject(name, typeof(RectTransform));
            var rect = (RectTransform)gameObject.transform;
            rect.SetParent(parent, false);
            return rect;
        }

        private static void SetRect(RectTransform rect, Vector2 offsetMin, Vector2 offsetMax)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
        }

        private void EnsureVisualAssets()
        {
            if (font == null)
            {
                font = Resources.Load<Font>("NotoSansJP-Variable");
            }
            if (font == null)
            {
                try
                {
                    font = Font.CreateDynamicFontFromOSFont(JapaneseFontCandidates, 32);
                    ownsFont = font != null;
                }
                catch (Exception)
                {
                    font = null;
                }
                font ??= Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            }

            if (roundedSprite == null)
            {
                roundedTexture = CreateRoundedTexture(64, 16f);
                roundedSprite = Sprite.Create(
                    roundedTexture,
                    new Rect(0f, 0f, 64f, 64f),
                    new Vector2(0.5f, 0.5f),
                    64f,
                    0,
                    SpriteMeshType.FullRect,
                    new Vector4(18f, 18f, 18f, 18f));
                roundedSprite.name = "Runtime Rounded UI";
            }
        }

        private static Texture2D CreateRoundedTexture(int size, float radius)
        {
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false, true)
            {
                name = "Runtime Rounded UI Texture",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp
            };
            var pixels = new Color32[size * size];
            var half = size * 0.5f;
            var inner = half - radius;
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var point = new Vector2(Mathf.Abs(x + 0.5f - half), Mathf.Abs(y + 0.5f - half));
                    var corner = new Vector2(Mathf.Max(0f, point.x - inner), Mathf.Max(0f, point.y - inner));
                    var alpha = Mathf.Clamp01(radius + 0.5f - corner.magnitude);
                    pixels[y * size + x] = new Color(1f, 1f, 1f, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            return texture;
        }

        private void OnDestroy()
        {
            if (modeController != null) modeController.ModeChanged -= HandleModeChanged;
            if (trackEditor != null) trackEditor.SelectionChanged -= HandleSelectionChanged;
            if (goal != null) goal.ScoreChanged -= HandleScoreChanged;
            if (roundedSprite != null) Destroy(roundedSprite);
            if (roundedTexture != null) Destroy(roundedTexture);
            if (ownsFont && font != null) Destroy(font);
        }
    }
}
