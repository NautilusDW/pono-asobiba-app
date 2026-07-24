using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Procedural art for the float (ウキ) and its surface wake foam.
    ///
    /// This replaces the old 64x96 flat two-tone dome that
    /// <see cref="KawaGlintActorsBuilder"/> generated inline -- everything
    /// else on screen (background, fish shadows, catch art, Pono) is
    /// colored-pencil illustration, and a flat vector-looking float read as
    /// the cheapest object in the frame. What a C# pixel loop *can* do
    /// convincingly is form: a spherical highlight, a rim shadow, a warm
    /// charcoal waistline and -- most importantly for a 3-7 year old
    /// spotting it at 5% of screen height -- a visible antenna with a bright
    /// bead on top. A faint paper-grain noise nudges it toward the
    /// colored-pencil-on-paper look of its neighbours.
    ///
    /// Every function here is static and allocation-light (one Texture2D per
    /// call, nothing cached), and consumes no randomness at all -- the paper
    /// grain comes from a positional integer hash, never from
    /// <see cref="System.Random"/>, so dropping these calls into
    /// <see cref="KawaGlintActorsBuilder"/> cannot perturb its seeded ambient
    /// fish placement draw order.
    ///
    /// The caller owns the returned textures: wrap them in a Sprite and
    /// register both with <c>KawaGlintActorsController.RegisterGeneratedAsset</c>
    /// exactly like every other runtime-generated asset in this module.
    /// </summary>
    public static class KawaGlintBobberArt
    {
        // -----------------------------------------------------------------
        // Float texture
        // -----------------------------------------------------------------

        /// <summary>Width of the generated float texture, in pixels.</summary>
        public const int BobberTextureWidth = 96;

        /// <summary>Height of the generated float texture, in pixels.</summary>
        public const int BobberTextureHeight = 160;

        /// <summary>
        /// V coordinate (0 = bottom row, 1 = top row) of the centre of the
        /// float's waistline -- the widest point, where the red dome meets
        /// the cream taper, i.e. the line that visually *is* the waterline
        /// when the float is bobbing.
        ///
        /// This is the sprite pivot's V. Setting the pivot here means
        /// assigning <c>transform.position.y = waterlineY</c> literally
        /// guarantees "the waist sits on the water", instead of relying on
        /// the old centre-pivot approximation ("half the sprite is below the
        /// line, so it must look half-submerged"), which was only ever
        /// accidentally true for a symmetric silhouette.
        ///
        /// Because the art is procedural, this is an exact authored value
        /// rather than something measured off a PNG -- it is the
        /// hand-generated stand-in for the <c>bobber_metrics.json</c> that a
        /// future illustrated float would ship with.
        /// </summary>
        public const float WaistV = 0.40f;

        /// <summary>
        /// Suggested rendered world height of the float. Raised from the
        /// shipped 0.55 so the new antenna/bead detail is actually legible
        /// at 1080p (QA tuning range 0.58-0.76; changing it requires a
        /// physical-device check per AGENTS.md 7.4).
        /// </summary>
        public const float RecommendedBobberWorldHeight = 0.66f;

        // Top of the red dome. Above this is the antenna stem and bead.
        private const float DomeTopV = 0.82f;

        // Antenna bead: centre V and radius in pixels. Placed so the bead's
        // anti-aliased top edge lands on the texture's top row -- the design
        // contract puts the tip of the antenna at exactly 100% of the
        // trimmed height, and it is the single most legible part of the float
        // at 1080p.
        private const float BeadCenterV = 0.9537f;
        private const float BeadRadiusPixels = 7f;
        private const float AntennaHalfWidthPixels = 1.6f;

        // Widest half-width of the body, as a fraction of half the texture
        // width. 0.70 leaves a margin wide enough for the edge's
        // anti-aliasing plus the bead, and puts the body's full width at 42%
        // of the texture height -- the proportion a classic float reads at.
        private const float BodyMaxHalfWidthFraction = 0.70f;

        // Lower taper exponent. Below 1 it bulges outward from the bottom
        // point, giving the rounded teardrop of a real float rather than the
        // straight cone the previous linear ramp produced.
        private const float TaperExponent = 0.55f;

        private static readonly Color BobberRed = HexColor(0xE9, 0x4B, 0x4B);
        private static readonly Color BobberCream = HexColor(0xFF, 0xF6, 0xEC);

        // Warm charcoal rather than #333333: a neutral near-black read as a
        // hard vector stroke against the colored-pencil neighbours.
        private static readonly Color BobberWaist = HexColor(0x4A, 0x3A, 0x33);

        private static readonly Color AntennaStem = HexColor(0xF2, 0xE6, 0xD0);
        private static readonly Color AntennaBead = HexColor(0xF7, 0xC9, 0x48);
        private static readonly Color AntennaBeadHighlight = HexColor(0xFF, 0xEE, 0xB8);

        // Key light from the upper left, tilted toward the viewer.
        private static readonly Vector3 KeyLight = new Vector3(-0.50f, 0.60f, 0.62f).normalized;

        // +/-12% brightness swing across the dome (design contract).
        private const float ShadeMin = 0.88f;
        private const float ShadeMax = 1.12f;

        // Paper-grain amplitude, in 0-255 units.
        private const float PaperGrainAmplitude255 = 3f;

        // -----------------------------------------------------------------
        // Wake foam texture
        // -----------------------------------------------------------------

        /// <summary>Width of the generated wake foam texture, in pixels.</summary>
        public const int WakeFoamTextureWidth = 256;

        /// <summary>Height of the generated wake foam texture, in pixels.</summary>
        public const int WakeFoamTextureHeight = 64;

        /// <summary>
        /// V coordinate of the foam ridge's centre line, averaged along its
        /// length. Used as the sprite pivot's V by
        /// <see cref="KawaGlintBobberWake"/> so that placing the transform on
        /// the water surface puts the ridge itself on the water, rather than
        /// the texture's geometric centre.
        /// </summary>
        public const float WakeFoamRidgeV = 0.44f;

        // The crescent is authored bright-at-LEFT; KawaGlintBobberWake flips
        // the renderer (flipX) to point it the other way, never rebuilding
        // or non-uniformly scaling the texture.
        private const float FoamMaxThicknessV = 0.30f;
        private const float FoamBaseCenterV = 0.38f;
        private const float FoamCenterRiseV = 0.10f;
        private const float FoamThicknessFalloff = 1.35f;
        private const float FoamBrightnessFalloff = 0.60f;

        private static readonly Color FoamWhite = HexColor(0xFF, 0xFF, 0xFF);
        private static readonly Color FoamPaleCyan = HexColor(0xDD, 0xF3, 0xFA);

        // Scattered bubble specks above the ridge -- fixed positions, never
        // randomized, so the texture is byte-identical on every run.
        private static readonly float[] SpeckleU = { 0.07f, 0.16f, 0.25f, 0.34f, 0.44f, 0.55f };
        private static readonly float[] SpeckleV = { 0.74f, 0.63f, 0.79f, 0.60f, 0.71f, 0.58f };
        private static readonly float[] SpeckleRadiusPixels = { 2.6f, 1.9f, 1.6f, 2.2f, 1.5f, 1.3f };
        private const float SpeckleAlpha = 0.55f;

        /// <summary>
        /// World-space distance from the waterline up to the antenna bead,
        /// for a float rendered <paramref name="bobberWorldHeight"/> tall
        /// with its pivot at <see cref="WaistV"/>. This is what
        /// <see cref="KawaGlintBobber.Initialize"/> wants as its
        /// <c>topOffsetWorld</c> argument, and what
        /// <see cref="KawaGlintBobber.TopWorldY"/> then reports as the
        /// fishing line's attachment point.
        /// </summary>
        public static float TopOffsetWorld(float bobberWorldHeight)
        {
            return (1f - WaistV) * bobberWorldHeight;
        }

        /// <summary>
        /// Builds the float's texture: shaded red dome, cream teardrop
        /// taper, charcoal waistline and ivory antenna with a warm bead.
        /// Caller owns the returned texture.
        /// </summary>
        public static Texture2D CreateBobberTexture()
        {
            const int width = BobberTextureWidth;
            const int height = BobberTextureHeight;

            var texture = CreateTexture(width, height, "KawaGlint Bobber");
            var pixels = new Color32[width * height];

            var centerX = (width - 1) * 0.5f;
            var maxHalfWidth = width * 0.5f * BodyMaxHalfWidthFraction;
            var domeSpanV = DomeTopV - WaistV;
            var beadCenterY = BeadCenterV * (height - 1);

            for (var y = 0; y < height; y++)
            {
                var v = height > 1 ? y / (float)(height - 1) : 0f;

                // Body half-width for this row.
                float halfWidthNorm;
                if (v >= WaistV)
                {
                    // Upper hemisphere: widest at the waist, rounding off to
                    // a point at DomeTopV.
                    var t = domeSpanV > 0.0001f ? Mathf.Clamp01((v - WaistV) / domeSpanV) : 1f;
                    halfWidthNorm = Mathf.Sqrt(Mathf.Max(0f, 1f - t * t));
                }
                else
                {
                    var s = WaistV > 0.0001f ? Mathf.Clamp01(v / WaistV) : 0f;
                    halfWidthNorm = Mathf.Pow(s, TaperExponent);
                }

                var halfWidthPixels = maxHalfWidth * halfWidthNorm;

                // Waist band: 2px solid core, softening out over 1 more px.
                var waistDistancePixels = Mathf.Abs(v - WaistV) * (height - 1);
                var waistWeight = 1f - SmoothStep01(1f, 2f, waistDistancePixels);

                var domeHeight01 = domeSpanV > 0.0001f ? Mathf.Clamp01((v - WaistV) / domeSpanV) : 0f;
                var taper01 = WaistV > 0.0001f ? Mathf.Clamp01(v / WaistV) : 0f;

                var rowStart = y * width;
                for (var x = 0; x < width; x++)
                {
                    var dx = x - centerX;

                    // --- body coverage -------------------------------------
                    var edge = halfWidthPixels > 0.001f ? Mathf.Abs(dx) / halfWidthPixels : 999f;
                    var bodyAlpha = v <= DomeTopV ? 1f - SmoothStep01(0.85f, 1.05f, edge) : 0f;

                    Color bodyColor;
                    if (v >= WaistV)
                    {
                        var normalX = maxHalfWidth > 0.001f ? dx / maxHalfWidth : 0f;
                        bodyColor = ShadeDome(BobberRed, normalX, domeHeight01);
                    }
                    else
                    {
                        var acrossBody = halfWidthPixels > 0.001f ? Mathf.Clamp(dx / halfWidthPixels, -1f, 1f) : 0f;
                        bodyColor = ShadeTaper(BobberCream, acrossBody, taper01);
                    }

                    if (waistWeight > 0f && bodyAlpha > 0f)
                    {
                        bodyColor = Color.Lerp(bodyColor, BobberWaist, waistWeight);
                    }

                    // --- antenna -------------------------------------------
                    var antennaColor = Color.clear;
                    var antennaAlpha = 0f;
                    // Starts a hair below the dome's apex so the stem always
                    // emerges from inside the dome -- a gap there would read
                    // as a floating detached antenna.
                    if (v > DomeTopV - 0.01f)
                    {
                        var stemEdge = Mathf.Abs(dx) / AntennaHalfWidthPixels;
                        // The stem stops where the bead begins, so the two
                        // never double-composite into a visible seam.
                        var stemTopY = beadCenterY - BeadRadiusPixels * 0.55f;
                        var stemAlpha = y <= stemTopY ? 1f - SmoothStep01(0.7f, 1.15f, stemEdge) : 0f;
                        if (stemAlpha > 0f)
                        {
                            antennaColor = AntennaStem;
                            antennaAlpha = stemAlpha;
                        }

                        var beadDy = y - beadCenterY;
                        var beadDistance = Mathf.Sqrt(dx * dx + beadDy * beadDy) / BeadRadiusPixels;
                        var beadAlpha = 1f - SmoothStep01(0.78f, 1.05f, beadDistance);
                        if (beadAlpha > 0f)
                        {
                            // Small specular dot on the upper-left of the
                            // bead so it reads as a rounded ball rather than
                            // a flat yellow disc.
                            var specular = 1f - SmoothStep01(
                                0.0f,
                                0.85f,
                                Mathf.Sqrt(
                                    Square((dx + BeadRadiusPixels * 0.32f) / BeadRadiusPixels)
                                    + Square((beadDy - BeadRadiusPixels * 0.32f) / BeadRadiusPixels)));
                            var color = Color.Lerp(AntennaBead, AntennaBeadHighlight, specular * 0.75f);
                            if (beadAlpha >= antennaAlpha)
                            {
                                antennaColor = color;
                                antennaAlpha = beadAlpha;
                            }
                        }
                    }

                    // --- composite -----------------------------------------
                    var alpha = Mathf.Max(bodyAlpha, antennaAlpha);
                    Color rgb;
                    if (antennaAlpha >= bodyAlpha)
                    {
                        rgb = antennaAlpha > 0f ? antennaColor : bodyColor;
                    }
                    else
                    {
                        rgb = bodyColor;
                    }

                    if (alpha > 0f)
                    {
                        var grain = (Hash01(x, y) - 0.5f) * 2f * (PaperGrainAmplitude255 / 255f);
                        rgb = new Color(
                            Mathf.Clamp01(rgb.r + grain),
                            Mathf.Clamp01(rgb.g + grain),
                            Mathf.Clamp01(rgb.b + grain));
                    }

                    pixels[rowStart + x] = new Color(rgb.r, rgb.g, rgb.b, Mathf.Clamp01(alpha));
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        /// <summary>
        /// Builds the surface wake foam: a low crescent ridge, thick and
        /// bright at the LEFT end and thinning away to nothing at the right,
        /// with a few bubble specks above it. Authored left-bright on
        /// purpose -- <see cref="KawaGlintBobberWake"/> mirrors it with
        /// <c>flipX</c> for the other tow direction, which costs nothing and
        /// keeps the sprite's aspect ratio untouched. Caller owns the
        /// returned texture.
        /// </summary>
        public static Texture2D CreateWakeFoamTexture()
        {
            const int width = WakeFoamTextureWidth;
            const int height = WakeFoamTextureHeight;

            var texture = CreateTexture(width, height, "KawaGlint Bobber Wake Foam");
            var pixels = new Color32[width * height];

            for (var y = 0; y < height; y++)
            {
                var v = height > 1 ? y / (float)(height - 1) : 0f;
                var rowStart = y * width;

                for (var x = 0; x < width; x++)
                {
                    var u = width > 1 ? x / (float)(width - 1) : 0f;
                    var remaining = 1f - u;

                    var thickness = FoamMaxThicknessV * Mathf.Pow(remaining, FoamThicknessFalloff);
                    var centerV = FoamBaseCenterV + FoamCenterRiseV * remaining;

                    var distance = thickness > 0.0001f ? Mathf.Abs(v - centerV) / thickness : 999f;
                    var ridgeAlpha = 1f - SmoothStep01(0.45f, 1f, distance);

                    // Soften the very left edge so the crescent does not
                    // start on a hard vertical cut, and fade the whole ridge
                    // out toward the right.
                    ridgeAlpha *= SmoothStep01(0f, 0.05f, u);
                    ridgeAlpha *= Mathf.Pow(remaining, FoamBrightnessFalloff);

                    var color = Color.Lerp(FoamPaleCyan, FoamWhite, 1f - Mathf.Clamp01(distance));
                    var alpha = ridgeAlpha;

                    for (var s = 0; s < SpeckleU.Length; s++)
                    {
                        var dx = x - SpeckleU[s] * (width - 1);
                        var dy = y - SpeckleV[s] * (height - 1);
                        var d = Mathf.Sqrt(dx * dx + dy * dy) / SpeckleRadiusPixels[s];
                        var speck = (1f - SmoothStep01(0.55f, 1f, d)) * SpeckleAlpha * remaining;
                        if (speck > alpha)
                        {
                            alpha = speck;
                            color = FoamWhite;
                        }
                    }

                    pixels[rowStart + x] = new Color(color.r, color.g, color.b, Mathf.Clamp01(alpha));
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // -----------------------------------------------------------------
        // Shading helpers
        // -----------------------------------------------------------------

        // Approximates the dome as a hemisphere and lambert-shades it, then
        // darkens the last sliver above the waist so the dome reads as
        // sitting *on* the taper rather than fused into it.
        private static Color ShadeDome(Color baseColor, float normalX, float domeHeight01)
        {
            var nx = Mathf.Clamp(normalX, -1f, 1f);
            var ny = Mathf.Clamp01(domeHeight01);
            var nz = Mathf.Sqrt(Mathf.Max(0f, 1f - nx * nx - ny * ny));

            var lambert = Mathf.Clamp01(nx * KeyLight.x + ny * KeyLight.y + nz * KeyLight.z);
            var shade = Mathf.Clamp(ShadeMin + lambert * 0.28f, ShadeMin, ShadeMax);

            var rim = 1f - SmoothStep01(0f, 0.18f, ny);
            shade *= 1f - 0.08f * rim;

            return Scale(baseColor, shade);
        }

        // The cream taper is nearly matte: a gentle shadow toward the lower
        // right and the faintest lift on the upper left, no specular.
        private static Color ShadeTaper(Color baseColor, float acrossBody, float taper01)
        {
            var lowness = 1f - Mathf.Clamp01(taper01);
            var shadow = SmoothStep01(0.05f, 1f, acrossBody) * (0.35f + 0.65f * lowness);
            var lift = SmoothStep01(0.05f, 1f, -acrossBody) * 0.45f * Mathf.Clamp01(taper01);

            var shade = Mathf.Clamp(1f - 0.12f * shadow + 0.05f * lift, ShadeMin, ShadeMax);
            return Scale(baseColor, shade);
        }

        private static Color Scale(Color color, float factor)
        {
            return new Color(
                Mathf.Clamp01(color.r * factor),
                Mathf.Clamp01(color.g * factor),
                Mathf.Clamp01(color.b * factor),
                color.a);
        }

        // -----------------------------------------------------------------
        // Shared helpers (mirrors KawaGlintActorsBuilder's own local copies
        // -- this module deliberately does not reach into that class, so the
        // two stay independently buildable)
        // -----------------------------------------------------------------

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

        private static Color HexColor(byte r, byte g, byte b, byte a = 255)
        {
            return new Color32(r, g, b, a);
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

        // Positional integer hash -- deterministic, allocation-free, and
        // (critically) NOT System.Random, so calling this from inside
        // KawaGlintActorsBuilder cannot shift its seeded ambient-fish draw
        // order by even one draw.
        private static float Hash01(int x, int y)
        {
            unchecked
            {
                var h = x * 374761393 + y * 668265263;
                h = (h ^ (h >> 13)) * 1274126177;
                h ^= h >> 16;
                return (h & 0x7FFFFF) / (float)0x7FFFFF;
            }
        }
    }
}
