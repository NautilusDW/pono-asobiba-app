using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace Pono.HideSeekCreatures.UI
{
    public static class UiFactory
    {
        public static RectTransform CreateRect(string name, Transform parent)
        {
            var gameObject = new GameObject(name, typeof(RectTransform));
            var rect = (RectTransform)gameObject.transform;
            rect.SetParent(parent, worldPositionStays: false);
            return rect;
        }

        public static Image CreateImage(string name, Transform parent, Sprite sprite, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = sprite;
            image.color = color;
            image.raycastTarget = false;
            image.preserveAspect = sprite != null;
            return image;
        }

        public static RawImage CreateRawImage(string name, Transform parent, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<RawImage>();
            image.color = color;
            image.texture = Texture2D.whiteTexture;
            return image;
        }

        public static Text CreateText(
            string name,
            Transform parent,
            string value,
            int fontSize,
            TextAnchor alignment,
            Color color)
        {
            var rect = CreateRect(name, parent);
            var text = rect.gameObject.AddComponent<Text>();
            text.font = RuntimeAssetLoader.LoadFont();
            text.text = value;
            text.fontSize = fontSize;
            text.alignment = alignment;
            text.color = color;
            text.supportRichText = false;
            text.resizeTextForBestFit = true;
            text.resizeTextMinSize = Mathf.Max(18, fontSize / 2);
            text.resizeTextMaxSize = fontSize;
            text.raycastTarget = false;
            return text;
        }

        public static Button CreateButton(
            string name,
            Transform parent,
            string label,
            Vector2 size,
            int fontSize = 34)
        {
            var normalSprite = RuntimeAssetLoader.LoadSprite(
                "HideSeekCreatures/UI/button_normal",
                new Vector4(44f, 28f, 44f, 28f));
            var pressedSprite = RuntimeAssetLoader.LoadSprite(
                "HideSeekCreatures/UI/button_pressed",
                new Vector4(44f, 28f, 44f, 28f));
            var rect = CreateRect(name, parent);
            rect.sizeDelta = size;
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = normalSprite;
            image.type = Image.Type.Sliced;
            image.raycastTarget = true;
            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            button.transition = Selectable.Transition.SpriteSwap;
            var state = button.spriteState;
            state.pressedSprite = pressedSprite;
            state.selectedSprite = normalSprite;
            state.highlightedSprite = normalSprite;
            button.spriteState = state;

            var text = CreateText("Label", rect, label, fontSize, TextAnchor.MiddleCenter, new Color(0.25f, 0.17f, 0.10f));
            Fill(text.rectTransform);
            text.rectTransform.offsetMin = new Vector2(18f, 8f);
            text.rectTransform.offsetMax = new Vector2(-18f, -8f);
            return button;
        }

        public static void Fill(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        public static void EnsureEventSystem()
        {
            if (Object.FindFirstObjectByType<EventSystem>() != null)
            {
                return;
            }
            var eventSystem = new GameObject("EventSystem", typeof(EventSystem));
            var inputModule = eventSystem.AddComponent<InputSystemUIInputModule>();
            inputModule.AssignDefaultActions();
            Object.DontDestroyOnLoad(eventSystem);
        }
    }
}
