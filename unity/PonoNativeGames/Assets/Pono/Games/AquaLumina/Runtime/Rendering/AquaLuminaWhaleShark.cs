using UnityEngine;

namespace Pono.AquaLumina.Rendering
{
    /// <summary>
    /// Places the single illustrated hero creature in the AquaLumina stage: a
    /// large jinbeizame (whale shark) sprite reused byte-identical from the
    /// quizland trivia game's asset bank (see <see cref="AquaLuminaSpriteLoader"/>).
    ///
    /// Unlike every procedural builder in <see cref="AquaLuminaStageBuilder"/>,
    /// this one takes no <see cref="System.Random"/>: there is exactly one hero
    /// instance to place deterministically, so nothing here needs randomization,
    /// and leaving the shared RNG stream untouched preserves the draw order of
    /// whatever elements are built around it.
    /// </summary>
    public static class AquaLuminaWhaleShark
    {
        // Matches AquaLuminaStageBuilder.PixelsPerUnit and the fixed 100f baked
        // into AquaLuminaSpriteLoader - kept as its own constant here (rather
        // than reaching into StageBuilder's private one) since this class is
        // built and owned independently of it.
        private const float PixelsPerUnit = 100f;

        // ~31% of the ~17.8-unit-wide visible rect at the spike camera
        // (orthographicSize 5, 16:9) and roughly 3.4x the largest 1.6-unit
        // placeholder fish - large enough to unambiguously read as the hero
        // creature without dwarfing the frame.
        private const float WorldWidth = 5.5f;

        // Sorting-order contract shared with AquaLuminaStageBuilder: in front
        // of Kelp (12) and the small silhouette Fish (14) so it reads above
        // the ambient background life, behind NearRocks (16) and the coral
        // decoration (17) so on its lowest bob it can pass behind foreground
        // reef for depth, and strictly below the god-ray/caustics/distortion
        // passes (20+) so that lighting continues to illuminate this
        // illustrated art like everything else in the stage. Prominence
        // comes from its size, not from sorting on top of everything.
        private const int WhaleSharkSortingOrder = 15;

        // Slower than every small fish's 0.3-0.7 range, paired with a gentle
        // low-frequency bob - reads as a massive, unhurried filter-feeder
        // cruising through the frame rather than a darting small fish.
        private const float Speed = 0.25f;

        // Source art faces -X (left, head left / tail right - verified by
        // visual review) which already matches the procedural fish texture's
        // facing convention, so direction of travel and art orientation agree
        // with no mirroring needed.
        private const float Direction = -1f;

        private const float BobSpeed = 0.5f;
        private const float BobPhase = 0f;
        private const float BobAmplitude = 0.12f;

        public static void Build(AquaLuminaStageContent content, Transform parent, Rect visibleRect, Material material)
        {
            var sprite = AquaLuminaSpriteLoader.LoadSprite("AquaLumina/Content/Creatures/jinbeizame");
            if (sprite == null)
            {
                // AquaLuminaSpriteLoader already logs the specific
                // Resources.Load miss; nothing else to build without the
                // source art.
                return;
            }

            var texture = sprite.texture;

            // Single uniform scalar derived from the source PNG's own native
            // pixel aspect ratio (read at runtime, never hardcoded) - both
            // world-space axes are multiplied by this one factor, so the art
            // can never be stretched off its authored proportions.
            var nativeWidth = texture.width / PixelsPerUnit;
            var scale = WorldWidth / nativeWidth;

            // Mid-water and slightly above center, inside the god-ray band
            // and comfortably above the near-rock skyline (bottom ~26% of
            // the frame) so the hero never intersects the seafloor or the
            // coral row.
            var x = visibleRect.center.x - visibleRect.width * 0.1f;
            var baseY = visibleRect.center.y + visibleRect.height * 0.08f;

            var renderer = CreateSpriteRendererObject(
                "WhaleShark", parent, sprite, material, WhaleSharkSortingOrder, new Vector3(x, baseY, 0f));
            renderer.transform.localScale = new Vector3(scale, scale, 1f);

            // Art already faces -X, matching Direction below - display
            // unmirrored.
            renderer.flipX = false;

            var halfWidth = WorldWidth * 0.5f;

            // Legal (and cheap) because this class lives in the same
            // Pono.AquaLumina.Rendering asmdef as AquaLuminaStageContent's
            // internal Register*/Set* API. Reusing the existing drift/bob/wrap
            // animation costs zero new animation code and the existing wrap
            // logic (halfWidth ensures the sprite fully exits before
            // teleporting to the far edge) comes for free. A motionless
            // 5.5-unit hero would read as a pasted sticker; this slow drift
            // plus gentle low-frequency bob reads as a massive filter-feeder
            // cruising through the frame instead.
            content.RegisterFish(renderer.transform, Speed, Direction, baseY, BobSpeed, BobPhase, BobAmplitude, halfWidth);
        }

        // Minimal self-contained renderer-object helper. AquaLuminaStageBuilder
        // has an equivalent private CreateSpriteRendererObject, but it is
        // private to that class and this unit is built/owned independently of
        // it, so this class keeps its own small copy rather than depending on
        // StageBuilder internals.
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
            go.transform.position = worldPosition;
            var renderer = go.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.sharedMaterial = material;
            renderer.sortingOrder = sortingOrder;
            return renderer;
        }
    }
}
