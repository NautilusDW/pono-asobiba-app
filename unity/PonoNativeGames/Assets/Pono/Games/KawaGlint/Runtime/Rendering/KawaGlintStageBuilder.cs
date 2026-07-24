using System;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Result of <see cref="KawaGlintStageBuilder.Build"/>: the root object of
    /// the generated riverside stage plus the layout facts the other
    /// KawaGlint modules (surface band, refraction, actors) need in order to
    /// align themselves without recomputing camera/rect math of their own.
    /// </summary>
    public readonly struct KawaStageInfo
    {
        public readonly GameObject Root;
        public readonly float WaterlineWorldY;
        public readonly Rect WaterWorldRect;
        public readonly Rect SkyWorldRect;
        public readonly Vector2 SunViewportPosition;
        public readonly Vector3 RodTipWorldPosition;
        public readonly float ShoreRightEdgeWorldX;

        public KawaStageInfo(
            GameObject root,
            float waterlineWorldY,
            Rect waterWorldRect,
            Rect skyWorldRect,
            Vector2 sunViewportPosition,
            Vector3 rodTipWorldPosition,
            float shoreRightEdgeWorldX)
        {
            Root = root;
            WaterlineWorldY = waterlineWorldY;
            WaterWorldRect = waterWorldRect;
            SkyWorldRect = skyWorldRect;
            SunViewportPosition = sunViewportPosition;
            RodTipWorldPosition = rodTipWorldPosition;
            ShoreRightEdgeWorldX = shoreRightEdgeWorldX;
        }
    }

    /// <summary>
    /// Builds the entire baseline riverside cutaway (sky, sun, clouds,
    /// shore bank, angler silhouette, riverbed, water plants, underwater
    /// motes) procedurally at runtime under a given parent transform. Every
    /// texture is a code-generated <see cref="Texture2D"/> and every
    /// material is a plain <c>new Material(shader)</c> — this spike has zero
    /// .prefab/.mat assets by convention and this builder must not introduce
    /// any.
    ///
    /// This class has no dependency on the surface-band/refraction/actors
    /// effect modules (module 1/2/4): with all of those absent or disabled,
    /// what this builder produces must already read as a tasteful,
    /// correctly-layered static riverside — that is the effects-off QA
    /// "baseline" capture. Fish shadows and the bobber are deliberately NOT
    /// built here (module 4's responsibility).
    ///
    /// The sky/sun/clouds/riverbed/water-plants/shore-bank/angler are all
    /// procedurally generated <em>unless</em> the production art from batch
    /// 1458-kawaglint-fish-art (Content/Resources/KawaGlint/Sprites) has been
    /// imported, in which case a single full-art background image replaces
    /// the whole procedural backdrop (see <see cref="BuildBackgroundArt"/>)
    /// and the angler silhouette is replaced by the illustrated Pono sprite
    /// (see <see cref="BuildAnglerArt"/>). Both fall back to the original
    /// procedural placeholders when the corresponding Resources asset is
    /// absent, so this class keeps working with zero .prefab/.mat/texture
    /// assets if the art hasn't been imported yet.
    /// </summary>
    public static class KawaGlintStageBuilder
    {
        private const float PixelsPerUnit = 100f;

        // Fixed seed so every randomized shape/phase (riverbed skyline,
        // cloud blobs, plant sway, stone/plant/cloud placement) is identical
        // run to run — required so CLI QA screenshots are comparable across
        // captures instead of looking different every time.
        private const int GenerationSeed = 20260724;

        // Pinned wave/camera contract shared with every other KawaGlint
        // module (surface shader, refraction pass, bobber): waterline sits
        // at world y = +1.6, which is 34% down from the top of the 16:9
        // orthographic frame (camera size 5, position (0,0,-10)).
        public const float WaterlineWorldY = 1.6f;

        private static readonly Vector2 SunViewportPosition = new Vector2(0.82f, 0.90f);
        private static readonly Vector3 RodTipWorldPosition = new Vector3(-4.6f, 2.9f, 0f);
        private static readonly Vector3 AnglerWorldPosition = new Vector3(-7.2f, 2.6f, 0f);
        private const float ShoreRightEdgeWorldX = -5.4f;
        private const float ShoreTopWorldY = 2.7f;
        private const float ShoreBottomWorldY = 0.6f;

        // Sorting-order contract shared with the other KawaGlint rendering
        // modules (surface band owns 30, ripple rings/fishing line/bobber
        // own 32-34, fish shadows own 14 — all module 4/2, not built here).
        private const int SkySortingOrder = 0;
        private const int WaterSortingOrder = 1;
        private const int BackgroundArtSortingOrder = 2; // between Water(1) and SunGlow(6)
        private const int SunGlowSortingOrder = 6;
        private const int CloudsSortingOrder = 8;
        private const int RiverbedSortingOrder = 10;
        private const int PlantsSortingOrder = 12;
        private const int MotesSortingOrder = 18;
        private const int ShoreSortingOrder = 40;
        private const int AnglerSortingOrder = 42;

        private const int SkyTextureWidth = 64;
        private const int SkyTextureHeight = 256;
        private const int WaterTextureWidth = 64;
        private const int WaterTextureHeight = 512;
        private const int SunTextureSize = 128;
        private const int CloudTextureWidth = 256;
        private const int CloudTextureHeight = 96;
        private const int RiverbedTextureWidth = 512;
        private const int RiverbedTextureHeight = 160;
        private const int PlantTextureWidth = 32;
        private const int PlantTextureHeight = 256;
        private const int ShoreTextureWidth = 512;
        private const int AnglerTextureWidth = 256;
        private const int AnglerTextureHeight = 192;

        // ---------------------------------------------------------------
        // Production art integration (batch 1458-kawaglint-fish-art).
        // Sprites are loaded via the shared KawaGlintSpriteCatalog
        // (LoadBackground/LoadAngler), which returns null when the
        // corresponding Resources asset hasn't been imported yet -- that
        // means "keep the procedural placeholder" everywhere it's consumed
        // below.
        // ---------------------------------------------------------------

        // bg_river_crosssection.png's own baked-in waterline row, measured
        // from the top of the image by module A's preprocessing script
        // (tmp/alpha_pending/1458-kawaglint-fish-art/bg_metrics.json:
        // waterline_from_top01). Used to align the art's drawn water
        // surface to the shared WaterlineWorldY contract regardless of
        // camera aspect -- see BuildBackgroundArt.
        private const float BgWaterlineFromTop01 = 0.4138157894736842f;

        // Extra uniform scale on top of the strict cover-fit minimum, so
        // the refraction pass's underwater UV distortion never samples
        // past the art's own edge (same margin rationale as
        // KawaGlintStageBuilder.ExpandRect for the procedural water rect).
        private const float BackgroundArtOversampleFactor = 1.02f;

        // Pono's illustrated world height; width is derived from the
        // sprite's own aspect ratio (never assigned independently -- see
        // BuildAnglerArt). Bottom-center world anchor picked to visually
        // match the procedural placeholder's seat-on-the-bank position;
        // QA-adjustable in the 1.8-2.2 range per DESIGN.md if the log
        // Pono sits on reads wrong against the art background.
        private const float AnglerArtWorldHeight = 2.6f;
        private static readonly Vector3 AnglerArtBottomCenter = new Vector3(-7.2f, 1.95f, 0f);

        // pono_angler_side.png's rod-tip loop position, measured by module
        // A's preprocessing script (tmp/alpha_pending/1458-kawaglint-fish-art/
        // pono_anchor.json) as a UV fraction of the (trimmed+padded) sprite:
        // u from the left edge, v from the bottom edge. Used to derive the
        // world-space rod tip directly from the art instead of a hand-picked
        // constant, so the fishing line/bobber always line up with wherever
        // the drawn rod actually points -- see BuildAnglerArt.
        private const float PonoRodTipU = 0.9605878423513694f;
        private const float PonoRodTipV = 0.7213541666666667f;

        // Stock URP 2D shader (ships with the render pipeline, not a project
        // asset) — using it directly is what makes these sprites/particles
        // render correctly under the 2D Renderer without depending on any
        // Light2D being present in the scene, since it is the unlit variant.
        private const string SpriteUnlitShaderName = "Universal Render Pipeline/2D/Sprite-Unlit-Default";

        public static KawaStageInfo Build(Transform parent, Camera camera)
        {
            if (parent == null)
            {
                throw new ArgumentNullException(nameof(parent));
            }

            if (camera == null)
            {
                throw new ArgumentNullException(nameof(camera));
            }

            if (!camera.orthographic)
            {
                // ComputeVisibleWorldRect (below) and the sun-glow depth
                // resolution both assume an orthographic projection (reading
                // orthographicSize/aspect directly). This builder is only
                // ever exercised today via KawaGlintProjectSetup's spike
                // scene, which hardcodes an orthographic camera, but that
                // contract isn't enforced anywhere - warn loudly instead of
                // silently producing an incorrect layout if a future caller
                // passes a perspective camera.
                Debug.LogWarning(
                    "KawaGlintStageBuilder.Build: expected an orthographic camera; layout "
                    + "(visible-world-rect, sun placement, etc.) will be incorrect for a "
                    + "perspective camera.");
            }

            var root = new GameObject("KawaStage");
            root.transform.SetParent(parent, false);
            var content = root.AddComponent<KawaGlintStageContent>();

            var visibleRect = ComputeVisibleWorldRect(camera);
            SplitAtWaterline(visibleRect, WaterlineWorldY, out var skyRect, out var waterRect);
            var random = new System.Random(GenerationSeed);

            var spriteMaterial = CreateSharedMaterial("KawaGlint Sprite (Runtime)", texture: null);
            content.RegisterGeneratedAsset(spriteMaterial);

            var backgroundArtSprite = KawaGlintSpriteCatalog.LoadBackground();
            if (backgroundArtSprite != null)
            {
                // The full-art background already contains sky, sun glow,
                // clouds, riverbed, water plants and the shore bank baked
                // into one illustration -- building the procedural versions
                // of any of those on top would double-draw them. Motes and
                // the angler are unaffected (the art has neither) and stay
                // below.
                BuildBackgroundArt(root.transform, visibleRect, backgroundArtSprite, spriteMaterial);
            }
            else
            {
                BuildSky(content, root.transform, skyRect, spriteMaterial);
                BuildWater(content, root.transform, waterRect, spriteMaterial);
                BuildSunGlow(content, root.transform, camera, SunViewportPosition, random, spriteMaterial);
                BuildClouds(content, root.transform, skyRect, random, spriteMaterial);
                BuildRiverbed(content, root.transform, waterRect, random, spriteMaterial);
                BuildPlants(content, root.transform, waterRect, random, spriteMaterial);
                BuildShoreBank(content, root.transform, visibleRect, spriteMaterial);
            }

            var rodTipWorldPosition = BuildAngler(content, root.transform, spriteMaterial);

            var particleTexture = CreateSoftCircleTexture();
            content.RegisterGeneratedAsset(particleTexture);
            var particleMaterial = CreateSharedMaterial("KawaGlint Particle (Runtime)", particleTexture);
            content.RegisterGeneratedAsset(particleMaterial);
            BuildMotes(root.transform, waterRect, particleMaterial);

            // Returned separately from what content is actually built against
            // (the raw split rects) — the effect modules use the slightly
            // larger rect so full-screen passes keep covering the frame even
            // while their own UV distortion samples a few percent outside it.
            var waterWorldRect = ExpandRect(waterRect, 0.05f);
            var skyWorldRect = ExpandRect(skyRect, 0.05f);
            return new KawaStageInfo(
                root,
                WaterlineWorldY,
                waterWorldRect,
                skyWorldRect,
                SunViewportPosition,
                rodTipWorldPosition,
                ShoreRightEdgeWorldX);
        }

        private static Rect ComputeVisibleWorldRect(Camera camera)
        {
            var height = 2f * camera.orthographicSize;
            var width = height * camera.aspect;
            var center = camera.transform.position;
            return new Rect(center.x - width * 0.5f, center.y - height * 0.5f, width, height);
        }

        private static void SplitAtWaterline(Rect visibleRect, float waterlineY, out Rect skyRect, out Rect waterRect)
        {
            var skyHeight = Mathf.Max(0f, visibleRect.yMax - waterlineY);
            var waterHeight = Mathf.Max(0f, waterlineY - visibleRect.yMin);
            skyRect = new Rect(visibleRect.x, waterlineY, visibleRect.width, skyHeight);
            waterRect = new Rect(visibleRect.x, visibleRect.yMin, visibleRect.width, waterHeight);
        }

        private static Rect ExpandRect(Rect rect, float factor)
        {
            var extraWidth = rect.width * factor;
            var extraHeight = rect.height * factor;
            return new Rect(
                rect.x - extraWidth * 0.5f,
                rect.y - extraHeight * 0.5f,
                rect.width + extraWidth,
                rect.height + extraHeight);
        }

        // ---------------------------------------------------------------
        // Sky backdrop (order 0)
        // ---------------------------------------------------------------

        private static void BuildSky(KawaGlintStageContent content, Transform parent, Rect skyRect, Material material)
        {
            const int width = SkyTextureWidth;
            const int height = SkyTextureHeight;
            var top = HexColor(0xBF, 0xE6, 0xFF);
            var bottom = HexColor(0xD9, 0xF0, 0xE0);

            var texture = CreateTexture(width, height, "KawaGlint Sky");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var t = height > 1 ? y / (float)(height - 1) : 0f; // t=0 bottom row, t=1 top row
                var rowColor = (Color32)Color.Lerp(bottom, top, t);
                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    pixels[rowStart + x] = rowColor;
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            content.RegisterGeneratedAsset(texture);

            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Sky");
            content.RegisterGeneratedAsset(sprite);

            var renderer = CreateSpriteRendererObject(
                "Sky", parent, sprite, material, SkySortingOrder, new Vector3(skyRect.center.x, skyRect.center.y, 0f));

            // Deliberate full stretch: this is an abstract vertical color
            // ramp with no horizontal detail (every column is identical), so
            // covering the rect exactly (per spec) resamples a constant
            // per-row color and introduces no visible distortion.
            var nativeSize = new Vector2(width, height) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(skyRect.width / nativeSize.x, skyRect.height / nativeSize.y, 1f);
        }

        // ---------------------------------------------------------------
        // Water backdrop (order 1)
        // ---------------------------------------------------------------

        private static void BuildWater(KawaGlintStageContent content, Transform parent, Rect waterRect, Material material)
        {
            const int width = WaterTextureWidth;
            const int height = WaterTextureHeight;

            var texture = CreateTexture(width, height, "KawaGlint Water");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var t = height > 1 ? y / (float)(height - 1) : 0f; // t=0 bottom row, t=1 top row
                var depth = 1f - t; // depth=0 at the surface (top), depth=1 at the riverbed (bottom)
                var rowColor = (Color32)WaterDepthColor(depth);
                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    pixels[rowStart + x] = rowColor;
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            content.RegisterGeneratedAsset(texture);

            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Water");
            content.RegisterGeneratedAsset(sprite);

            var renderer = CreateSpriteRendererObject(
                "Water", parent, sprite, material, WaterSortingOrder, new Vector3(waterRect.center.x, waterRect.center.y, 0f));

            // Same "abstract vertical ramp, no horizontal detail" stretch
            // justification as BuildSky above.
            var nativeSize = new Vector2(width, height) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(waterRect.width / nativeSize.x, waterRect.height / nativeSize.y, 1f);
        }

        // Pinned 4-stop palette (web version): 0% (surface) #7FD0E8, 35%
        // #4FA8D8, 70% #2F7AB0, 100% (riverbed) #17466B.
        private static Color WaterDepthColor(float depth)
        {
            var surface = HexColor(0x7F, 0xD0, 0xE8);
            var mid1 = HexColor(0x4F, 0xA8, 0xD8);
            var mid2 = HexColor(0x2F, 0x7A, 0xB0);
            var bed = HexColor(0x17, 0x46, 0x6B);

            if (depth <= 0.35f)
            {
                return Color.Lerp(surface, mid1, depth / 0.35f);
            }

            if (depth <= 0.70f)
            {
                return Color.Lerp(mid1, mid2, (depth - 0.35f) / 0.35f);
            }

            return Color.Lerp(mid2, bed, (depth - 0.70f) / 0.30f);
        }

        // ---------------------------------------------------------------
        // Background art (order 2) — production replacement for the
        // procedural Sky/Water/SunGlow/Clouds/Riverbed/Plants/ShoreBank
        // stack above, used only when bg_river_crosssection.png has been
        // imported (see BackgroundResourcePath / LoadArtSprite). Sits
        // between Water(1) and SunGlow(6) purely so the sorting-order
        // contract stays intact even if a future change ever draws both
        // side by side; in practice only one of the two ever exists in a
        // given Build() call.
        // ---------------------------------------------------------------

        private static void BuildBackgroundArt(Transform parent, Rect visibleRect, Sprite sprite, Material material)
        {
            // Cover-fit + waterline alignment, uniform scale only -- the
            // art's own aspect ratio (~1.7684, not a clean 16:9) is
            // preserved exactly by applying the single scalar `s` to both
            // axes below; whatever doesn't fit the visible frame is
            // cropped, never squashed (this project's absolute image
            // stretch prohibition).
            var size = sprite.bounds.size; // world units at scale=1 (PixelsPerUnit=100 per the imported .meta)
            var above = Mathf.Max(0f, visibleRect.yMax - WaterlineWorldY);
            var below = Mathf.Max(0f, WaterlineWorldY - visibleRect.yMin);
            var s = Mathf.Max(
                visibleRect.width / size.x,
                above / (size.y * BgWaterlineFromTop01),
                below / (size.y * (1f - BgWaterlineFromTop01)))
                * BackgroundArtOversampleFactor;

            // Anchors the art's own measured waterline row (bg_metrics.json,
            // module A) to the shared WaterlineWorldY contract so the baked-
            // in water surface lines up with KawaSurfaceBand/refraction
            // regardless of camera aspect -- computed from camera.aspect via
            // visibleRect, never a hardcoded 16:9 assumption.
            var centerY = WaterlineWorldY - (0.5f - BgWaterlineFromTop01) * size.y * s;
            var position = new Vector3(visibleRect.center.x, centerY, 0f);

            var renderer = CreateSpriteRendererObject(
                "BackgroundArt", parent, sprite, material, BackgroundArtSortingOrder, position);
            renderer.transform.localScale = new Vector3(s, s, 1f);
        }

        // ---------------------------------------------------------------
        // Sun glow (order 6)
        // ---------------------------------------------------------------

        private static void BuildSunGlow(
            KawaGlintStageContent content,
            Transform parent,
            Camera camera,
            Vector2 sunViewport,
            System.Random random,
            Material material)
        {
            const int size = SunTextureSize;
            const float worldWidth = 2.2f;
            var core = new Color(1.0f, 0.96f, 0.78f, 1f);

            var texture = CreateTexture(size, size, "KawaGlint Sun Glow");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var radius = center;
            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var distance = Mathf.Sqrt(dx * dx + dy * dy) / radius;
                    var alpha = Mathf.Clamp01(1f - distance);
                    alpha *= alpha; // steeper core, soft glow falloff towards the rim
                    pixels[y * size + x] = new Color(core.r, core.g, core.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            content.RegisterGeneratedAsset(texture);

            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Sun Glow");
            content.RegisterGeneratedAsset(sprite);

            // Resolve the world-space depth the content plane (z = 0) actually
            // sits at from the camera's own point of view, then convert the
            // desired viewport point back at that same depth. This is robust
            // to the camera's exact position/orientation instead of assuming
            // a hardcoded distance.
            var contentDepth = camera.WorldToViewportPoint(Vector3.zero).z;
            var worldPosition = camera.ViewportToWorldPoint(new Vector3(sunViewport.x, sunViewport.y, contentDepth));
            worldPosition.z = 0f;

            var renderer = CreateSpriteRendererObject("SunGlow", parent, sprite, material, SunGlowSortingOrder, worldPosition);
            var nativeSize = size / PixelsPerUnit;
            var scale = worldWidth / nativeSize;
            var baseScale = new Vector3(scale, scale, 1f);
            renderer.transform.localScale = baseScale;

            var pulseSpeed = 2f * Mathf.PI / 5f; // ~5 second pulse period
            var pulsePhase = NextFloat(random, 0f, Mathf.PI * 2f);
            content.RegisterSun(renderer.transform, baseScale, pulseSpeed, pulsePhase, pulseAmplitude: 0.03f);
        }

        // ---------------------------------------------------------------
        // Clouds (order 8)
        // ---------------------------------------------------------------

        private static void BuildClouds(
            KawaGlintStageContent content,
            Transform parent,
            Rect skyRect,
            System.Random random,
            Material material)
        {
            content.SetCloudWrapBounds(skyRect.xMin, skyRect.xMax);

            const int cloudCount = 2;
            for (var i = 0; i < cloudCount; i++)
            {
                var texture = CreateCloudTexture(random);
                content.RegisterGeneratedAsset(texture);
                var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), $"KawaGlint Cloud {i}");
                content.RegisterGeneratedAsset(sprite);

                // Height chosen, width derived from the texture's own native
                // aspect ratio (CloudTextureWidth:CloudTextureHeight) so the
                // baked blobs never stretch into ellipses.
                var worldHeight = NextFloat(random, 0.9f, 1.5f);
                var worldWidth = worldHeight * (CloudTextureWidth / (float)CloudTextureHeight);
                var x = NextFloat(random, skyRect.xMin, skyRect.xMax);
                var y = NextFloat(random, skyRect.yMin + skyRect.height * 0.45f, skyRect.yMax - skyRect.height * 0.1f);

                var renderer = CreateSpriteRendererObject(
                    $"Cloud{i}", parent, sprite, material, CloudsSortingOrder, new Vector3(x, y, 0f));
                var nativeSize = new Vector2(CloudTextureWidth, CloudTextureHeight) / PixelsPerUnit;
                renderer.transform.localScale = new Vector3(worldWidth / nativeSize.x, worldHeight / nativeSize.y, 1f);

                var speed = NextFloat(random, 0.08f, 0.14f);
                content.RegisterCloud(renderer.transform, speed, worldWidth * 0.5f);
            }
        }

        private static Texture2D CreateCloudTexture(System.Random random)
        {
            const int width = CloudTextureWidth;
            const int height = CloudTextureHeight;
            const int blobCount = 4;
            const float peakAlpha = 0.85f;
            var tint = Color.white;

            var blobX = new float[blobCount];
            var blobY = new float[blobCount];
            var blobRadius = new float[blobCount];
            for (var i = 0; i < blobCount; i++)
            {
                blobX[i] = NextFloat(random, width * 0.15f, width * 0.85f);
                blobY[i] = NextFloat(random, height * 0.30f, height * 0.65f);
                blobRadius[i] = NextFloat(random, height * 0.28f, height * 0.42f);
            }

            var texture = CreateTexture(width, height, "KawaGlint Cloud");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    var alpha = 0f;
                    for (var i = 0; i < blobCount; i++)
                    {
                        var dx = x - blobX[i];
                        var dy = y - blobY[i];
                        var d = Mathf.Sqrt(dx * dx + dy * dy) / blobRadius[i];
                        var blobAlpha = Mathf.Clamp01(1f - d);
                        blobAlpha = blobAlpha * blobAlpha * (3f - 2f * blobAlpha); // smoothstep
                        alpha = Mathf.Max(alpha, blobAlpha); // overlapping blobs union, never double-brighten
                    }
                    pixels[rowStart + x] = new Color(tint.r, tint.g, tint.b, alpha * peakAlpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Riverbed silhouette + stones (order 10)
        // ---------------------------------------------------------------

        private static void BuildRiverbed(
            KawaGlintStageContent content,
            Transform parent,
            Rect waterRect,
            System.Random random,
            Material material)
        {
            var tint = HexColor(0x12, 0x30, 0x48);
            var texture = CreateRiverbedSilhouetteTexture(random, tint);
            content.RegisterGeneratedAsset(texture);

            var sprite = CreateSprite(texture, new Vector2(0.5f, 0f), "KawaGlint Riverbed");
            content.RegisterGeneratedAsset(sprite);

            // Height derives from the texture's own native aspect ratio while
            // width spans the water rect, so scale.x == scale.y and the
            // silhouette is never stretched off its authored proportions
            // (same technique as AquaLuminaStageBuilder's rock layer).
            var worldHeight = waterRect.width * (RiverbedTextureHeight / (float)RiverbedTextureWidth);
            var renderer = CreateSpriteRendererObject(
                "Riverbed", parent, sprite, material, RiverbedSortingOrder, new Vector3(waterRect.center.x, waterRect.yMin, 0f));

            var nativeSize = new Vector2(RiverbedTextureWidth, RiverbedTextureHeight) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(waterRect.width / nativeSize.x, worldHeight / nativeSize.y, 1f);

            BuildStones(content, parent, waterRect, random, material);
        }

        private static Texture2D CreateRiverbedSilhouetteTexture(System.Random random, Color tint)
        {
            const int width = RiverbedTextureWidth;
            const int height = RiverbedTextureHeight;
            const float featherPixels = 2.5f; // soft anti-aliased skyline edge, never a hard 1px cutoff
            const float baseHeightFraction = 0.28f;

            var freq1 = NextFloat(random, 1.0f, 2.2f);
            var freq2 = NextFloat(random, 2.5f, 4.5f);
            var freq3 = NextFloat(random, 5f, 9f);
            var phase1 = NextFloat(random, 0f, Mathf.PI * 2f);
            var phase2 = NextFloat(random, 0f, Mathf.PI * 2f);
            var phase3 = NextFloat(random, 0f, Mathf.PI * 2f);
            var amp1 = height * 0.14f;
            var amp2 = height * 0.08f;
            var amp3 = height * 0.04f;
            var baseHeight = height * baseHeightFraction;

            var texture = CreateTexture(width, height, "KawaGlint Riverbed Silhouette");
            var pixels = new Color32[width * height];
            for (var x = 0; x < width; x++)
            {
                var u = width > 1 ? x / (float)(width - 1) : 0f;
                var skyline = baseHeight
                    + amp1 * Mathf.Sin(u * freq1 * Mathf.PI * 2f + phase1)
                    + amp2 * Mathf.Sin(u * freq2 * Mathf.PI * 2f + phase2)
                    + amp3 * Mathf.Sin(u * freq3 * Mathf.PI * 2f + phase3);
                skyline = Mathf.Clamp(skyline, 10f, height - 6f);

                for (var y = 0; y < height; y++)
                {
                    // Row 0 is the texture's bottom row (Unity's SetPixels
                    // convention), so positive edgeDistance = below the
                    // skyline = solid riverbed; smoothstep gives a soft,
                    // multi-pixel-wide edge rather than a jagged 1px cutoff.
                    var edgeDistance = skyline - y;
                    var alpha = Mathf.Clamp01(0.5f + edgeDistance / featherPixels);
                    alpha = alpha * alpha * (3f - 2f * alpha);
                    pixels[y * width + x] = new Color(tint.r, tint.g, tint.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        private static void BuildStones(
            KawaGlintStageContent content,
            Transform parent,
            Rect waterRect,
            System.Random random,
            Material material)
        {
            var tint = HexColor(0x0E, 0x2A, 0x40);
            var texture = CreateSoftDiscTexture(tint);
            content.RegisterGeneratedAsset(texture);
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Stone");
            content.RegisterGeneratedAsset(sprite);

            var count = random.Next(4, 7); // 4-6 stones inclusive
            var margin = waterRect.width * 0.06f;
            var nativeDiameter = 64f / PixelsPerUnit;
            for (var i = 0; i < count; i++)
            {
                var diameter = NextFloat(random, 0.5f, 1.2f);
                var x = NextFloat(random, waterRect.xMin + margin, waterRect.xMax - margin);
                var y = waterRect.yMin + NextFloat(random, 0f, diameter * 0.25f);

                var renderer = CreateSpriteRendererObject(
                    $"Stone{i}", parent, sprite, material, RiverbedSortingOrder, new Vector3(x, y, 0f));
                var scale = diameter / nativeDiameter;
                renderer.transform.localScale = new Vector3(scale, scale, 1f);
            }
        }

        // ---------------------------------------------------------------
        // Water plants (order 12)
        // ---------------------------------------------------------------

        private static void BuildPlants(
            KawaGlintStageContent content,
            Transform parent,
            Rect waterRect,
            System.Random random,
            Material material)
        {
            const int variantCount = 3;
            var tint = HexColor(0x0F, 0x4A, 0x50);
            var variants = new Sprite[variantCount];
            for (var i = 0; i < variantCount; i++)
            {
                var texture = CreatePlantTexture(random, tint);
                content.RegisterGeneratedAsset(texture);
                var sprite = CreateSprite(texture, new Vector2(0.5f, 0f), $"KawaGlint Plant Variant {i}");
                content.RegisterGeneratedAsset(sprite);
                variants[i] = sprite;
            }

            var count = random.Next(3, 5); // 3-4 blades inclusive
            var margin = waterRect.width * 0.08f;
            var nativeSize = new Vector2(PlantTextureWidth, PlantTextureHeight) / PixelsPerUnit;
            for (var i = 0; i < count; i++)
            {
                var sprite = variants[i % variantCount];
                var worldHeight = NextFloat(random, 1.5f, 3f);
                // Width derives from height via the texture's own pixel
                // aspect ratio so the blade is never stretched off its
                // authored proportions (same technique used for rocks/fish
                // in AquaLuminaStageBuilder).
                var worldWidth = worldHeight * (PlantTextureWidth / (float)PlantTextureHeight);
                var x = NextFloat(random, waterRect.xMin + margin, waterRect.xMax - margin);

                var renderer = CreateSpriteRendererObject(
                    $"Plant{i}", parent, sprite, material, PlantsSortingOrder, new Vector3(x, waterRect.yMin, 0f));
                renderer.transform.localScale = new Vector3(worldWidth / nativeSize.x, worldHeight / nativeSize.y, 1f);

                var baseRotation = NextFloat(random, -4f, 4f);
                var swaySpeed = NextFloat(random, 0.6f, 1.3f);
                var swayPhase = NextFloat(random, 0f, Mathf.PI * 2f);
                content.RegisterPlant(renderer.transform, baseRotation, swaySpeed, swayPhase);
            }
        }

        private static Texture2D CreatePlantTexture(System.Random random, Color tint)
        {
            const int width = PlantTextureWidth;
            const int height = PlantTextureHeight;
            var waveFreq = NextFloat(random, 1.2f, 2.0f);
            var wavePhase = NextFloat(random, 0f, Mathf.PI * 2f);
            var waveAmp = NextFloat(random, 0.08f, 0.18f) * width;

            var texture = CreateTexture(width, height, "KawaGlint Plant");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                // v = 0 at the bottom row (the blade's rooted base, matches
                // the bottom-center sprite pivot) and 1 at the tip.
                var v = height > 1 ? y / (float)(height - 1) : 0f;
                var centerOffset = Mathf.Sin(v * waveFreq * Mathf.PI * 2f + wavePhase) * waveAmp * v;
                var halfWidth = Mathf.Lerp(width * 0.5f, width * 0.10f, v);
                var tipFade = v > 0.9f ? Mathf.Lerp(1f, 0f, (v - 0.9f) / 0.1f) : 1f;

                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    var dx = x - (width * 0.5f + centerOffset);
                    var mask = halfWidth > 0.001f ? Mathf.Clamp01(1f - Mathf.Abs(dx) / halfWidth) : 0f;
                    var edgeAlpha = mask * mask * (3f - 2f * mask); // smoothstep -> feathered blade edge
                    var alpha = edgeAlpha * tipFade;
                    pixels[rowStart + x] = new Color(tint.r, tint.g, tint.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Shore bank (order 40)
        // ---------------------------------------------------------------

        private static void BuildShoreBank(
            KawaGlintStageContent content,
            Transform parent,
            Rect visibleRect,
            Material material)
        {
            var worldLeft = visibleRect.xMin;
            var worldRight = ShoreRightEdgeWorldX;
            var worldWidth = Mathf.Max(0.01f, worldRight - worldLeft);
            var worldHeight = ShoreTopWorldY - ShoreBottomWorldY;

            // Texture height derives from the world aspect ratio the bank
            // will actually be drawn at (rather than deriving world size
            // from a fixed texture aspect, as elsewhere in this file) so the
            // rounded top-right corner baked into the texture stays
            // perfectly circular after the sprite is scaled to fit — no
            // stretch skew on the one shape in this stage that would show it.
            var textureHeight = Mathf.Clamp(
                Mathf.RoundToInt(ShoreTextureWidth * (worldHeight / worldWidth)),
                32,
                1024);

            var texture = CreateShoreTexture(ShoreTextureWidth, textureHeight);
            content.RegisterGeneratedAsset(texture);
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0f), "KawaGlint Shore Bank");
            content.RegisterGeneratedAsset(sprite);

            var renderer = CreateSpriteRendererObject(
                "ShoreBank",
                parent,
                sprite,
                material,
                ShoreSortingOrder,
                new Vector3((worldLeft + worldRight) * 0.5f, ShoreBottomWorldY, 0f));

            var nativeSize = new Vector2(ShoreTextureWidth, textureHeight) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(worldWidth / nativeSize.x, worldHeight / nativeSize.y, 1f);
        }

        private static Texture2D CreateShoreTexture(int width, int height)
        {
            const float featherPixels = 2.5f;
            var grassTint = HexColor(0x6F, 0xAE, 0x5C);
            var soilTop = HexColor(0x9C, 0x70, 0x43);
            var soilBottom = HexColor(0x5F, 0x40, 0x22);
            var grassBandFraction = 0.10f; // top 10% reads as a grass lip
            var cornerRadiusPixels = height * 0.5f; // rounded top-right corner only

            var texture = CreateTexture(width, height, "KawaGlint Shore Bank");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var v = height > 1 ? y / (float)(height - 1) : 0f; // v=0 bottom, v=1 top
                var soilColor = Color.Lerp(soilBottom, soilTop, v);
                var isGrassBand = v > 1f - grassBandFraction;
                var baseColor = isGrassBand ? Color.Lerp(soilColor, grassTint, 0.85f) : soilColor;

                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    // Only the top-right corner rounds off (the bank meets
                    // the water there); every other edge of the rect is a
                    // hard boundary against the sky/water backdrops, which
                    // is intentional (this is a solid bank, not an island).
                    var cornerDx = x - (width - cornerRadiusPixels);
                    var cornerDy = y - (height - cornerRadiusPixels);
                    var insideCornerBox = cornerDx > 0f && cornerDy > 0f;
                    var alpha = 1f;
                    if (insideCornerBox)
                    {
                        var distance = Mathf.Sqrt(cornerDx * cornerDx + cornerDy * cornerDy);
                        alpha = Mathf.Clamp01(0.5f + (cornerRadiusPixels - distance) / featherPixels);
                        alpha = alpha * alpha * (3f - 2f * alpha);
                    }
                    pixels[rowStart + x] = new Color(baseColor.r, baseColor.g, baseColor.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Angler silhouette (order 42) — replaced by the illustrated Pono
        // sprite (pono_angler_side.png, batch 1458-kawaglint-fish-art) when
        // that art has been imported; falls back to the original procedural
        // placeholder otherwise. Either path returns the world-space rod-tip
        // position the fishing line/bobber should draw to.
        // ---------------------------------------------------------------

        private static Vector3 BuildAngler(KawaGlintStageContent content, Transform parent, Material material)
        {
            var artSprite = KawaGlintSpriteCatalog.LoadAngler();
            return artSprite != null
                ? BuildAnglerArt(parent, artSprite, material)
                : BuildAnglerPlaceholder(content, parent, material);
        }

        private static Vector3 BuildAnglerArt(Transform parent, Sprite sprite, Material material)
        {
            // Uniform scale derived from a fixed world height only; width is
            // whatever the sprite's own aspect ratio makes it (never
            // assigned independently) -- absolutely no stretch.
            var size = sprite.bounds.size;
            var scale = AnglerArtWorldHeight / size.y;
            var worldWidth = size.x * scale;

            // Sprite pivot is bottom-center (0.5, 0), so the GameObject's
            // own world position IS the bottom-center anchor -- no extra
            // offset math needed here.
            var renderer = CreateSpriteRendererObject(
                "Angler", parent, sprite, material, AnglerSortingOrder, AnglerArtBottomCenter);
            renderer.transform.localScale = new Vector3(scale, scale, 1f);

            // Rod-tip loop position derived from the measured UV anchor
            // (pono_anchor.json, module A, batch 1458) rather than a
            // hand-picked world constant, so the fishing line/bobber always
            // line up with wherever the drawn rod actually points.
            return AnglerArtBottomCenter
                + new Vector3((PonoRodTipU - 0.5f) * worldWidth, PonoRodTipV * AnglerArtWorldHeight, 0f);
        }

        private static Vector3 BuildAnglerPlaceholder(KawaGlintStageContent content, Transform parent, Material material)
        {
            var texture = CreateAnglerTexture();
            content.RegisterGeneratedAsset(texture);
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "KawaGlint Angler");
            content.RegisterGeneratedAsset(sprite);

            const float worldHeight = 2.0f;
            var worldWidth = worldHeight * (AnglerTextureWidth / (float)AnglerTextureHeight);
            var renderer = CreateSpriteRendererObject("Angler", parent, sprite, material, AnglerSortingOrder, AnglerWorldPosition);
            var nativeSize = new Vector2(AnglerTextureWidth, AnglerTextureHeight) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(worldWidth / nativeSize.x, worldHeight / nativeSize.y, 1f);

            return RodTipWorldPosition;
        }

        private static Texture2D CreateAnglerTexture()
        {
            const int width = AnglerTextureWidth;
            const int height = AnglerTextureHeight;
            const float featherPixels = 2f;
            var tint = HexColor(0x4A, 0x33, 0x20);

            // Simple seated silhouette baked in texture-local pixels (origin
            // bottom-left, matching this file's y=0-is-bottom convention):
            // round head, an oval body below it, and a rod stub extending
            // from the hand toward the texture edge in the actual world
            // direction from AnglerWorldPosition to RodTipWorldPosition, so
            // the placeholder rod reads as pointing the right way even
            // though the true rod-to-bobber line is drawn later by the
            // actors module (module 4).
            var headCenter = new Vector2(width * 0.42f, height * 0.72f);
            var headRadius = width * 0.14f;
            var bodyCenter = new Vector2(width * 0.44f, height * 0.42f);
            var bodyRadiusX = width * 0.20f;
            var bodyRadiusY = height * 0.30f;
            var handPoint = new Vector2(width * 0.58f, height * 0.55f);

            var rodDirectionWorld = RodTipWorldPosition - AnglerWorldPosition;
            rodDirectionWorld.z = 0f;
            var rodDirection2D = new Vector2(rodDirectionWorld.x, rodDirectionWorld.y).normalized;
            if (rodDirection2D.sqrMagnitude < 0.0001f)
            {
                rodDirection2D = new Vector2(1f, 0.1f).normalized; // degenerate fallback, never expected in practice
            }
            var rodEndPoint = handPoint + rodDirection2D * (width * 0.5f);
            const float rodThicknessPixels = 2.5f;

            var texture = CreateTexture(width, height, "KawaGlint Angler");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    var point = new Vector2(x, y);

                    var headDistance = Vector2.Distance(point, headCenter) - headRadius;
                    var headAlpha = Mathf.Clamp01(0.5f - headDistance / featherPixels);

                    var bodyValue = Square((point.x - bodyCenter.x) / bodyRadiusX) + Square((point.y - bodyCenter.y) / bodyRadiusY);
                    var bodyAlpha = 1f - SmoothStep01(0.9f, 1.1f, bodyValue);

                    var rodDistance = DistanceToSegment(point, handPoint, rodEndPoint) - rodThicknessPixels;
                    var rodAlpha = Mathf.Clamp01(0.5f - rodDistance / featherPixels);

                    var alpha = Mathf.Max(headAlpha, Mathf.Max(bodyAlpha, rodAlpha));
                    pixels[rowStart + x] = new Color(tint.r, tint.g, tint.b, Mathf.Clamp01(alpha));
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Underwater motes (order 18)
        // ---------------------------------------------------------------

        private static void BuildMotes(Transform parent, Rect waterRect, Material material)
        {
            var go = new GameObject("Motes");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(waterRect.center.x, waterRect.center.y, 0f);

            var system = go.AddComponent<ParticleSystem>();
            // AddComponent<ParticleSystem>() starts the system playing immediately
            // (main.playOnAwake defaults to true), and both randomSeed and
            // main.duration below refuse to be set on an already-playing system
            // ("...is still playing is not supported"). Stop-and-clear first so every
            // configuration call below lands on a fully stopped system; system.Play()
            // at the end of this method restarts it under the final configuration.
            system.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            // Fixed, non-auto seed so particle placement/timing is
            // reproducible across CLI captures, same rationale as
            // GenerationSeed above.
            system.useAutoRandomSeed = false;
            system.randomSeed = (uint)GenerationSeed;

            var main = system.main;
            main.loop = true;
            main.prewarm = true;
            main.playOnAwake = true;
            main.duration = 20f; // >= max startLifetime so prewarm reaches a steady-state distribution
            main.startDelay = 0f;
            main.startLifetime = new ParticleSystem.MinMaxCurve(12f, 18f);
            main.startSpeed = 0f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.02f, 0.06f);
            main.startColor = new ParticleSystem.MinMaxGradient(
                new Color(1f, 1f, 1f, 0.10f), new Color(1f, 1f, 1f, 0.22f));
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 150;
            main.gravityModifier = 0f;

            var emission = system.emission;
            emission.rateOverTime = 12f;

            var shape = system.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.position = Vector3.zero;
            shape.rotation = Vector3.zero;
            shape.scale = new Vector3(waterRect.width, waterRect.height, 1f);

            var velocityOverLifetime = system.velocityOverLifetime;
            velocityOverLifetime.enabled = true;
            velocityOverLifetime.space = ParticleSystemSimulationSpace.World;
            // NOTE: ParticleSystem.VelocityOverLifetimeModule has no "separateAxes" toggle (that
            // property lives on NoiseModule, not this module -- verified against the installed
            // UnityEngine.ParticleSystemModule.dll; an earlier attempt to call it here failed to
            // compile). Instead this module shares ONE curve-evaluation mode across ALL of its
            // curves (x, y, z, orbitalX/Y/Z, orbitalOffsetX/Y/Z, radial, speedModifier) -- setting
            // x/y/z to the two-constant constructor fixes the module's mode to TwoConstants, but
            // every other curve on the module was left at its untouched default (Constant), and
            // Unity re-validates that all curves share one mode every single frame, which is
            // exactly the "Particle Velocity curves must all be in the same mode" spam confirmed
            // in the checked-in QA player logs. Explicitly zeroing every other curve with the same
            // two-constant constructor makes the whole module consistently TwoConstants and is a
            // pure no-op behaviorally (motes never orbit, offset-orbit, move radially, or have
            // their speed remapped).
            velocityOverLifetime.x = new ParticleSystem.MinMaxCurve(0.05f, 0.2f);
            velocityOverLifetime.y = new ParticleSystem.MinMaxCurve(0.01f, 0.05f); // slight rise
            velocityOverLifetime.z = new ParticleSystem.MinMaxCurve(0f, 0f); // motes never drift in z
            velocityOverLifetime.orbitalX = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalY = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalZ = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalOffsetX = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalOffsetY = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.orbitalOffsetZ = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.radial = new ParticleSystem.MinMaxCurve(0f, 0f);
            velocityOverLifetime.speedModifier = new ParticleSystem.MinMaxCurve(1f, 1f);

            var noise = system.noise;
            noise.enabled = true;
            noise.strength = 0.1f;
            noise.frequency = 0.25f;

            var colorOverLifetime = system.colorOverLifetime;
            colorOverLifetime.enabled = true;
            colorOverLifetime.color = new ParticleSystem.MinMaxGradient(BuildFadeInOutGradient());

            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = material;
            renderer.sortingOrder = MotesSortingOrder;
            renderer.renderMode = ParticleSystemRenderMode.Billboard;

            system.Play();
        }

        private static Gradient BuildFadeInOutGradient()
        {
            var gradient = new Gradient();
            gradient.SetKeys(
                new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                new[]
                {
                    new GradientAlphaKey(0f, 0f),
                    new GradientAlphaKey(1f, 0.15f),
                    new GradientAlphaKey(1f, 0.8f),
                    new GradientAlphaKey(0f, 1f)
                });
            return gradient;
        }

        private static Texture2D CreateSoftCircleTexture()
        {
            const int size = 64;
            var texture = CreateTexture(size, size, "KawaGlint Particle Soft Circle");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var radius = center;
            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var d = Mathf.Sqrt(dx * dx + dy * dy) / radius;
                    var body = Mathf.Clamp01(1f - d);
                    body = body * body * (3f - 2f * body); // smoothstep -> soft round falloff, no hard pixel edge
                    pixels[y * size + x] = new Color(1f, 1f, 1f, body);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        private static Texture2D CreateSoftDiscTexture(Color tint)
        {
            const int size = 64;
            var texture = CreateTexture(size, size, "KawaGlint Soft Disc");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var radius = center;
            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var d = Mathf.Sqrt(dx * dx + dy * dy) / radius;
                    var body = Mathf.Clamp01(1f - d);
                    body = body * body * (3f - 2f * body); // smoothstep -> soft round falloff, no hard pixel edge
                    pixels[y * size + x] = new Color(tint.r, tint.g, tint.b, body);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
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

        private static Sprite CreateSprite(Texture2D texture, Vector2 pivot, string name)
        {
            var sprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, texture.width, texture.height),
                pivot,
                PixelsPerUnit,
                0,
                SpriteMeshType.FullRect);
            sprite.name = name;
            return sprite;
        }

        // Production (non-procedural) background/angler art is loaded via
        // KawaGlintSpriteCatalog.LoadBackground()/LoadAngler() (see Build()
        // and BuildAngler() above) rather than a loader of this file's own
        // -- that catalog owns the Resources.Load + Sprite.Create + cache
        // recipe (and its own "never register with RegisterGeneratedAsset"
        // contract) for every KawaGlint illustrated asset, fish art
        // included.

        private static SpriteRenderer CreateSpriteRendererObject(
            string name,
            Transform parent,
            Sprite sprite,
            Material material,
            int sortingOrder,
            Vector3 worldPosition)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            // Assigned in world space (not localPosition) so placement is
            // correct regardless of the parent hierarchy's own transform,
            // since visibleRect/skyRect/waterRect were computed in world
            // space from the camera.
            go.transform.position = worldPosition;
            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sharedMaterial = material;
            renderer.sortingOrder = sortingOrder;
            return renderer;
        }

        /// <summary>
        /// Creates one shared Sprite-Unlit-Default material. When
        /// <paramref name="texture"/> is null (the common SpriteRenderer
        /// case) the material is left textureless and relies on each
        /// SpriteRenderer supplying its own texture via its assigned Sprite;
        /// when non-null (the ParticleSystemRenderer case, which has no such
        /// per-instance sprite mechanism) the texture is baked into the
        /// material directly.
        /// </summary>
        private static Material CreateSharedMaterial(string name, Texture2D texture)
        {
            var shader = Shader.Find(SpriteUnlitShaderName);
            if (shader == null)
            {
                Debug.LogError($"KawaGlint: shader not found, falling back: {SpriteUnlitShaderName}");
                shader = Shader.Find("Sprites/Default");
            }
            if (shader == null)
            {
                // Last-resort guard: even "Sprites/Default" is missing (a stripped/broken
                // player, exactly the failure the checked-in QA logs showed). Hidden/
                // InternalErrorShader ships with every Unity build and is never stripped, so
                // `new Material(shader)` below never receives null (which would throw) and the
                // stage keeps rendering -- as an obvious magenta error material -- instead of the
                // whole builder faulting.
                Debug.LogError("KawaGlint: Sprites/Default also missing, falling back to Hidden/InternalErrorShader");
                shader = Shader.Find("Hidden/InternalErrorShader");
            }
            var material = new Material(shader)
            {
                name = name,
                hideFlags = HideFlags.DontSave
            };
            if (texture != null)
            {
                material.mainTexture = texture;
            }
            return material;
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

        private static float DistanceToSegment(Vector2 point, Vector2 segmentStart, Vector2 segmentEnd)
        {
            var segment = segmentEnd - segmentStart;
            var lengthSquared = segment.sqrMagnitude;
            if (lengthSquared < 0.0001f)
            {
                return Vector2.Distance(point, segmentStart);
            }
            var t = Mathf.Clamp01(Vector2.Dot(point - segmentStart, segment) / lengthSquared);
            var projected = segmentStart + segment * t;
            return Vector2.Distance(point, projected);
        }
    }
}
