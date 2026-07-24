// ── Pono.KawaGlint.UI / KawaGlintLocationSelectPanel.cs ──
// ロケーション選択パネル。 KawaGlint 海拡張 実装契約 v1.0 (C) §C-2。
//
// GameObject 名は PlayMode テスト契約 (契約書どおり、リネーム禁止):
// LocationOpenButton / LocationSelectPanel(全画面ディム) / LocationTabRiver /
// LocationTabSea / LocationCard_<id> / LocationConfirmButton / LocationCloseButton。
//
// 選択の永続化・route 自動送り・route-*.json (§2.5) は今回スコープ外 -- 毎起動
// asase から開始する (KawaGlintGameController.Configure が asase で初期化する)。
using System.Collections.Generic;
using Pono.KawaGlint.Core;
using Pono.KawaGlint.Gameplay;
using Pono.KawaGlint.Input;
using UnityEngine;
using UnityEngine.UI;

namespace Pono.KawaGlint.UI
{
    /// <summary>
    /// 「ばしょ」ボタン→全画面ダイアログでロケーションを選び「ここで つる！」で
    /// <see cref="KawaGlintGameController.TrySetLocation"/> を呼ぶ、独立 Canvas の
    /// パネル。 KawaGlintHud とは別 Canvas (sortingOrder 110 &gt; HUD の 100) を
    /// 持つことで、開いている間は HUD の全画面タップサーフェスより手前に居座って
    /// raycast を遮断する -- <see cref="KawaGlintInputSurface.InputEnabled"/> を
    /// false にする二重ガードと合わせて、Open 中のキャストタップを確実に無効化する。
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class KawaGlintLocationSelectPanel : MonoBehaviour
    {
        private const int SortingOrder = 110; // HUD(100) より手前

        private const string TitleText = "どこで つる？";
        private const string OpenButtonLabel = "ばしょ";
        private const string RiverTabLabel = "かわ";
        private const string SeaTabLabel = "うみ";
        private const string ConfirmButtonLabel = "ここで つる！";
        private const string CloseButtonLabel = "やめる";
        private const string UnlockedStatusText = "つれるよ！";
        private const string LockedStatusFormat = "あと {0}ひきで いけるよ！";

        private const float CardWidth = 260f;
        private const float CardHeight = 220f;
        private const float CardHighlightMargin = 8f;
        private const float CardSpacing = 24f;

        private static readonly Color DimColor = new Color(0f, 0f, 0f, 0.55f);
        private static readonly Color PanelBgColor = new Color(0.08f, 0.16f, 0.22f, 0.96f);
        private static readonly Color OpenButtonColor = new Color(0.08f, 0.22f, 0.32f, 0.92f);
        private static readonly Color ConfirmButtonColor = new Color(0.18f, 0.5f, 0.28f, 0.95f);
        private static readonly Color CloseButtonColor = new Color(0.3f, 0.3f, 0.34f, 0.9f);
        private static readonly Color TabActiveColor = new Color(0.18f, 0.42f, 0.55f, 1f);
        private static readonly Color TabInactiveColor = new Color(0.14f, 0.2f, 0.26f, 0.85f);
        private static readonly Color CardBgUnlocked = new Color(0.16f, 0.28f, 0.36f, 0.95f);
        private static readonly Color CardBgLocked = new Color(0.14f, 0.16f, 0.18f, 0.7f);
        private static readonly Color HighlightColor = new Color(1f, 217f / 255f, 61f / 255f, 1f); // #FFD93D (選択カードの黄色枠)

        private sealed class LocationCardRefs
        {
            public RectTransform HighlightRect;
            public RectTransform CardRect;
            public Image CardImage;
            public Button CardButton;
            public Text StatusText;
        }

        private KawaGlintGameController _controller;
        private KawaGlintInputSurface _inputSurface;
        private System.Func<TsuriWaterZone, int> _zoneCatchCountProvider;

        private GameObject _panelRoot;
        private RectTransform _cardsRow;
        private Image _riverTabImage;
        private Image _seaTabImage;

        private readonly Dictionary<string, LocationCardRefs> _cards = new Dictionary<string, LocationCardRefs>();

        private string _selectedLocationId = TsuriWorldData.DefaultLocationId;
        private TsuriWaterZone _activeZone = TsuriWaterZone.River;

        public bool IsOpen { get; private set; }

        public static KawaGlintLocationSelectPanel Build(Transform parent)
        {
            var canvasGo = new GameObject("KawaGlintLocationSelectCanvas");
            canvasGo.transform.SetParent(parent, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = SortingOrder;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var panel = canvasGo.AddComponent<KawaGlintLocationSelectPanel>();
            panel.BuildChildren(canvasGo.transform);
            return panel;
        }

        public void Configure(
            KawaGlintGameController controller,
            KawaGlintInputSurface inputSurface,
            System.Func<TsuriWaterZone, int> zoneCatchCountProvider)
        {
            _controller = controller;
            _inputSurface = inputSurface;
            _zoneCatchCountProvider = zoneCatchCountProvider;
        }

        /// <summary>Opens the dialog -- no-op unless <see cref="KawaGlintGameController.Phase"/> is Idle/Landed/Escaped.</summary>
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

            var currentLoc = TsuriWorldData.GetLocationById(_controller.CurrentLocationId);
            _selectedLocationId = currentLoc.Id;
            _activeZone = currentLoc.Zone;

            RefreshTabs();
            RefreshCards();

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
            if (_panelRoot != null)
            {
                _panelRoot.SetActive(false);
            }
            if (_inputSurface != null)
            {
                _inputSurface.InputEnabled = true;
            }
        }

        // ── construction ────────────────────────────────────────────────

        private void BuildChildren(Transform canvasTransform)
        {
            // Bottom-left (not top-left, its original spot): the illustrated
            // Pono sprite (KawaGlintStageBuilder's "Angler") sits near the
            // top-left of every camera-visible frame at river_asase/
            // river_kakou (KawaGlintStageBuilder.AnglerArtBottomCenter is a
            // fixed world position there, never relocated -- river_asase is
            // this project's regression baseline), and a top-left anchor
            // here used to sit squarely on top of Pono's head/rod at that
            // same screen corner. Bottom-left stays clear of Pono at every
            // location (§D-3's per-location anchors keep Pono's world Y well
            // above the bottom of frame everywhere) and of NarrationBarBg
            // (bottom-CENTER, KawaGlintHud), so it is a fix that holds
            // regardless of which location is active, not just a swap of one
            // fixed overlap for another.
            var openButton = KawaGlintUiFactory.CreateButton("LocationOpenButton", canvasTransform, OpenButtonLabel, 32, OpenButtonColor, Color.white);
            var openRect = (RectTransform)openButton.transform;
            openRect.anchorMin = new Vector2(0f, 0f);
            openRect.anchorMax = new Vector2(0f, 0f);
            openRect.pivot = new Vector2(0f, 0f);
            openRect.anchoredPosition = new Vector2(40f, 40f);
            openRect.sizeDelta = new Vector2(160f, 72f);
            openButton.onClick.AddListener(Open);

            var dimImage = KawaGlintUiFactory.CreateImage("LocationSelectPanel", canvasTransform, DimColor, raycastTarget: true);
            KawaGlintUiFactory.Fill(dimImage.rectTransform);
            _panelRoot = dimImage.gameObject;

            var panelBg = KawaGlintUiFactory.CreateImage("LocationSelectPanelBg", dimImage.rectTransform, PanelBgColor, raycastTarget: true);
            var panelBgRect = panelBg.rectTransform;
            panelBgRect.anchorMin = new Vector2(0.5f, 0.5f);
            panelBgRect.anchorMax = new Vector2(0.5f, 0.5f);
            panelBgRect.pivot = new Vector2(0.5f, 0.5f);
            panelBgRect.anchoredPosition = Vector2.zero;
            panelBgRect.sizeDelta = new Vector2(1500f, 820f);

            var title = KawaGlintUiFactory.CreateText("LocationSelectTitle", panelBgRect, TitleText, 56, TextAnchor.MiddleCenter, Color.white, outline: true);
            var titleRect = title.rectTransform;
            titleRect.anchorMin = new Vector2(0.5f, 1f);
            titleRect.anchorMax = new Vector2(0.5f, 1f);
            titleRect.pivot = new Vector2(0.5f, 1f);
            titleRect.anchoredPosition = new Vector2(0f, -50f);
            titleRect.sizeDelta = new Vector2(1200f, 90f);

            BuildTabs(panelBgRect);
            BuildCardsRow(panelBgRect);
            BuildBottomButtons(panelBgRect);

            _panelRoot.SetActive(false);
        }

        private void BuildTabs(Transform panelTransform)
        {
            var riverButton = KawaGlintUiFactory.CreateButton("LocationTabRiver", panelTransform, RiverTabLabel, 40, TabInactiveColor, Color.white);
            var riverRect = (RectTransform)riverButton.transform;
            riverRect.anchorMin = new Vector2(0.5f, 1f);
            riverRect.anchorMax = new Vector2(0.5f, 1f);
            riverRect.pivot = new Vector2(1f, 1f);
            riverRect.anchoredPosition = new Vector2(-10f, -160f);
            riverRect.sizeDelta = new Vector2(240f, 80f);
            riverButton.onClick.AddListener(() => SelectTab(TsuriWaterZone.River));
            _riverTabImage = riverButton.GetComponent<Image>();

            var seaButton = KawaGlintUiFactory.CreateButton("LocationTabSea", panelTransform, SeaTabLabel, 40, TabInactiveColor, Color.white);
            var seaRect = (RectTransform)seaButton.transform;
            seaRect.anchorMin = new Vector2(0.5f, 1f);
            seaRect.anchorMax = new Vector2(0.5f, 1f);
            seaRect.pivot = new Vector2(0f, 1f);
            seaRect.anchoredPosition = new Vector2(10f, -160f);
            seaRect.sizeDelta = new Vector2(240f, 80f);
            seaButton.onClick.AddListener(() => SelectTab(TsuriWaterZone.Sea));
            _seaTabImage = seaButton.GetComponent<Image>();
        }

        private void BuildCardsRow(Transform panelTransform)
        {
            var rowRect = KawaGlintUiFactory.CreateRect("LocationCardsRow", panelTransform);
            rowRect.anchorMin = new Vector2(0.5f, 0.5f);
            rowRect.anchorMax = new Vector2(0.5f, 0.5f);
            rowRect.pivot = new Vector2(0.5f, 0.5f);
            rowRect.anchoredPosition = new Vector2(0f, 20f);
            rowRect.sizeDelta = new Vector2(1400f, CardHeight + CardHighlightMargin * 2f);
            _cardsRow = rowRect;

            // 定義順 = UI表示順 (asase, kakou, sunahama, iwaba, oki) をそのまま辿る --
            // タブ切替時に zone でフィルタして表示/非表示するだけで、生成は1回きり。
            for (int i = 0; i < TsuriWorldData.Locations.Count; i++)
            {
                BuildCard(TsuriWorldData.Locations[i]);
            }
        }

        /// <summary>
        /// カード1件を構築する。 Highlight (黄色枠 #FFD93D、選択カードの一回り大きい
        /// 矩形) を先に、実カード (Image+Button、契約名 LocationCard_&lt;id&gt;) を
        /// 後に同じ親へ追加することで、Highlight が選択時だけ後ろに透けて見える
        /// 「枠」を成立させる (子は親より後に描画される uGUI の描画順を利用)。
        /// </summary>
        private void BuildCard(TsuriLocationData loc)
        {
            var highlightImage = KawaGlintUiFactory.CreateImage("LocationCardHighlight_" + loc.Id, _cardsRow, HighlightColor, raycastTarget: false);
            var highlightRect = highlightImage.rectTransform;
            highlightRect.anchorMin = new Vector2(0.5f, 0.5f);
            highlightRect.anchorMax = new Vector2(0.5f, 0.5f);
            highlightRect.pivot = new Vector2(0.5f, 0.5f);
            highlightRect.sizeDelta = new Vector2(CardWidth + CardHighlightMargin * 2f, CardHeight + CardHighlightMargin * 2f);
            highlightImage.gameObject.SetActive(false);

            var cardImage = KawaGlintUiFactory.CreateImage("LocationCard_" + loc.Id, _cardsRow, CardBgUnlocked, raycastTarget: true);
            var cardRect = cardImage.rectTransform;
            cardRect.anchorMin = new Vector2(0.5f, 0.5f);
            cardRect.anchorMax = new Vector2(0.5f, 0.5f);
            cardRect.pivot = new Vector2(0.5f, 0.5f);
            cardRect.sizeDelta = new Vector2(CardWidth, CardHeight);
            var cardButton = cardImage.gameObject.AddComponent<Button>();
            cardButton.targetGraphic = cardImage;
            var locationId = loc.Id; // ラムダキャプチャ用のローカルコピー (foreach/for変数の直接キャプチャを避ける)
            cardButton.onClick.AddListener(() => SelectCard(locationId));

            var nameText = KawaGlintUiFactory.CreateText("LocationCardName_" + loc.Id, cardRect, loc.Name, 32, TextAnchor.UpperCenter, Color.white);
            var nameRect = nameText.rectTransform;
            nameRect.anchorMin = new Vector2(0.5f, 1f);
            nameRect.anchorMax = new Vector2(0.5f, 1f);
            nameRect.pivot = new Vector2(0.5f, 1f);
            nameRect.anchoredPosition = new Vector2(0f, -18f);
            nameRect.sizeDelta = new Vector2(CardWidth - 20f, 90f);

            var statusText = KawaGlintUiFactory.CreateText("LocationCardStatus_" + loc.Id, cardRect, UnlockedStatusText, 24, TextAnchor.LowerCenter, new Color(1f, 0.92f, 0.5f));
            var statusRect = statusText.rectTransform;
            statusRect.anchorMin = new Vector2(0.5f, 0f);
            statusRect.anchorMax = new Vector2(0.5f, 0f);
            statusRect.pivot = new Vector2(0.5f, 0f);
            statusRect.anchoredPosition = new Vector2(0f, 16f);
            statusRect.sizeDelta = new Vector2(CardWidth - 20f, 60f);

            _cards[loc.Id] = new LocationCardRefs
            {
                HighlightRect = highlightRect,
                CardRect = cardRect,
                CardImage = cardImage,
                CardButton = cardButton,
                StatusText = statusText
            };
        }

        private void BuildBottomButtons(Transform panelTransform)
        {
            var confirmButton = KawaGlintUiFactory.CreateButton("LocationConfirmButton", panelTransform, ConfirmButtonLabel, 40, ConfirmButtonColor, Color.white);
            var confirmRect = (RectTransform)confirmButton.transform;
            confirmRect.anchorMin = new Vector2(0.5f, 0f);
            confirmRect.anchorMax = new Vector2(0.5f, 0f);
            confirmRect.pivot = new Vector2(1f, 0f);
            confirmRect.anchoredPosition = new Vector2(-10f, 50f);
            confirmRect.sizeDelta = new Vector2(360f, 96f);
            confirmButton.onClick.AddListener(TryConfirm);

            var closeButton = KawaGlintUiFactory.CreateButton("LocationCloseButton", panelTransform, CloseButtonLabel, 36, CloseButtonColor, Color.white);
            var closeRect = (RectTransform)closeButton.transform;
            closeRect.anchorMin = new Vector2(0.5f, 0f);
            closeRect.anchorMax = new Vector2(0.5f, 0f);
            closeRect.pivot = new Vector2(0f, 0f);
            closeRect.anchoredPosition = new Vector2(10f, 50f);
            closeRect.sizeDelta = new Vector2(240f, 96f);
            closeButton.onClick.AddListener(Close);
        }

        // ── interaction ──────────────────────────────────────────────────

        private void SelectTab(TsuriWaterZone zone)
        {
            _activeZone = zone;
            var currentLoc = TsuriWorldData.GetLocationById(_selectedLocationId);
            if (currentLoc == null || currentLoc.Zone != zone)
            {
                var def = TsuriWorldData.DefaultLocation(zone);
                if (def != null)
                {
                    _selectedLocationId = def.Id;
                }
            }
            RefreshTabs();
            RefreshCards();
        }

        private void SelectCard(string locationId)
        {
            var loc = TsuriWorldData.GetLocationById(locationId);
            if (loc == null)
            {
                return;
            }
            var zoneCatchCount = _zoneCatchCountProvider != null ? _zoneCatchCountProvider(loc.Zone) : 0;
            if (!TsuriWorldData.IsUnlocked(loc, zoneCatchCount))
            {
                return; // ロック中カードは選択不可 (休眠分岐 -- 現状 UnlockCount は全ロケ null で未到達)
            }
            _selectedLocationId = loc.Id;
            RefreshCards();
        }

        private void TryConfirm()
        {
            if (_controller == null || string.IsNullOrEmpty(_selectedLocationId))
            {
                return;
            }
            if (_controller.TrySetLocation(_selectedLocationId))
            {
                Close();
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

        private void RefreshCards()
        {
            var visible = new List<TsuriLocationData>();
            for (int i = 0; i < TsuriWorldData.Locations.Count; i++)
            {
                if (TsuriWorldData.Locations[i].Zone == _activeZone)
                {
                    visible.Add(TsuriWorldData.Locations[i]);
                }
            }

            var totalWidth = visible.Count * CardWidth + Mathf.Max(0, visible.Count - 1) * CardSpacing;
            var startX = -totalWidth * 0.5f + CardWidth * 0.5f;

            for (int i = 0; i < TsuriWorldData.Locations.Count; i++)
            {
                var loc = TsuriWorldData.Locations[i];
                if (!_cards.TryGetValue(loc.Id, out var refs))
                {
                    continue;
                }

                var isVisible = loc.Zone == _activeZone;
                refs.CardRect.gameObject.SetActive(isVisible);
                if (!isVisible)
                {
                    refs.HighlightRect.gameObject.SetActive(false);
                    continue;
                }

                var idx = visible.IndexOf(loc);
                var x = startX + idx * (CardWidth + CardSpacing);
                refs.CardRect.anchoredPosition = new Vector2(x, 0f);
                refs.HighlightRect.anchoredPosition = new Vector2(x, 0f);
                refs.HighlightRect.gameObject.SetActive(loc.Id == _selectedLocationId);

                // 今回は全ロケ UnlockCount==null (常時解放) なので unlocked は常に true --
                // この分岐は将来 UnlockCount を設定した時のための休眠実装 (契約どおり)。
                var zoneCatchCount = _zoneCatchCountProvider != null ? _zoneCatchCountProvider(loc.Zone) : 0;
                var unlocked = TsuriWorldData.IsUnlocked(loc, zoneCatchCount);
                refs.StatusText.text = unlocked
                    ? UnlockedStatusText
                    : string.Format(LockedStatusFormat, Mathf.Max(0, (loc.UnlockCount ?? 0) - zoneCatchCount));
                refs.CardImage.color = unlocked ? CardBgUnlocked : CardBgLocked;
                refs.CardButton.interactable = unlocked;
            }
        }
    }
}
