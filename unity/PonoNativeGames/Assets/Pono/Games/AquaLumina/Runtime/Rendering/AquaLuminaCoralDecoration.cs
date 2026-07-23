using UnityEngine;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Adds a prominent illustrated coral/reef layer in front of the
    /// procedural near-rock silhouette (<see cref="AquaLuminaStageBuilder"/>'s
    /// <c>BuildRockLayer</c>, order 16). The two rock silhouette layers stay
    /// in the scene unchanged — they are the dark seafloor ground plane and
    /// atmospheric depth backdrop, not what the owner's "looks like an
    /// abstract fractal, not a real aquarium" complaint was about. That
    /// complaint is about the total ABSENCE of illustrated art anywhere in
    /// the stage, so the fix here is additive: real hand-illustrated reef
    /// pieces (reused byte-identical from the existing PixiJS web aquarium
    /// asset bank, see the prep-step summary) planted on top of the near
    /// silhouette so every piece reads as rooted in the seafloor rather than
    /// floating on the bare background gradient.
    ///
    /// Static only (no sway/animation, matching how the web aquarium's own
    /// placeRocks() treats reef decoration) and registers nothing with
    /// <see cref="AquaLuminaStageContent"/>: there is no per-frame animation
    /// state to track, and the sprites/textures here are Resources-owned via
    /// <see cref="AquaLuminaSpriteLoader"/>, not runtime-generated, so they
    /// must never be handed to <c>RegisterGeneratedAsset</c> (its OnDestroy
    /// would destroy the shared Resources-backed texture and break every
    /// later Resources.Load of it for the lifetime of the application).
    /// </summary>
    public static class AquaLuminaCoralDecoration
    {
        // Sprite.Create in AquaLuminaSpriteLoader fixes pixelsPerUnit at 100f
        // (matching AquaLuminaStageBuilder.PixelsPerUnit) so a loaded
        // texture's native world size is directly comparable to every
        // procedurally-painted sprite the stage builder already places.
        private const float PixelsPerUnit = 100f;

        private const int InstanceCount = 6;
        private const int VariantCount = 3;

        // Sorting-order contract shared with AquaLuminaStageBuilder (see that
        // file's "Sorting-order contract" block, lines 58-68): 17 sits in
        // front of NearRocks (16, the silhouette this coral roots into) and
        // strictly below 20+, which the god-ray/caustics/distortion passes
        // own — lighting playing across this real illustrated art is the
        // entire point of this integration, so coral must never render in
        // front of those effect layers.
        private const int CoralSortingOrder = 17;

        // Keep the reef confined to the inner 88% of the frame so no piece's
        // silhouette is ever clipped by the camera's left/right edge.
        private const float HorizontalMarginFraction = 0.06f;

        // A jittered-slot layout (rather than 6 fully independent random X
        // draws) guarantees coverage across the whole seafloor - every slot
        // gets exactly one instance - while the jitter still reads as
        // scattered like the web aquarium's own placeRocks(). This does NOT
        // guarantee zero overlap between neighbors: the widest variant
        // (OceanRocks1_001, ~1.19:1) at MaxWorldHeight can render wider than
        // one slot (usable width / 6 columns), so under worst-case opposing
        // jitter two adjacent pieces can still visually touch/overlap. That
        // is accepted, not fixed outright - the web aquarium's own
        // placeRocks() allows the same organic overlap - but
        // MaxWorldHeight/this jitter fraction were both trimmed down from
        // their original values specifically to make that overlap smaller
        // and less likely rather than eliminating the scattered look.
        private const float SlotJitterFraction = 0.2f;

        // Bottom-edge placement as a fraction of visible rect height above
        // yMin, kept well under a PROVABLE (not eyeballed) worst-case floor:
        // AquaLuminaStageBuilder.CreateRockSilhouetteTexture hard-clamps its
        // per-column skyline to a minimum of SkylineFloorPixels regardless of
        // RNG seed/frequencies/phases (see that method's own
        // `Mathf.Clamp(skyline, 10f, height - 6f)` call), so this bound holds
        // for any GenerationSeed, not just the one this file happens to ship
        // with. AssertBottomBandIsSafe (below, called once per Build()) turns
        // this from a comment into an enforced runtime check against the
        // caller's actual visibleRect aspect ratio.
        private const float SkylineFloorPixels = 10f; // mirrors AquaLuminaStageBuilder's clamp floor
        private const float RockTextureWidth = 512f; // mirrors AquaLuminaStageBuilder.RockTextureWidth
        private const float MinBottomHeightFraction = 0.006f;
        private const float MaxBottomHeightFraction = 0.022f;

        // Target on-screen size: 16-23% of the 10-unit visible height at the
        // spike camera's orthographicSize 5 (2 * 5 = 10). Upper end trimmed
        // down from an earlier 26% specifically to reduce the widest
        // variant's worst-case slot overlap (see SlotJitterFraction's
        // comment above).
        private const float MinWorldHeight = 1.6f;
        private const float MaxWorldHeight = 2.3f;

        private const string Reef1Path = "AquaLumina/Content/Reef/OceanRocks1_001";
        private const string Reef2Path = "AquaLumina/Content/Reef/OceanRocks3_001";
        private const string Reef3Path = "AquaLumina/Content/Reef/OceanRocks3_008";

        /// <summary>
        /// Builds 6 static illustrated coral/reef pieces (2 of each of the 3
        /// source pieces) across <paramref name="visibleRect"/>'s seafloor.
        /// Parameter order deliberately mirrors AquaLuminaStageBuilder's
        /// private BuildKelp/BuildFish so every stage-content Build() call
        /// site reads uniformly.
        /// </summary>
        public static void Build(AquaLuminaStageContent content, Transform parent, Rect visibleRect, System.Random random, Material material)
        {
            // content is accepted (not used) purely to keep this call site's
            // signature uniform with BuildKelp/BuildFish. Coral is static
            // decoration: it has no per-frame animation state to register and
            // owns no runtime-generated Texture2D/Sprite/Material (the loader
            // sprites below are Resources-owned instead), so there is nothing
            // here for AquaLuminaStageContent to animate or clean up.
            _ = content;

            // Enforced (not just commented) bound: fails loudly if the
            // constants above are ever changed without re-checking that
            // every coral bottom-edge draw still lands inside the near-rock
            // silhouette's guaranteed opaque band, for the caller's actual
            // camera aspect rather than an assumed 16:9.
            AssertBottomBandIsSafe(visibleRect);

            // Loaded once up front (not per-instance) - each of the 3 pieces
            // is reused for exactly 2 of the 6 instances below.
            var variants = new Sprite[VariantCount];
            variants[0] = AquaLuminaSpriteLoader.LoadSprite(Reef1Path);
            variants[1] = AquaLuminaSpriteLoader.LoadSprite(Reef2Path);
            variants[2] = AquaLuminaSpriteLoader.LoadSprite(Reef3Path);

            var horizontalMargin = visibleRect.width * HorizontalMarginFraction;
            var usableXMin = visibleRect.xMin + horizontalMargin;
            var usableXMax = visibleRect.xMax - horizontalMargin;
            var slotWidth = (usableXMax - usableXMin) / InstanceCount;

            for (var i = 0; i < InstanceCount; i++)
            {
                var sprite = variants[i % VariantCount];
                if (sprite == null)
                {
                    // AquaLuminaSpriteLoader already logged the missing-asset
                    // error; degrade gracefully by skipping this instance
                    // rather than throwing and taking down the whole stage.
                    continue;
                }

                var slotCenter = usableXMin + slotWidth * (i + 0.5f);
                var jitter = NextFloat(random, -SlotJitterFraction, SlotJitterFraction) * slotWidth;
                var x = slotCenter + jitter;

                var bottomY = visibleRect.yMin
                    + NextFloat(random, MinBottomHeightFraction, MaxBottomHeightFraction) * visibleRect.height;

                // Single uniform-scale draw (the hard aspect-ratio rule): only
                // worldHeight is randomized, and width is derived from it via
                // the source PNG's own native pixel aspect ratio below - never
                // draw a second, independent random for width.
                var worldHeight = NextFloat(random, MinWorldHeight, MaxWorldHeight);

                // Loader pivot is center (0.5, 0.5), so placing the bottom
                // edge at bottomY means the transform's Y sits half the
                // sprite's world height above it.
                var y = bottomY + worldHeight * 0.5f;

                var renderer = CreateSpriteRendererObject(
                    $"Coral{i}", parent, sprite, material, CoralSortingOrder, new Vector3(x, y, 0f));

                var nativeHeight = sprite.texture.height / PixelsPerUnit;
                var scale = worldHeight / nativeHeight;
                renderer.transform.localScale = new Vector3(scale, scale, 1f);

                // Mirroring is safe variety (does not distort the aspect
                // ratio the way independent width/height scaling would).
                renderer.flipX = random.Next(2) == 0;
            }
        }

        // Converts AquaLuminaStageBuilder's hard-coded near-rock skyline
        // pixel floor (SkylineFloorPixels out of RockTextureHeight, which
        // that file's CreateRockSilhouetteTexture clamps to unconditionally,
        // independent of RNG seed/frequencies/phases) into a fraction of
        // THIS visibleRect's height, using the rect's own actual aspect
        // ratio rather than assuming a fixed 16:9 - the near-rock sprite's
        // width always spans the full rect width (see BuildRockLayer), so
        // world height per texture pixel is (rect.width / RockTextureWidth),
        // and dividing that by rect.height to get a fraction cancels down to
        // (SkylineFloorPixels / RockTextureWidth) * (rect.width / rect.height).
        // Logs an error (rather than throwing, matching this file's existing
        // graceful-degradation style) if MaxBottomHeightFraction is ever
        // widened past that guaranteed floor, so the "always inside the
        // opaque silhouette" claim above stays true instead of silently
        // rotting the next time these constants are tuned.
        private static void AssertBottomBandIsSafe(Rect visibleRect)
        {
            if (visibleRect.height <= 0f)
            {
                return; // Degenerate rect; nothing meaningful to check.
            }

            var guaranteedFloorFraction = (SkylineFloorPixels / RockTextureWidth) * (visibleRect.width / visibleRect.height);
            if (MaxBottomHeightFraction >= guaranteedFloorFraction)
            {
                Debug.LogError(
                    $"AquaLuminaCoralDecoration: MaxBottomHeightFraction ({MaxBottomHeightFraction:F4}) is not "
                    + $"safely below the near-rock silhouette's guaranteed opaque floor ({guaranteedFloorFraction:F4}) "
                    + "for this visibleRect - coral bases could render above a transparent gap in the rock "
                    + "silhouette instead of always inside it. Lower MaxBottomHeightFraction, or re-derive "
                    + "SkylineFloorPixels/RockTextureWidth here if AquaLuminaStageBuilder's rock-generation "
                    + "constants ever change.");
            }
        }

        // Minimal local duplicate of AquaLuminaStageBuilder's identical
        // private helper - that one isn't accessible from here, and
        // duplicating these ~12 lines keeps this class fully self-contained
        // so the only shared-file edit stays in the later integration step.
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

        private static float NextFloat(System.Random random, float min, float max)
        {
            return min + (float)random.NextDouble() * (max - min);
        }
    }
}
