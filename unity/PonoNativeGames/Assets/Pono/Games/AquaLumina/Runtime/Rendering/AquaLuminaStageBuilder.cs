using System;
using UnityEngine;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Result of <see cref="AquaLuminaStageBuilder.Build"/>: the root object of
    /// the generated stage plus the two pieces of layout info the effect
    /// modules (god rays / caustics / distortion) need to align themselves to
    /// this content without recomputing it.
    /// </summary>
    public readonly struct AquaStageInfo
    {
        public readonly GameObject Root;
        public readonly Vector2 SunViewportPosition;
        public readonly Rect WaterWorldRect;

        public AquaStageInfo(GameObject root, Vector2 sunViewportPosition, Rect waterWorldRect)
        {
            Root = root;
            SunViewportPosition = sunViewportPosition;
            WaterWorldRect = waterWorldRect;
        }
    }

    /// <summary>
    /// Builds the entire baseline underwater scene (background, rock
    /// silhouettes, kelp, fish, sun, bubbles, marine snow) procedurally at
    /// runtime under a given parent transform. Every texture is a
    /// code-generated <see cref="Texture2D"/>, with two deliberate
    /// exceptions: the illustrated coral/reef decoration and whale-shark hero
    /// sprite, which are loaded from Resources via
    /// <see cref="AquaLuminaSpriteLoader"/> by the companion
    /// <see cref="AquaLuminaCoralDecoration"/> and
    /// <see cref="AquaLuminaWhaleShark"/> builder classes. Every material is a
    /// plain <c>new Material(shader)</c> — this project has zero .prefab/.mat
    /// assets by convention and this builder must not introduce any.
    ///
    /// This class has no dependency on the god-ray/caustics/distortion effect
    /// modules: with all of those switched off, what this builder produces
    /// must already read as a tasteful, correctly-layered static aquarium —
    /// that is the effects-off QA baseline capture.
    /// </summary>
    public static class AquaLuminaStageBuilder
    {
        private const float PixelsPerUnit = 100f;

        // Fixed seed so every randomized shape/phase (rock skylines, kelp
        // waviness, fish/kelp placement and timing, particle RNG streams) is
        // identical run to run — required so CLI QA screenshots are
        // comparable across captures instead of looking different every time.
        private const int GenerationSeed = 20260723;

        private const float SunViewportX = 0.5f;
        private const float SunViewportY = 0.88f;

        // Stock URP 2D shader (ships with the render pipeline, not a project
        // asset) — using it directly is what makes these sprites/particles
        // render correctly under the 2D Renderer without depending on any
        // Light2D being present in the scene, since it is the unlit variant.
        private const string SpriteUnlitShaderName = "Universal Render Pipeline/2D/Sprite-Unlit-Default";

        // Sorting-order contract shared with the other AquaLumina rendering
        // modules (god rays / caustics / distortion own the gaps at 20+).
        // Order 15 (AquaLuminaWhaleShark) and order 17 (AquaLuminaCoralDecoration)
        // are also part of this contract but are owned as private consts in
        // those companion classes, not here — this table is the single source
        // of truth for who sits where, but each class still declares its own
        // const rather than reaching into this file's private members.
        private const int BackgroundSortingOrder = 0;
        private const int SurfaceLightBandSortingOrder = 5;
        private const int FarRocksSortingOrder = 10;
        private const int KelpSortingOrder = 12;
        private const int FishSortingOrder = 14;
        // 15: AquaLuminaWhaleShark.WhaleSharkSortingOrder (illustrated hero sprite).
        private const int NearRocksSortingOrder = 16;
        // 17: AquaLuminaCoralDecoration.CoralSortingOrder (illustrated reef decoration).
        private const int SunDiscSortingOrder = 30;
        private const int MarineSnowSortingOrder = 35;
        private const int BubblesSortingOrder = 40;

        private const int RockTextureWidth = 512;
        private const int RockTextureHeight = 160;
        private const int KelpTextureWidth = 32;
        private const int KelpTextureHeight = 256;
        private const int FishTextureWidth = 128;
        private const int FishTextureHeight = 64;

        public static AquaStageInfo Build(Transform parent, Camera camera)
        {
            if (camera == null)
            {
                throw new ArgumentNullException(nameof(camera));
            }

            if (!camera.orthographic)
            {
                // ComputeVisibleWorldRect (below) and the sun-disc depth
                // resolution both assume an orthographic projection (reading
                // orthographicSize/aspect directly). This builder is only ever
                // exercised today via AquaLuminaProjectSetup's spike scene,
                // which hardcodes an orthographic camera, but that contract
                // isn't enforced anywhere - warn loudly instead of silently
                // producing an incorrect layout if a future caller passes a
                // perspective camera.
                Debug.LogWarning(
                    "AquaLuminaStageBuilder.Build: expected an orthographic camera; layout "
                    + "(visible-world-rect, sun placement, etc.) will be incorrect for a "
                    + "perspective camera.");
            }

            var root = new GameObject("AquaStage");
            root.transform.SetParent(parent, false);
            var content = root.AddComponent<AquaLuminaStageContent>();

            var visibleRect = ComputeVisibleWorldRect(camera);
            var random = new System.Random(GenerationSeed);

            var spriteMaterial = CreateSharedMaterial("AquaLumina Sprite (Runtime)", texture: null);
            content.RegisterGeneratedAsset(spriteMaterial);

            BuildBackground(content, root.transform, visibleRect, spriteMaterial);
            BuildSurfaceLightBand(content, root.transform, visibleRect, spriteMaterial);

            var sunViewport = new Vector2(SunViewportX, SunViewportY);
            BuildSunDisc(content, root.transform, camera, sunViewport, random, spriteMaterial);

            BuildRockLayer(content, root.transform, visibleRect, random, spriteMaterial, isFarLayer: true);
            BuildRockLayer(content, root.transform, visibleRect, random, spriteMaterial, isFarLayer: false);
            BuildKelp(content, root.transform, visibleRect, random, spriteMaterial);
            BuildFish(content, root.transform, visibleRect, random, spriteMaterial);

            // Placed after BuildFish deliberately: every RNG draw for the
            // existing background/rocks/kelp/fish layout above happens before
            // coral touches the shared random stream, so that previously-tuned
            // procedural layout stays bit-identical (the whale shark takes no
            // random parameter at all, and the particle systems below use
            // their own fixed seeds, consuming nothing from `random` either).
            AquaLuminaCoralDecoration.Build(content, root.transform, visibleRect, random, spriteMaterial);
            AquaLuminaWhaleShark.Build(content, root.transform, visibleRect, spriteMaterial);

            var particleTexture = CreateSoftCircleTexture();
            content.RegisterGeneratedAsset(particleTexture);
            var particleMaterial = CreateSharedMaterial("AquaLumina Particle (Runtime)", particleTexture);
            content.RegisterGeneratedAsset(particleMaterial);
            BuildBubbles(root.transform, visibleRect, particleMaterial);
            BuildMarineSnow(root.transform, visibleRect, particleMaterial);

            // Returned separately from what content is actually built against
            // (the raw visibleRect) — the effect modules use the slightly
            // larger rect so full-screen passes keep covering the frame even
            // while their own UV distortion samples a few percent outside it.
            var waterWorldRect = ExpandRect(visibleRect, 0.05f);
            return new AquaStageInfo(root, sunViewport, waterWorldRect);
        }

        private static Rect ComputeVisibleWorldRect(Camera camera)
        {
            var height = 2f * camera.orthographicSize;
            var width = height * camera.aspect;
            var center = camera.transform.position;
            return new Rect(center.x - width * 0.5f, center.y - height * 0.5f, width, height);
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
        // Background (order 0)
        // ---------------------------------------------------------------

        private static void BuildBackground(AquaLuminaStageContent content, Transform parent, Rect rect, Material material)
        {
            const int width = 64;
            const int height = 512;
            const float paleBandStart = 0.92f; // top 8% blends into the pale surface tone
            var deep = HexColor(0x04, 0x1C, 0x30);
            var mid = HexColor(0x2E, 0x7E, 0xA6);
            var pale = HexColor(0x7F, 0xC7, 0xDF);

            var texture = CreateTexture(width, height, "AquaLumina Background");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var t = height > 1 ? y / (float)(height - 1) : 0f;
                var color = t < paleBandStart
                    ? Color.Lerp(deep, mid, t / paleBandStart)
                    : Color.Lerp(mid, pale, (t - paleBandStart) / (1f - paleBandStart));
                var rowColor = (Color32)color;
                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    pixels[rowStart + x] = rowColor;
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            content.RegisterGeneratedAsset(texture);

            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "AquaLumina Background");
            content.RegisterGeneratedAsset(sprite);

            var renderer = CreateSpriteRendererObject(
                "Background", parent, sprite, material, BackgroundSortingOrder, new Vector3(rect.center.x, rect.center.y, 0f));

            // Deliberate full stretch: this is an abstract vertical color ramp
            // with no horizontal detail, not illustrated artwork, so covering
            // the rect exactly (per spec) introduces no visible distortion.
            var nativeSize = new Vector2(width, height) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(rect.width / nativeSize.x, rect.height / nativeSize.y, 1f);
        }

        // ---------------------------------------------------------------
        // Surface light band (order 5)
        // ---------------------------------------------------------------

        private static void BuildSurfaceLightBand(AquaLuminaStageContent content, Transform parent, Rect rect, Material material)
        {
            const int width = 8;
            const int height = 128;
            const float peakAlpha = 0.25f;
            var tint = HexColor(0xCF, 0xF3, 0xF7);

            var texture = CreateTexture(width, height, "AquaLumina Surface Light");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var t = height > 1 ? y / (float)(height - 1) : 0f;
                // Raised-cosine window: 0 at both edges, peakAlpha at the
                // middle -> a soft feathered band with no hard seam at either
                // edge of the strip.
                var alpha = peakAlpha * 0.5f * (1f - Mathf.Cos(t * Mathf.PI * 2f));
                var rowColor = (Color32)new Color(tint.r, tint.g, tint.b, alpha);
                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    pixels[rowStart + x] = rowColor;
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            content.RegisterGeneratedAsset(texture);

            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "AquaLumina Surface Light");
            content.RegisterGeneratedAsset(sprite);

            var bandHeight = rect.height * 0.15f;
            var centerY = rect.yMax - bandHeight * 0.5f;
            var renderer = CreateSpriteRendererObject(
                "SurfaceLightBand", parent, sprite, material, SurfaceLightBandSortingOrder, new Vector3(rect.center.x, centerY, 0f));

            var nativeSize = new Vector2(width, height) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(rect.width / nativeSize.x, bandHeight / nativeSize.y, 1f);
        }

        // ---------------------------------------------------------------
        // Sun disc (order 30)
        // ---------------------------------------------------------------

        private static void BuildSunDisc(
            AquaLuminaStageContent content,
            Transform parent,
            Camera camera,
            Vector2 sunViewport,
            System.Random random,
            Material material)
        {
            const int size = 128;
            const float worldWidth = 1.8f;
            var core = new Color(1f, 0.96f, 0.85f, 1f);

            var texture = CreateTexture(size, size, "AquaLumina Sun");
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

            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "AquaLumina Sun");
            content.RegisterGeneratedAsset(sprite);

            // Resolve the world-space depth the content plane (z = 0) actually
            // sits at from the camera's own point of view, then convert the
            // desired viewport point back at that same depth. This is robust
            // to the camera's exact position/orientation instead of assuming
            // a hardcoded distance.
            var contentDepth = camera.WorldToViewportPoint(Vector3.zero).z;
            var worldPosition = camera.ViewportToWorldPoint(new Vector3(sunViewport.x, sunViewport.y, contentDepth));
            worldPosition.z = 0f;

            var renderer = CreateSpriteRendererObject("SunDisc", parent, sprite, material, SunDiscSortingOrder, worldPosition);
            var nativeSize = size / PixelsPerUnit;
            var scale = worldWidth / nativeSize;
            var baseScale = new Vector3(scale, scale, 1f);
            renderer.transform.localScale = baseScale;

            var pulseSpeed = 2f * Mathf.PI / 5f; // ~5 second pulse period
            var pulsePhase = NextFloat(random, 0f, Mathf.PI * 2f);
            content.RegisterSun(renderer.transform, baseScale, pulseSpeed, pulsePhase, pulseAmplitude: 0.03f);
        }

        // ---------------------------------------------------------------
        // Rock silhouettes (far order 10, near order 16)
        // ---------------------------------------------------------------

        private static void BuildRockLayer(
            AquaLuminaStageContent content,
            Transform parent,
            Rect rect,
            System.Random random,
            Material material,
            bool isFarLayer)
        {
            var tint = isFarLayer ? HexColor(0x12, 0x37, 0x4F) : HexColor(0x0A, 0x24, 0x38);
            var baseHeightFraction = isFarLayer ? 0.30f : 0.34f;
            var amplitudeScale = isFarLayer ? 1f : 1.2f;

            var texture = CreateRockSilhouetteTexture(random, tint, baseHeightFraction, amplitudeScale);
            content.RegisterGeneratedAsset(texture);

            var name = isFarLayer ? "RocksFar" : "RocksNear";
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0f), $"AquaLumina {name}");
            content.RegisterGeneratedAsset(sprite);

            // Height derives from the texture's own pixel aspect ratio while
            // width is forced to span the rect, so the silhouette is never
            // stretched off its authored proportions.
            //
            // Known trade-off (not a correctness bug): this quad spans the
            // texture's full authored height (RockTextureHeight:Width = 1:3.2),
            // but CreateRockSilhouetteTexture only ever paints the bottom
            // ~30-34% (+ a modest sine-wave amplitude) of that as opaque; the
            // rest above the skyline is fully transparent and simply doesn't
            // draw, so this does not visually misrepresent the rocks as taller
            // than intended - it only means the sprite's bounds/overdraw
            // footprint (~55% of a typical 16:9 rect's height) is larger than
            // the visible silhouette. Accepted for this spike; if a future QA
            // screenshot shows the rock layer reading as unexpectedly
            // dominant, either author a wider/shorter rock texture (lower
            // RockTextureHeight:RockTextureWidth) or cap worldHeight
            // independently and derive width from that instead of the full
            // rect width.
            var worldHeight = rect.width * (RockTextureHeight / (float)RockTextureWidth);
            var renderer = CreateSpriteRendererObject(
                name,
                parent,
                sprite,
                material,
                isFarLayer ? FarRocksSortingOrder : NearRocksSortingOrder,
                new Vector3(rect.center.x, rect.yMin, 0f));

            var nativeSize = new Vector2(RockTextureWidth, RockTextureHeight) / PixelsPerUnit;
            renderer.transform.localScale = new Vector3(rect.width / nativeSize.x, worldHeight / nativeSize.y, 1f);
        }

        private static Texture2D CreateRockSilhouetteTexture(
            System.Random random,
            Color tint,
            float baseHeightFraction,
            float amplitudeScale)
        {
            const int width = RockTextureWidth;
            const int height = RockTextureHeight;
            const float featherPixels = 2.5f; // 2-3px anti-aliased skyline edge, never a hard 1px cutoff

            var freq1 = NextFloat(random, 1.0f, 2.2f);
            var freq2 = NextFloat(random, 2.5f, 4.5f);
            var freq3 = NextFloat(random, 5f, 9f);
            var phase1 = NextFloat(random, 0f, Mathf.PI * 2f);
            var phase2 = NextFloat(random, 0f, Mathf.PI * 2f);
            var phase3 = NextFloat(random, 0f, Mathf.PI * 2f);
            var amp1 = height * 0.14f * amplitudeScale;
            var amp2 = height * 0.08f * amplitudeScale;
            var amp3 = height * 0.04f * amplitudeScale;
            var baseHeight = height * baseHeightFraction;

            var texture = CreateTexture(width, height, "AquaLumina Rock Silhouette");
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
                    // skyline = solid ground; smoothstep gives a soft,
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

        // ---------------------------------------------------------------
        // Kelp (order 12)
        // ---------------------------------------------------------------

        private static void BuildKelp(AquaLuminaStageContent content, Transform parent, Rect rect, System.Random random, Material material)
        {
            const int variantCount = 3;
            var tint = HexColor(0x0E, 0x3B, 0x33);
            var variants = new Sprite[variantCount];
            for (var i = 0; i < variantCount; i++)
            {
                var texture = CreateKelpTexture(random, tint);
                content.RegisterGeneratedAsset(texture);
                var sprite = CreateSprite(texture, new Vector2(0.5f, 0f), $"AquaLumina Kelp Variant {i}");
                content.RegisterGeneratedAsset(sprite);
                variants[i] = sprite;
            }

            var count = random.Next(4, 7); // 4-6 blades inclusive
            var margin = rect.width * 0.08f;
            var nativeSize = new Vector2(KelpTextureWidth, KelpTextureHeight) / PixelsPerUnit;
            for (var i = 0; i < count; i++)
            {
                var sprite = variants[i % variantCount];
                var worldHeight = NextFloat(random, 3f, 6f);
                // Width derives from height via the texture's own pixel aspect
                // ratio (KelpTextureWidth:KelpTextureHeight, 1:8) so the
                // resulting scale is uniform on both axes - matches the
                // pattern already used for rocks/fish elsewhere in this file.
                // Randomizing worldHeight alone still gives blade-to-blade
                // size variety (plus the 3 distinct wave-pattern variants)
                // without ever stretching a blade off its authored proportions.
                var worldWidth = worldHeight * (KelpTextureWidth / (float)KelpTextureHeight);
                var x = NextFloat(random, rect.xMin + margin, rect.xMax - margin);

                var renderer = CreateSpriteRendererObject(
                    $"Kelp{i}", parent, sprite, material, KelpSortingOrder, new Vector3(x, rect.yMin, 0f));
                renderer.transform.localScale = new Vector3(worldWidth / nativeSize.x, worldHeight / nativeSize.y, 1f);

                var baseRotation = NextFloat(random, -4f, 4f);
                var swaySpeed = NextFloat(random, 0.6f, 1.3f);
                var swayPhase = NextFloat(random, 0f, Mathf.PI * 2f);
                content.RegisterKelp(renderer.transform, baseRotation, swaySpeed, swayPhase);
            }
        }

        private static Texture2D CreateKelpTexture(System.Random random, Color tint)
        {
            const int width = KelpTextureWidth;
            const int height = KelpTextureHeight;
            var waveFreq = NextFloat(random, 1.2f, 2.0f);
            var wavePhase = NextFloat(random, 0f, Mathf.PI * 2f);
            var waveAmp = NextFloat(random, 0.08f, 0.18f) * width;

            var texture = CreateTexture(width, height, "AquaLumina Kelp");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                // v = 0 at the bottom row (the blade's rooted base, matches the
                // bottom-center sprite pivot) and 1 at the tip.
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
        // Fish (order 14)
        // ---------------------------------------------------------------

        private static void BuildFish(AquaLuminaStageContent content, Transform parent, Rect rect, System.Random random, Material material)
        {
            var texture = CreateFishTexture();
            content.RegisterGeneratedAsset(texture);
            var sprite = CreateSprite(texture, new Vector2(0.5f, 0.5f), "AquaLumina Fish");
            content.RegisterGeneratedAsset(sprite);

            content.SetFishWrapBounds(rect.xMin, rect.xMax);

            var minY = rect.yMin + rect.height * 0.35f;
            var maxY = rect.yMax - rect.height * 0.25f;
            var nativeSize = new Vector2(FishTextureWidth, FishTextureHeight) / PixelsPerUnit;

            // 2 ambient fish, not 3: the third slot is now the illustrated
            // AquaLuminaWhaleShark hero, built right after this method returns.
            // The first two fish still draw the exact same RNG values as
            // before (this loop only dropped its own trailing iteration).
            for (var i = 0; i < 2; i++)
            {
                var length = NextFloat(random, 0.9f, 1.6f);
                // Uniform scale on both axes preserves the texture's native
                // 2:1 aspect ratio exactly - no stretch.
                var scale = length / nativeSize.x;
                var direction = random.Next(2) == 0 ? -1f : 1f;
                var startX = NextFloat(random, rect.xMin, rect.xMax);
                var baseY = NextFloat(random, minY, maxY);

                var renderer = CreateSpriteRendererObject(
                    $"Fish{i}", parent, sprite, material, FishSortingOrder, new Vector3(startX, baseY, 0f));
                renderer.transform.localScale = new Vector3(scale, scale, 1f);
                // Texture faces -X (left) by default; flip to face the
                // direction of travel.
                renderer.flipX = direction > 0f;

                var speed = NextFloat(random, 0.3f, 0.7f);
                var bobSpeed = NextFloat(random, 1.0f, 2.0f);
                var bobPhase = NextFloat(random, 0f, Mathf.PI * 2f);
                var bobAmplitude = NextFloat(random, 0.1f, 0.25f);
                var halfWidth = length * 0.5f;

                content.RegisterFish(renderer.transform, speed, direction, baseY, bobSpeed, bobPhase, bobAmplitude, halfWidth);
            }
        }

        private static Texture2D CreateFishTexture()
        {
            const int width = FishTextureWidth;
            const int height = FishTextureHeight;
            var tint = new Color(0.05f, 0.08f, 0.10f, 1f);
            var centerX = width * 0.40f;
            var centerY = height * 0.5f;
            var rx = width * 0.26f;
            var ry = height * 0.30f;
            var tailStartX = centerX + rx * 0.55f;
            var tailEndX = width * 0.97f;
            // The tail's base half-height is derived from the ellipse formula
            // at tailStartX itself, so the triangle tail joins the ellipse
            // body with no visible seam at the handoff point.
            var tailRatio = Mathf.Sqrt(Mathf.Max(0f, 1f - Square((tailStartX - centerX) / rx)));
            var tailBaseHalfHeight = ry * tailRatio;

            var texture = CreateTexture(width, height, "AquaLumina Fish");
            var pixels = new Color32[width * height];
            for (var y = 0; y < height; y++)
            {
                var dy = y - centerY;
                for (var x = 0; x < width; x++)
                {
                    float alpha;
                    if (x <= tailStartX)
                    {
                        var dx = x - centerX;
                        var value = Square(dx / rx) + Square(dy / ry);
                        alpha = 1f - SmoothStep01(0.92f, 1.15f, value);
                    }
                    else if (x <= tailEndX)
                    {
                        var t = (x - tailStartX) / (tailEndX - tailStartX);
                        var halfHeight = Mathf.Lerp(tailBaseHalfHeight, 0f, t);
                        var value = halfHeight > 0.05f ? Mathf.Abs(dy) / halfHeight : 999f;
                        alpha = 1f - SmoothStep01(0.85f, 1.05f, value);
                    }
                    else
                    {
                        alpha = 0f;
                    }
                    pixels[y * width + x] = new Color(tint.r, tint.g, tint.b, Mathf.Clamp01(alpha));
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Bubbles (order 40) / marine snow (order 35)
        // ---------------------------------------------------------------

        private static void BuildBubbles(Transform parent, Rect rect, Material material)
        {
            var go = new GameObject("Bubbles");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(rect.center.x, rect.yMin + 0.15f, 0f);

            var system = go.AddComponent<ParticleSystem>();
            // Fixed, non-auto seed so the particle placement/timing is
            // reproducible across CLI captures, same rationale as
            // GenerationSeed above.
            system.useAutoRandomSeed = false;
            system.randomSeed = (uint)GenerationSeed;

            var main = system.main;
            main.loop = true;
            main.prewarm = true;
            main.playOnAwake = true;
            main.duration = 10f; // >= max startLifetime so prewarm reaches a steady-state distribution
            main.startDelay = 0f;
            main.startLifetime = new ParticleSystem.MinMaxCurve(6f, 10f);
            main.startSpeed = 0f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.05f, 0.22f);
            main.startColor = new Color(0.85f, 0.95f, 1f, 0.7f);
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 200;
            main.gravityModifier = 0f;

            var emission = system.emission;
            emission.rateOverTime = 8f;

            var shape = system.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.position = Vector3.zero;
            shape.rotation = Vector3.zero;
            shape.scale = new Vector3(rect.width * 0.9f, 0.05f, 1f);

            var velocityOverLifetime = system.velocityOverLifetime;
            velocityOverLifetime.enabled = true;
            velocityOverLifetime.space = ParticleSystemSimulationSpace.World;
            velocityOverLifetime.y = new ParticleSystem.MinMaxCurve(0.5f, 1.2f);

            var noise = system.noise;
            noise.enabled = true;
            noise.strength = 0.15f;
            noise.frequency = 0.3f;

            var sizeOverLifetime = system.sizeOverLifetime;
            sizeOverLifetime.enabled = true;
            var sizeCurve = new AnimationCurve(new Keyframe(0f, 0.85f), new Keyframe(1f, 1.15f));
            sizeOverLifetime.size = new ParticleSystem.MinMaxCurve(1f, sizeCurve);

            var colorOverLifetime = system.colorOverLifetime;
            colorOverLifetime.enabled = true;
            colorOverLifetime.color = new ParticleSystem.MinMaxGradient(BuildFadeInOutGradient());

            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = material;
            renderer.sortingOrder = BubblesSortingOrder;
            renderer.renderMode = ParticleSystemRenderMode.Billboard;

            system.Play();
        }

        private static void BuildMarineSnow(Transform parent, Rect rect, Material material)
        {
            var go = new GameObject("MarineSnow");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(rect.center.x, rect.yMax - 0.1f, 0f);

            var system = go.AddComponent<ParticleSystem>();
            system.useAutoRandomSeed = false;
            system.randomSeed = (uint)(GenerationSeed + 1); // distinct stream from the bubbles system

            var main = system.main;
            main.loop = true;
            main.prewarm = true;
            main.playOnAwake = true;
            main.duration = 20f; // >= max startLifetime so prewarm reaches a steady-state distribution
            main.startDelay = 0f;
            main.startLifetime = new ParticleSystem.MinMaxCurve(14f, 20f);
            main.startSpeed = 0f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.01f, 0.04f);
            main.startColor = new ParticleSystem.MinMaxGradient(
                new Color(1f, 1f, 1f, 0.12f), new Color(1f, 1f, 1f, 0.25f));
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 400;
            main.gravityModifier = 0f;

            var emission = system.emission;
            emission.rateOverTime = 30f;

            var shape = system.shape;
            shape.enabled = true;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.position = Vector3.zero;
            shape.rotation = Vector3.zero;
            shape.scale = new Vector3(rect.width * 0.95f, 0.05f, 1f);

            var velocityOverLifetime = system.velocityOverLifetime;
            velocityOverLifetime.enabled = true;
            velocityOverLifetime.space = ParticleSystemSimulationSpace.World;
            velocityOverLifetime.y = new ParticleSystem.MinMaxCurve(-0.15f, -0.05f);

            var noise = system.noise;
            noise.enabled = true;
            noise.strength = 0.08f;
            noise.frequency = 0.2f;

            var colorOverLifetime = system.colorOverLifetime;
            colorOverLifetime.enabled = true;
            colorOverLifetime.color = new ParticleSystem.MinMaxGradient(BuildFadeInOutGradient());

            var renderer = go.GetComponent<ParticleSystemRenderer>();
            renderer.sharedMaterial = material;
            renderer.sortingOrder = MarineSnowSortingOrder;
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
            var texture = CreateTexture(size, size, "AquaLumina Particle Soft Circle");
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

                    // A brighter ring just inside the boundary approximates a
                    // bubble's refractive highlight rim.
                    var rim = Mathf.Clamp01(1f - Mathf.Abs(d - 0.78f) / 0.14f);
                    var alpha = Mathf.Clamp01(body * 0.55f + rim * 0.5f);
                    pixels[y * size + x] = new Color(1f, 1f, 1f, alpha);
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
            // since visibleRect was computed in world space from the camera.
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
                Debug.LogError($"AquaLumina: shader not found, falling back: {SpriteUnlitShaderName}");
                shader = Shader.Find("Sprites/Default");
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
    }
}
