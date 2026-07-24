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
    ///
    /// Multi-chance pre-bite (batch:kawaglint-multi-chance-prebite): the
    /// timing ring (<see cref="ShowTimingRing"/>/<see cref="SetTimingRing"/>/
    /// <see cref="HideTimingRing"/>) and the hit-confirm effect
    /// (<see cref="PlayHookHitFx"/>) are driven by the exact same stateless
    /// API during a Wait-phase Deep ("グイン") pre-bite window as during the
    /// terminal Bite phase -- this class carries zero awareness of which
    /// caller (<see cref="Gameplay.KawaGlintGameController"/>) is asking, or
    /// of how many hooking chances a single cast offers.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintHud : MonoBehaviour
    {
        private const float ComboPopScale = 1.25f;
        private const float ComboDecayPerSecond = 6f;
        private const float FlyWordDurationSeconds = 0.6f;
        private const float FlyWordRiseCanvasUnits = 80f;

        // ── Timing ring (module B, item 2): a pure visual guide for the bite
        // window's remaining time -- never used to judge tap precision. See
        // KawaGlintGameController.UpdateTimingRing/BiteWindowRemaining01 for
        // the frame-by-frame driver; TsuriCore.TapHook's success/fail logic
        // is untouched by any of this.
        private const float TimingRingBaseSizeCanvasUnits = 170f;
        private const float TimingRingOuterMaxScale = 2.8f;
        private const float TimingRingCloseThreshold01 = 0.15f;
        // 1.2Hz is comfortably under the 3Hz child-safety flicker limit, and
        // +/-5% is a gentle "alive" pulse rather than a blink.
        private const float TimingRingPulseFrequencyHz = 1.2f;
        private const float TimingRingPulseAmplitude = 0.05f;
        private static readonly Color TimingRingInnerBaseColor = new Color(1f, 1f, 1f, 0.85f);
        private static readonly Color TimingRingOuterBaseColor = new Color(1f, 217f / 255f, 61f / 255f, 0.95f); // #FFD93D

        // ── Hook-hit confirm effect (module B, item 3): a ~0.7s local burst
        // (ring pop + label + radiating dots), entirely inside the HUD canvas
        // -- no full-screen flash or camera shake, per the 3-7yo safety rules.
        private const string HookHitLabelText = "ヒット！";
        private const int HookHitLabelFontSize = 96;
        private static readonly Color HookHitColor = new Color(1f, 217f / 255f, 61f / 255f, 1f); // #FFD93D
        private const float HookHitBurstDurationSeconds = 0.30f;
        private const float HookHitBurstStartScale = 1.0f;
        private const float HookHitBurstMaxScale = 2.2f;
        private const float HookHitBurstStartAlpha = 0.9f;
        private const float HookHitLabelPopStartScale = 1.6f;
        private const float HookHitLabelPopDurationSeconds = 0.15f;
        private const float HookHitLabelHoldSeconds = 0.35f;
        private const float HookHitLabelFadeDurationSeconds = 0.20f;
        private const float HookHitTotalDurationSeconds =
            HookHitLabelPopDurationSeconds + HookHitLabelHoldSeconds + HookHitLabelFadeDurationSeconds;
        private const int HookHitDropletCount = 8;
        private const float HookHitDropletDurationSeconds = 0.4f;
        private const float HookHitDropletMaxRadiusCanvasUnits = 180f;
        private const float HookHitDropletSizeCanvasUnits = 24f;

        private static readonly Color GaugeGreen = new Color32(0x6F, 0xCF, 0x6F, 0xFF);
        private static readonly Color GaugeYellow = new Color32(0xFF, 0xD9, 0x3D, 0xFF);
        private static readonly Color GaugeOrange = new Color32(0xFF, 0x8A, 0x3D, 0xFF);

        // ── Catch banner tail-wag art (module D, batch:1458-kawaglint-fish-art) ──
        // uGUI has no MaterialPropertyBlock equivalent, so (unlike the
        // world-space fish actors in KawaGlintActorsController) this banner
        // gets one dedicated Material instance -- there is only ever a
        // single catch banner on screen at a time, so no sharing concern.
        // Amplitude/speed/wave are deliberately gentler than every
        // world-space fish mode (KawaGlintActorsController's
        // TargetFishWag*) since this art sits still and large in the middle
        // of the screen -- a strong wag here would read as distracting
        // rather than lively.
        private const string FishWagShaderResourcePath = "KawaGlint/Rendering/KawaFishWag";
        private const float CatchBannerArtWagAmplitude = 0.012f;
        private const float CatchBannerArtWagSpeed = 5.0f;
        private const float CatchBannerArtWagWave = 3.0f;
        private static readonly int WagAmpId = Shader.PropertyToID("_WagAmp");
        private static readonly int WagSpeedId = Shader.PropertyToID("_WagSpeed");
        private static readonly int WagWaveId = Shader.PropertyToID("_WagWave");

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
        private Image _catchBannerArt;
        private Material _catchBannerArtMaterial;
        private GameObject _escapeBanner;
        private Text _bucketCount;
        private RectTransform _flyWordLayer;

        private RectTransform _timingRingRoot;
        private RectTransform _timingRingOuter;
        private Image _timingRingOuterImage;
        private RectTransform _timingRingInner;
        private Image _timingRingInnerImage;
        private bool _timingRingActive;

        private RectTransform _hookHitFxRoot;
        private Image _hookHitBurstImage;
        private Text _hookHitLabel;
        private Image[] _hookHitDots;
        private Coroutine _hookHitRoutine;

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
            UpdateRendaComboPop();
            UpdateTimingRingPulse();
        }

        // Runtime-generated Material (never a project asset) -- mirrors the
        // Application.isEditor DestroyImmediate/Destroy split used
        // throughout this spike's Rendering-side controllers (e.g.
        // KawaGlintActorsController.DestroyGeneratedAsset).
        private void OnDestroy()
        {
            if (_catchBannerArtMaterial != null)
            {
                if (Application.isEditor)
                {
                    DestroyImmediate(_catchBannerArtMaterial);
                }
                else
                {
                    Destroy(_catchBannerArtMaterial);
                }
                _catchBannerArtMaterial = null;
            }
        }

        private void UpdateRendaComboPop()
        {
            if (_rendaComboNum == null || _rendaComboScale <= 1f)
            {
                return;
            }
            _rendaComboScale = Mathf.Max(1f, _rendaComboScale - ComboDecayPerSecond * Time.deltaTime);
            _rendaComboNum.rectTransform.localScale = new Vector3(_rendaComboScale, _rendaComboScale, 1f);
        }

        /// <summary>Gentle 1.2Hz +/-5% "alive" pulse on the fixed inner target ring while the timing ring is shown -- purely decorative, never a flicker (child-safety: well under 3Hz).</summary>
        private void UpdateTimingRingPulse()
        {
            if (!_timingRingActive || _timingRingInner == null)
            {
                return;
            }
            var pulse = 1f + TimingRingPulseAmplitude * Mathf.Sin(Time.time * TimingRingPulseFrequencyHz * Mathf.PI * 2f);
            _timingRingInner.localScale = new Vector3(pulse, pulse, 1f);
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

        /// <summary>
        /// <paramref name="catchArt"/> (batch:1458-kawaglint-fish-art's
        /// full-color per-species illustration) is optional -- omit it (or
        /// pass null) to fall back to the banner's original text-only look,
        /// e.g. for a species whose art failed to resolve.
        /// </summary>
        public void ShowCatchBanner(string label, string speciesName, Color dotColor, Sprite catchArt = null)
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
            if (_catchBannerArt != null)
            {
                _catchBannerArt.sprite = catchArt;
                _catchBannerArt.gameObject.SetActive(catchArt != null);
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

        // ── timing ring (module B) ──────────────────────────────────────
        // Pure visual guide for the current bite window's remaining time.
        // TsuriCore.TapHook's success/fail contract (bite中ならいつタップし
        // ても成功) is entirely untouched by this -- SetTimingRing only ever
        // draws whatever remaining01 the caller (KawaGlintGameController)
        // computes from the real session state, it never judges anything.

        public void ShowTimingRing()
        {
            _timingRingActive = true;
            if (_timingRingRoot != null)
            {
                _timingRingRoot.gameObject.SetActive(true);
            }
        }

        public void HideTimingRing()
        {
            _timingRingActive = false;
            if (_timingRingRoot != null)
            {
                _timingRingRoot.gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// Positions the ring at <paramref name="viewportPos"/> (0..1, e.g.
        /// from Camera.WorldToViewportPoint) and draws the outer ring's
        /// shrink-to-target scale purely as a function of
        /// <paramref name="remaining01"/> (1 = window just opened, 0 = about
        /// to expire) -- a stateless redraw, safe to call every frame.
        /// </summary>
        public void SetTimingRing(Vector2 viewportPos, float remaining01)
        {
            if (_timingRingRoot == null)
            {
                return;
            }

            _timingRingRoot.anchorMin = viewportPos;
            _timingRingRoot.anchorMax = viewportPos;
            _timingRingRoot.anchoredPosition = Vector2.zero;

            var clamped = Mathf.Clamp01(remaining01);
            if (_timingRingOuter != null)
            {
                var outerScale = Mathf.Lerp(1f, TimingRingOuterMaxScale, clamped);
                _timingRingOuter.localScale = new Vector3(outerScale, outerScale, 1f);
            }

            // "Overlapping now" strongly highlighted by fading both rings to
            // solid white -- deliberately NOT a blink (a single one-way color
            // lerp, not a repeating flash) so it stays inside the child-safe
            // no-flicker rule while still reading as "this is the moment".
            var closeToNow = clamped <= TimingRingCloseThreshold01;
            if (_timingRingInnerImage != null)
            {
                _timingRingInnerImage.color = closeToNow ? new Color(1f, 1f, 1f, 1f) : TimingRingInnerBaseColor;
            }
            if (_timingRingOuterImage != null)
            {
                _timingRingOuterImage.color = closeToNow ? new Color(1f, 1f, 1f, 1f) : TimingRingOuterBaseColor;
            }
        }

        // ── hook-hit confirm effect (module B) ──────────────────────────

        /// <summary>
        /// Plays a ~0.7s local "ヒット！" burst at <paramref name="viewportPos"/>:
        /// a quick ring pop, a popping/holding/fading label, and eight
        /// radiating droplets. Entirely local to the HUD canvas -- no
        /// full-screen flash or camera shake. Safe to call again mid-effect
        /// (restarts from the top).
        /// </summary>
        public void PlayHookHitFx(Vector2 viewportPos)
        {
            if (_hookHitFxRoot == null)
            {
                return;
            }

            if (_hookHitRoutine != null)
            {
                StopCoroutine(_hookHitRoutine);
                _hookHitRoutine = null;
            }

            _hookHitFxRoot.anchorMin = viewportPos;
            _hookHitFxRoot.anchorMax = viewportPos;
            _hookHitFxRoot.anchoredPosition = Vector2.zero;
            _hookHitFxRoot.gameObject.SetActive(true);
            _hookHitRoutine = StartCoroutine(AnimateHookHitFx());
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
            BuildTimingRing(canvasTransform);
            BuildHookHitFx(canvasTransform);

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
            // Enlarged (was 900x420) to make room for the per-species catch
            // illustration (batch:1458-kawaglint-fish-art) below the label.
            bannerRect.sizeDelta = new Vector2(900f, 560f);

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
            labelRect.anchoredPosition = new Vector2(0f, -90f);
            labelRect.sizeDelta = new Vector2(820f, 100f);

            // Catch illustration: centered in the banner's middle band,
            // between the label and the species name. preserveAspect=true is
            // this uGUI subtree's AR-safety mechanism (this project's
            // absolute image-stretch ban applies here too) -- Image never
            // stretches the sprite to fill the fixed 360x260 box, it always
            // contains/letterboxes it.
            var artImage = KawaGlintUiFactory.CreateImage("CatchBannerArt", bannerRect, Color.white);
            artImage.preserveAspect = true;
            var artRect = artImage.rectTransform;
            artRect.anchorMin = new Vector2(0.5f, 0.5f);
            artRect.anchorMax = new Vector2(0.5f, 0.5f);
            artRect.pivot = new Vector2(0.5f, 0.5f);
            artRect.anchoredPosition = new Vector2(0f, 10f);
            artRect.sizeDelta = new Vector2(360f, 260f);
            _catchBannerArt = artImage;
            _catchBannerArt.gameObject.SetActive(false);

            // Tail-wag material (module D, batch:1458-kawaglint-fish-art):
            // a single dedicated instance (uGUI Image has no
            // MaterialPropertyBlock equivalent -- unlike the world-space fish
            // in KawaGlintActorsController -- but there is only ever one
            // catch banner on screen, so one instance is exactly right).
            // Missing/unsupported shader falls back to Image's default UI
            // material -- the illustration simply renders static, no error.
            var wagShader = Resources.Load<Shader>(FishWagShaderResourcePath);
            if (wagShader != null && wagShader.isSupported)
            {
                _catchBannerArtMaterial = new Material(wagShader)
                {
                    name = "KawaGlint Catch Banner Wag (Runtime)",
                    hideFlags = HideFlags.DontSave
                };
                _catchBannerArtMaterial.SetFloat(WagAmpId, CatchBannerArtWagAmplitude);
                _catchBannerArtMaterial.SetFloat(WagSpeedId, CatchBannerArtWagSpeed);
                _catchBannerArtMaterial.SetFloat(WagWaveId, CatchBannerArtWagWave);
                _catchBannerArt.material = _catchBannerArtMaterial;
            }

            _catchBannerName = KawaGlintUiFactory.CreateText("CatchBannerName", bannerRect, string.Empty, 80, TextAnchor.MiddleCenter, new Color(1f, 0.92f, 0.5f));
            var nameRect = _catchBannerName.rectTransform;
            nameRect.anchorMin = new Vector2(0.5f, 0f);
            nameRect.anchorMax = new Vector2(0.5f, 0f);
            nameRect.pivot = new Vector2(0.5f, 0f);
            nameRect.anchoredPosition = new Vector2(0f, 40f);
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

        /// <summary>
        /// TimingRing / TimingRingOuter / TimingRingInner -- GameObject names
        /// are a PlayMode-test contract (see class doc). Inner is built first
        /// (fixed-size target ring) and Outer second, so Outer -- the ring
        /// that visibly shrinks down onto Inner -- renders on top of it.
        /// </summary>
        private void BuildTimingRing(Transform canvasTransform)
        {
            var rootRect = KawaGlintUiFactory.CreateRect("TimingRing", canvasTransform);
            rootRect.anchorMin = new Vector2(0.5f, 0.5f);
            rootRect.anchorMax = new Vector2(0.5f, 0.5f);
            rootRect.pivot = new Vector2(0.5f, 0.5f);
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _timingRingRoot = rootRect;

            var innerImage = KawaGlintUiFactory.CreateRing("TimingRingInner", rootRect, TimingRingInnerBaseColor);
            var innerRect = innerImage.rectTransform;
            innerRect.anchorMin = new Vector2(0.5f, 0.5f);
            innerRect.anchorMax = new Vector2(0.5f, 0.5f);
            innerRect.pivot = new Vector2(0.5f, 0.5f);
            innerRect.sizeDelta = new Vector2(TimingRingBaseSizeCanvasUnits, TimingRingBaseSizeCanvasUnits);
            innerRect.anchoredPosition = Vector2.zero;
            _timingRingInner = innerRect;
            _timingRingInnerImage = innerImage;

            var outerImage = KawaGlintUiFactory.CreateRing("TimingRingOuter", rootRect, TimingRingOuterBaseColor);
            var outerRect = outerImage.rectTransform;
            outerRect.anchorMin = new Vector2(0.5f, 0.5f);
            outerRect.anchorMax = new Vector2(0.5f, 0.5f);
            outerRect.pivot = new Vector2(0.5f, 0.5f);
            outerRect.sizeDelta = new Vector2(TimingRingBaseSizeCanvasUnits, TimingRingBaseSizeCanvasUnits);
            outerRect.anchoredPosition = Vector2.zero;
            _timingRingOuter = outerRect;
            _timingRingOuterImage = outerImage;

            _timingRingRoot.gameObject.SetActive(false);
        }

        /// <summary>
        /// HookHitFx / HookHitLabel -- GameObject names are a PlayMode-test
        /// contract (see class doc). Built once and reused every hook.
        /// </summary>
        private void BuildHookHitFx(Transform canvasTransform)
        {
            var rootRect = KawaGlintUiFactory.CreateRect("HookHitFx", canvasTransform);
            rootRect.anchorMin = new Vector2(0.5f, 0.5f);
            rootRect.anchorMax = new Vector2(0.5f, 0.5f);
            rootRect.pivot = new Vector2(0.5f, 0.5f);
            rootRect.sizeDelta = Vector2.zero;
            rootRect.anchoredPosition = Vector2.zero;
            _hookHitFxRoot = rootRect;

            var burstImage = KawaGlintUiFactory.CreateRing("HookHitBurstRing", rootRect, HookHitColor);
            var burstRect = burstImage.rectTransform;
            burstRect.anchorMin = new Vector2(0.5f, 0.5f);
            burstRect.anchorMax = new Vector2(0.5f, 0.5f);
            burstRect.pivot = new Vector2(0.5f, 0.5f);
            burstRect.sizeDelta = new Vector2(TimingRingBaseSizeCanvasUnits, TimingRingBaseSizeCanvasUnits);
            burstRect.anchoredPosition = Vector2.zero;
            _hookHitBurstImage = burstImage;

            _hookHitDots = new Image[HookHitDropletCount];
            for (var i = 0; i < HookHitDropletCount; i++)
            {
                var dotImage = KawaGlintUiFactory.CreateDot("HookHitDot" + i, rootRect, Color.white);
                var dotRect = dotImage.rectTransform;
                dotRect.anchorMin = new Vector2(0.5f, 0.5f);
                dotRect.anchorMax = new Vector2(0.5f, 0.5f);
                dotRect.pivot = new Vector2(0.5f, 0.5f);
                dotRect.sizeDelta = new Vector2(HookHitDropletSizeCanvasUnits, HookHitDropletSizeCanvasUnits);
                dotRect.anchoredPosition = Vector2.zero;
                _hookHitDots[i] = dotImage;
            }

            _hookHitLabel = KawaGlintUiFactory.CreateText(
                "HookHitLabel", rootRect, HookHitLabelText, HookHitLabelFontSize, TextAnchor.MiddleCenter, HookHitColor);
            var labelRect = _hookHitLabel.rectTransform;
            labelRect.anchorMin = new Vector2(0.5f, 0.5f);
            labelRect.anchorMax = new Vector2(0.5f, 0.5f);
            labelRect.pivot = new Vector2(0.5f, 0.5f);
            labelRect.anchoredPosition = Vector2.zero;
            labelRect.sizeDelta = new Vector2(640f, 160f);

            _hookHitFxRoot.gameObject.SetActive(false);
        }

        private IEnumerator AnimateHookHitFx()
        {
            ResetHookHitFxVisualState();

            var elapsed = 0f;
            while (elapsed < HookHitTotalDurationSeconds)
            {
                elapsed += Time.deltaTime;
                ApplyHookHitBurst(elapsed);
                ApplyHookHitDroplets(elapsed);
                ApplyHookHitLabel(elapsed);
                yield return null;
            }

            _hookHitRoutine = null;
            if (_hookHitFxRoot != null)
            {
                _hookHitFxRoot.gameObject.SetActive(false);
            }
        }

        private void ResetHookHitFxVisualState()
        {
            if (_hookHitBurstImage != null)
            {
                _hookHitBurstImage.rectTransform.localScale = new Vector3(HookHitBurstStartScale, HookHitBurstStartScale, 1f);
                var burstColor = HookHitColor;
                burstColor.a = HookHitBurstStartAlpha;
                _hookHitBurstImage.color = burstColor;
            }

            if (_hookHitDots != null)
            {
                for (var i = 0; i < _hookHitDots.Length; i++)
                {
                    if (_hookHitDots[i] == null)
                    {
                        continue;
                    }
                    _hookHitDots[i].rectTransform.anchoredPosition = Vector2.zero;
                    var dotColor = _hookHitDots[i].color;
                    dotColor.a = 1f;
                    _hookHitDots[i].color = dotColor;
                }
            }

            if (_hookHitLabel != null)
            {
                _hookHitLabel.rectTransform.localScale = new Vector3(HookHitLabelPopStartScale, HookHitLabelPopStartScale, 1f);
                var labelColor = HookHitColor;
                labelColor.a = 1f;
                _hookHitLabel.color = labelColor;
            }
        }

        private void ApplyHookHitBurst(float elapsed)
        {
            if (_hookHitBurstImage == null)
            {
                return;
            }
            var t01 = Mathf.Clamp01(elapsed / HookHitBurstDurationSeconds);
            var scale = Mathf.Lerp(HookHitBurstStartScale, HookHitBurstMaxScale, t01);
            _hookHitBurstImage.rectTransform.localScale = new Vector3(scale, scale, 1f);
            var color = _hookHitBurstImage.color;
            color.a = Mathf.Lerp(HookHitBurstStartAlpha, 0f, t01);
            _hookHitBurstImage.color = color;
        }

        private void ApplyHookHitDroplets(float elapsed)
        {
            if (_hookHitDots == null)
            {
                return;
            }
            var t01 = Mathf.Clamp01(elapsed / HookHitDropletDurationSeconds);
            var radius = Mathf.Lerp(0f, HookHitDropletMaxRadiusCanvasUnits, t01);
            var alpha = 1f - t01;
            for (var i = 0; i < _hookHitDots.Length; i++)
            {
                if (_hookHitDots[i] == null)
                {
                    continue;
                }
                var angle = i * (360f / _hookHitDots.Length) * Mathf.Deg2Rad;
                var offset = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * radius;
                _hookHitDots[i].rectTransform.anchoredPosition = offset;
                var color = _hookHitDots[i].color;
                color.a = alpha;
                _hookHitDots[i].color = color;
            }
        }

        private void ApplyHookHitLabel(float elapsed)
        {
            if (_hookHitLabel == null)
            {
                return;
            }

            float scale;
            var alpha = 1f;
            if (elapsed < HookHitLabelPopDurationSeconds)
            {
                var popT = elapsed / HookHitLabelPopDurationSeconds;
                scale = Mathf.Lerp(HookHitLabelPopStartScale, 1f, popT);
            }
            else if (elapsed < HookHitLabelPopDurationSeconds + HookHitLabelHoldSeconds)
            {
                scale = 1f;
            }
            else
            {
                scale = 1f;
                var fadeT = (elapsed - HookHitLabelPopDurationSeconds - HookHitLabelHoldSeconds) / HookHitLabelFadeDurationSeconds;
                alpha = Mathf.Lerp(1f, 0f, Mathf.Clamp01(fadeT));
            }

            _hookHitLabel.rectTransform.localScale = new Vector3(scale, scale, 1f);
            var color = _hookHitLabel.color;
            color.a = alpha;
            _hookHitLabel.color = color;
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
