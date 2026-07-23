using System.Collections;
using Pono.KawaGlint.Input;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.KawaGlint.UI
{
    /// <summary>
    /// Procedurally-built HUD for KawaGlint's playable river-fishing loop:
    /// phase/narration text, the renda (連打) pull panel, catch/escape
    /// banners, the session bucket counter, and floating "fly word" callouts.
    /// Mirrors <c>Pono.HideSeekCreatures.UI</c>'s pattern of a MonoBehaviour
    /// that owns the whole uGUI subtree it builds. GameObject names below are
    /// a PlayMode-test contract -- do not rename without updating the tests.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintHud : MonoBehaviour
    {
        private const float ComboPopScale = 1.25f;
        private const float ComboDecayPerSecond = 6f;
        private const float FlyWordDurationSeconds = 0.6f;
        private const float FlyWordRiseCanvasUnits = 80f;

        private static readonly Color GaugeGreen = new Color32(0x6F, 0xCF, 0x6F, 0xFF);
        private static readonly Color GaugeYellow = new Color32(0xFF, 0xD9, 0x3D, 0xFF);
        private static readonly Color GaugeOrange = new Color32(0xFF, 0x8A, 0x3D, 0xFF);

        /// <summary>Catch-banner rarity dot colors -- the single shared source for both this HUD's
        /// default banner state and <see cref="Gameplay.KawaGlintGameController"/>'s dot-color lookup.</summary>
        public static readonly Color RarityNormalColor = new Color32(0x7F, 0xD0, 0xE8, 0xFF);
        public static readonly Color RarityRareColor = new Color32(0xFF, 0xD9, 0x3D, 0xFF);

        private Text _phaseWord;
        private Text _narrationBar;
        private GameObject _rendaWrap;
        private Text _rendaBigText;
        private Text _rendaComboNum;
        private Image _rendaGaugeFill;
        private GameObject _catchBanner;
        private Text _catchBannerLabel;
        private Text _catchBannerName;
        private Image _catchBannerDot;
        private GameObject _escapeBanner;
        private Text _bucketCount;
        private RectTransform _flyWordLayer;

        private float _rendaComboScale = 1f;

        /// <summary>The full-screen tap surface -- first child of the canvas, wired by the game controller.</summary>
        public KawaGlintInputSurface InputSurface { get; private set; }

        public static KawaGlintHud Build(Transform parent)
        {
            var canvasGo = new GameObject("KawaGlintCanvas");
            canvasGo.transform.SetParent(parent, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var hud = canvasGo.AddComponent<KawaGlintHud>();
            hud.BuildChildren(canvasGo.transform);
            return hud;
        }

        private void Update()
        {
            if (_rendaComboNum == null || _rendaComboScale <= 1f)
            {
                return;
            }
            _rendaComboScale = Mathf.Max(1f, _rendaComboScale - ComboDecayPerSecond * Time.deltaTime);
            _rendaComboNum.rectTransform.localScale = new Vector3(_rendaComboScale, _rendaComboScale, 1f);
        }

        // ── public HUD API (Gameplay-layer facing) ──────────────────────

        public void SetPhaseWord(string text)
        {
            if (_phaseWord != null)
            {
                _phaseWord.text = text ?? string.Empty;
            }
        }

        public void SetNarration(string text)
        {
            if (_narrationBar != null)
            {
                _narrationBar.text = text ?? string.Empty;
            }
        }

        public void ShowRenda()
        {
            _rendaWrap?.SetActive(true);
        }

        public void HideRenda()
        {
            _rendaWrap?.SetActive(false);
        }

        public void SetRendaBigText(string text)
        {
            if (_rendaBigText != null)
            {
                _rendaBigText.text = text ?? string.Empty;
            }
        }

        public void SetRendaCombo(int count)
        {
            if (_rendaComboNum == null)
            {
                return;
            }
            _rendaComboNum.text = count.ToString();
            _rendaComboScale = ComboPopScale;
            _rendaComboNum.rectTransform.localScale = new Vector3(_rendaComboScale, _rendaComboScale, 1f);
        }

        /// <summary>0-100. Colors green &lt;50, yellow &gt;=50, orange &gt;=80 (matches the web version's tiers).</summary>
        public void SetRendaGauge(float pct)
        {
            if (_rendaGaugeFill == null)
            {
                return;
            }
            var clamped = Mathf.Clamp(pct, 0f, 100f);
            var rect = _rendaGaugeFill.rectTransform;
            rect.anchorMax = new Vector2(clamped / 100f, 1f);

            var color = GaugeGreen;
            if (clamped >= 80f)
            {
                color = GaugeOrange;
            }
            else if (clamped >= 50f)
            {
                color = GaugeYellow;
            }
            _rendaGaugeFill.color = color;
        }

        /// <summary>Spawns a short-lived rising/fading callout text in the lower half of the screen.</summary>
        public void SpawnFlyWord(string text, bool big)
        {
            if (_flyWordLayer == null)
            {
                return;
            }
            var fontSize = big ? 72 : 48;
            var color = big ? new Color(1f, 0.85f, 0.2f) : Color.white;
            var word = KawaGlintUiFactory.CreateText("FlyWord", _flyWordLayer, text, fontSize, TextAnchor.MiddleCenter, color);
            var rect = word.rectTransform;
            var x = Random.Range(0.2f, 0.8f);
            var y = Random.Range(0.08f, 0.38f);
            rect.anchorMin = new Vector2(x, y);
            rect.anchorMax = new Vector2(x, y);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(600f, 120f);
            StartCoroutine(AnimateFlyWord(word));
        }

        public void ShowCatchBanner(string label, string speciesName, Color dotColor)
        {
            if (_catchBannerLabel != null)
            {
                _catchBannerLabel.text = label ?? string.Empty;
            }
            if (_catchBannerName != null)
            {
                _catchBannerName.text = speciesName ?? string.Empty;
            }
            if (_catchBannerDot != null)
            {
                _catchBannerDot.color = dotColor;
            }
            _catchBanner?.SetActive(true);
        }

        public void HideCatchBanner()
        {
            _catchBanner?.SetActive(false);
        }

        public void ShowEscapeBanner()
        {
            _escapeBanner?.SetActive(true);
        }

        public void HideEscapeBanner()
        {
            _escapeBanner?.SetActive(false);
        }

        public void SetBucketCount(int n)
        {
            if (_bucketCount != null)
            {
                _bucketCount.text = "つれた かず " + n;
            }
        }

        // ── construction ────────────────────────────────────────────────

        private void BuildChildren(Transform canvasTransform)
        {
            var tapImage = KawaGlintUiFactory.CreateImage("TapSurface", canvasTransform, new Color(0f, 0f, 0f, 0f), raycastTarget: true);
            KawaGlintUiFactory.Fill(tapImage.rectTransform);
            InputSurface = tapImage.gameObject.AddComponent<KawaGlintInputSurface>();

            _phaseWord = KawaGlintUiFactory.CreateText("PhaseWord", canvasTransform, string.Empty, 64, TextAnchor.MiddleCenter, Color.white);
            var phaseRect = _phaseWord.rectTransform;
            phaseRect.anchorMin = new Vector2(0.5f, 1f);
            phaseRect.anchorMax = new Vector2(0.5f, 1f);
            phaseRect.pivot = new Vector2(0.5f, 1f);
            phaseRect.anchoredPosition = new Vector2(0f, -60f);
            phaseRect.sizeDelta = new Vector2(1200f, 100f);

            var narrationBg = KawaGlintUiFactory.CreateImage("NarrationBarBg", canvasTransform, new Color(0.05f, 0.16f, 0.24f, 0.72f));
            var narrationBgRect = narrationBg.rectTransform;
            narrationBgRect.anchorMin = new Vector2(0.5f, 0f);
            narrationBgRect.anchorMax = new Vector2(0.5f, 0f);
            narrationBgRect.pivot = new Vector2(0.5f, 0f);
            narrationBgRect.anchoredPosition = new Vector2(0f, 40f);
            narrationBgRect.sizeDelta = new Vector2(1400f, 96f);

            _narrationBar = KawaGlintUiFactory.CreateText("NarrationBar", narrationBgRect, string.Empty, 40, TextAnchor.MiddleCenter, Color.white);
            KawaGlintUiFactory.Fill(_narrationBar.rectTransform);

            _bucketCount = KawaGlintUiFactory.CreateText("BucketCount", canvasTransform, "つれた かず 0", 36, TextAnchor.UpperRight, Color.white);
            var bucketRect = _bucketCount.rectTransform;
            bucketRect.anchorMin = new Vector2(1f, 1f);
            bucketRect.anchorMax = new Vector2(1f, 1f);
            bucketRect.pivot = new Vector2(1f, 1f);
            bucketRect.anchoredPosition = new Vector2(-40f, -40f);
            bucketRect.sizeDelta = new Vector2(420f, 80f);

            BuildRendaWrap(canvasTransform);
            BuildCatchBanner(canvasTransform);
            BuildEscapeBanner(canvasTransform);

            var flyLayerRect = KawaGlintUiFactory.CreateRect("FlyWordLayer", canvasTransform);
            KawaGlintUiFactory.Fill(flyLayerRect);
            _flyWordLayer = flyLayerRect;
        }

        private void BuildRendaWrap(Transform canvasTransform)
        {
            var wrapImage = KawaGlintUiFactory.CreateImage("RendaWrap", canvasTransform, new Color(0f, 0.05f, 0.1f, 0.55f));
            _rendaWrap = wrapImage.gameObject;
            var wrapRect = wrapImage.rectTransform;
            wrapRect.anchorMin = new Vector2(0.5f, 1f);
            wrapRect.anchorMax = new Vector2(0.5f, 1f);
            wrapRect.pivot = new Vector2(0.5f, 1f);
            wrapRect.anchoredPosition = new Vector2(0f, -220f);
            wrapRect.sizeDelta = new Vector2(900f, 360f);

            _rendaBigText = KawaGlintUiFactory.CreateText("RendaBigText", wrapRect, "ひっぱれ！！", 88, TextAnchor.MiddleCenter, Color.white);
            var bigRect = _rendaBigText.rectTransform;
            bigRect.anchorMin = new Vector2(0.5f, 1f);
            bigRect.anchorMax = new Vector2(0.5f, 1f);
            bigRect.pivot = new Vector2(0.5f, 1f);
            bigRect.anchoredPosition = new Vector2(0f, -20f);
            bigRect.sizeDelta = new Vector2(860f, 120f);

            _rendaComboNum = KawaGlintUiFactory.CreateText("RendaComboNum", wrapRect, "0", 72, TextAnchor.MiddleCenter, new Color(1f, 0.9f, 0.3f));
            var comboRect = _rendaComboNum.rectTransform;
            comboRect.anchorMin = new Vector2(0.5f, 0.5f);
            comboRect.anchorMax = new Vector2(0.5f, 0.5f);
            comboRect.pivot = new Vector2(0.5f, 0.5f);
            comboRect.anchoredPosition = new Vector2(0f, -10f);
            comboRect.sizeDelta = new Vector2(200f, 100f);

            var gaugeBgImage = KawaGlintUiFactory.CreateImage("RendaGaugeBg", wrapRect, new Color(1f, 1f, 1f, 0.25f));
            var gaugeBgRect = gaugeBgImage.rectTransform;
            gaugeBgRect.anchorMin = new Vector2(0.5f, 0f);
            gaugeBgRect.anchorMax = new Vector2(0.5f, 0f);
            gaugeBgRect.pivot = new Vector2(0.5f, 0f);
            gaugeBgRect.anchoredPosition = new Vector2(0f, 20f);
            gaugeBgRect.sizeDelta = new Vector2(760f, 56f);

            var gaugeFillImage = KawaGlintUiFactory.CreateImage("RendaGaugeFill", gaugeBgRect, GaugeGreen);
            var gaugeFillRect = gaugeFillImage.rectTransform;
            gaugeFillRect.anchorMin = new Vector2(0f, 0f);
            gaugeFillRect.anchorMax = new Vector2(0f, 1f);
            gaugeFillRect.pivot = new Vector2(0f, 0.5f);
            gaugeFillRect.offsetMin = Vector2.zero;
            gaugeFillRect.offsetMax = Vector2.zero;
            _rendaGaugeFill = gaugeFillImage;

            _rendaWrap.SetActive(false);
        }

        private void BuildCatchBanner(Transform canvasTransform)
        {
            var bannerImage = KawaGlintUiFactory.CreateImage("CatchBanner", canvasTransform, new Color(0.08f, 0.22f, 0.32f, 0.92f));
            _catchBanner = bannerImage.gameObject;
            var bannerRect = bannerImage.rectTransform;
            bannerRect.anchorMin = new Vector2(0.5f, 0.5f);
            bannerRect.anchorMax = new Vector2(0.5f, 0.5f);
            bannerRect.pivot = new Vector2(0.5f, 0.5f);
            bannerRect.anchoredPosition = Vector2.zero;
            bannerRect.sizeDelta = new Vector2(900f, 420f);

            var dotImage = KawaGlintUiFactory.CreateDot("CatchBannerRarityDot", bannerRect, RarityNormalColor);
            var dotRect = dotImage.rectTransform;
            dotRect.anchorMin = new Vector2(0.5f, 1f);
            dotRect.anchorMax = new Vector2(0.5f, 1f);
            dotRect.pivot = new Vector2(0.5f, 1f);
            dotRect.anchoredPosition = new Vector2(0f, -30f);
            dotRect.sizeDelta = new Vector2(48f, 48f);
            _catchBannerDot = dotImage;

            _catchBannerLabel = KawaGlintUiFactory.CreateText("CatchBannerLabel", bannerRect, string.Empty, 56, TextAnchor.MiddleCenter, Color.white);
            var labelRect = _catchBannerLabel.rectTransform;
            labelRect.anchorMin = new Vector2(0.5f, 1f);
            labelRect.anchorMax = new Vector2(0.5f, 1f);
            labelRect.pivot = new Vector2(0.5f, 1f);
            labelRect.anchoredPosition = new Vector2(0f, -100f);
            labelRect.sizeDelta = new Vector2(820f, 100f);

            _catchBannerName = KawaGlintUiFactory.CreateText("CatchBannerName", bannerRect, string.Empty, 80, TextAnchor.MiddleCenter, new Color(1f, 0.92f, 0.5f));
            var nameRect = _catchBannerName.rectTransform;
            nameRect.anchorMin = new Vector2(0.5f, 0.5f);
            nameRect.anchorMax = new Vector2(0.5f, 0.5f);
            nameRect.pivot = new Vector2(0.5f, 0.5f);
            nameRect.anchoredPosition = new Vector2(0f, -20f);
            nameRect.sizeDelta = new Vector2(820f, 140f);

            _catchBanner.SetActive(false);
        }

        private void BuildEscapeBanner(Transform canvasTransform)
        {
            var bannerImage = KawaGlintUiFactory.CreateImage("EscapeBanner", canvasTransform, new Color(0.12f, 0.16f, 0.22f, 0.88f));
            _escapeBanner = bannerImage.gameObject;
            var bannerRect = bannerImage.rectTransform;
            bannerRect.anchorMin = new Vector2(0.5f, 0.5f);
            bannerRect.anchorMax = new Vector2(0.5f, 0.5f);
            bannerRect.pivot = new Vector2(0.5f, 0.5f);
            bannerRect.anchoredPosition = Vector2.zero;
            bannerRect.sizeDelta = new Vector2(760f, 240f);

            var text = KawaGlintUiFactory.CreateText("EscapeBannerLabel", bannerRect, "にげちゃった…", 64, TextAnchor.MiddleCenter, Color.white);
            KawaGlintUiFactory.Fill(text.rectTransform);

            _escapeBanner.SetActive(false);
        }

        private IEnumerator AnimateFlyWord(Text word)
        {
            if (word == null)
            {
                yield break;
            }
            var rect = word.rectTransform;
            var startPos = rect.anchoredPosition;
            var startColor = word.color;
            var elapsed = 0f;
            while (elapsed < FlyWordDurationSeconds)
            {
                elapsed += Time.deltaTime;
                var t = Mathf.Clamp01(elapsed / FlyWordDurationSeconds);
                rect.anchoredPosition = startPos + new Vector2(0f, FlyWordRiseCanvasUnits * t);
                var color = startColor;
                color.a = startColor.a * (1f - t);
                word.color = color;
                yield return null;
            }
            if (word != null)
            {
                Destroy(word.gameObject);
            }
        }
    }
}
