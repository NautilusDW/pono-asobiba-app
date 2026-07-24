using System.Collections.Generic;
using UnityEngine;

namespace Pono.KawaGlint.Rendering
{
    /// <summary>
    /// Procedural placeholder silhouettes for the 10 sea-expansion species
    /// that don't have illustrated art yet (KawaGlint 海拡張 実装契約 v1.0
    /// §D-1). Each species gets its own tint + body-shape recipe so the new
    /// species read as visually distinct from one another (and from the 5
    /// illustrated river species' silhouettes) purely from code-generated
    /// textures.
    ///
    /// The teardrop generator's pixel math is copied from
    /// <c>KawaGlintActorsBuilder.CreateFishShadowTexture</c> and
    /// parameterized by tint/aspect/tail-length -- that method itself is left
    /// completely untouched, per contract (its class doc promises zero
    /// dependency on sibling rendering types). Two extra shapes (a 5-point
    /// star, a flat-bottomed half-disc "fan") cover the two non-fish species
    /// (hitode/treasure_kaigara).
    ///
    /// WHY (do not violate): exactly like <see cref="KawaGlintSpriteCatalog"/>,
    /// the Sprites/Textures cached here live in the static cache below for
    /// reuse across stage rebuilds. Callers must NEVER pass them (or their
    /// textures) to <see cref="KawaGlintActorsController.RegisterGeneratedAsset"/>
    /// -- its OnDestroy destroys every registered object, and destroying one
    /// of these statically-cached assets would permanently break every later
    /// call for that species for the lifetime of the application.
    /// </summary>
    public static class KawaGlintProceduralFishArt
    {
        private const float PixelsPerUnit = 100f;
        private static readonly Vector2 CenterPivot = new Vector2(0.5f, 0.5f);

        private const int TeardropWidth = 128;
        private const int TeardropHeight = 64;
        private const int RoundTextureSize = 96;
        private const float SilhouetteAlpha = 0.95f;

        private enum ShapeKind
        {
            Teardrop,
            Star,
            Fan
        }

        private sealed class Recipe
        {
            public ShapeKind Shape;
            public Color32 Tint;

            // Teardrop-only. AspectMul scales the body ellipse's vertical
            // (ry) radius; TailLengthMul scales how far the tail run extends
            // past the body (both relative to the shared 1.0 baseline used by
            // KawaGlintActorsBuilder's own teardrop silhouette).
            public float AspectMul = 1f;
            public float TailLengthMul = 1f;
        }

        // §D-1 recipe table -- tint hex + shape params transcribed verbatim
        // from the KawaGlint 海拡張 実装契約 v1.0 contract.
        private static readonly Dictionary<string, Recipe> Recipes = new Dictionary<string, Recipe>
        {
            { "fish_aji", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0x9F, 0xB8, 0xC8), AspectMul = 1f, TailLengthMul = 1f } },
            { "fish_ebi", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0xE8, 0x86, 0x5A), AspectMul = 0.8f, TailLengthMul = 0.6f } },
            { "fish_karei", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0xC9, 0xA8, 0x6B), AspectMul = 1.35f, TailLengthMul = 0.5f } },
            { "hitode", new Recipe { Shape = ShapeKind.Star, Tint = HexColor(0xE8, 0xB8, 0x4B) } },
            { "treasure_kaigara", new Recipe { Shape = ShapeKind.Fan, Tint = HexColor(0xF2, 0xC4, 0xCE) } },
            { "fish_iwashi", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0xC8, 0xD4, 0xE0), AspectMul = 0.6f, TailLengthMul = 1f } },
            { "fish_tai", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0xE8, 0x64, 0x70), AspectMul = 1.2f, TailLengthMul = 0.9f } },
            { "fish_ika", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0xE8, 0xE0, 0xF0), AspectMul = 0.7f, TailLengthMul = 1.4f } },
            { "fish_maguro", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0x2B, 0x4A, 0x6F), AspectMul = 0.9f, TailLengthMul = 0.8f } },
            { "fish_unagi", new Recipe { Shape = ShapeKind.Teardrop, Tint = HexColor(0x4A, 0x5A, 0x3A), AspectMul = 0.35f, TailLengthMul = 1.6f } },
        };

        // Shadow-art contract color (#0F2C56): every archetype stand-in below
        // is a flat fill in exactly the shade the illustrated silhouette PNGs
        // are painted in, so dropping the real art in later changes the shape
        // and nothing else.
        private static readonly Color32 ArchetypeShadowTint = HexColor(0x0F, 0x2C, 0x56);

        // Body-plan stand-ins, one per KawaGlintFishSilhouettes archetype key.
        // These are placeholders for Shadows/sil_<key>_shadow.png: the point is
        // that a rare's outline already differs from a normal's before any art
        // is commissioned, not that these are good drawings. Every entry keeps
        // the same head-left / tail-right orientation the wag shader requires.
        private static readonly Dictionary<string, Recipe> ArchetypeRecipes = new Dictionary<string, Recipe>
        {
            { KawaGlintFishSilhouettes.SlimSmall, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 0.62f, TailLengthMul = 1.00f } },
            { KawaGlintFishSilhouettes.StandardMid, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 1.00f, TailLengthMul = 1.00f } },
            { KawaGlintFishSilhouettes.FlatDisc, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 1.50f, TailLengthMul = 0.45f } },
            { KawaGlintFishSilhouettes.Crawler, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 0.85f, TailLengthMul = 0.55f } },
            { KawaGlintFishSilhouettes.ObjectBoot, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 1.15f, TailLengthMul = 0.35f } },
            { KawaGlintFishSilhouettes.ObjectShell, new Recipe { Shape = ShapeKind.Fan, Tint = ArchetypeShadowTint } },
            { KawaGlintFishSilhouettes.Star5, new Recipe { Shape = ShapeKind.Star, Tint = ArchetypeShadowTint } },
            { KawaGlintFishSilhouettes.BroadFancy, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 1.35f, TailLengthMul = 0.95f } },
            { KawaGlintFishSilhouettes.SalmonRare, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 0.95f, TailLengthMul = 1.05f } },
            { KawaGlintFishSilhouettes.Tentacle, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 0.80f, TailLengthMul = 1.50f } },
            { KawaGlintFishSilhouettes.Serpentine, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 0.32f, TailLengthMul = 1.60f } },
            { KawaGlintFishSilhouettes.TorpedoGiant, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 1.05f, TailLengthMul = 0.85f } },
            { KawaGlintFishSilhouettes.RegalLongfin, new Recipe { Shape = ShapeKind.Teardrop, Tint = ArchetypeShadowTint, AspectMul = 0.50f, TailLengthMul = 1.70f } }
        };

        private static readonly Dictionary<string, Sprite> Cache = new Dictionary<string, Sprite>();

        /// <summary>
        /// Procedural silhouette for <paramref name="speciesId"/>: the
        /// species' own recipe when it has one, otherwise the stand-in for its
        /// body-plan archetype (<see cref="KawaGlintFishSilhouettes"/>).
        /// Null only for an id with neither -- which cannot happen for a
        /// species registered in the silhouette table, so in practice this is
        /// the last rung of the ladder that always catches.
        /// </summary>
        public static Sprite GetSilhouette(string speciesId)
        {
            if (string.IsNullOrEmpty(speciesId))
            {
                return null;
            }

            if (Recipes.TryGetValue(speciesId, out var recipe))
            {
                return GetOrCreate(speciesId, recipe, $"KawaGlint Procedural Fish ({speciesId})");
            }

            // Not one of the hand-tuned per-species recipes: fall through to
            // the shared body-plan stand-in rather than returning null, so a
            // newly-added species never renders as an empty sprite.
            return GetArchetypeSilhouette(KawaGlintFishSilhouettes.ResolveArchetype(speciesId, 0));
        }

        /// <summary>
        /// Stand-in silhouette for a <see cref="KawaGlintFishSilhouettes"/>
        /// archetype key, used until the shared <c>sil_&lt;key&gt;_shadow.png</c>
        /// library is drawn. Null only for an unknown key.
        /// </summary>
        public static Sprite GetArchetypeSilhouette(string archetypeKey)
        {
            if (string.IsNullOrEmpty(archetypeKey) || !ArchetypeRecipes.TryGetValue(archetypeKey, out var recipe))
            {
                return null;
            }
            return GetOrCreate($"archetype:{archetypeKey}", recipe, $"KawaGlint Procedural Archetype ({archetypeKey})");
        }

        private static Sprite GetOrCreate(string cacheKey, Recipe recipe, string assetName)
        {
            if (Cache.TryGetValue(cacheKey, out var cached) && cached != null)
            {
                return cached;
            }

            Texture2D texture;
            switch (recipe.Shape)
            {
                case ShapeKind.Star:
                    texture = CreateStarTexture(recipe.Tint);
                    break;
                case ShapeKind.Fan:
                    texture = CreateFanTexture(recipe.Tint);
                    break;
                default:
                    texture = CreateTeardropTexture(recipe.Tint, recipe.AspectMul, recipe.TailLengthMul);
                    break;
            }
            texture.name = assetName;

            var sprite = Sprite.Create(
                texture,
                new Rect(0f, 0f, texture.width, texture.height),
                CenterPivot,
                PixelsPerUnit,
                0,
                SpriteMeshType.FullRect);
            sprite.name = assetName;
            Cache[cacheKey] = sprite;
            return sprite;
        }

        // ---------------------------------------------------------------
        // Teardrop (standard fish silhouette) -- pixel math copied from
        // KawaGlintActorsBuilder.CreateFishShadowTexture and parameterized by
        // tint/aspect/tail-length (that method itself is untouched).
        // ---------------------------------------------------------------
        private static Texture2D CreateTeardropTexture(Color32 tint, float aspectMul, float tailLengthMul)
        {
            const int width = TeardropWidth;
            const int height = TeardropHeight;

            var centerX = width * 0.40f;
            var centerY = height * 0.5f;
            var rx = width * 0.26f;
            var ry = height * 0.30f * aspectMul;
            var tailStartX = centerX + rx * 0.55f;
            var baseTailEndX = width * 0.97f;
            var baseTailLength = baseTailEndX - tailStartX;
            // Clamped so an aggressively long tail (e.g. unagi's 1.6x) still
            // stays inside the fixed 128px canvas rather than sampling
            // off-texture pixels.
            var tailEndX = Mathf.Min(tailStartX + baseTailLength * tailLengthMul, width - 1.5f);

            var tailRatio = Mathf.Sqrt(Mathf.Max(0f, 1f - Square((tailStartX - centerX) / rx)));
            var tailBaseHalfHeight = ry * tailRatio;

            var tintColor = (Color)tint;
            var texture = CreateTexture(width, height, $"KawaGlint Procedural Teardrop {tint}");
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

                    var alpha = Mathf.Clamp01(shapeAlpha) * SilhouetteAlpha;
                    pixels[y * width + x] = new Color(tintColor.r, tintColor.g, tintColor.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // 5-point star (hitode / ひとで)
        // ---------------------------------------------------------------
        private static Texture2D CreateStarTexture(Color32 tint)
        {
            const int size = RoundTextureSize;
            const int points = 5;
            const float outerRadius = 0.46f;
            const float innerRadius = 0.20f;

            var tintColor = (Color)tint;
            var texture = CreateTexture(size, size, $"KawaGlint Procedural Star {tint}");
            var pixels = new Color32[size * size];
            var center = (size - 1) * 0.5f;
            var maxRadius = size * 0.5f;
            var segmentAngle = (2f * Mathf.PI) / points;

            for (var y = 0; y < size; y++)
            {
                var dy = y - center;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - center;
                    var r = Mathf.Sqrt(dx * dx + dy * dy) / maxRadius;
                    var angle = Mathf.Atan2(dy, dx) + Mathf.PI; // 0..2π
                    var t = Mathf.Repeat(angle, segmentAngle) / segmentAngle; // 0..1 within one point period
                    var fraction = Mathf.Abs(2f * t - 1f); // 1 at a tip, 0 at a valley
                    var radial = Mathf.Lerp(innerRadius, outerRadius, fraction);
                    var value = radial > 0.0001f ? r / radial : 999f;
                    var shapeAlpha = 1f - SmoothStep01(0.85f, 1.15f, value);
                    var alpha = Mathf.Clamp01(shapeAlpha) * SilhouetteAlpha;
                    pixels[y * size + x] = new Color(tintColor.r, tintColor.g, tintColor.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Fan / half-disc (treasure_kaigara / きらきらの かいがら): straight
        // bottom edge + rounded upper half-circle, per §D-1.
        // ---------------------------------------------------------------
        private static Texture2D CreateFanTexture(Color32 tint)
        {
            const int size = RoundTextureSize;
            const float radiusNorm = 0.42f;
            const float baselineYNorm = 0.30f; // flat edge sits below texture center, arc bulges upward

            var tintColor = (Color)tint;
            var texture = CreateTexture(size, size, $"KawaGlint Procedural Fan {tint}");
            var pixels = new Color32[size * size];
            var centerX = (size - 1) * 0.5f;
            var baselineY = size * baselineYNorm;
            var radius = size * radiusNorm;

            for (var y = 0; y < size; y++)
            {
                var dy = y - baselineY;
                for (var x = 0; x < size; x++)
                {
                    var dx = x - centerX;
                    var value = Square(dx / radius) + Square(dy / radius);
                    var circleAlpha = 1f - SmoothStep01(0.85f, 1.15f, value);
                    var edgeAlpha = SmoothStep01(-1.5f, 1.5f, dy); // soft flat-edge cutoff at dy == 0 (0 below, 1 above)
                    var alpha = Mathf.Clamp01(circleAlpha * edgeAlpha) * SilhouetteAlpha;
                    pixels[y * size + x] = new Color(tintColor.r, tintColor.g, tintColor.b, alpha);
                }
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ---------------------------------------------------------------
        // Shared helpers (deliberately duplicated from KawaGlintActorsBuilder
        // rather than shared -- that class's own contract keeps it at zero
        // dependency on sibling rendering types; see its class doc).
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

        private static Color32 HexColor(byte r, byte g, byte b, byte a = 255)
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
    }
}
