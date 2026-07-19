using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace Pono.ColorWaterDelivery.UI
{
    internal static class ColorWaterUiFactory
    {
        private static readonly Dictionary<string, Sprite> Sprites = new Dictionary<string, Sprite>();
        private static Sprite _circleSprite;

        public static RectTransform CreateRect(string name, Transform parent)
        {
            var gameObject = new GameObject(name, typeof(RectTransform));
            var rect = (RectTransform)gameObject.transform;
            rect.SetParent(parent, false);
            return rect;
        }

        public static Image CreateImage(string name, Transform parent, Sprite sprite, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = sprite;
            image.color = color;
            image.preserveAspect = sprite != null;
            image.raycastTarget = false;
            return image;
        }

        public static RawImage CreateRawImage(string name, Transform parent, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<RawImage>();
            image.texture = Texture2D.whiteTexture;
            image.color = color;
            image.raycastTarget = false;
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
            text.font = Resources.Load<Font>("Fonts/NotoSansJP-Variable");
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

        public static Button CreateWoodButton(
            string name,
            Transform parent,
            string label,
            Vector2 size,
            int fontSize = 34)
        {
            var rect = CreateRect(name, parent);
            rect.sizeDelta = size;
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = LoadSprite(
                "HideSeekCreatures/UI/button_normal",
                new Vector4(44f, 28f, 44f, 28f));
            image.type = Image.Type.Sliced;
            image.raycastTarget = true;

            var button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = image;
            button.transition = Selectable.Transition.SpriteSwap;
            var spriteState = button.spriteState;
            spriteState.pressedSprite = LoadSprite(
                "HideSeekCreatures/UI/button_pressed",
                new Vector4(44f, 28f, 44f, 28f));
            spriteState.highlightedSprite = image.sprite;
            spriteState.selectedSprite = image.sprite;
            button.spriteState = spriteState;

            var text = CreateText(
                "Label",
                rect,
                label,
                fontSize,
                TextAnchor.MiddleCenter,
                new Color(0.25f, 0.17f, 0.10f));
            Fill(text.rectTransform);
            text.rectTransform.offsetMin = new Vector2(18f, 8f);
            text.rectTransform.offsetMax = new Vector2(-18f, -8f);
            return button;
        }

        public static Sprite LoadSprite(string path, Vector4 border = default)
        {
            var key = $"{path}:{border}";
            if (Sprites.TryGetValue(key, out var cached) && cached != null)
            {
                return cached;
            }

            var texture = Resources.Load<Texture2D>(path);
            if (texture == null)
            {
                Debug.LogError($"ColorWater resource not found: {path}");
                return null;
            }

            var sprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, texture.width, texture.height),
                new Vector2(0.5f, 0.5f),
                100f,
                0,
                SpriteMeshType.FullRect,
                border);
            sprite.name = texture.name;
            Sprites[key] = sprite;
            return sprite;
        }

        public static Sprite GetCircleSprite()
        {
            if (_circleSprite != null)
            {
                return _circleSprite;
            }

            const int size = 64;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false, true)
            {
                name = "ColorWater Circle (Runtime)",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            for (var y = 0; y < size; y++)
            {
                for (var x = 0; x < size; x++)
                {
                    var distance = Vector2.Distance(new Vector2(x, y), new Vector2(center, center)) / center;
                    var alpha = Mathf.Clamp01((1f - distance) * 8f);
                    pixels[x + y * size] = new Color(1f, 1f, 1f, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            _circleSprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, size, size),
                new Vector2(0.5f, 0.5f),
                100f);
            _circleSprite.name = "ColorWater Circle (Runtime)";
            return _circleSprite;
        }

        public static void Fill(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
        }

        public static void Place(
            RectTransform rect,
            Vector2 anchor,
            Vector2 size,
            Vector2 anchoredPosition = default)
        {
            rect.anchorMin = rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.sizeDelta = size;
            rect.anchoredPosition = anchoredPosition;
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
