using System.Collections.Generic;
using Pono.ColorWaterDelivery.Gameplay;
using Pono.ColorWaterDelivery.UI;
using Pono.NativeShell;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Pono.ColorWaterDelivery.Bootstrap
{
    [DisallowMultipleComponent]
    public sealed class ColorWaterDeliveryBootstrap : MonoBehaviour
    {
        private static readonly Color Brown = new Color(0.25f, 0.16f, 0.09f, 1f);
        private static readonly Color Cream = new Color(1f, 0.97f, 0.84f, 0.94f);

        private void Awake()
        {
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            ColorWaterUiFactory.EnsureEventSystem();
            BuildGame();
        }

        private void BuildGame()
        {
            var controller = gameObject.AddComponent<ColorWaterDeliveryController>();
            var canvasObject = new GameObject(
                "Color Water Canvas",
                typeof(RectTransform),
                typeof(Canvas),
                typeof(CanvasScaler),
                typeof(GraphicRaycaster));
            canvasObject.transform.SetParent(transform, false);
            var canvasRect = (RectTransform)canvasObject.transform;
            var canvas = canvasObject.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasObject.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(2560f, 1440f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            var root = ColorWaterUiFactory.CreateRect("Game Surface", canvasRect);
            ColorWaterUiFactory.Fill(root);
            var forest = ColorWaterUiFactory.LoadSprite("HideSeekCreatures/km01/forest_background");
            var backdrop = ColorWaterUiFactory.CreateImage(
                "Forest Backdrop",
                root,
                forest,
                new Color(0.64f, 0.72f, 0.56f, 1f));
            backdrop.rectTransform.anchorMin = backdrop.rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
            backdrop.gameObject.AddComponent<AspectCoverFitter>();
            var outsideVeil = ColorWaterUiFactory.CreateImage(
                "Outside Veil",
                root,
                null,
                new Color(0.96f, 0.93f, 0.77f, 0.46f));
            ColorWaterUiFactory.Fill(outsideVeil.rectTransform);

            var contentFrame = ColorWaterUiFactory.CreateImage(
                "Color Water Content",
                root,
                forest,
                new Color(0.96f, 0.98f, 0.87f, 1f));
            contentFrame.rectTransform.anchorMin = contentFrame.rectTransform.anchorMax = new Vector2(0.5f, 0.5f);
            contentFrame.gameObject.AddComponent<AspectFitFitter>();
            var paperVeil = ColorWaterUiFactory.CreateImage(
                "Water Table",
                contentFrame.rectTransform,
                null,
                new Color(0.97f, 0.95f, 0.79f, 0.88f));
            ColorWaterUiFactory.Fill(paperVeil.rectTransform);

            CreateSourceWell(
                contentFrame.rectTransform,
                "Blue Spring",
                ColorWaterDeliveryController.BlueSourceUv,
                new Color(0.16f, 0.56f, 0.96f, 0.52f),
                "あおの いずみ",
                new Vector2(0f, 118f));
            CreateSourceWell(
                contentFrame.rectTransform,
                "Yellow Spring",
                ColorWaterDeliveryController.YellowSourceUv,
                new Color(1f, 0.72f, 0.12f, 0.56f),
                "きいろの いずみ",
                new Vector2(0f, -118f));
            CreateMixingPool(contentFrame.rectTransform);
            CreateGoalRing(contentFrame.rectTransform);
            CreateRock(contentFrame.rectTransform, new Vector2(0.49f, 0.78f));
            CreateRock(contentFrame.rectTransform, new Vector2(0.49f, 0.22f));

            var fluidImage = ColorWaterUiFactory.CreateRawImage(
                "Two Color Fluid",
                contentFrame.rectTransform,
                Color.white);
            ColorWaterUiFactory.Fill(fluidImage.rectTransform);
            var fluid = fluidImage.gameObject.AddComponent<ColorWaterFluidPresenter>();
            fluid.Initialize();

            var gateViews = new List<LeafGateView>(3)
            {
                CreateGate(contentFrame.rectTransform, "blue_gate", new Vector2(0.31f, 0.68f), controller),
                CreateGate(contentFrame.rectTransform, "yellow_gate", new Vector2(0.31f, 0.32f), controller),
                CreateGate(contentFrame.rectTransform, "goal_gate", new Vector2(0.69f, 0.50f), controller)
            };

            var rabbitHouse = CreateRabbitHouse(contentFrame.rectTransform, out var rabbit);
            rabbitHouse.SetAsLastSibling();
            var progressLeaves = CreateProgressLeaves(contentFrame.rectTransform);

            var header = ColorWaterUiFactory.CreateText(
                "Stage Title",
                contentFrame.rectTransform,
                "あお ＋ きいろ ＝ みどり",
                54,
                TextAnchor.MiddleCenter,
                Brown);
            ColorWaterUiFactory.Place(header.rectTransform, new Vector2(0.5f, 0.92f), new Vector2(1080f, 92f));
            var headerShadow = header.gameObject.AddComponent<Shadow>();
            headerShadow.effectColor = new Color(1f, 1f, 0.86f, 0.88f);
            headerShadow.effectDistance = new Vector2(2f, -2f);

            var instruction = ColorWaterUiFactory.CreateText(
                "Instruction",
                contentFrame.rectTransform,
                "はっぱを さわって みずを まげよう",
                43,
                TextAnchor.MiddleCenter,
                Brown);
            ColorWaterUiFactory.Place(instruction.rectTransform, new Vector2(0.5f, 0.075f), new Vector2(1400f, 82f));
            var instructionShadow = instruction.gameObject.AddComponent<Shadow>();
            instructionShadow.effectColor = new Color(1f, 1f, 0.90f, 0.95f);
            instructionShadow.effectDistance = new Vector2(2f, -2f);

            var status = ColorWaterUiFactory.CreateText(
                "Water Status",
                contentFrame.rectTransform,
                "みずの ながれを みてみよう",
                34,
                TextAnchor.MiddleCenter,
                new Color(0.24f, 0.41f, 0.23f, 1f));
            ColorWaterUiFactory.Place(status.rectTransform, new Vector2(0.54f, 0.84f), new Vector2(1000f, 64f));

            var safeRoot = ColorWaterUiFactory.CreateRect("Safe Area UI", root);
            ColorWaterUiFactory.Fill(safeRoot);
            safeRoot.gameObject.AddComponent<SafeAreaFitter>();
            var backButton = CreateIconButton(
                "Back Button",
                safeRoot,
                "HideSeekCreatures/UI/back_button",
                new Vector2(0f, 1f),
                new Vector2(86f, -78f),
                new Vector2(112f, 112f));
            var settingsButton = CreateIconButton(
                "Pause Button",
                safeRoot,
                "HideSeekCreatures/UI/settings_button",
                new Vector2(1f, 1f),
                new Vector2(-80f, -78f),
                new Vector2(100f, 100f));

            var pausePanel = CreatePausePanel(contentFrame.rectTransform, controller);
            var completePanel = CreateCompletePanel(contentFrame.rectTransform, controller);
            backButton.onClick.AddListener(controller.RequestExit);
            settingsButton.onClick.AddListener(controller.TogglePause);

            controller.Initialize(
                fluid,
                gateViews,
                instruction,
                status,
                progressLeaves,
                rabbit,
                pausePanel,
                completePanel);

            ColorWaterRuntimeQaCapture.AttachIfRequested(gameObject);
        }

        private static void CreateSourceWell(
            RectTransform parent,
            string name,
            Vector2 uv,
            Color color,
            string label,
            Vector2 labelOffset)
        {
            var ring = ColorWaterUiFactory.CreateImage(
                name,
                parent,
                ColorWaterUiFactory.GetCircleSprite(),
                color);
            ColorWaterUiFactory.Place(ring.rectTransform, uv, new Vector2(220f, 220f));
            var inner = ColorWaterUiFactory.CreateImage(
                "Spring Core",
                ring.rectTransform,
                ColorWaterUiFactory.GetCircleSprite(),
                new Color(color.r, color.g, color.b, 0.82f));
            ColorWaterUiFactory.Place(inner.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(112f, 112f));
            var text = ColorWaterUiFactory.CreateText(
                "Spring Label",
                ring.rectTransform,
                label,
                30,
                TextAnchor.MiddleCenter,
                Brown);
            ColorWaterUiFactory.Place(text.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(300f, 58f), labelOffset);
        }

        private static void CreateMixingPool(RectTransform parent)
        {
            var pool = ColorWaterUiFactory.CreateImage(
                "Mixing Pool",
                parent,
                ColorWaterUiFactory.GetCircleSprite(),
                new Color(0.34f, 0.78f, 0.42f, 0.18f));
            ColorWaterUiFactory.Place(
                pool.rectTransform,
                ColorWaterDeliveryController.MixingPoolUv,
                new Vector2(300f, 300f));
            var label = ColorWaterUiFactory.CreateText(
                "Mixing Label",
                pool.rectTransform,
                "まぜいけ",
                29,
                TextAnchor.MiddleCenter,
                new Color(0.21f, 0.42f, 0.24f, 0.86f));
            ColorWaterUiFactory.Place(label.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(230f, 54f));
        }

        private static void CreateGoalRing(RectTransform parent)
        {
            var goal = ColorWaterUiFactory.CreateImage(
                "Home Water Cup",
                parent,
                ColorWaterUiFactory.GetCircleSprite(),
                new Color(0.25f, 0.78f, 0.44f, 0.28f));
            ColorWaterUiFactory.Place(
                goal.rectTransform,
                ColorWaterDeliveryController.GoalUv,
                new Vector2(230f, 230f));
            var inner = ColorWaterUiFactory.CreateImage(
                "Goal Core",
                goal.rectTransform,
                ColorWaterUiFactory.GetCircleSprite(),
                new Color(0.96f, 0.94f, 0.76f, 0.68f));
            ColorWaterUiFactory.Place(inner.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(112f, 112f));
        }

        private static void CreateRock(RectTransform parent, Vector2 uv)
        {
            var rock = ColorWaterUiFactory.CreateImage(
                "Smooth Stone",
                parent,
                ColorWaterUiFactory.GetCircleSprite(),
                new Color(0.47f, 0.50f, 0.42f, 0.78f));
            ColorWaterUiFactory.Place(rock.rectTransform, uv, new Vector2(135f, 118f));
        }

        private static LeafGateView CreateGate(
            RectTransform parent,
            string id,
            Vector2 uv,
            ColorWaterDeliveryController controller)
        {
            var gateObject = new GameObject($"Leaf Gate {id}", typeof(RectTransform), typeof(LeafGateView));
            gateObject.transform.SetParent(parent, false);
            var view = gateObject.GetComponent<LeafGateView>();
            view.Initialize(id, uv, controller.OnGateTapped);
            return view;
        }

        private static RectTransform CreateRabbitHouse(RectTransform parent, out Image rabbit)
        {
            var house = ColorWaterUiFactory.CreateImage(
                "Rabbit House",
                parent,
                ColorWaterUiFactory.LoadSprite("HideSeekCreatures/UI/discovery_popup"),
                Color.white);
            ColorWaterUiFactory.Place(house.rectTransform, new Vector2(0.92f, 0.48f), new Vector2(330f, 410f));
            rabbit = ColorWaterUiFactory.CreateImage(
                "Rabbit",
                house.rectTransform,
                ColorWaterUiFactory.LoadSprite("HideSeekCreatures/km01/rabbit"),
                Color.white);
            ColorWaterUiFactory.Place(rabbit.rectTransform, new Vector2(0.5f, 0.47f), new Vector2(205f, 260f));
            var label = ColorWaterUiFactory.CreateText(
                "House Label",
                house.rectTransform,
                "ウサギの おうち",
                29,
                TextAnchor.MiddleCenter,
                Brown);
            ColorWaterUiFactory.Place(label.rectTransform, new Vector2(0.5f, 0.88f), new Vector2(250f, 52f));
            return house.rectTransform;
        }

        private static Image[] CreateProgressLeaves(RectTransform parent)
        {
            var leaves = new Image[3];
            var sprite = ColorWaterUiFactory.LoadSprite("HideSeekCreatures/UI/leaf_token");
            for (var index = 0; index < leaves.Length; index++)
            {
                leaves[index] = ColorWaterUiFactory.CreateImage(
                    $"Delivery Leaf {index + 1}",
                    parent,
                    sprite,
                    new Color(0.58f, 0.57f, 0.45f, 0.42f));
                ColorWaterUiFactory.Place(
                    leaves[index].rectTransform,
                    new Vector2(0.88f + index * 0.035f, 0.80f),
                    new Vector2(76f, 76f));
            }
            return leaves;
        }

        private static Button CreateIconButton(
            string name,
            Transform parent,
            string resourcePath,
            Vector2 anchor,
            Vector2 position,
            Vector2 size)
        {
            var image = ColorWaterUiFactory.CreateImage(
                name,
                parent,
                ColorWaterUiFactory.LoadSprite(resourcePath),
                Color.white);
            ColorWaterUiFactory.Place(image.rectTransform, anchor, size, position);
            image.raycastTarget = true;
            var button = image.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            button.transition = Selectable.Transition.ColorTint;
            return button;
        }

        private static GameObject CreatePausePanel(
            RectTransform parent,
            ColorWaterDeliveryController controller)
        {
            var overlay = CreateOverlay("Pause Panel", parent, "ちょっと ひとやすみ");
            var panel = (RectTransform)overlay.transform.Find("Panel");
            var resume = ColorWaterUiFactory.CreateWoodButton(
                "Resume",
                panel,
                "つづける",
                new Vector2(360f, 108f));
            ColorWaterUiFactory.Place(resume.GetComponent<RectTransform>(), new Vector2(0.5f, 0.54f), new Vector2(360f, 108f));
            resume.onClick.AddListener(controller.TogglePause);
            var waterReset = ColorWaterUiFactory.CreateWoodButton(
                "Water Reset",
                panel,
                "おみずを もどす",
                new Vector2(420f, 108f),
                30);
            ColorWaterUiFactory.Place(waterReset.GetComponent<RectTransform>(), new Vector2(0.5f, 0.33f), new Vector2(420f, 108f));
            waterReset.onClick.AddListener(() =>
            {
                controller.ResetWater();
                controller.TogglePause();
            });
            overlay.SetActive(false);
            return overlay;
        }

        private static GameObject CreateCompletePanel(
            RectTransform parent,
            ColorWaterDeliveryController controller)
        {
            var overlay = CreateOverlay("Complete Panel", parent, "みどりの おみず とどいた！");
            var panel = (RectTransform)overlay.transform.Find("Panel");
            var retry = ColorWaterUiFactory.CreateWoodButton(
                "Retry",
                panel,
                "もういちど",
                new Vector2(350f, 108f));
            ColorWaterUiFactory.Place(retry.GetComponent<RectTransform>(), new Vector2(0.34f, 0.31f), new Vector2(350f, 108f));
            retry.onClick.AddListener(controller.Restart);
            var exit = ColorWaterUiFactory.CreateWoodButton(
                "Exit",
                panel,
                "おわる",
                new Vector2(350f, 108f));
            ColorWaterUiFactory.Place(exit.GetComponent<RectTransform>(), new Vector2(0.66f, 0.31f), new Vector2(350f, 108f));
            exit.onClick.AddListener(controller.RequestExit);
            overlay.SetActive(false);
            return overlay;
        }

        private static GameObject CreateOverlay(string name, RectTransform parent, string titleText)
        {
            var overlay = ColorWaterUiFactory.CreateRect(name, parent);
            ColorWaterUiFactory.Fill(overlay);
            var dimmer = overlay.gameObject.AddComponent<Image>();
            dimmer.color = new Color(0.10f, 0.08f, 0.04f, 0.42f);
            dimmer.raycastTarget = true;

            var panelImage = ColorWaterUiFactory.CreateImage(
                "Panel",
                overlay,
                ColorWaterUiFactory.LoadSprite("HideSeekCreatures/UI/discovery_popup"),
                Color.white);
            ColorWaterUiFactory.Place(panelImage.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(920f, 580f));
            var title = ColorWaterUiFactory.CreateText(
                "Title",
                panelImage.rectTransform,
                titleText,
                47,
                TextAnchor.MiddleCenter,
                Brown);
            ColorWaterUiFactory.Place(title.rectTransform, new Vector2(0.5f, 0.73f), new Vector2(720f, 110f));
            return overlay.gameObject;
        }
    }
}
