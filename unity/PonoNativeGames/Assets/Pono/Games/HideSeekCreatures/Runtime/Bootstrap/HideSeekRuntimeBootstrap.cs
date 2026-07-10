using Pono.HideSeekCreatures.Gameplay;
using Pono.HideSeekCreatures.Input;
using Pono.HideSeekCreatures.Rendering;
using Pono.HideSeekCreatures.UI;
using Pono.NativeShell;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Pono.HideSeekCreatures.Bootstrap
{
    [DisallowMultipleComponent]
    public sealed class HideSeekRuntimeBootstrap : MonoBehaviour
    {
        private static readonly Color TextBrown = new Color(0.24f, 0.16f, 0.10f, 1f);
        private static readonly Color Cream = new Color(1f, 0.97f, 0.87f, 0.98f);

        private void Awake()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            UiFactory.EnsureEventSystem();
            BuildGame();
        }

        private void BuildGame()
        {
            var canvasObject = new GameObject("Hide Seek Canvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvasRect = (RectTransform)canvasObject.transform;
            var canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.pixelPerfect = false;
            var scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(2560f, 1440f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;
            canvasObject.transform.SetParent(transform, false);

            var root = UiFactory.CreateRect("Game Surface", canvasRect);
            UiFactory.Fill(root);

            var background = UiFactory.CreateImage(
                "Forest Background",
                root,
                RuntimeAssetLoader.LoadSprite("HideSeekCreatures/km01/forest_background"),
                Color.white);
            background.rectTransform.anchorMin = background.rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
            background.gameObject.AddComponent<AspectCoverFitter>();

            var creatureLayer = UiFactory.CreateRect("Creatures", root);
            UiFactory.Fill(creatureLayer);
            var creatures = new CreatureView[HideSeekStageCatalog.Creatures.Length];
            for (var i = 0; i < creatures.Length; i++)
            {
                var creatureObject = new GameObject(
                    $"Creature {HideSeekStageCatalog.Creatures[i].DisplayName}",
                    typeof(RectTransform),
                    typeof(Image),
                    typeof(CreatureView));
                var view = creatureObject.GetComponent<CreatureView>();
                view.Initialize(HideSeekStageCatalog.Creatures[i], creatureLayer);
                creatures[i] = view;
            }

            var inkImage = UiFactory.CreateRawImage("FluidInk Surface", root, Color.white);
            UiFactory.Fill(inkImage.rectTransform);
            inkImage.raycastTarget = true;
            var inkPresenter = inkImage.gameObject.AddComponent<FluidInkPresenter>();
            var inputSurface = inkImage.gameObject.AddComponent<InkInputSurface>();

            var effectsLayer = UiFactory.CreateRect("Celebration Effects", root);
            UiFactory.Fill(effectsLayer);
            effectsLayer.gameObject.AddComponent<CanvasGroup>().blocksRaycasts = false;
            var celebration = effectsLayer.gameObject.AddComponent<CelebrationOverlay>();
            celebration.Initialize();

            var safeRoot = UiFactory.CreateRect("Safe Area UI", root);
            UiFactory.Fill(safeRoot);
            safeRoot.gameObject.AddComponent<SafeAreaFitter>();

            var backButton = CreateIconButton(
                "Back Button",
                safeRoot,
                "HideSeekCreatures/UI/back_button",
                new Vector2(0f, 1f),
                new Vector2(88f, -82f),
                new Vector2(118f, 118f),
                "もどる");

            var settingsButton = CreateIconButton(
                "Settings Button",
                safeRoot,
                "HideSeekCreatures/UI/settings_button",
                new Vector2(1f, 1f),
                new Vector2(-82f, -82f),
                new Vector2(102f, 102f),
                "せってい");

            var progressPlate = UiFactory.CreateImage(
                "Progress Plate",
                safeRoot,
                RuntimeAssetLoader.LoadSprite("HideSeekCreatures/UI/button_normal", new Vector4(44f, 28f, 44f, 28f)),
                new Color(1f, 1f, 1f, 0.90f));
            progressPlate.type = Image.Type.Sliced;
            SetAnchor(progressPlate.rectTransform, new Vector2(0.5f, 1f), new Vector2(0f, -74f), new Vector2(390f, 112f));
            var progressTokens = new Image[3];
            for (var i = 0; i < progressTokens.Length; i++)
            {
                var token = UiFactory.CreateImage(
                    $"Progress {i + 1}",
                    progressPlate.transform,
                    RuntimeAssetLoader.LoadSprite("HideSeekCreatures/UI/leaf_token"),
                    new Color(0.52f, 0.47f, 0.34f, 0.48f));
                token.rectTransform.anchorMin = token.rectTransform.anchorMax = new Vector2((i + 1f) / 4f, 0.5f);
                token.rectTransform.anchoredPosition = Vector2.zero;
                token.rectTransform.sizeDelta = new Vector2(82f, 82f);
                token.preserveAspect = true;
                progressTokens[i] = token;
            }

            var stageTitle = UiFactory.CreateText(
                "Stage Title",
                safeRoot,
                HideSeekStageCatalog.StageName,
                66,
                TextAnchor.MiddleCenter,
                TextBrown);
            SetAnchor(stageTitle.rectTransform, new Vector2(0.5f, 0.77f), Vector2.zero, new Vector2(1050f, 130f));
            AddSoftShadow(stageTitle, new Color(1f, 0.98f, 0.82f, 0.9f), new Vector2(3f, -3f));

            var foundBanner = UiFactory.CreateText(
                "Found Banner",
                safeRoot,
                string.Empty,
                58,
                TextAnchor.MiddleCenter,
                TextBrown);
            SetAnchor(foundBanner.rectTransform, new Vector2(0.5f, 0.66f), Vector2.zero, new Vector2(1150f, 130f));
            AddSoftShadow(foundBanner, new Color(1f, 0.96f, 0.72f, 0.96f), new Vector2(4f, -4f));
            foundBanner.gameObject.SetActive(false);

            var tutorialInstruction = UiFactory.CreateText(
                "Tutorial Instruction",
                safeRoot,
                string.Empty,
                42,
                TextAnchor.MiddleCenter,
                Cream);
            SetAnchor(tutorialInstruction.rectTransform, new Vector2(0.5f, 0f), new Vector2(0f, 92f), new Vector2(1250f, 92f));
            AddSoftShadow(tutorialInstruction, new Color(0.18f, 0.12f, 0.08f, 0.95f), new Vector2(3f, -3f));

            var guideImage = UiFactory.CreateImage(
                "Guide Leaf",
                safeRoot,
                RuntimeAssetLoader.LoadSprite("HideSeekCreatures/UI/leaf_token"),
                new Color(0.60f, 0.92f, 1f, 0.92f));
            guideImage.rectTransform.sizeDelta = new Vector2(76f, 76f);
            guideImage.raycastTarget = false;
            guideImage.gameObject.SetActive(false);
            var tutorial = safeRoot.gameObject.AddComponent<TutorialGuide>();
            tutorial.Initialize(guideImage.rectTransform, tutorialInstruction);

            var completePanel = CreateCardOverlay("Complete Panel", safeRoot, dimBackground: false, out var completeCard);
            completeCard.sizeDelta = new Vector2(940f, 520f);
            var completeTitle = UiFactory.CreateText(
                "Complete Title",
                completeCard,
                "みんな みつけた！",
                58,
                TextAnchor.MiddleCenter,
                TextBrown);
            SetAnchor(completeTitle.rectTransform, new Vector2(0.5f, 0.68f), Vector2.zero, new Vector2(720f, 110f));
            var replayButton = UiFactory.CreateButton("Replay Button", completeCard, "もういちど", new Vector2(340f, 106f), 38);
            SetAnchor((RectTransform)replayButton.transform, new Vector2(0.31f, 0.27f), Vector2.zero, new Vector2(340f, 106f));
            replayButton.gameObject.AddComponent<AccessibleLabel>().Configure("もういちど");
            var completeExitButton = UiFactory.CreateButton("Complete Exit Button", completeCard, "おわる", new Vector2(300f, 106f), 38);
            SetAnchor((RectTransform)completeExitButton.transform, new Vector2(0.70f, 0.27f), Vector2.zero, new Vector2(300f, 106f));
            completeExitButton.gameObject.AddComponent<AccessibleLabel>().Configure("おわる");
            completePanel.SetActive(false);

            var exitPanel = CreateCardOverlay("Exit Panel", safeRoot, dimBackground: true, out var exitCard);
            var exitTitle = UiFactory.CreateText(
                "Exit Question",
                exitCard,
                "あそびを おわる？",
                52,
                TextAnchor.MiddleCenter,
                TextBrown);
            SetAnchor(exitTitle.rectTransform, new Vector2(0.5f, 0.68f), Vector2.zero, new Vector2(700f, 100f));
            var keepPlayingButton = UiFactory.CreateButton("Keep Playing", exitCard, "まだ あそぶ", new Vector2(340f, 106f), 36);
            SetAnchor((RectTransform)keepPlayingButton.transform, new Vector2(0.31f, 0.30f), Vector2.zero, new Vector2(340f, 106f));
            keepPlayingButton.gameObject.AddComponent<AccessibleLabel>().Configure("まだ あそぶ");
            var exitButton = UiFactory.CreateButton("Exit Game", exitCard, "おわる", new Vector2(280f, 106f), 36);
            SetAnchor((RectTransform)exitButton.transform, new Vector2(0.70f, 0.30f), Vector2.zero, new Vector2(280f, 106f));
            exitButton.gameObject.AddComponent<AccessibleLabel>().Configure("おわる");
            exitPanel.SetActive(false);

            var settingsPanel = CreateCardOverlay("Settings Panel", safeRoot, dimBackground: true, out var settingsCard);
            settingsCard.sizeDelta = new Vector2(860f, 620f);
            var settingsTitle = UiFactory.CreateText(
                "Settings Title",
                settingsCard,
                "せってい",
                54,
                TextAnchor.MiddleCenter,
                TextBrown);
            SetAnchor(settingsTitle.rectTransform, new Vector2(0.5f, 0.82f), Vector2.zero, new Vector2(640f, 90f));
            var soundButton = UiFactory.CreateButton("Sound Toggle", settingsCard, "おと あり", new Vector2(520f, 104f), 36);
            SetAnchor((RectTransform)soundButton.transform, new Vector2(0.5f, 0.58f), Vector2.zero, new Vector2(520f, 104f));
            soundButton.gameObject.AddComponent<AccessibleLabel>().Configure("おとの きりかえ");
            var soundLabel = soundButton.GetComponentInChildren<Text>();
            var motionButton = UiFactory.CreateButton("Motion Toggle", settingsCard, "うごき そのまま", new Vector2(520f, 104f), 34);
            SetAnchor((RectTransform)motionButton.transform, new Vector2(0.5f, 0.38f), Vector2.zero, new Vector2(520f, 104f));
            motionButton.gameObject.AddComponent<AccessibleLabel>().Configure("うごきの きりかえ");
            var motionLabel = motionButton.GetComponentInChildren<Text>();
            var closeSettingsButton = UiFactory.CreateButton("Close Settings", settingsCard, "とじる", new Vector2(300f, 96f), 34);
            SetAnchor((RectTransform)closeSettingsButton.transform, new Vector2(0.5f, 0.16f), Vector2.zero, new Vector2(300f, 96f));
            closeSettingsButton.gameObject.AddComponent<AccessibleLabel>().Configure("とじる");
            settingsPanel.SetActive(false);

            var revealPresenter = gameObject.AddComponent<RevealTexturePresenter>();
            var audio = gameObject.AddComponent<HideSeekAudio>();
            var controller = gameObject.AddComponent<HideSeekGameController>();
            controller.Configure(
                inkPresenter,
                inputSurface,
                revealPresenter,
                tutorial,
                audio,
                creatures,
                progressTokens,
                stageTitle,
                foundBanner,
                completePanel,
                completeTitle,
                exitPanel,
                settingsPanel,
                soundLabel,
                motionLabel,
                celebration);

            backButton.onClick.AddListener(controller.ShowExitDialog);
            settingsButton.onClick.AddListener(controller.ShowSettings);
            replayButton.onClick.AddListener(controller.RestartGame);
            completeExitButton.onClick.AddListener(controller.ShowExitDialog);
            keepPlayingButton.onClick.AddListener(controller.CancelExit);
            exitButton.onClick.AddListener(controller.ConfirmExit);
            soundButton.onClick.AddListener(controller.ToggleSound);
            motionButton.onClick.AddListener(controller.ToggleReduceMotion);
            closeSettingsButton.onClick.AddListener(controller.CloseSettings);
        }

        private static Button CreateIconButton(
            string name,
            RectTransform parent,
            string resourcePath,
            Vector2 anchor,
            Vector2 anchoredPosition,
            Vector2 size,
            string accessibleLabel)
        {
            var image = UiFactory.CreateImage(name, parent, RuntimeAssetLoader.LoadSprite(resourcePath), Color.white);
            image.raycastTarget = true;
            SetAnchor(image.rectTransform, anchor, anchoredPosition, size);
            var button = image.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            button.transition = Selectable.Transition.ColorTint;
            var colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1f, 1f, 0.92f, 1f);
            colors.pressedColor = new Color(0.82f, 0.78f, 0.68f, 1f);
            colors.fadeDuration = 0.08f;
            button.colors = colors;
            image.gameObject.AddComponent<AccessibleLabel>().Configure(accessibleLabel);
            return button;
        }

        private static GameObject CreateCardOverlay(string name, RectTransform parent, bool dimBackground, out RectTransform card)
        {
            var overlay = UiFactory.CreateRect(name, parent);
            UiFactory.Fill(overlay);
            if (dimBackground)
            {
                var dimmer = overlay.gameObject.AddComponent<Image>();
                dimmer.color = new Color(0.10f, 0.08f, 0.06f, 0.48f);
                dimmer.raycastTarget = true;
            }

            var cardImage = UiFactory.CreateImage(
                "Card",
                overlay,
                RuntimeAssetLoader.LoadSprite("HideSeekCreatures/UI/discovery_popup"),
                Color.white);
            cardImage.raycastTarget = true;
            card = cardImage.rectTransform;
            card.anchorMin = card.anchorMax = new Vector2(0.5f, 0.5f);
            card.pivot = new Vector2(0.5f, 0.5f);
            card.anchoredPosition = Vector2.zero;
            card.sizeDelta = new Vector2(900f, 540f);
            cardImage.preserveAspect = true;
            return overlay.gameObject;
        }

        private static void SetAnchor(RectTransform rect, Vector2 anchor, Vector2 position, Vector2 size)
        {
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = size;
        }

        private static void AddSoftShadow(Text text, Color color, Vector2 distance)
        {
            var shadow = text.gameObject.AddComponent<Shadow>();
            shadow.effectColor = color;
            shadow.effectDistance = distance;
            shadow.useGraphicAlpha = true;
        }
    }
}
