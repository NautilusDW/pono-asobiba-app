using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Builds every wave-synced actor in the KawaGlint river spike -- fish
    /// shadows, the bobber (ウキ), its ripple rings, and the fishing line --
    /// procedurally under a given parent transform. Every texture is a
    /// code-generated <see cref="Texture2D"/> and every material a plain
    /// <c>new Material(shader)</c> built from a stock URP 2D shader; this
    /// class has zero dependency on any other KawaGlint module's C# types
    /// (per DESIGN.md's cross-module dependency rule) and therefore always
    /// succeeds regardless of whether the refraction/surface shaders are
    /// available on the current platform.
    ///
    /// The refraction full-screen pass (a different module) is screen-space
    /// below the waterline, so every underwater sprite built here wobbles
    /// for free once that pass is active -- no extra distortion work is
    /// needed in this class.
    /// </summary>
    public static class KawaGlintActorsBuilder
    {
        private const float PixelsPerUnit = 100f;

        // Fixed seed shared by every KawaGlint module (DESIGN.md: "every
        // module that uses randomness seeds System.Random(20260724)").
        private const int GenerationSeed = 20260724;

        // Sorting-order contract shared with the other KawaGlint rendering
        // modules (refraction/surface own 0-30; the bobber's ripple rings,
        // the fishing line and the bobber itself own the remaining gaps).
        private const int FishSortingOrder = 14;
        private const int RippleRingSortingOrder = 32;
        private const int FishingLineSortingOrder = 33;
        private const int BobberSortingOrder = 34;

        private const int FishTextureWidth = 128;
        private const int FishTextureHeight = 64;
        private const int FishCount = 4;
        private const float FishMinLengthWorld = 0.8f;
        private const float FishMaxLengthWorld = 1.6f;
        private const float FishMinDepthY = -4.2f;
        private const float FishMaxDepthY = 0.8f;
        private const float FishMinSpeedWorld = 0.4f;
        private const float FishMaxSpeedWorld = 0.9f;
        private const float FishBobAmplitude = 0.15f;

        // Bob frequency isn't a value pinned by the shared DESIGN.md
        // contract (only drift speed and bob amplitude are) -- chosen to
        // read as a slow ambient sway clearly distinct from the water
        // surface's own ~1-3 Hz wave frequencies.
        private const float FishMinBobSpeed = 0.3f;
        private const float FishMaxBobSpeed = 0.6f;

        private static readonly Color FishShadowColor = HexColor(0x0A, 0x2E, 0x44);
        private const float FishShadowAlpha = 0.55f;

        private const int BobberTextureWidth = 64;
        private const int BobberTextureHeight = 96;
        private const float BobberWorldHeight = 0.55f;
        private const float BobberRestX = 1.8f;

        // Top ~46% of the texture is the red dome, so the dome/white split
        // sits at v = 1 - 0.46 = 0.54 (v = 0 bottom row, v = 1 top row).
        private const float BobberSplitV = 0.54f;
        private const float BobberWaistHalfBandV = 3f / BobberTextureHeight; // ~3px thin waistline

        private static readonly Color BobberRedColor = HexColor(0xE9, 0x4B, 0x4B);
        private static readonly Color BobberWhiteColor = Color.white;
        private static readonly Color BobberWaistColor = HexColor(0x33, 0x33, 0x33);

        private const int RingTextureSize = 128;
        private const int RingCount = 2;
        private const float RingNormalizedRadius = 0.42f;
        private const float RingNormalizedThickness = 0.09f;

        private const int LineSegments = 12;
        private const int LineSegmentPointCount = LineSegments + 1;
        private const float FishingLineWidth = 0.02f;
        private static readonly Color FishingLineColor = new Color(1f, 1f, 1f, 0.5f);

        // Stock URP 2D shader (ships with the render pipeline, not a project
        // asset) -- using it directly means every sprite/line here renders
        // correctly under the 2D Renderer with zero custom-shader risk,
        // matching the "always succeeds (stock shaders only)" module contract.
        private const string SpriteUnlitShaderName = "Universal Render Pipeline/2D/Sprite-Unlit-Default";

        public static KawaGlintActorsController Build(
            Transform parent,
            Rect waterWorldRect,
            float waterlineWorldY,
            Vector3 rodTipWorldPosition)
        {
            var root = new GameObject("KawaGlintActors");
            root.transform.SetParent(parent, false);
            var controller = root.AddComponent<KawaGlintActorsController>();
            controller.SetWrapBounds(waterWorldRect.xMin, waterWorldRect.xMax);

            var random = new System.Random(GenerationSeed);

            var spriteMaterial = CreateSharedMaterial("KawaGlint Actor Sprite (Runtime)");
            controller.RegisterGeneratedAsset(spriteMaterial);

            BuildFishShadows(controller, root.transform, waterWorldRect, random, spriteMaterial, out var fishSprite, out var fishNativeWidthWorld);
            BuildBobber(controller, root.transform, waterlineWorldY, spriteMaterial);
            BuildRippleRings(controller, root.transform, waterlineWorldY, spriteMaterial);
            BuildFishingLine(controller, root.transform, rodTipWorldPosition, spriteMaterial);

            // Built last and after every seeded random draw above, so the
            // four ambient fish keep their reproducible placement regardless
            // of this addition. Shares the ambient fish silhouette
            // texture/sprite rather than generating a second copy.
            BuildTargetFish(controller, root.transform, fishSprite, fishNativeWidthWorld, spriteMaterial);

            return controller;
        }

        // ---------------------------------------------------------------
        // Fish shadows (order 14)
        // ---------------------------------------------------------------

        private static void BuildFishShadows(
            KawaGlintActorsController controller,
            Transform parent,
            Rect waterWorldRect,
            System.Random random,
            Material material,
            out Sprite fishSprite,
            out float nativeWidthWorld)
        {
            var texture = CreateFishShadowTexture();
            controller.RegisterGeneratedAsset(texture);
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Fish Shadow", PixelsPerUnit);
            controller.RegisterGeneratedAsset(sprite);
            fishSprite = sprite;

            var nativeWidth = FishTextureWidth / PixelsPerUnit;
            nativeWidthWorld = nativeWidth;

            for (var i = 0; i < FishCount; i++)
            {
                var length = NextFloat(random, FishMinLengthWorld, FishMaxLengthWorld);
                // Uniform scale on both axes preserves the texture's native
                // 2:1 aspect ratio exactly -- no stretch.
                var scale = length / nativeWidth;
                var direction = random.Next(2) == 0 ? -1f : 1f;
                var startX = NextFloat(random, waterWorldRect.xMin, waterWorldRect.xMax);
                var baseY = NextFloat(random, FishMinDepthY, FishMaxDepthY);

                var go = new GameObject($"FishShadow{i}");
                go.transform.SetParent(parent, false);
                go.transform.position = new Vector3(startX, baseY, 0f);
                go.transform.localScale = new Vector3(scale, scale, 1f);

                var renderer = go.AddComponent<SpriteRenderer>();
                renderer.sprite = sprite;
                renderer.sharedMaterial = material;
                renderer.sortingOrder = FishSortingOrder;
                // Source silhouette faces -X by default; flip to face the
                // direction of travel.
                renderer.flipX = direction > 0f;

                var speed = NextFloat(random, FishMinSpeedWorld, FishMaxSpeedWorld);
                var bobSpeed = NextFloat(random, FishMinBobSpeed, FishMaxBobSpeed);
                var bobPhase = NextFloat(random, 0f, Mathf.PI * 2f);
                var halfWidth = length * 0.5f;

                controller.RegisterFish(go.transform, speed, direction, baseY, bobSpeed, bobPhase, FishBobAmplitude, halfWidth);
            }
        }

        private static Texture2D CreateFishShadowTexture()
        {
            const int width = FishTextureWidth;
            const int height = FishTextureHeight;
            var tint = FishShadowColor;

            var centerX = width * 0.40f;
            var centerY = height * 0.5f;
            var rx = width * 0.26f;
            var ry = height * 0.30f;
            var tailStartX = centerX + rx * 0.55f;
            var tailEndX = width * 0.97f;
            // The tail's base half-height is derived from the ellipse
            // formula at tailStartX itself, so the triangular tail joins the
            // ellipse body with no visible seam at the handoff point.
            var tailRatio = Mathf.Sqrt(Mathf.Max(0f, 1f - Square((tailStartX - centerX) / rx)));
            var tailBaseHalfHeight = ry * tailRatio;

            var texture = CreateTexture(width, height, "KawaGlint Fish Shadow");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var dy = y - centerY;
                for (var x = 0; x < width; x++)
                {
                    float shapeAlpha;
                    if (x <= tailStartX)
                    {
                        var dx = x - centerX;
                        var value = Square(dx / rx) + Square(dy / ry);
                        // Deliberately wide smoothstep band (vs. a hard
                        // cutout): stands in for a baked ~2px blur on the
                        // silhouette edge without a separate blur pass.
                        shapeAlpha = 1f - SmoothStep01(0.85f, 1.25f, value);
                    }
                    else if (x <= tailEndX)
                    {
                        var t = (x - tailStartX) / (tailEndX - tailStartX);
                        var halfHeight = Mathf.Lerp(tailBaseHalfHeight, 0f, t);
                        var value = halfHeight > 0.05f ? Mathf.Abs(dy) / halfHeight : 999f;
                        shapeAlpha = 1f - SmoothStep01(0.75f, 1.15f, value);
                    }
                    else
                    {
                        shapeAlpha = 0f;
                    }

                    var alpha = Mathf.Clamp01(shapeAlpha) * FishShadowAlpha;
                    pixels[y * width + x] = new Color(tint.r, tint.g, tint.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Target fish (order 14, same as ambient shadows -- reuses the
        // ambient silhouette sprite; deliberately excluded from
        // RegisterFish so it never joins the ambient wrap-drift pool)
        // ---------------------------------------------------------------

        private static void BuildTargetFish(
            KawaGlintActorsController controller,
            Transform parent,
            Sprite fishSprite,
            float nativeWidthWorld,
            Material material)
        {
            var go = new GameObject("TargetFishShadow");
            go.transform.SetParent(parent, false);
            go.SetActive(false);

            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = fishSprite;
            renderer.sharedMaterial = material;
            renderer.sortingOrder = FishSortingOrder;

            controller.SetTargetFish(go.transform, renderer, nativeWidthWorld);
        }

        // ---------------------------------------------------------------
        // Bobber (order 34)
        // ---------------------------------------------------------------

        private static void BuildBobber(
            KawaGlintActorsController controller,
            Transform parent,
            float waterlineWorldY,
            Material material)
        {
            var texture = CreateBobberTexture();
            controller.RegisterGeneratedAsset(texture);
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Bobber", PixelsPerUnit);
            controller.RegisterGeneratedAsset(sprite);

            var go = new GameObject("Bobber");
            go.transform.SetParent(parent, false);

            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sharedMaterial = material;
            renderer.sortingOrder = BobberSortingOrder;

            // Single uniform scalar derived from the texture's own native
            // height so the authored dome/taper silhouette is never
            // stretched off its proportions.
            var nativeHeight = BobberTextureHeight / PixelsPerUnit;
            var scale = BobberWorldHeight / nativeHeight;
            go.transform.localScale = new Vector3(scale, scale, 1f);

            var bobber = go.AddComponent<KawaGlintBobber>();
            var halfHeightWorld = BobberWorldHeight * 0.5f;
            bobber.Initialize(BobberRestX, waterlineWorldY, halfHeightWorld);

            controller.SetBobber(bobber);
        }

        private static Texture2D CreateBobberTexture()
        {
            const int width = BobberTextureWidth;
            const int height = BobberTextureHeight;
            var centerX = (width - 1) * 0.5f;
            // Inset from the full half-width so the widest point (the
            // "equator" at BobberSplitV) still has a soft anti-aliased edge
            // rather than touching the texture border.
            var maxHalfWidth = width * 0.5f * 0.82f;
            var domeHeightV = 1f - BobberSplitV;

            var texture = CreateTexture(width, height, "KawaGlint Bobber");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var v = height > 1 ? y / (float)(height - 1) : 0f;

                float halfWidthNorm;
                if (v >= BobberSplitV)
                {
                    // Upper hemisphere: widest (1.0) at the equator
                    // (v = BobberSplitV), tapering to a rounded point at the
                    // top (v = 1) -- the "dome".
                    var t = domeHeightV > 0.0001f ? (v - BobberSplitV) / domeHeightV : 0f;
                    halfWidthNorm = Mathf.Sqrt(Mathf.Max(0f, 1f - t * t));
                }
                else
                {
                    // Lower taper: linear from the equator's full width down
                    // to a point at the bottom row -- the classic bobber
                    // teardrop silhouette.
                    halfWidthNorm = BobberSplitV > 0.0001f ? v / BobberSplitV : 0f;
                }
                var halfWidthPixels = maxHalfWidth * halfWidthNorm;

                Color bodyColor;
                if (Mathf.Abs(v - BobberSplitV) < BobberWaistHalfBandV)
                {
                    bodyColor = BobberWaistColor;
                }
                else
                {
                    bodyColor = v >= BobberSplitV ? BobberRedColor : BobberWhiteColor;
                }

                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    var dx = x - centerX;
                    var value = halfWidthPixels > 0.001f ? Mathf.Abs(dx) / halfWidthPixels : 999f;
                    var alpha = 1f - SmoothStep01(0.85f, 1.05f, value);
                    pixels[rowStart + x] = new Color(bodyColor.r, bodyColor.g, bodyColor.b, Mathf.Clamp01(alpha));
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Ripple rings (order 32)
        // ---------------------------------------------------------------

        private static void BuildRippleRings(
            KawaGlintActorsController controller,
            Transform parent,
            float waterlineWorldY,
            Material material)
        {
            var texture = CreateRingTexture();
            controller.RegisterGeneratedAsset(texture);
            // pixelsPerUnit == texture size gives the ring a native diameter
            // of exactly 1 world unit, so the loop's 0.3->1.1 "world units"
            // scale values (DESIGN.md) can be written straight into
            // transform.localScale with no extra conversion factor.
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Ripple Ring", RingTextureSize);
            controller.RegisterGeneratedAsset(sprite);

            for (var i = 0; i < RingCount; i++)
            {
                var go = new GameObject($"RippleRing{i}");
                go.transform.SetParent(parent, false);
                go.transform.position = new Vector3(BobberRestX, waterlineWorldY, 0f);

                var renderer = go.AddComponent<SpriteRenderer>();
                renderer.sprite = sprite;
                renderer.sharedMaterial = material;
                renderer.sortingOrder = RippleRingSortingOrder;
                renderer.color = new Color(1f, 1f, 1f, 0f);

                // Two rings, offset by half the loop period so they read as
                // a continuous outward pulse rather than pulsing in unison.
                var phaseOffsetSeconds = i * (KawaGlintActorsController.RingLoopDurationSeconds * 0.5f);
                controller.RegisterRing(go.transform, renderer, phaseOffsetSeconds);
            }
        }

        private static Texture2D CreateRingTexture()
        {
            const int size = RingTextureSize;
            var texture = CreateTexture(size, size, "KawaGlint Ripple Ring");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var maxRadius = size * 0.5f;

            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var d = Mathf.Sqrt(dx * dx + dy * dy) / maxRadius; // 0 at center, 1 at texture edge
                    var band = Mathf.Clamp01(1f - Mathf.Abs(d - RingNormalizedRadius) / RingNormalizedThickness);
                    var alpha = band * band * (3f - 2f * band); // smoothstep -> soft ring, no hard edge
                    pixels[y * size + x] = new Color(1f, 1f, 1f, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Fishing line (order 33)
        // ---------------------------------------------------------------

        private static void BuildFishingLine(
            KawaGlintActorsController controller,
            Transform parent,
            Vector3 rodTipWorldPosition,
            Material material)
        {
            var go = new GameObject("FishingLine");
            go.transform.SetParent(parent, false);

            var line = go.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.sharedMaterial = material;
            line.sortingOrder = FishingLineSortingOrder;
            line.widthMultiplier = FishingLineWidth;
            line.numCapVertices = 2;
            line.numCornerVertices = 0;
            line.startColor = FishingLineColor;
            line.endColor = FishingLineColor;
            line.positionCount = LineSegmentPointCount;

            controller.SetFishingLine(line, rodTipWorldPosition, LineSegmentPointCount);
        }

        // ---------------------------------------------------------------
        // Shared helpers
        // ---------------------------------------------------------------

        private static Texture2D CreateTexture(int width, int height, string name)
        {
            return new Texture2D(width, height, TextureFormat.RGBA32, mipChain: false, linear: false)
            {
                name = name,
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                hideFlags = HideFlags.DontSave
            };
        }

        private static Sprite CreateSprite(Texture2D texture, Vector2 pivot, string name, float pixelsPerUnit)
        {
            var sprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, texture.width, texture.height),
                pivot,
                pixelsPerUnit,
                0,
                SpriteMeshType.FullRect);
            sprite.name = name;
            return sprite;
        }

        private static Material CreateSharedMaterial(string name)
        {
            var shader = Shader.Find(SpriteUnlitShaderName);
            if (shader == null)
            {
                Debug.LogError($"KawaGlint: shader not found, falling back: {SpriteUnlitShaderName}");
                shader = Shader.Find("Sprites/Default");
            }
            return new Material(shader)
            {
                name = name,
                hideFlags = HideFlags.DontSave
            };
        }

        private static Color HexColor(byte r, byte g, byte b, byte a = 255)
        {
            return new Color32(r, g, b, a);
        }

        private static float NextFloat(System.Random random, float min, float max)
        {
            return min + (float)random.NextDouble() * (max - min);
        }

        private static float Square(float value)
        {
            return value * value;
        }

        private static float SmoothStep01(float edge0, float edge1, float value)
        {
            var t = Mathf.Clamp01((value - edge0) / (edge1 - edge0));
            return t * t * (3f - 2f * t);
        }
    }
}
