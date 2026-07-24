// ── Pono.KawaGlint.UI / KawaGlintFishdexPanel.cs ──
// 「おさかなずかん」閲覧画面 (batch:1467-kawaglint-sea-depth-fishdex-art, Phase C)。
// docs/TSURI_SEA_WORLDMAP_PLAN_2026-07-24.md §6.2/§7 の合意事項 (3状態図鑑 + ヘッダ進捗
// 「つれた: X/Yしゅるい」+ 図鑑ボタン) を、既存データ層 (TsuriDex/KawaGlintFishdexService) を
// 一切変更せず「読むだけ」で表示する UI 層としてここに新設する。
//
// 3状態の描画契約 (§7 合意):
//   - 未遭遇 (species 辞書にレコードなし、または seen==false): グリッドの枠だけ表示し
//     「？」グリフ + 「？？？」 の名前で埋める (完全非表示にはしない -- ヘッダの
//     「X/Yしゅるい」分母と実際に並ぶ枠の数が一致しないと、達成感の基準がぶれるため)。
//   - 遭遇済み未捕獲 (seen==true && count==0): 追加アートを一切増やさず、既存の
//     KawaGlintSpriteCatalog.LoadCatchArt をそのまま暗色ティントしてシルエットに転用する
//     (企画書どおり「シルエット=catch画像 tint、追加画像ゼロ」)。名前は表示するが
//     タップしても詳細は開かない (捕まえるまで数値情報は明かさない)。
//   - 捕獲済み (count>0): フルカラーのアート + 名前 + 捕獲回数を表示し、タップで
//     詳細ビュー (大きいアート・レアリティ・捕獲数・さいだいサイズ) を開く。
//
// GameObject 名は KawaGlintLocationSelectPanel に倣うが、このクラス専用の PlayMode テスト
// はまだ存在しないため「リネーム禁止」契約ではない (将来 PlayMode テストを足す際にここへ
// 契約コメントを追加すること)。
//
// dexProfile (habitat/subtitle/funFacts 等の読み物テキスト) は §6.1 でサンプル2種のみ
// 先行執筆・フォーマット未承認のため、TsuriSpecies にまだ移植されていない。この画面は
// それらのフィールドに一切依存せず、既存の TsuriSpecies (Name/Rarity/Zones) と
// TsuriDexRecord (seen/count/maxSizeCm) だけで成立するように設計している。
using System.Collections.Generic;
using Pono.KawaGlint.Core;
using Pono.KawaGlint.Gameplay;
using Pono.KawaGlint.Input;
using Pono.KawaGlint.Rendering;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.KawaGlint.UI
{
    /// <summary>
    /// 「ずかん」ボタン→全画面ダイアログで魚図鑑を閲覧する、独立 Canvas のパネル。
    /// KawaGlintLocationSelectPanel と同じ設計 (HUD/ロケーションパネルより手前の
    /// sortingOrder + <see cref="KawaGlintInputSurface.InputEnabled"/> の二重ガード) を
    /// 踏襲する。
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintFishdexPanel : MonoBehaviour
    {
        private const int SortingOrder = 111; // LocationSelectPanel(110) より手前

        private const string OpenButtonLabel = "ずかん";
        private const string TitleText = "さかな ずかん";
        private const string RiverTabLabel = "かわ";
        private const string SeaTabLabel = "うみ";
        private const string CloseButtonLabel = "とじる";
        private const string DetailCloseButtonLabel = "もどる";
        private const string UnseenName = "？？？";
        private const string UnseenGlyph = "？";
        private const string SeenStatusLabel = "みつけたよ";
        private const string ProgressFormat = "つれた: {0}/{1}しゅるい";
        private const string CardCaughtCountFormat = "×{0}";
        private const string DetailCaughtCountFormat = "つかまえた かず: {0}";
        private const string DetailMaxSizeFormat = "さいだい: やく{0}cm";
        private const string DetailMaxSizeUnknown = "さいだい: ？cm";

        // 「ずかん」ボタン予約スロット (直前ステップで確保済み)。BucketCount
        // (KawaGlintHud, top-right (-40,-40) サイズ 420x80) の真下、96px の
        // ギャップを空けて二段目に置く -- HUD 側は一切変更しない。
        private static readonly Vector2 OpenButtonAnchoredPosition = new Vector2(-40f, -216f);
        private static readonly Vector2 OpenButtonSize = new Vector2(160f, 72f);

        private const float CardWidth = 200f;
        private const float CardHeight = 220f;
        private const float CardSpacingX = 24f;
        private const float CardSpacingY = 24f;
        private const int CardColumns = 5;

        private static readonly Color DimColor = new Color(0f, 0f, 0f, 0.55f);
        private static readonly Color PanelBgColor = new Color(0.09f, 0.15f, 0.21f, 0.97f);
        private static readonly Color OpenButtonColor = new Color(0.08f, 0.22f, 0.32f, 0.92f);
        private static readonly Color CloseButtonColor = new Color(0.3f, 0.3f, 0.34f, 0.9f);
        private static readonly Color TabActiveColor = new Color(0.18f, 0.42f, 0.55f, 1f);
        private static readonly Color TabInactiveColor = new Color(0.14f, 0.2f, 0.26f, 0.85f);
        private static readonly Color CardCaughtColor = new Color(0.16f, 0.28f, 0.36f, 0.95f);
        private static readonly Color CardSeenColor = new Color(0.14f, 0.14f, 0.16f, 0.9f);
        private static readonly Color CardUnseenColor = new Color(0.08f, 0.08f, 0.09f, 0.75f);
        private static readonly Color SilhouetteTint = new Color(0.03f, 0.03f, 0.04f, 1f);
        private static readonly Color CaughtStatusColor = new Color(1f, 0.92f, 0.5f);
        private static readonly Color SeenStatusColor = new Color(1f, 1f, 1f, 0.6f);
        private static readonly Color GlyphColor = new Color(1f, 1f, 1f, 0.35f);

        private sealed class CardRefs
        {
            public TsuriSpecies Species;
            public RectTransform CardRect;
            public Image CardImage;
            public Image ArtImage;
            public Text GlyphText;
            public Text NameText;
            public Text StatusText;
            public Button CardButton;
        }

        private KawaGlintGameController _controller;
        private KawaGlintInputSurface _inputSurface;
        private KawaGlintFishdexService _fishdex;
        private KawaGlintLocationSelectPanel _locationPanel;

        private GameObject _panelRoot;
        private RectTransform _gridRoot;
        private Text _headerText;
        private Image _riverTabImage;
        private Image _seaTabImage;

        private GameObject _detailRoot;
        private Image _detailArtImage;
        private Text _detailNameText;
        private Image _detailRarityDot;
        private Text _detailCaughtText;
        private Text _detailMaxSizeText;

        private readonly List<CardRefs> _cards = new List<CardRefs>();
        private TsuriWaterZone _activeZone = TsuriWaterZone.River;

        public bool IsOpen { get; private set; }

        public static KawaGlintFishdexPanel Build(Transform parent)
        {
            var canvasGo = new GameObject("KawaGlintFishdexCanvas");
            canvasGo.transform.SetParent(parent, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = SortingOrder;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var panel = canvasGo.AddComponent<KawaGlintFishdexPanel>();
            panel.BuildChildren(canvasGo.transform);
            return panel;
        }

        public void Configure(
            KawaGlintGameController controller,
            KawaGlintInputSurface inputSurface,
            KawaGlintFishdexService fishdex,
            KawaGlintLocationSelectPanel locationPanel = null)
        {
            _controller = controller;
            _inputSurface = inputSurface;
            _fishdex = fishdex;
            _locationPanel = locationPanel;
        }

        /// <summary>
        /// Opens the dialog -- no-op unless <see cref="KawaGlintGameController.Phase"/> is
        /// Idle/Landed/Escaped (mirrors KawaGlintLocationSelectPanel.Open's gate, so browsing
        /// the dex never interrupts a live bite/renda challenge). Also no-ops while the
        /// <see cref="KawaGlintLocationSelectPanel"/> passed to <see cref="Configure"/> is
        /// already open: this panel's own Canvas sits at a HIGHER sortingOrder (111) than
        /// KawaGlintLocationSelectPanel's (110), so its persistent "ずかん" open button would
        /// otherwise stay reachable ON TOP of an already-open location-select dialog (that
        /// dialog's own full-screen dim only blocks things drawn below IT, not a sibling Canvas
        /// stacked above it) -- tapping it there would stack this dialog over that one instead
        /// of being blocked, and the two panels have no other shared mutual-exclusion. The
        /// reverse direction needs no matching guard: this panel's own full-screen dim (also on
        /// sortingOrder 111) already sits above the location panel's OpenButton (sortingOrder
        /// 110), so it already blocks that button while this dialog is open.
        /// </summary>
        public void Open()
        {
            if (_controller == null)
            {
                return;
            }
            var phase = _controller.Phase;
            if (phase != TsuriPhase.Idle && phase != TsuriPhase.Landed && phase != TsuriPhase.Escaped)
            {
                return;
            }
            if (_locationPanel != null && _locationPanel.IsOpen)
            {
                return;
            }

            _activeZone = ResolveInitialZone();
            CloseDetail();
            RefreshTabs();
            RefreshGrid();

            IsOpen = true;
            if (_panelRoot != null)
            {
                _panelRoot.SetActive(true);
            }
            if (_inputSurface != null)
            {
                _inputSurface.InputEnabled = false;
            }
        }

        public void Close()
        {
            IsOpen = false;
            CloseDetail();
            if (_panelRoot != null)
            {
                _panelRoot.SetActive(false);
            }
            if (_inputSurface != null)
            {
                _inputSurface.InputEnabled = true;
            }
        }

        private TsuriWaterZone ResolveInitialZone()
        {
            var currentLoc = _controller != null ? TsuriWorldData.GetLocationById(_controller.CurrentLocationId) : null;
            return currentLoc?.Zone ?? TsuriWaterZone.River;
        }

        // ── construction ────────────────────────────────────────────────

        private void BuildChildren(Transform canvasTransform)
        {
            // 予約スロット (-40,-216): BucketCount (top-right, KawaGlintHud) の
            // 真下に二段目として置く。HUD 側 (KawaGlintHud.cs) は不変。
            var openButton = KawaGlintUiFactory.CreateButton("FishdexOpenButton", canvasTransform, OpenButtonLabel, 32, OpenButtonColor, Color.white);
            var openRect = (RectTransform)openButton.transform;
            openRect.anchorMin = new Vector2(1f, 1f);
            openRect.anchorMax = new Vector2(1f, 1f);
            openRect.pivot = new Vector2(1f, 1f);
            openRect.anchoredPosition = OpenButtonAnchoredPosition;
            openRect.sizeDelta = OpenButtonSize;
            openButton.onClick.AddListener(Open);

            var dimImage = KawaGlintUiFactory.CreateImage("FishdexPanel", canvasTransform, DimColor, raycastTarget: true);
            KawaGlintUiFactory.Fill(dimImage.rectTransform);
            _panelRoot = dimImage.gameObject;

            var panelBg = KawaGlintUiFactory.CreateImage("FishdexPanelBg", dimImage.rectTransform, PanelBgColor, raycastTarget: true);
            var panelBgRect = panelBg.rectTransform;
            panelBgRect.anchorMin = new Vector2(0.5f, 0.5f);
            panelBgRect.anchorMax = new Vector2(0.5f, 0.5f);
            panelBgRect.pivot = new Vector2(0.5f, 0.5f);
            panelBgRect.anchoredPosition = Vector2.zero;
            panelBgRect.sizeDelta = new Vector2(1560f, 900f);

            var title = KawaGlintUiFactory.CreateText("FishdexTitle", panelBgRect, TitleText, 56, TextAnchor.MiddleCenter, Color.white, outline: true);
            var titleRect = title.rectTransform;
            titleRect.anchorMin = new Vector2(0.5f, 1f);
            titleRect.anchorMax = new Vector2(0.5f, 1f);
            titleRect.pivot = new Vector2(0.5f, 1f);
            titleRect.anchoredPosition = new Vector2(0f, -50f);
            titleRect.sizeDelta = new Vector2(1200f, 90f);

            BuildTabs(panelBgRect);
            BuildHeader(panelBgRect);
            BuildGrid(panelBgRect);
            BuildCloseButton(panelBgRect);
            BuildDetail(panelBgRect);

            _panelRoot.SetActive(false);
        }

        private void BuildTabs(Transform panelTransform)
        {
            var riverButton = KawaGlintUiFactory.CreateButton("FishdexTabRiver", panelTransform, RiverTabLabel, 40, TabInactiveColor, Color.white);
            var riverRect = (RectTransform)riverButton.transform;
            riverRect.anchorMin = new Vector2(0.5f, 1f);
            riverRect.anchorMax = new Vector2(0.5f, 1f);
            riverRect.pivot = new Vector2(1f, 1f);
            riverRect.anchoredPosition = new Vector2(-10f, -160f);
            riverRect.sizeDelta = new Vector2(240f, 80f);
            riverButton.onClick.AddListener(() => SelectTab(TsuriWaterZone.River));
            _riverTabImage = riverButton.GetComponent<Image>();

            var seaButton = KawaGlintUiFactory.CreateButton("FishdexTabSea", panelTransform, SeaTabLabel, 40, TabInactiveColor, Color.white);
            var seaRect = (RectTransform)seaButton.transform;
            seaRect.anchorMin = new Vector2(0.5f, 1f);
            seaRect.anchorMax = new Vector2(0.5f, 1f);
            seaRect.pivot = new Vector2(0f, 1f);
            seaRect.anchoredPosition = new Vector2(10f, -160f);
            seaRect.sizeDelta = new Vector2(240f, 80f);
            seaButton.onClick.AddListener(() => SelectTab(TsuriWaterZone.Sea));
            _seaTabImage = seaButton.GetComponent<Image>();
        }

        private void BuildHeader(Transform panelTransform)
        {
            _headerText = KawaGlintUiFactory.CreateText("FishdexHeader", panelTransform, string.Empty, 34, TextAnchor.MiddleCenter, new Color(1f, 0.92f, 0.5f));
            var headerRect = _headerText.rectTransform;
            headerRect.anchorMin = new Vector2(0.5f, 1f);
            headerRect.anchorMax = new Vector2(0.5f, 1f);
            headerRect.pivot = new Vector2(0.5f, 1f);
            headerRect.anchoredPosition = new Vector2(0f, -250f);
            headerRect.sizeDelta = new Vector2(700f, 50f);
        }

        private void BuildGrid(Transform panelTransform)
        {
            var gridRect = KawaGlintUiFactory.CreateRect("FishdexGrid", panelTransform);
            gridRect.anchorMin = new Vector2(0.5f, 0.5f);
            gridRect.anchorMax = new Vector2(0.5f, 0.5f);
            gridRect.pivot = new Vector2(0.5f, 0.5f);
            gridRect.anchoredPosition = new Vector2(0f, -40f);
            gridRect.sizeDelta = new Vector2(1480f, CardHeight * 2f + CardSpacingY);
            _gridRoot = gridRect;

            // 全種 (川5+海10) ぶんのカードを1回だけ生成し、タブ切替では
            // 「activeZone に含まれる種だけ表示」の可視/非可視切替のみ行う --
            // KawaGlintLocationSelectPanel のカード行構築と同じ設計。
            for (int i = 0; i < TsuriFishData.AllSpecies.Count; i++)
            {
                BuildCard(TsuriFishData.AllSpecies[i]);
            }
        }

        private void BuildCard(TsuriSpecies species)
        {
            var cardImage = KawaGlintUiFactory.CreateImage("FishdexCard_" + species.Id, _gridRoot, CardUnseenColor, raycastTarget: true);
            var cardRect = cardImage.rectTransform;
            cardRect.anchorMin = new Vector2(0.5f, 0.5f);
            cardRect.anchorMax = new Vector2(0.5f, 0.5f);
            cardRect.pivot = new Vector2(0.5f, 0.5f);
            cardRect.sizeDelta = new Vector2(CardWidth, CardHeight);

            var cardButton = cardImage.gameObject.AddComponent<Button>();
            cardButton.targetGraphic = cardImage;
            var speciesId = species.Id; // ラムダキャプチャ用のローカルコピー
            cardButton.onClick.AddListener(() => OnCardTapped(speciesId));

            // アート (preserveAspect=true -- 本プロジェクトの画像ストレッチ禁止規約。
            // KawaGlintSpriteCatalog.LoadCatchArt をそのまま流用し、シルエット状態は
            // 追加アートを増やさずティント (Image.color) だけで表現する。
            var artImage = KawaGlintUiFactory.CreateImage("FishdexCardArt_" + species.Id, cardRect, Color.white);
            artImage.preserveAspect = true;
            var artRect = artImage.rectTransform;
            artRect.anchorMin = new Vector2(0.5f, 1f);
            artRect.anchorMax = new Vector2(0.5f, 1f);
            artRect.pivot = new Vector2(0.5f, 1f);
            artRect.anchoredPosition = new Vector2(0f, -14f);
            artRect.sizeDelta = new Vector2(CardWidth - 30f, 120f);
            artImage.gameObject.SetActive(false);

            var glyphText = KawaGlintUiFactory.CreateText("FishdexCardGlyph_" + species.Id, cardRect, UnseenGlyph, 64, TextAnchor.MiddleCenter, GlyphColor);
            var glyphRect = glyphText.rectTransform;
            glyphRect.anchorMin = new Vector2(0.5f, 1f);
            glyphRect.anchorMax = new Vector2(0.5f, 1f);
            glyphRect.pivot = new Vector2(0.5f, 1f);
            glyphRect.anchoredPosition = new Vector2(0f, -14f);
            glyphRect.sizeDelta = new Vector2(CardWidth - 30f, 120f);

            var nameText = KawaGlintUiFactory.CreateText("FishdexCardName_" + species.Id, cardRect, UnseenName, 26, TextAnchor.MiddleCenter, Color.white);
            var nameRect = nameText.rectTransform;
            nameRect.anchorMin = new Vector2(0.5f, 1f);
            nameRect.anchorMax = new Vector2(0.5f, 1f);
            nameRect.pivot = new Vector2(0.5f, 1f);
            nameRect.anchoredPosition = new Vector2(0f, -140f);
            nameRect.sizeDelta = new Vector2(CardWidth - 16f, 44f);

            var statusText = KawaGlintUiFactory.CreateText("FishdexCardStatus_" + species.Id, cardRect, string.Empty, 22, TextAnchor.MiddleCenter, SeenStatusColor);
            var statusRect = statusText.rectTransform;
            statusRect.anchorMin = new Vector2(0.5f, 1f);
            statusRect.anchorMax = new Vector2(0.5f, 1f);
            statusRect.pivot = new Vector2(0.5f, 1f);
            statusRect.anchoredPosition = new Vector2(0f, -186f);
            statusRect.sizeDelta = new Vector2(CardWidth - 16f, 30f);

            cardImage.gameObject.SetActive(false);

            _cards.Add(new CardRefs
            {
                Species = species,
                CardRect = cardRect,
                CardImage = cardImage,
                ArtImage = artImage,
                GlyphText = glyphText,
                NameText = nameText,
                StatusText = statusText,
                CardButton = cardButton
            });
        }

        private void BuildCloseButton(Transform panelTransform)
        {
            var closeButton = KawaGlintUiFactory.CreateButton("FishdexCloseButton", panelTransform, CloseButtonLabel, 40, CloseButtonColor, Color.white);
            var closeRect = (RectTransform)closeButton.transform;
            closeRect.anchorMin = new Vector2(0.5f, 0f);
            closeRect.anchorMax = new Vector2(0.5f, 0f);
            closeRect.pivot = new Vector2(0.5f, 0f);
            closeRect.anchoredPosition = new Vector2(0f, 50f);
            closeRect.sizeDelta = new Vector2(280f, 96f);
            closeButton.onClick.AddListener(Close);
        }

        private void BuildDetail(Transform panelTransform)
        {
            var bg = KawaGlintUiFactory.CreateImage("FishdexDetailPanel", panelTransform, new Color(0.05f, 0.09f, 0.13f, 0.98f), raycastTarget: true);
            _detailRoot = bg.gameObject;
            var bgRect = bg.rectTransform;
            bgRect.anchorMin = new Vector2(0.5f, 0.5f);
            bgRect.anchorMax = new Vector2(0.5f, 0.5f);
            bgRect.pivot = new Vector2(0.5f, 0.5f);
            bgRect.anchoredPosition = Vector2.zero;
            bgRect.sizeDelta = new Vector2(920f, 800f);

            var artImage = KawaGlintUiFactory.CreateImage("FishdexDetailArt", bgRect, Color.white);
            artImage.preserveAspect = true;
            var artRect = artImage.rectTransform;
            artRect.anchorMin = new Vector2(0.5f, 1f);
            artRect.anchorMax = new Vector2(0.5f, 1f);
            artRect.pivot = new Vector2(0.5f, 1f);
            artRect.anchoredPosition = new Vector2(0f, -70f);
            artRect.sizeDelta = new Vector2(440f, 340f);
            _detailArtImage = artImage;

            var dot = KawaGlintUiFactory.CreateDot("FishdexDetailRarityDot", bgRect, KawaGlintHud.RarityNormalColor);
            var dotRect = dot.rectTransform;
            dotRect.anchorMin = new Vector2(0.5f, 1f);
            dotRect.anchorMax = new Vector2(0.5f, 1f);
            dotRect.pivot = new Vector2(0.5f, 1f);
            dotRect.anchoredPosition = new Vector2(0f, -430f);
            dotRect.sizeDelta = new Vector2(36f, 36f);
            _detailRarityDot = dot;

            var nameText = KawaGlintUiFactory.CreateText("FishdexDetailName", bgRect, string.Empty, 56, TextAnchor.MiddleCenter, Color.white);
            var nameRect = nameText.rectTransform;
            nameRect.anchorMin = new Vector2(0.5f, 1f);
            nameRect.anchorMax = new Vector2(0.5f, 1f);
            nameRect.pivot = new Vector2(0.5f, 1f);
            nameRect.anchoredPosition = new Vector2(0f, -480f);
            nameRect.sizeDelta = new Vector2(760f, 90f);
            _detailNameText = nameText;

            var caughtText = KawaGlintUiFactory.CreateText("FishdexDetailCaughtCount", bgRect, string.Empty, 34, TextAnchor.MiddleCenter, CaughtStatusColor);
            var caughtRect = caughtText.rectTransform;
            caughtRect.anchorMin = new Vector2(0.5f, 1f);
            caughtRect.anchorMax = new Vector2(0.5f, 1f);
            caughtRect.pivot = new Vector2(0.5f, 1f);
            caughtRect.anchoredPosition = new Vector2(0f, -570f);
            caughtRect.sizeDelta = new Vector2(760f, 60f);
            _detailCaughtText = caughtText;

            var maxSizeText = KawaGlintUiFactory.CreateText("FishdexDetailMaxSize", bgRect, string.Empty, 34, TextAnchor.MiddleCenter, Color.white);
            var maxSizeRect = maxSizeText.rectTransform;
            maxSizeRect.anchorMin = new Vector2(0.5f, 1f);
            maxSizeRect.anchorMax = new Vector2(0.5f, 1f);
            maxSizeRect.pivot = new Vector2(0.5f, 1f);
            maxSizeRect.anchoredPosition = new Vector2(0f, -630f);
            maxSizeRect.sizeDelta = new Vector2(760f, 60f);
            _detailMaxSizeText = maxSizeText;

            var backButton = KawaGlintUiFactory.CreateButton("FishdexDetailCloseButton", bgRect, DetailCloseButtonLabel, 36, CloseButtonColor, Color.white);
            var backRect = (RectTransform)backButton.transform;
            backRect.anchorMin = new Vector2(0.5f, 0f);
            backRect.anchorMax = new Vector2(0.5f, 0f);
            backRect.pivot = new Vector2(0.5f, 0f);
            backRect.anchoredPosition = new Vector2(0f, 40f);
            backRect.sizeDelta = new Vector2(240f, 90f);
            backButton.onClick.AddListener(CloseDetail);

            _detailRoot.SetActive(false);
        }

        // ── interaction ──────────────────────────────────────────────────

        private void SelectTab(TsuriWaterZone zone)
        {
            _activeZone = zone;
            RefreshTabs();
            RefreshGrid();
        }

        private void OnCardTapped(string speciesId)
        {
            // 契約: 捕獲済み (count>0) のカードだけが詳細を開く。未遭遇/遭遇済み未捕獲は
            // ボタン自体を Interactable=false にしているので通常ここに来ないが、
            // 二重ガードとして record を再チェックする。
            var record = GetRecord(speciesId);
            if (record == null || record.count <= 0)
            {
                return;
            }
            var species = TsuriFishData.GetSpeciesById(speciesId);
            if (species == null)
            {
                return;
            }
            ShowDetail(species, record);
        }

        private void ShowDetail(TsuriSpecies species, TsuriDexRecord record)
        {
            if (_detailRoot == null)
            {
                return;
            }

            if (_detailArtImage != null)
            {
                _detailArtImage.sprite = KawaGlintSpriteCatalog.LoadCatchArt(species.Id);
                _detailArtImage.color = Color.white;
            }
            if (_detailNameText != null)
            {
                _detailNameText.text = species.Name;
            }
            if (_detailRarityDot != null)
            {
                _detailRarityDot.color = species.Rarity == TsuriRarity.Rare ? KawaGlintHud.RarityRareColor : KawaGlintHud.RarityNormalColor;
            }
            if (_detailCaughtText != null)
            {
                _detailCaughtText.text = string.Format(DetailCaughtCountFormat, record.count);
            }
            if (_detailMaxSizeText != null)
            {
                _detailMaxSizeText.text = record.maxSizeCm.HasValue
                    ? string.Format(DetailMaxSizeFormat, record.maxSizeCm.Value)
                    : DetailMaxSizeUnknown;
            }

            _detailRoot.SetActive(true);
        }

        private void CloseDetail()
        {
            if (_detailRoot != null)
            {
                _detailRoot.SetActive(false);
            }
        }

        // ── refresh ──────────────────────────────────────────────────────

        private void RefreshTabs()
        {
            SetTabColor(_riverTabImage, _activeZone == TsuriWaterZone.River);
            SetTabColor(_seaTabImage, _activeZone == TsuriWaterZone.Sea);
        }

        private static void SetTabColor(Image tabImage, bool active)
        {
            if (tabImage != null)
            {
                tabImage.color = active ? TabActiveColor : TabInactiveColor;
            }
        }

        private void RefreshGrid()
        {
            var visible = new List<CardRefs>();
            for (int i = 0; i < _cards.Count; i++)
            {
                if (IsInZone(_cards[i].Species, _activeZone))
                {
                    visible.Add(_cards[i]);
                }
            }

            var columns = Mathf.Min(CardColumns, Mathf.Max(1, visible.Count));
            var rows = Mathf.Max(1, Mathf.CeilToInt(visible.Count / (float)columns));
            var totalWidth = columns * CardWidth + Mathf.Max(0, columns - 1) * CardSpacingX;
            var totalHeight = rows * CardHeight + Mathf.Max(0, rows - 1) * CardSpacingY;
            var startX = -totalWidth * 0.5f + CardWidth * 0.5f;
            var startY = totalHeight * 0.5f - CardHeight * 0.5f;

            var caughtCount = 0;
            for (int i = 0; i < _cards.Count; i++)
            {
                var refs = _cards[i];
                var isVisible = IsInZone(refs.Species, _activeZone);
                refs.CardRect.gameObject.SetActive(isVisible);
                if (!isVisible)
                {
                    continue;
                }

                var idx = visible.IndexOf(refs);
                var col = idx % columns;
                var row = idx / columns;
                var x = startX + col * (CardWidth + CardSpacingX);
                var y = startY - row * (CardHeight + CardSpacingY);
                refs.CardRect.anchoredPosition = new Vector2(x, y);

                UpdateCardContent(refs);
                var record = GetRecord(refs.Species.Id);
                if (record != null && record.count > 0)
                {
                    caughtCount++;
                }
            }

            if (_headerText != null)
            {
                _headerText.text = string.Format(ProgressFormat, caughtCount, visible.Count);
            }
        }

        private void UpdateCardContent(CardRefs refs)
        {
            var record = GetRecord(refs.Species.Id);
            var caught = record != null && record.count > 0;
            var seen = caught || (record != null && record.seen);

            if (caught)
            {
                refs.CardImage.color = CardCaughtColor;
                refs.ArtImage.gameObject.SetActive(true);
                refs.ArtImage.color = Color.white;
                refs.ArtImage.sprite = KawaGlintSpriteCatalog.LoadCatchArt(refs.Species.Id);
                refs.GlyphText.gameObject.SetActive(false);
                refs.NameText.text = refs.Species.Name;
                refs.StatusText.text = string.Format(CardCaughtCountFormat, record.count);
                refs.StatusText.color = CaughtStatusColor;
                refs.CardButton.interactable = true;
            }
            else if (seen)
            {
                refs.CardImage.color = CardSeenColor;
                refs.ArtImage.gameObject.SetActive(true);
                refs.ArtImage.color = SilhouetteTint;
                refs.ArtImage.sprite = KawaGlintSpriteCatalog.LoadCatchArt(refs.Species.Id);
                refs.GlyphText.gameObject.SetActive(false);
                refs.NameText.text = refs.Species.Name;
                refs.StatusText.text = SeenStatusLabel;
                refs.StatusText.color = SeenStatusColor;
                refs.CardButton.interactable = false;
            }
            else
            {
                refs.CardImage.color = CardUnseenColor;
                refs.ArtImage.gameObject.SetActive(false);
                refs.GlyphText.gameObject.SetActive(true);
                refs.NameText.text = UnseenName;
                refs.StatusText.text = string.Empty;
                refs.CardButton.interactable = false;
            }
        }

        private TsuriDexRecord GetRecord(string speciesId)
        {
            var document = _fishdex?.Document;
            if (document?.species == null || string.IsNullOrEmpty(speciesId))
            {
                return null;
            }
            return document.species.TryGetValue(speciesId, out var record) ? record : null;
        }

        private static bool IsInZone(TsuriSpecies species, TsuriWaterZone zone)
        {
            if (species?.Zones == null)
            {
                return false;
            }
            for (int i = 0; i < species.Zones.Length; i++)
            {
                if (species.Zones[i] == zone)
                {
                    return true;
                }
            }
            return false;
        }
    }
}
