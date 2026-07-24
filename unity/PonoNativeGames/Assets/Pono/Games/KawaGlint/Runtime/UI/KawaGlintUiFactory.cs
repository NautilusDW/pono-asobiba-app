using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace Pono.KawaGlint.UI
{
    /// <summary>
    /// Procedural uGUI construction helpers for KawaGlint's runtime-built HUD,
    /// mirroring <c>Pono.HideSeekCreatures.UI.UiFactory</c>. Unlike HideSeek's
    /// factory, KawaGlint has no Resources/-shipped button sprites or JP font
    /// asset to load from -- every visual here is either a plain color rect
    /// (Texture2D.whiteTexture, via Image with no sprite) or a code-generated
    /// soft dot, and the font is resolved from the OS at runtime.
    /// </summary>
    public static class KawaGlintUiFactory
    {
        // Tried in order; the first one the platform actually has wins. Falls
        // back to Unity's always-present LegacyRuntime.ttf (Latin-only, but
        // never null) if every OS candidate fails -- this project's japanese
        // strings would render as tofu boxes in that fallback case, but the
        // HUD never throws.
        private static readonly string[] FontCandidates =
        {
            "Hiragino Maru Gothic ProN",
            "Hiragino Sans",
            "Noto Sans CJK JP",
            "Roboto"
        };

        private const int DotTextureSize = 64;
        private const int RingTextureSize = 256;

        // Normalized (0..1, matching LoadDotSprite's distance/radius convention
        // where 1.0 touches the middle of each texture edge) outer/inner radii
        // of the procedural annulus used by the timing-ring UI (module B).
        // Radius 0.5 leaves generous padding for the outer ring's up-to-2.8x
        // scale animation to never clip against the texture bounds.
        private const float RingOuterRadiusNorm = 0.5f;
        private const float RingInnerRadiusNorm = 0.38f;
        private const float RingAntiAliasWidthNorm = 0.02f;

        private static Font _cachedFont;
        private static Sprite _cachedDotSprite;
        private static Sprite _cachedRingSprite;

        public static RectTransform CreateRect(string name, Transform parent)
        {
            var gameObject = new GameObject(name, typeof(RectTransform));
            var rect = (RectTransform)gameObject.transform;
            rect.SetParent(parent, worldPositionStays: false);
            return rect;
        }

        /// <summary>Plain color rectangle (no sprite). Set <paramref name="raycastTarget"/> true only for the tap surface.</summary>
        public static Image CreateImage(string name, Transform parent, Color color, bool raycastTarget = false)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.color = color;
            image.raycastTarget = raycastTarget;
            return image;
        }

        /// <summary>A soft round dot (rarity indicator) rather than a hard-edged square Image.</summary>
        public static Image CreateDot(string name, Transform parent, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = LoadDotSprite();
            image.color = color;
            image.raycastTarget = false;
            image.preserveAspect = true;
            return image;
        }

        /// <summary>
        /// A procedural annulus (ring) sprite used by the bite-window timing
        /// guide (module B): a static target ring plus a shrinking outer
        /// ring, both instances of this same shared sprite recolored/rescaled
        /// per-caller. Purely a visual guide -- never used to judge tap
        /// precision (see KawaGlintHud/KawaGlintGameController contract).
        /// </summary>
        public static Image CreateRing(string name, Transform parent, Color color)
        {
            var rect = CreateRect(name, parent);
            var image = rect.gameObject.AddComponent<Image>();
            image.sprite = LoadRingSprite();
            image.color = color;
            image.raycastTarget = false;
            image.preserveAspect = true;
            return image;
        }

        public static Text CreateText(
            string name,
            Transform parent,
            string value,
            int fontSize,
            TextAnchor alignment,
            Color color,
            bool outline = false,
            bool shadow = false)
        {
            var rect = CreateRect(name, parent);
            var text = rect.gameObject.AddComponent<Text>();
            text.font = LoadFont();
            text.text = value;
            text.fontSize = fontSize;
            text.alignment = alignment;
            text.color = color;
            text.supportRichText = false;
            text.raycastTarget = false;

            // Outline before Shadow: uGUI applies vertex-modifier components in
            // AddComponent order, so Shadow must run on top of an
            // already-outlined glyph mesh to shadow the outline too (not just
            // the bare glyph). Both default to off so every pre-existing
            // CreateText() call site (timing-ring labels, banners, etc., which
            // already sit on their own dark panel背景) keeps its exact prior
            // look.
            if (outline)
            {
                var o = rect.gameObject.AddComponent<Outline>();
                o.effectColor = new Color(0.05f, 0.16f, 0.24f, 1f); // deep river navy #0D2938 (matches NarrationBarBg)
                o.effectDistance = new Vector2(2f, 2f);
                o.useGraphicAlpha = true;
            }
            if (shadow)
            {
                var s = rect.gameObject.AddComponent<Shadow>();
                s.effectColor = new Color(0f, 0f, 0f, 0.8f);
                s.effectDistance = new Vector2(0f, -3f);
                s.useGraphicAlpha = true;
            }

            return text;
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

        private static Font LoadFont()
        {
            if (_cachedFont != null)
            {
                return _cachedFont;
            }

            for (var i = 0; i < FontCandidates.Length; i++)
            {
                var font = Font.CreateDynamicFontFromOSFont(FontCandidates[i], 16);
                if (font != null)
                {
                    _cachedFont = font;
                    return _cachedFont;
                }
            }

            _cachedFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            return _cachedFont;
        }

        private static Sprite LoadDotSprite()
        {
            if (_cachedDotSprite != null)
            {
                return _cachedDotSprite;
            }

            const int size = DotTextureSize;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, mipChain: false, linear: false)
            {
                name = "KawaGlint HUD Dot",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var radius = center;
            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                var rowStart = y * size;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var distance = Mathf.Sqrt(dx * dx + dy * dy) / radius;
                    var alpha = Mathf.Clamp01(1f - distance);
                    alpha = alpha * alpha * (3f - 2f * alpha); // smoothstep -> soft round edge
                    pixels[rowStart + x] = new Color(1f, 1f, 1f, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);

            _cachedDotSprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, size, size),
                new Vector2(0.5f, 0.5f),
                100f,
                0,
                SpriteMeshType.FullRect);
            _cachedDotSprite.name = "KawaGlint HUD Dot Sprite";
            return _cachedDotSprite;
        }

        private static Sprite LoadRingSprite()
        {
            if (_cachedRingSprite != null)
            {
                return _cachedRingSprite;
            }

            const int size = RingTextureSize;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, mipChain: false, linear: false)
            {
                name = "KawaGlint HUD Ring",
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var radius = center;
            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                var rowStart = y * size;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var distanceNorm = Mathf.Sqrt(dx * dx + dy * dy) / radius;

                    // Outside the outer radius fades to transparent; inside the
                    // inner radius also fades to transparent -- their product
                    // leaves only the annular band between them opaque, with a
                    // smoothstep-antialiased edge on both sides (mirrors the
                    // GLSL smoothstep(edge0, edge1, x) convention, not
                    // Mathf.SmoothStep's differently-shaped from/to overload).
                    var outerAlpha = 1f - SmoothStep01(
                        RingOuterRadiusNorm - RingAntiAliasWidthNorm, RingOuterRadiusNorm, distanceNorm);
                    var innerAlpha = SmoothStep01(
                        RingInnerRadiusNorm - RingAntiAliasWidthNorm, RingInnerRadiusNorm, distanceNorm);
                    var alpha = outerAlpha * innerAlpha;
                    pixels[rowStart + x] = new Color(1f, 1f, 1f, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);

            _cachedRingSprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, size, size),
                new Vector2(0.5f, 0.5f),
                100f,
                0,
                SpriteMeshType.FullRect);
            _cachedRingSprite.name = "KawaGlint HUD Ring Sprite";
            return _cachedRingSprite;
        }

        private static float SmoothStep01(float edge0, float edge1, float x)
        {
            var t = Mathf.Clamp01((x - edge0) / (edge1 - edge0));
            return t * t * (3f - 2f * t);
        }
    }
}
